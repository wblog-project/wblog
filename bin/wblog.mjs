#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { createInterface } from 'node:readline/promises';
import { parse, stringify } from 'yaml';

const root = process.cwd();
const configPath = path.join(root, 'config.yml');
const configGuide = `# wblog site configuration\n# Detailed field-by-field reference: config.example.yml and README.md#配置站点\n# Images live in public/images/ and use /images/... paths. avatar should be square;\n# heroImage uses a centered crop; background should be wide. SteamID64 is 17 digits.\n\n`;
const usage = `
wblog — configuration-first static blog helper

Usage:
  npm run wblog -- <command> [arguments] [options]

Commands:
  help [command]                         Show all help or help for one command
  setup [--minimal|--detailed]           Guided setup for profile and platform accounts
  config show                             Print the current config.yml
  config set <path> <value>               Update a nested config value
  post new <title> [--tags a,b] [--cover path] [--draft] [--description text]
                                          Create a blog Markdown file
  life new <title> --summary <text> [--photo file ...]
                                          Add a Daily Life entry and copy photos
  gallery new <title> --description <text> --image <file> [--image file]
                                          Add a Gallery entry and copy images
  asset add <file> [--to images/uploads]  Copy a local asset into public/
  pages sync [--repository URL]            Build and sync static output to a GitHub Pages repo
  build                                   Run the production build
  preview                                 Build then start a local production preview
  test                                    Run unit tests
  status                                  Show repository and deployment configuration
  doctor                                  Check Node, config, images and Git readiness
  deploy [--message text] [--no-test]     Build, test, commit all project changes and push

Examples:
  npm run wblog -- config set profile.name "Rex"
  npm run wblog -- setup --minimal
  npm run wblog -- setup --detailed
  npm run wblog -- config set home.modules.music false
  npm run wblog -- post new "Hello wblog" --tags Notes,Astro
  npm run wblog -- life new "A sunny walk" --summary "Spring arrived" --photo ~/Desktop/sun.jpg
  npm run wblog -- gallery new "Night sky" --description "First frame" --image ./sky.png
  npm run wblog -- pages sync
  npm run wblog -- deploy --message "content: add weekly photos"
`;

const helpByCommand = {
  setup: `setup\n\n  setup [--minimal|--detailed]\n    --minimal configures the URL, name, contact email and core profile links in about two minutes.\n    --detailed additionally configures visual assets, bio, homepage modules, VRChat, Bilibili, music and Pages publishing.\n    Without a flag, choose a mode in the wizard.\n\n    Steam accepts both https://steamcommunity.com/id/custom-name/ and https://steamcommunity.com/profiles/76561198.../.\n    A 17-digit ID is detected automatically from /profiles/ URLs; provide it manually only when using an /id/ custom URL.\n    Press Enter at any question to leave the current value unchanged. Supplying a Steam ID enables Steam activity sync.`,
  config: `config\n\n  config show\n    Print the parsed project configuration.\n\n  config set <path> <value>\n    Set a dot-separated value, such as profile.name or home.modules.blog.\n    true, false and numeric values are stored using their native YAML types.\n\n  config wizard\n    Alias for the interactive setup wizard.`,
  post: `post new\n\n  post new <title> [--tags one,two] [--cover /images/cover.webp] [--draft] [--description text] [--date YYYY-MM-DD]\n    Creates src/content/posts/<slug>.md. Existing files are never overwritten.`,
  life: `life new\n\n  life new <title> --summary <text> [--photo file] [--photo file] [--date YYYY-MM-DD]\n    Creates a Daily Life entry and copies every supplied photo to public/images/life/<slug>/.`,
  gallery: `gallery new\n\n  gallery new <title> --description <text> --image <file> [--image file] [--date YYYY-MM-DD]\n    Creates a Gallery entry, copies images to public/images/gallery/<slug>/, and uses the first as cover.`,
  asset: `asset add\n\n  asset add <file> [--to images/uploads]\n    Copies a local file into public/<destination>. The destination must remain inside public/.`,
  pages: `pages sync\n\n  pages sync [--repository git@github.com:OWNER/OWNER.github.io.git]\n    Builds with a root-domain base path, then publishes only dist/ to the configured GitHub Pages repository.\n    The repository defaults to deployment.githubPagesRepository in config.yml. Source files, node_modules, .env and Git metadata are never copied.`,
  deploy: `deploy\n\n  deploy [--message text] [--no-test]\n    Runs the production build, runs tests unless --no-test is used, stages project files, creates one commit, and pushes origin/main.\n    It never commits .env, dist, node_modules or .astro because they are ignored.`,
};

function fail(message) { console.error(`\nError: ${message}\nRun \`npm run wblog -- help\` for usage.`); process.exit(1); }
function info(message) { console.log(`✓ ${message}`); }
function project() { if (!existsSync(configPath) || !existsSync(path.join(root, 'package.json'))) fail('Run this command from the wblog project root.'); }
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
function steamIdFromProfile(value) { const match = value.match(/^https?:\/\/steamcommunity\.com\/profiles\/(\d{17})\/?(?:\?.*)?$/i); return match?.[1] || ''; }
function githubUsernameFromInput(value) { if (!validUrl(value)) return value; const url = new URL(value); if (url.hostname.toLowerCase() !== 'github.com') return value; return url.pathname.split('/').filter(Boolean)[0] || ''; }
function setSocialUrl(config, name, icon, url) { const existing = config.socials?.find((social) => social.name === name); if (existing) existing.url = url; else { config.socials ||= []; config.socials.push({ name, icon, url }); } }
function frontmatter(data, body = '') { return `---\n${stringify(data)}---\n\n${body}`; }
function writeStarterFile(file, contents) { if (!existsSync(file)) { mkdirSync(path.dirname(file), { recursive: true }); writeFileSync(file, contents, 'utf8'); return true; } return false; }
function generateStarterContent() {
  const sampleImage = path.join(root, 'public/images/examples/wblog-starter.svg');
  const files = [
    [sampleImage, `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#19143e"/><stop offset=".55" stop-color="#57387a"/><stop offset="1" stop-color="#d06d9e"/></linearGradient></defs><rect width="1600" height="900" fill="url(#g)"/><circle cx="1250" cy="180" r="100" fill="#fff1d8" opacity=".88"/><path d="M0 680Q240 510 460 690T920 620T1320 700T1600 610V900H0Z" fill="#10162f" opacity=".72"/><text x="100" y="690" fill="#fff" font-family="sans-serif" font-size="76" font-weight="700">Your first little moment</text><text x="105" y="755" fill="#e5ccff" font-family="sans-serif" font-size="30">Replace this starter image with one of your own.</text></svg>`],
    [path.join(root, 'src/content/posts/_example-first-post.md'), frontmatter({ title: 'Welcome to my space', date: dateToday(), description: 'A starter post generated by wblog setup.', tags: ['Start here'], cover: '/images/examples/wblog-starter.svg', draft: false }, `This sample is safe to edit or delete.\n\n![Starter artwork](/images/examples/wblog-starter.svg)\n\nImages live in \`public/images/\`. Reference them with a site-relative path such as \`/images/posts/my-photo.webp\`, never with a local disk path.\n`)],
    [path.join(root, 'src/content/life/_example-first-moment.md'), frontmatter({ title: 'My first small moment', date: dateToday(), summary: 'A starter Daily Life entry with one image.', images: ['/images/examples/wblog-starter.svg'] }, `Write a little memory here. The first item in \`images\` becomes this entry's preview image.\n`)],
    [path.join(root, 'src/content/gallery/_example-first-frame.md'), frontmatter({ title: 'First frame', date: dateToday(), description: 'A starter gallery item. Replace it with your own photo.', cover: '/images/examples/wblog-starter.svg', images: ['/images/examples/wblog-starter.svg'] }, `Use \`cover\` for the gallery grid and \`images\` for the full set of photos.\n`)],
  ];
  const generated = files.filter(([file, contents]) => writeStarterFile(file, contents)).length;
  if (generated) info(`Generated ${generated} starter file(s): one post, one life entry, one gallery entry and a test image.`);
}
function ensureFresh(file) { if (existsSync(file)) fail(`Refusing to overwrite ${path.relative(root, file)}.`); mkdirSync(path.dirname(file), { recursive: true }); }
function imagePublicPath(source, kind, slug) { const sourcePath = path.resolve(root, source); if (!existsSync(sourcePath) || !statSync(sourcePath).isFile()) fail(`Image not found: ${source}`); const extension = path.extname(sourcePath).toLowerCase(); if (!['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'].includes(extension)) fail(`Unsupported image type: ${extension || 'none'}`); const filename = path.basename(sourcePath).replace(/[^\p{L}\p{N}._-]+/gu, '-'); const relative = path.posix.join('/images', kind, slug, filename); const destination = path.join(root, 'public', relative);
  mkdirSync(path.dirname(destination), { recursive: true }); if (existsSync(destination)) fail(`Refusing to overwrite ${relative}.`); cpSync(sourcePath, destination); return relative;
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
    const githubInput = await ask('GitHub username or profile URL', config.integrations?.github?.username, 'Examples: REXWindW or https://github.com/REXWindW — Enter to skip');
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
      const avatar = await ask('Avatar path', config.profile?.avatar, 'Example: /images/avatar.png (place the file in public/images/)');
      if (avatar) { if (!avatar.startsWith('/images/')) fail('Avatar must begin with /images/.'); config.profile.avatar = avatar; changed = true; }
      const heroImage = await ask('Hero artwork path', config.profile?.heroImage, 'Example: /images/hero.webp; use - to remove it');
      if (heroImage) { if (heroImage === '-') config.profile.heroImage = ''; else if (!heroImage.startsWith('/images/')) fail('Hero artwork must begin with /images/.'); else config.profile.heroImage = heroImage; changed = true; }
      const background = await ask('Background image path', config.appearance?.background, 'Example: /images/background.webp; use - to remove it');
      if (background) { if (background === '-') config.appearance.background = ''; else if (!background.startsWith('/images/')) fail('Background must begin with /images/.'); else config.appearance.background = background; changed = true; }
      const vrchat = await ask('VRChat profile URL', config.socials?.find((social) => social.name === 'VRChat')?.url, 'Example: https://vrchat.com/home/user/usr_xxx — Enter to skip');
      if (vrchat) { if (!validUrl(vrchat) || !/^(https?:\/\/)?vrchat\.com\//i.test(vrchat)) fail('Use a valid vrchat.com profile URL.'); setSocialUrl(config, 'VRChat', 'badge', vrchat); changed = true; }
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
    generateStarterContent();
    if (changed) { if (config.integrations.steam.enabled) info('Steam sync is enabled. Add STEAM_API_KEY to .env locally and GitHub Actions Secrets before publishing.'); info('Setup complete. Run `npm run wblog -- doctor` to verify local assets, then `npm run wblog -- deploy` to publish.'); }
    else info('No settings changed; starter files were checked without overwriting anything.');
  } finally { terminal.close(); }
}
function commandPost(args) { const { positionals, flags } = parseArgs(args); if (positionals[0] !== 'new' || !positionals.slice(1).join(' ')) fail('Use: post new <title> [options]'); const title = positionals.slice(1).join(' '); const slug = slugify(title); const file = path.join(root, 'src/content/posts', `${slug}.md`); ensureFresh(file); const tags = String(flag(flags, 'tags', '')).split(',').map((tag) => tag.trim()).filter(Boolean); const data = { title, date: flag(flags, 'date', dateToday()), description: flag(flags, 'description', `Notes about ${title}.`), tags, cover: flag(flags, 'cover', ''), draft: Boolean(flag(flags, 'draft', false)) }; writeFileSync(file, frontmatter(data, 'Write your post here.\n'), 'utf8'); info(`Created ${path.relative(root, file)}`); }
function commandLife(args) { const { positionals, flags } = parseArgs(args); if (positionals[0] !== 'new' || !positionals.slice(1).join(' ')) fail('Use: life new <title> --summary <text> [--photo file]'); const title = positionals.slice(1).join(' '); const summary = flag(flags, 'summary'); if (!summary || summary === true) fail('Daily Life entries require --summary <text>.'); const slug = slugify(title); const file = path.join(root, 'src/content/life', `${slug}.md`); ensureFresh(file); const images = flagsOf(flags, 'photo').map((source) => imagePublicPath(source, 'life', slug)); writeFileSync(file, frontmatter({ title, date: flag(flags, 'date', dateToday()), summary, images }, 'Write the longer memory here.\n'), 'utf8'); info(`Created ${path.relative(root, file)}${images.length ? ` with ${images.length} photo(s)` : ''}`); }
function commandGallery(args) { const { positionals, flags } = parseArgs(args); if (positionals[0] !== 'new' || !positionals.slice(1).join(' ')) fail('Use: gallery new <title> --description <text> --image <file>'); const title = positionals.slice(1).join(' '); const description = flag(flags, 'description'); if (!description || description === true) fail('Gallery entries require --description <text>.'); const slug = slugify(title); const sources = flagsOf(flags, 'image'); if (!sources.length) fail('Gallery entries require at least one --image <file>.'); const file = path.join(root, 'src/content/gallery', `${slug}.md`); ensureFresh(file); const images = sources.map((source) => imagePublicPath(source, 'gallery', slug)); writeFileSync(file, frontmatter({ title, date: flag(flags, 'date', dateToday()), description, cover: images[0], images }, 'Add your gallery notes here.\n'), 'utf8'); info(`Created ${path.relative(root, file)} with ${images.length} image(s)`); }
function commandAsset(args) { const { positionals, flags } = parseArgs(args); if (positionals[0] !== 'add' || !positionals[1]) fail('Use: asset add <file> [--to images/uploads]'); const source = path.resolve(root, positionals[1]); if (!existsSync(source) || !statSync(source).isFile()) fail(`Asset not found: ${positionals[1]}`); const relativeTarget = String(flag(flags, 'to', 'images/uploads')).replace(/^\/+/, ''); const destinationDir = path.resolve(root, 'public', relativeTarget); const publicRoot = path.resolve(root, 'public'); if (!destinationDir.startsWith(`${publicRoot}${path.sep}`) && destinationDir !== publicRoot) fail('Asset destination must remain inside public/.'); mkdirSync(destinationDir, { recursive: true }); const destination = path.join(destinationDir, path.basename(source)); if (existsSync(destination)) fail(`Refusing to overwrite public/${path.relative(publicRoot, destination)}.`); cpSync(source, destination); info(`Copied to public/${path.relative(publicRoot, destination)}`); }
function commandPages(args) {
  const { positionals, flags } = parseArgs(args);
  if (positionals[0] !== 'sync') fail('Use: pages sync [--repository URL]');
  const config = readConfig();
  const repository = flag(flags, 'repository', config.deployment?.githubPagesRepository);
  if (!repository || repository === true) fail('Set deployment.githubPagesRepository or pass --repository <URL>.');
  const siteUrl = flag(flags, 'site', config.site?.url);
  if (!siteUrl || siteUrl === true || !validUrl(siteUrl)) fail('Set a valid site.url or pass --site <https://...>.');
  const buildEnvironment = { ...process.env, WBLOG_BASE: '', WBLOG_SITE_URL: String(siteUrl).replace(/\/$/, '') };
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
    if (!changed) { info('GitHub Pages repository is already up to date.'); return; }
    run('git', ['-C', temporaryRepo, 'commit', '-m', String(flag(flags, 'message', 'deploy: sync wblog static site'))]);
    run('git', ['-C', temporaryRepo, 'push', '-u', 'origin', 'main'], { env: gitEnvironment });
    info(`Synced static site to ${repository}`);
  } finally { rmSync(temporaryRepo, { recursive: true, force: true }); }
}
function commandDoctor() { project(); const config = readConfig(); const checks = [ ['Node.js 20+', Number(process.versions.node.split('.')[0]) >= 20], ['Git repository', spawnSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: root, encoding: 'utf8' }).status === 0], ['Git remote origin', spawnSync('git', ['remote', 'get-url', 'origin'], { cwd: root, encoding: 'utf8' }).status === 0], ['Configured avatar exists', !config.profile?.avatar || existsSync(path.join(root, 'public', config.profile.avatar))], ['Configured hero image exists', !config.profile?.heroImage || existsSync(path.join(root, 'public', config.profile.heroImage))], ['Configured background exists', !config.appearance?.background || existsSync(path.join(root, 'public', config.appearance.background))] ]; let bad = false; for (const [label, ok] of checks) { console.log(`${ok ? '✓' : '✗'} ${label}`); bad ||= !ok; } if (bad) process.exit(1); }
function commandDeploy(args) { const { flags } = parseArgs(args); run('npm', ['run', 'build']); if (!flag(flags, 'no-test', false)) run('npm', ['test']); const status = spawnSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }); if (status.status !== 0) fail('Git is not available. Run wblog doctor for details.'); if (!status.stdout.trim()) { info('Nothing to deploy; working tree is clean.'); return; } run('git', ['add', '.']); run('git', ['commit', '-m', String(flag(flags, 'message', 'content: update wblog site'))]); run('git', ['push', 'origin', 'main']); info('Pushed to GitHub. GitHub Pages will publish after the workflow completes.'); }

const [command = 'help', ...rest] = process.argv.slice(2);
if (command === 'help' || command === '--help' || command === '-h') { console.log(rest[0] ? helpByCommand[rest[0]] || usage : usage); }
else if (command === 'config' && rest[0] === 'wizard') await commandSetup(rest.slice(1));
else if (command === 'config') commandConfig(rest);
else if (command === 'setup') await commandSetup(rest);
else if (command === 'post') commandPost(rest);
else if (command === 'life') commandLife(rest);
else if (command === 'gallery') commandGallery(rest);
else if (command === 'asset') commandAsset(rest);
else if (command === 'pages') commandPages(rest);
else if (command === 'build') run('npm', ['run', 'build']);
else if (command === 'preview') { run('npm', ['run', 'build']); run('npm', ['run', 'preview']); }
else if (command === 'test') run('npm', ['test']);
else if (command === 'status') { run('git', ['status', '--short', '--branch']); const config = readConfig(); console.log(`\nSite: ${config.site?.url || 'not configured'}${config.site?.base || ''}`); }
else if (command === 'doctor') commandDoctor();
else if (command === 'deploy') commandDeploy(rest);
else fail(`Unknown command: ${command}`);
