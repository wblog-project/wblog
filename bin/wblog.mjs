#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { createInterface } from 'node:readline/promises';
import { parse, stringify } from 'yaml';
import { commandVrchat } from './vrchat.mjs';
import { readBuildReport } from './build-report.mjs';

const root = process.cwd();
const siteDirectory = process.env.WBLOG_SITE_DIR === 'template' ? 'template' : 'site';
const siteRoot = path.join(root, siteDirectory);
const privateSiteRoot = path.join(root, 'site');
const templateRoot = path.join(root, 'template');
const imagesRoot = path.join(siteRoot, 'images');
const contentRoot = path.join(siteRoot, 'content');
const configPath = path.join(siteRoot, 'config.yml');
const configGuide = `# wblog site configuration\n# Everything you own lives in site/. Image paths are relative to site/images/.\n\n`;
const usage = `
wblog — configuration-first static blog helper

Usage:
  npm run wblog -- <command> [arguments] [options]

Commands:
  help [command]                         Show all help or help for one command
  init                                   Create private site/ from template/
  setup [--minimal|--detailed]           Guided setup for profile and platform accounts
  config show                             Print the current config.yml
  config set <path> <value>               Update a nested config value
  post new <title> [--tags a,b] [--cover file] [--cover-alt text] [--draft]
                                          Create a blog Markdown file
  life new <title> --summary <text> --photo <file> [--photo file ...]
                                          Add a Daily Life entry and copy photos
  gallery new <title> --description <text> --image <file> [--image file]
                                          Add a Gallery entry and copy images
  vrchat login|sync|status|logout           Manage VRChat login and static snapshots
  asset add <file> [--to general]         Copy a local asset into site/images/
  pages sync [--repository URL]            Build and sync static output to a GitHub Pages repo
  build                                   Run the production build
  preview                                 Build then start a local production preview
  test                                    Run unit tests
  status                                  Show repository and deployment configuration
  doctor                                  Check Node, config, images and Git readiness
  deploy --yes [--message text]           Build and publish site/ to its Pages repository

Examples:
  npm run wblog -- init
  npm run wblog -- config set profile.name "Rex"
  npm run wblog -- setup --minimal
  npm run wblog -- setup --detailed
  npm run wblog -- config set home.modules.music false
  npm run wblog -- post new "Hello wblog" --tags Notes,Astro --cover ./cover.jpg --cover-alt "Night sky"
  npm run wblog -- life new "A sunny walk" --summary "Spring arrived" --photo ~/Desktop/sun.jpg
  npm run wblog -- gallery new "Night sky" --description "First frame" --image ./sky.png
  npm run wblog -- pages sync
  npm run wblog -- deploy --yes --message "deploy: add weekly photos"
`;

const helpByCommand = {
  init: `init\n\n  init\n    Copies the public template/ into a new private site/ directory. Existing site/ data is never overwritten.`,
  setup: `setup\n\n  setup [--minimal|--detailed]\n    --minimal configures the URL, name, contact email and core profile links in about two minutes.\n    --detailed additionally configures visual assets, bio, homepage modules, VRChat, Bilibili, music and Pages publishing.\n    Without a flag, choose a mode in the wizard.\n\n    Steam accepts both https://steamcommunity.com/id/custom-name/ and https://steamcommunity.com/profiles/76561198.../.\n    A 17-digit ID is detected automatically from /profiles/ URLs; provide it manually only when using an /id/ custom URL.\n    Press Enter at any question to leave the current value unchanged. Supplying a Steam ID enables Steam activity sync.`,
  config: `config\n\n  config show\n    Print the parsed project configuration.\n\n  config set <path> <value>\n    Set a dot-separated value, such as profile.name or home.modules.blog.\n    true, false and numeric values are stored using their native YAML types.\n\n  config wizard\n    Alias for the interactive setup wizard.`,
  post: `post new\n\n  post new <title> [--tags one,two] [--cover file] [--cover-alt text] [--draft] [--description text] [--date YYYY-MM-DD]\n    Creates site/content/posts/<slug>.md and copies an optional cover into site/images/posts/<slug>/.`,
  life: `life new\n\n  life new <title> --summary <text> --photo <file> [--photo file] [--date YYYY-MM-DD]\n    Creates a Daily Life entry and copies photos to site/images/life/<slug>/.`,
  gallery: `gallery new\n\n  gallery new <title> --description <text> --image <file> [--image file] [--date YYYY-MM-DD]\n    Creates a Gallery entry and copies images to site/images/gallery/<slug>/.`,
  vrchat: `vrchat\n\n  vrchat login\n    Prompts for credentials and 2FA, stores only session cookies locally, then creates a public-data snapshot.\n\n  vrchat sync\n    Refreshes the profile and recent-world snapshot.\n\n  vrchat status\n    Shows local session and snapshot status without printing secrets.\n\n  vrchat logout\n    Removes the local session while keeping the last public snapshot.`,
  asset: `asset add\n\n  asset add <file> [--to general]\n    Copies a local file into a category under site/images/. The destination cannot escape that directory.`,
  pages: `pages sync\n\n  pages sync [--repository git@github.com:OWNER/OWNER.github.io.git]\n    Builds with a root-domain base path, then publishes only dist/ to the configured GitHub Pages repository.\n    The repository defaults to deployment.githubPagesRepository in site/config.yml.`,
  deploy: `deploy\n\n  deploy --yes [--message text]\n    Builds the private site/ and publishes static output to deployment.githubPagesRepository. It never commits site/ to the framework repository. --yes acknowledges the external change.`,
};

function fail(message) { console.error(`\nError: ${message}\nRun \`npm run wblog -- help\` for usage.`); process.exit(1); }
function info(message) { console.log(`✓ ${message}`); }
function printBuildReport(reportPath) {
  const report = readBuildReport(reportPath);
  const labels = { live: 'live API', snapshot: 'saved snapshot', fallback: 'configured fallback', unavailable: 'unavailable', disabled: 'disabled' };
  const entries = Object.entries(report);
  if (!entries.length) return;
  console.log('\nBuild data sources:');
  for (const [name, result] of entries) {
    const displayName = name.charAt(0).toUpperCase() + name.slice(1);
    console.log(`  ${displayName}: ${labels[result.source] || result.source}${result.detail ? ` (${result.detail})` : ''}`);
  }
}
function project() { if (!existsSync(configPath) || !existsSync(path.join(root, 'package.json'))) fail(`Run this command from the wblog project root. Expected ${siteDirectory}/config.yml. New clone? Run \`npm run wblog -- init\`.`); }
function run(command, args, options = {}) { const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', ...options }); if (result.error) fail(result.error.message); if (result.status !== 0) process.exit(result.status ?? 1); }
function readConfig() { project(); return parse(readFileSync(configPath, 'utf8')); }
function writeConfig(config) { writeFileSync(configPath, `${configGuide}${stringify(config)}`, 'utf8'); info('Updated config.yml'); }
function dateToday() { return new Date().toISOString().slice(0, 10); }
function slugify(value) { const slug = value.normalize('NFKC').trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, ''); return slug || `entry-${Date.now()}`; }
function parseArgs(tokens) { const positionals = []; const flags = new Map(); for (let i = 0; i < tokens.length; i++) { const token = tokens[i]; if (!token.startsWith('--')) { positionals.push(token); continue; } const key = token.slice(2); const next = tokens[i + 1]; const value = next && !next.startsWith('--') ? next : true; if (value !== true) i++; const values = flags.get(key) || []; values.push(value); flags.set(key, values); } return { positionals, flags }; }
function flag(flags, name, fallback = undefined) { return flags.get(name)?.at(-1) ?? fallback; }
function flagsOf(flags, name) { return flags.get(name) || []; }
function scalar(value) { if (value === 'true') return true; if (value === 'false') return false; if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value); return value; }
function setPath(object, dottedPath, value) { const parts = dottedPath.split('.').filter(Boolean); if (!parts.length) fail('Configuration path cannot be empty.'); let target = object; for (const part of parts.slice(0, -1)) { if (!target[part] || typeof target[part] !== 'object') target[part] = {}; target = target[part]; } target[parts.at(-1)] = value; }
function validUrl(value) { try { new URL(value); return true; } catch { return false; } }
function validSiteImageRef(value) { return value && !path.isAbsolute(value) && !value.split(/[\\/]/).includes('..'); }
function steamIdFromProfile(value) { const match = value.match(/^https?:\/\/steamcommunity\.com\/profiles\/(\d{17})\/?(?:\?.*)?$/i); return match?.[1] || ''; }
function githubUsernameFromInput(value) { if (!validUrl(value)) return value; const url = new URL(value); if (url.hostname.toLowerCase() !== 'github.com') return value; return url.pathname.split('/').filter(Boolean)[0] || ''; }
function setSocialUrl(config, name, icon, url) { const existing = config.socials?.find((social) => social.name === name); if (existing) existing.url = url; else { config.socials ||= []; config.socials.push({ name, icon, url }); } }
function frontmatter(data, body = '') { return `---\n${stringify(data)}---\n\n${body}`; }
function commandInit() {
  if (!existsSync(path.join(root, 'package.json')) || !existsSync(path.join(templateRoot, 'config.yml'))) fail('Run this command from a complete wblog checkout.');
  if (existsSync(privateSiteRoot)) fail('Refusing to overwrite existing site/. Move or remove it first if you really want to reinitialize.');
  cpSync(templateRoot, privateSiteRoot, { recursive: true });
  info('Created private site/ from template/. Git ignores this directory by default.');
}
function ensureFresh(file) { if (existsSync(file)) fail(`Refusing to overwrite ${path.relative(root, file)}.`); mkdirSync(path.dirname(file), { recursive: true }); }
function copyContentImage(source, kind, slug) { const sourcePath = path.resolve(root, source); if (!existsSync(sourcePath) || !statSync(sourcePath).isFile()) fail(`Image not found: ${source}`); const extension = path.extname(sourcePath).toLowerCase(); if (!['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'].includes(extension)) fail(`Unsupported image type: ${extension || 'none'}`); const filename = path.basename(sourcePath).replace(/[^\p{L}\p{N}._-]+/gu, '-'); const destination = path.join(imagesRoot, kind, slug, filename);
  mkdirSync(path.dirname(destination), { recursive: true }); if (existsSync(destination)) fail(`Refusing to overwrite ${path.relative(root, destination)}.`); cpSync(sourcePath, destination); return `../../images/${kind}/${slug}/${filename}`;
}
function commandConfig(args) { const [action, dottedPath, value] = args; if (action === 'show') { console.log(readFileSync(configPath, 'utf8')); return; } if (action === 'set') { if (!dottedPath || value === undefined) fail('Use: config set <path> <value>'); const config = readConfig(); setPath(config, dottedPath, scalar(value)); writeConfig(config); return; } fail('Use: config show | config set <path> <value>'); }
async function commandSetup(args = []) {
  project();
  if (!process.stdin.isTTY) fail('`setup` requires an interactive terminal. Use `config set <path> <value>` in scripts or CI.');
  const config = readConfig();
  let changed = false;
  const terminal = createInterface({ input: process.stdin, output: process.stdout });
  const ask = async (label, current = '', hint = 'Enter to skip') => (await terminal.question(`${label}${current ? ` [current: ${current}]` : ''}\n  ${hint}: `)).trim();
  try {
    const requestedMode = args.includes('--minimal') ? 'minimal' : args.includes('--detailed') ? 'detailed' : '';
    if (args.some((arg) => !['--minimal', '--detailed'].includes(arg))) fail('Use: setup [--minimal|--detailed]');
    if (args.includes('--minimal') && args.includes('--detailed')) fail('Choose only one setup mode.');
    console.log('\nwblog guided setup — blank answers leave the current value unchanged.\n');
    let mode = requestedMode;
    if (!mode) {
      const choice = await ask('Choose setup mode', '', 'Type 1 for minimal (identity + core links), 2 for detailed (visuals + all homepage modules)');
      if (choice && choice !== '1' && choice !== '2') fail('Type 1 or 2, or run setup with --minimal or --detailed.');
      mode = choice === '2' ? 'detailed' : 'minimal';
    }
    console.log(`\n${mode === 'minimal' ? 'Minimal' : 'Detailed'} setup selected.\n`);
    const siteUrl = await ask('Site URL', config.site?.url, 'Example: https://YOUR_NAME.github.io — Enter keeps current value');
    if (siteUrl) { if (!validUrl(siteUrl)) fail('Site URL must start with http:// or https://.'); config.site.url = siteUrl.replace(/\/$/, ''); changed = true; }
    const siteBase = await ask('GitHub Pages base path', config.site?.base, 'Use /my-blog for a project site, type / for a root site, or Enter to keep current value');
    if (siteBase) { config.site.base = siteBase === '/' ? '' : `/${siteBase.replace(/^\/+|\/+$/g, '')}`; changed = true; }
    const name = await ask('Display name', config.profile?.name);
    if (name) { config.profile.name = name; changed = true; }
    const email = await ask('Contact email', config.profile?.contactEmail, 'Used by the Contact button — Enter to skip');
    if (email) { if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('Contact email is invalid.'); config.profile.contactEmail = email; changed = true; }
    const githubInput = await ask('GitHub username or profile URL', config.integrations?.github?.username, 'Examples: YOUR_NAME or https://github.com/YOUR_NAME — Enter to skip');
    if (githubInput) { const github = githubUsernameFromInput(githubInput); if (!github || /[/?#]/.test(github)) fail('GitHub username or profile URL is invalid.'); config.integrations.github.username = github; setSocialUrl(config, 'GitHub', 'github', `https://github.com/${github}`); changed = true; }
    const steamProfile = await ask('Steam profile URL', config.socials?.find((social) => social.name === 'Steam')?.url, 'Accepted: /id/custom-name/ or /profiles/76561198000000000/ — Enter to skip');
    const detectedSteamId = steamProfile ? steamIdFromProfile(steamProfile) : '';
    if (steamProfile) { if (!validUrl(steamProfile) || !/^https?:\/\/steamcommunity\.com\/(id|profiles)\//i.test(steamProfile)) fail('Use a Steam Community URL beginning with https://steamcommunity.com/id/ or /profiles/.'); setSocialUrl(config, 'Steam', 'gamepad-2', steamProfile); changed = true; }
    if (detectedSteamId) { config.integrations.steam.steamId = detectedSteamId; config.integrations.steam.enabled = true; changed = true; info(`Detected SteamID64 ${detectedSteamId} from the profile URL.`); }
    const steamId = await ask('Steam 64-bit ID', detectedSteamId || config.integrations?.steam?.steamId, detectedSteamId ? 'Detected from /profiles/ URL; press Enter to use it, or type another 17-digit ID' : 'Required for build-time sync when using an /id/custom-name/ URL; 17 digits only, or Enter to skip');
    if (steamId) { if (!/^\d{17}$/.test(steamId)) fail('Steam 64-bit ID must contain exactly 17 digits.'); config.integrations.steam.steamId = steamId; config.integrations.steam.enabled = true; changed = true; }
    if (mode === 'detailed') {
      const bio = await ask('Short bio', config.profile?.bio, 'One or two sentences for the home page — Enter to keep current value');
      if (bio) { config.profile.bio = bio; changed = true; }
      const avatar = await ask('Avatar path', config.profile?.avatar, 'Relative to site/images, e.g. profile/avatar.png');
      if (avatar) { if (!validSiteImageRef(avatar)) fail('Avatar must be a safe path relative to site/images/.'); config.profile.avatar = avatar; changed = true; }
      const heroImage = await ask('Hero artwork path', config.profile?.heroImage, 'Example: profile/hero.webp; use - to remove it');
      if (heroImage) { if (heroImage === '-') config.profile.heroImage = ''; else if (!validSiteImageRef(heroImage)) fail('Hero artwork must be relative to site/images/.'); else config.profile.heroImage = heroImage; changed = true; }
      const background = await ask('Background image path', config.appearance?.background, 'Example: profile/background.webp; use - to remove it');
      if (background) { if (background === '-') config.appearance.background = ''; else if (!validSiteImageRef(background)) fail('Background must be relative to site/images/.'); else config.appearance.background = background; changed = true; }
      const vrchat = await ask('VRChat profile URL', config.socials?.find((social) => social.name === 'VRChat')?.url, 'Example: https://vrchat.com/home/user/usr_xxx — Enter to skip');
      if (vrchat) { if (!validUrl(vrchat) || !/^(https?:\/\/)?vrchat\.com\//i.test(vrchat)) fail('Use a valid vrchat.com profile URL.'); setSocialUrl(config, 'VRChat', 'badge', vrchat); config.integrations.vrchat = { enabled: true, maxRecentWorlds: config.integrations.vrchat?.maxRecentWorlds || 6 }; changed = true; }
      const bilibili = await ask('Bilibili space URL', config.socials?.find((social) => social.name === 'Bilibili')?.url, 'Example: https://space.bilibili.com/123456 — Enter to skip');
      if (bilibili) {
        const mid = bilibili.match(/^https?:\/\/space\.bilibili\.com\/(\d+)\/?(?:\?.*)?$/i)?.[1];
        if (!validUrl(bilibili) || !mid) fail('Use a Bilibili space URL with a numeric UID, such as https://space.bilibili.com/123456.');
        setSocialUrl(config, 'Bilibili', 'tv', bilibili);
        config.integrations.bilibili = { enabled: true, mid, maxVideos: config.integrations.bilibili?.maxVideos || 3 };
        info(`Bilibili UID ${mid} detected; latest public videos will be included at build time.`);
        changed = true;
      }
      const musicTitle = await ask('Currently listening — track title', config.home?.music?.title, 'Shown as a static card; Enter to keep current value');
      if (musicTitle) { config.home.music.title = musicTitle; changed = true; }
      const musicArtist = await ask('Currently listening — artist', config.home?.music?.artist);
      if (musicArtist) { config.home.music.artist = musicArtist; changed = true; }
      const tags = await ask('About tags', config.home?.aboutTags?.join(', '), 'Comma-separated, e.g. VRChat, Photography, Indie Dev');
      if (tags) { config.home.aboutTags = tags.split(',').map((tag) => tag.trim()).filter(Boolean); changed = true; }
      const moduleKeys = Object.keys(config.home.modules);
      const enabledModules = moduleKeys.filter((key) => config.home.modules[key]).join(', ');
      const modules = await ask('Homepage sections to show', enabledModules, `Choose from: ${moduleKeys.join(', ')}; comma-separated, or Enter to keep current sections`);
      if (modules) {
        const chosen = modules.split(',').map((value) => value.trim()).filter(Boolean);
        const unknown = chosen.filter((value) => !moduleKeys.includes(value));
        if (unknown.length) fail(`Unknown homepage section: ${unknown.join(', ')}. Use: ${moduleKeys.join(', ')}.`);
        for (const key of moduleKeys) config.home.modules[key] = chosen.includes(key);
        changed = true;
      }
      const pagesRepo = await ask('Optional standalone GitHub Pages repository', config.deployment?.githubPagesRepository, 'Example: git@github.com:YOUR_NAME/YOUR_NAME.github.io.git — Enter to skip');
      if (pagesRepo) { config.deployment ||= {}; config.deployment.githubPagesRepository = pagesRepo; changed = true; }
    }
    if (changed) writeConfig(config);
    if (changed) { if (config.integrations.steam.enabled) info('Steam sync is enabled. Add STEAM_API_KEY to .env locally and GitHub Actions Secrets before publishing.'); info('Setup complete. Run `npm run wblog -- doctor` to verify local assets, then `npm run wblog -- deploy` to publish.'); }
    else info('No settings changed.');
  } finally { terminal.close(); }
}
function commandPost(args) { const { positionals, flags } = parseArgs(args); if (positionals[0] !== 'new' || !positionals.slice(1).join(' ')) fail('Use: post new <title> [options]'); const title = positionals.slice(1).join(' '); const slug = slugify(title); const file = path.join(contentRoot, 'posts', `${slug}.md`); ensureFresh(file); const tags = String(flag(flags, 'tags', '')).split(',').map((tag) => tag.trim()).filter(Boolean); const coverSource = flag(flags, 'cover', ''); const cover = coverSource && coverSource !== true ? copyContentImage(coverSource, 'posts', slug) : undefined; const data = { title, date: flag(flags, 'date', dateToday()), description: flag(flags, 'description', `Notes about ${title}.`), tags, ...(cover ? { cover, coverAlt: flag(flags, 'cover-alt', title) } : {}), draft: Boolean(flag(flags, 'draft', false)) }; writeFileSync(file, frontmatter(data, 'Write your post here.\n'), 'utf8'); info(`Created ${path.relative(root, file)}`); }
function commandLife(args) { const { positionals, flags } = parseArgs(args); if (positionals[0] !== 'new' || !positionals.slice(1).join(' ')) fail('Use: life new <title> --summary <text> --photo <file>'); const title = positionals.slice(1).join(' '); const summary = flag(flags, 'summary'); if (!summary || summary === true) fail('Daily Life entries require --summary <text>.'); const sources = flagsOf(flags, 'photo'); if (!sources.length) fail('Daily Life entries require at least one --photo <file>.'); const slug = slugify(title); const file = path.join(contentRoot, 'life', `${slug}.md`); ensureFresh(file); const images = sources.map((source, index) => ({ src: copyContentImage(source, 'life', slug), alt: `${title} — photo ${index + 1}` })); writeFileSync(file, frontmatter({ title, date: flag(flags, 'date', dateToday()), summary, images }, 'Write the longer memory here.\n'), 'utf8'); info(`Created ${path.relative(root, file)} with ${images.length} photo(s)`); }
function commandGallery(args) { const { positionals, flags } = parseArgs(args); if (positionals[0] !== 'new' || !positionals.slice(1).join(' ')) fail('Use: gallery new <title> --description <text> --image <file>'); const title = positionals.slice(1).join(' '); const description = flag(flags, 'description'); if (!description || description === true) fail('Gallery entries require --description <text>.'); const slug = slugify(title); const sources = flagsOf(flags, 'image'); if (!sources.length) fail('Gallery entries require at least one --image <file>.'); const file = path.join(contentRoot, 'gallery', `${slug}.md`); ensureFresh(file); const images = sources.map((source, index) => ({ src: copyContentImage(source, 'gallery', slug), alt: `${title} — image ${index + 1}` })); writeFileSync(file, frontmatter({ title, date: flag(flags, 'date', dateToday()), description, images }, 'Add your gallery notes here.\n'), 'utf8'); info(`Created ${path.relative(root, file)} with ${images.length} image(s)`); }
function commandAsset(args) { const { positionals, flags } = parseArgs(args); if (positionals[0] !== 'add' || !positionals[1]) fail('Use: asset add <file> [--to general]'); const source = path.resolve(root, positionals[1]); if (!existsSync(source) || !statSync(source).isFile()) fail(`Asset not found: ${positionals[1]}`); const relativeTarget = String(flag(flags, 'to', 'general')).replace(/^\/+/, ''); const destinationDir = path.resolve(imagesRoot, relativeTarget); if (!destinationDir.startsWith(`${imagesRoot}${path.sep}`) && destinationDir !== imagesRoot) fail('Asset destination must remain inside site/images/.'); mkdirSync(destinationDir, { recursive: true }); const destination = path.join(destinationDir, path.basename(source)); if (existsSync(destination)) fail(`Refusing to overwrite ${path.relative(root, destination)}.`); cpSync(source, destination); info(`Copied to ${path.relative(root, destination)}`); }
function commandPages(args) {
  const { positionals, flags } = parseArgs(args);
  if (positionals[0] !== 'sync') fail('Use: pages sync [--repository URL]');
  const config = readConfig();
  const repository = flag(flags, 'repository', config.deployment?.githubPagesRepository);
  if (!repository || repository === true) fail('Set deployment.githubPagesRepository or pass --repository <URL>.');
  const siteUrl = flag(flags, 'site', config.site?.url);
  if (!siteUrl || siteUrl === true || !validUrl(siteUrl)) fail('Set a valid site.url or pass --site <https://...>.');
  const reportPath = path.join(os.tmpdir(), `wblog-build-report-${process.pid}.json`);
  rmSync(reportPath, { force: true });
  const buildEnvironment = { ...process.env, WBLOG_BASE: '', WBLOG_SITE_URL: String(siteUrl).replace(/\/$/, ''), WBLOG_BUILD_REPORT: reportPath };
  // Preserve an explicit SSH transport (for example a local SOCKS proxy) while
  // retaining sensible timeouts for the normal direct-SSH case.
  const gitEnvironment = {
    ...process.env,
    GIT_SSH_COMMAND: process.env.GIT_SSH_COMMAND || 'ssh -o ConnectTimeout=15 -o ServerAliveInterval=15 -o ServerAliveCountMax=2',
  };
  run('npm', ['run', 'build'], { env: buildEnvironment });
  const temporaryRepo = mkdtempSync(path.join(os.tmpdir(), 'wblog-pages-'));
  try {
    // A Pages repository contains generated assets only; shallow history makes
    // publishing much faster and avoids downloading unrelated old deploys.
    run('git', ['clone', '--depth', '1', String(repository), temporaryRepo], { env: gitEnvironment });
    const hasMain = spawnSync('git', ['-C', temporaryRepo, 'rev-parse', '--verify', 'main'], { stdio: 'ignore' }).status === 0;
    run('git', ['-C', temporaryRepo, 'checkout', ...(hasMain ? ['main'] : ['--orphan', 'main'])]);
    for (const entry of readdirSync(temporaryRepo)) if (entry !== '.git') rmSync(path.join(temporaryRepo, entry), { recursive: true, force: true });
    for (const entry of readdirSync(path.join(root, 'dist'))) cpSync(path.join(root, 'dist', entry), path.join(temporaryRepo, entry), { recursive: true });
    writeFileSync(path.join(temporaryRepo, '.nojekyll'), '');
    const authorName = spawnSync('git', ['config', 'user.name'], { cwd: root, encoding: 'utf8' }).stdout.trim();
    const authorEmail = spawnSync('git', ['config', 'user.email'], { cwd: root, encoding: 'utf8' }).stdout.trim();
    if (!authorName || !authorEmail) fail('Configure Git user.name and user.email before syncing Pages.');
    run('git', ['-C', temporaryRepo, 'config', 'user.name', authorName]);
    run('git', ['-C', temporaryRepo, 'config', 'user.email', authorEmail]);
    run('git', ['-C', temporaryRepo, 'add', '-A']);
    const changed = spawnSync('git', ['-C', temporaryRepo, 'status', '--porcelain'], { encoding: 'utf8' }).stdout.trim();
    if (!changed) {
      info('GitHub Pages repository is already up to date.');
      printBuildReport(reportPath);
      rmSync(reportPath, { force: true });
      return;
    }
    run('git', ['-C', temporaryRepo, 'commit', '-m', String(flag(flags, 'message', 'deploy: sync wblog static site'))]);
    run('git', ['-C', temporaryRepo, 'push', '-u', 'origin', 'main'], { env: gitEnvironment });
    info(`Synced static site to ${repository}`);
    printBuildReport(reportPath);
    rmSync(reportPath, { force: true });
  } finally { rmSync(temporaryRepo, { recursive: true, force: true }); }
}
function markdownFiles(directory) { if (!existsSync(directory)) return []; return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => { const file = path.join(directory, entry.name); return entry.isDirectory() ? markdownFiles(file) : entry.name.endsWith('.md') ? [file] : []; }); }
function contentMediaAreValid() { for (const file of markdownFiles(contentRoot)) { const source = readFileSync(file, 'utf8'); const frontmatterMatch = source.match(/^---\n([\s\S]*?)\n---/); if (!frontmatterMatch) return false; const data = parse(frontmatterMatch[1]); const references = [data.cover, data.portrait, ...(Array.isArray(data.images) ? data.images.map((image) => typeof image === 'string' ? image : image?.src) : [])].filter(Boolean); if (references.some((reference) => !existsSync(path.resolve(path.dirname(file), reference)))) return false; if (Array.isArray(data.images) && data.images.some((image) => typeof image !== 'object' || !image.alt)) return false; } return true; }
function commandDoctor() { project(); const config = readConfig(); const [nodeMajor, nodeMinor] = process.versions.node.split('.').map(Number); const configImages = [config.site?.ogImage, config.site?.favicon, config.profile?.avatar, config.profile?.heroImage, config.appearance?.background, config.home?.music?.cover].filter(Boolean); const checks = [ ['Node.js 22.19+', nodeMajor > 22 || (nodeMajor === 22 && nodeMinor >= 19)], ['Portable site directory', existsSync(contentRoot) && existsSync(imagesRoot)], ['Configuration schema', spawnSync('npm', ['exec', 'astro', 'check'], { cwd: root, stdio: 'ignore', env: { ...process.env, WBLOG_OFFLINE: '1' } }).status === 0], ['Configured images exist', configImages.every((image) => validSiteImageRef(image) && existsSync(path.join(imagesRoot, image)))], ['Content images and alt text', contentMediaAreValid()], ['Git repository', spawnSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: root, encoding: 'utf8' }).status === 0], ['Git remote origin', spawnSync('git', ['remote', 'get-url', 'origin'], { cwd: root, encoding: 'utf8' }).status === 0] ]; let bad = false; for (const [label, ok] of checks) { console.log(`${ok ? '✓' : '✗'} ${label}`); bad ||= !ok; } if (bad) process.exit(1); }
function commandDeploy(args) {
  const { flags } = parseArgs(args);
  if (!flag(flags, 'yes', false)) fail('Deploy changes the configured Pages repository. Review your site, then rerun with --yes.');
  commandPages(['sync', ...args]);
}

const [command = 'help', ...rest] = process.argv.slice(2);
if (command === 'help' || command === '--help' || command === '-h') { console.log(rest[0] ? helpByCommand[rest[0]] || usage : usage); }
else if (command === 'init') commandInit();
else if (command === 'config' && rest[0] === 'wizard') await commandSetup(rest.slice(1));
else if (command === 'config') commandConfig(rest);
else if (command === 'setup') await commandSetup(rest);
else if (command === 'post') commandPost(rest);
else if (command === 'life') commandLife(rest);
else if (command === 'gallery') commandGallery(rest);
else if (command === 'vrchat') { try { await commandVrchat(root, siteRoot, rest); } catch (error) { fail(error instanceof Error ? error.message : String(error)); } }
else if (command === 'asset') commandAsset(rest);
else if (command === 'pages') commandPages(rest);
else if (command === 'build') run('npm', ['run', 'build']);
else if (command === 'preview') { run('npm', ['run', 'build']); run('npm', ['run', 'preview']); }
else if (command === 'test') run('npm', ['test']);
else if (command === 'status') { run('git', ['status', '--short', '--branch']); const config = readConfig(); console.log(`\nSite: ${config.site?.url || 'not configured'}${config.site?.base || ''}`); }
else if (command === 'doctor') commandDoctor();
else if (command === 'deploy') commandDeploy(rest);
else fail(`Unknown command: ${command}`);
