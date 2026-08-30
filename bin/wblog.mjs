#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createInterface } from 'node:readline/promises';
import { parse, stringify } from 'yaml';

const root = process.cwd();
const configPath = path.join(root, 'config.yml');
const usage = `
wblog — configuration-first static blog helper

Usage:
  npm run wblog -- <command> [arguments] [options]

Commands:
  help [command]                         Show all help or help for one command
  setup                                  Guided setup for profile and platform accounts
  config show                             Print the current config.yml
  config set <path> <value>               Update a nested config value
  post new <title> [--tags a,b] [--cover path] [--draft] [--description text]
                                          Create a blog Markdown file
  life new <title> --summary <text> [--photo file ...]
                                          Add a Daily Life entry and copy photos
  gallery new <title> --description <text> --image <file> [--image file]
                                          Add a Gallery entry and copy images
  asset add <file> [--to images/uploads]  Copy a local asset into public/
  build                                   Run the production build
  preview                                 Build then start a local production preview
  test                                    Run unit tests
  status                                  Show repository and deployment configuration
  doctor                                  Check Node, config, images and Git readiness
  deploy [--message text] [--no-test]     Build, test, commit all project changes and push

Examples:
  npm run wblog -- config set profile.name "Rex"
  npm run wblog -- setup
  npm run wblog -- config set home.modules.music false
  npm run wblog -- post new "Hello wblog" --tags Notes,Astro
  npm run wblog -- life new "A sunny walk" --summary "Spring arrived" --photo ~/Desktop/sun.jpg
  npm run wblog -- gallery new "Night sky" --description "First frame" --image ./sky.png
  npm run wblog -- deploy --message "content: add weekly photos"
`;

const helpByCommand = {
  setup: `setup\n\n  setup\n    Starts an interactive configuration wizard for the site URL, display name, email, GitHub username, Steam profile URL and Steam ID.\n    Press Enter at any question to leave the current value unchanged. Supplying a Steam ID also enables Steam activity sync.`,
  config: `config\n\n  config show\n    Print the parsed project configuration.\n\n  config set <path> <value>\n    Set a dot-separated value, such as profile.name or home.modules.blog.\n    true, false and numeric values are stored using their native YAML types.\n\n  config wizard\n    Alias for the interactive setup wizard.`,
  post: `post new\n\n  post new <title> [--tags one,two] [--cover /images/cover.webp] [--draft] [--description text] [--date YYYY-MM-DD]\n    Creates src/content/posts/<slug>.md. Existing files are never overwritten.`,
  life: `life new\n\n  life new <title> --summary <text> [--photo file] [--photo file] [--date YYYY-MM-DD]\n    Creates a Daily Life entry and copies every supplied photo to public/images/life/<slug>/.`,
  gallery: `gallery new\n\n  gallery new <title> --description <text> --image <file> [--image file] [--date YYYY-MM-DD]\n    Creates a Gallery entry, copies images to public/images/gallery/<slug>/, and uses the first as cover.`,
  asset: `asset add\n\n  asset add <file> [--to images/uploads]\n    Copies a local file into public/<destination>. The destination must remain inside public/.`,
  deploy: `deploy\n\n  deploy [--message text] [--no-test]\n    Runs the production build, runs tests unless --no-test is used, stages project files, creates one commit, and pushes origin/main.\n    It never commits .env, dist, node_modules or .astro because they are ignored.`,
};

function fail(message) { console.error(`\nError: ${message}\nRun \`npm run wblog -- help\` for usage.`); process.exit(1); }
function info(message) { console.log(`✓ ${message}`); }
function project() { if (!existsSync(configPath) || !existsSync(path.join(root, 'package.json'))) fail('Run this command from the wblog project root.'); }
function run(command, args) { const result = spawnSync(command, args, { cwd: root, stdio: 'inherit' }); if (result.error) fail(result.error.message); if (result.status !== 0) process.exit(result.status ?? 1); }
function readConfig() { project(); return parse(readFileSync(configPath, 'utf8')); }
function writeConfig(config) { writeFileSync(configPath, stringify(config), 'utf8'); info('Updated config.yml'); }
function dateToday() { return new Date().toISOString().slice(0, 10); }
function slugify(value) { const slug = value.normalize('NFKC').trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, ''); return slug || `entry-${Date.now()}`; }
function parseArgs(tokens) { const positionals = []; const flags = new Map(); for (let i = 0; i < tokens.length; i++) { const token = tokens[i]; if (!token.startsWith('--')) { positionals.push(token); continue; } const key = token.slice(2); const next = tokens[i + 1]; const value = next && !next.startsWith('--') ? next : true; if (value !== true) i++; const values = flags.get(key) || []; values.push(value); flags.set(key, values); } return { positionals, flags }; }
function flag(flags, name, fallback = undefined) { return flags.get(name)?.at(-1) ?? fallback; }
function flagsOf(flags, name) { return flags.get(name) || []; }
function scalar(value) { if (value === 'true') return true; if (value === 'false') return false; if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value); return value; }
function setPath(object, dottedPath, value) { const parts = dottedPath.split('.').filter(Boolean); if (!parts.length) fail('Configuration path cannot be empty.'); let target = object; for (const part of parts.slice(0, -1)) { if (!target[part] || typeof target[part] !== 'object') target[part] = {}; target = target[part]; } target[parts.at(-1)] = value; }
function validUrl(value) { try { new URL(value); return true; } catch { return false; } }
function setSocialUrl(config, name, icon, url) { const existing = config.socials?.find((social) => social.name === name); if (existing) existing.url = url; else { config.socials ||= []; config.socials.push({ name, icon, url }); } }
function frontmatter(data, body = '') { return `---\n${stringify(data)}---\n\n${body}`; }
function ensureFresh(file) { if (existsSync(file)) fail(`Refusing to overwrite ${path.relative(root, file)}.`); mkdirSync(path.dirname(file), { recursive: true }); }
function imagePublicPath(source, kind, slug) { const sourcePath = path.resolve(root, source); if (!existsSync(sourcePath) || !statSync(sourcePath).isFile()) fail(`Image not found: ${source}`); const extension = path.extname(sourcePath).toLowerCase(); if (!['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'].includes(extension)) fail(`Unsupported image type: ${extension || 'none'}`); const filename = path.basename(sourcePath).replace(/[^\p{L}\p{N}._-]+/gu, '-'); const relative = path.posix.join('/images', kind, slug, filename); const destination = path.join(root, 'public', relative);
  mkdirSync(path.dirname(destination), { recursive: true }); if (existsSync(destination)) fail(`Refusing to overwrite ${relative}.`); cpSync(sourcePath, destination); return relative;
}
function commandConfig(args) { const [action, dottedPath, value] = args; if (action === 'show') { console.log(readFileSync(configPath, 'utf8')); return; } if (action === 'set') { if (!dottedPath || value === undefined) fail('Use: config set <path> <value>'); const config = readConfig(); setPath(config, dottedPath, scalar(value)); writeConfig(config); return; } fail('Use: config show | config set <path> <value>'); }
async function commandSetup() {
  project();
  if (!process.stdin.isTTY) fail('`setup` requires an interactive terminal. Use `config set <path> <value>` in scripts or CI.');
  const config = readConfig();
  let changed = false;
  const terminal = createInterface({ input: process.stdin, output: process.stdout });
  const ask = async (label, current = '') => (await terminal.question(`${label}${current ? ` [current: ${current}]` : ''} (Enter to skip): `)).trim();
  try {
    console.log('\nwblog guided setup — blank answers leave the current value unchanged.\n');
    const siteUrl = await ask('Site URL', config.site?.url);
    if (siteUrl) { if (!validUrl(siteUrl)) fail('Site URL must start with http:// or https://.'); config.site.url = siteUrl.replace(/\/$/, ''); changed = true; }
    const siteBase = await ask('GitHub Pages base path (for example /my-blog; leave blank to skip)', config.site?.base);
    if (siteBase) { config.site.base = siteBase === '/' ? '' : `/${siteBase.replace(/^\/+|\/+$/g, '')}`; changed = true; }
    const name = await ask('Display name', config.profile?.name);
    if (name) { config.profile.name = name; changed = true; }
    const email = await ask('Contact email', config.profile?.contactEmail);
    if (email) { if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('Contact email is invalid.'); config.profile.contactEmail = email; changed = true; }
    const github = await ask('GitHub username', config.integrations?.github?.username);
    if (github) { config.integrations.github.username = github; setSocialUrl(config, 'GitHub', 'github', `https://github.com/${github}`); changed = true; }
    const steamProfile = await ask('Steam profile URL', config.socials?.find((social) => social.name === 'Steam')?.url);
    if (steamProfile) { if (!validUrl(steamProfile)) fail('Steam profile URL must start with http:// or https://.'); setSocialUrl(config, 'Steam', 'gamepad-2', steamProfile); changed = true; }
    const steamId = await ask('Steam 64-bit ID', config.integrations?.steam?.steamId);
    if (steamId) { if (!/^\d{17}$/.test(steamId)) fail('Steam 64-bit ID must contain exactly 17 digits.'); config.integrations.steam.steamId = steamId; config.integrations.steam.enabled = true; changed = true; }
    if (changed) { writeConfig(config); info('Setup complete. Run `npm run wblog -- doctor` to verify local assets, then `npm run wblog -- deploy` to publish.'); }
    else info('No settings changed.');
  } finally { terminal.close(); }
}
function commandPost(args) { const { positionals, flags } = parseArgs(args); if (positionals[0] !== 'new' || !positionals.slice(1).join(' ')) fail('Use: post new <title> [options]'); const title = positionals.slice(1).join(' '); const slug = slugify(title); const file = path.join(root, 'src/content/posts', `${slug}.md`); ensureFresh(file); const tags = String(flag(flags, 'tags', '')).split(',').map((tag) => tag.trim()).filter(Boolean); const data = { title, date: flag(flags, 'date', dateToday()), description: flag(flags, 'description', `Notes about ${title}.`), tags, cover: flag(flags, 'cover', ''), draft: Boolean(flag(flags, 'draft', false)) }; writeFileSync(file, frontmatter(data, 'Write your post here.\n'), 'utf8'); info(`Created ${path.relative(root, file)}`); }
function commandLife(args) { const { positionals, flags } = parseArgs(args); if (positionals[0] !== 'new' || !positionals.slice(1).join(' ')) fail('Use: life new <title> --summary <text> [--photo file]'); const title = positionals.slice(1).join(' '); const summary = flag(flags, 'summary'); if (!summary || summary === true) fail('Daily Life entries require --summary <text>.'); const slug = slugify(title); const file = path.join(root, 'src/content/life', `${slug}.md`); ensureFresh(file); const images = flagsOf(flags, 'photo').map((source) => imagePublicPath(source, 'life', slug)); writeFileSync(file, frontmatter({ title, date: flag(flags, 'date', dateToday()), summary, images }, 'Write the longer memory here.\n'), 'utf8'); info(`Created ${path.relative(root, file)}${images.length ? ` with ${images.length} photo(s)` : ''}`); }
function commandGallery(args) { const { positionals, flags } = parseArgs(args); if (positionals[0] !== 'new' || !positionals.slice(1).join(' ')) fail('Use: gallery new <title> --description <text> --image <file>'); const title = positionals.slice(1).join(' '); const description = flag(flags, 'description'); if (!description || description === true) fail('Gallery entries require --description <text>.'); const slug = slugify(title); const sources = flagsOf(flags, 'image'); if (!sources.length) fail('Gallery entries require at least one --image <file>.'); const file = path.join(root, 'src/content/gallery', `${slug}.md`); ensureFresh(file); const images = sources.map((source) => imagePublicPath(source, 'gallery', slug)); writeFileSync(file, frontmatter({ title, date: flag(flags, 'date', dateToday()), description, cover: images[0], images }, 'Add your gallery notes here.\n'), 'utf8'); info(`Created ${path.relative(root, file)} with ${images.length} image(s)`); }
function commandAsset(args) { const { positionals, flags } = parseArgs(args); if (positionals[0] !== 'add' || !positionals[1]) fail('Use: asset add <file> [--to images/uploads]'); const source = path.resolve(root, positionals[1]); if (!existsSync(source) || !statSync(source).isFile()) fail(`Asset not found: ${positionals[1]}`); const relativeTarget = String(flag(flags, 'to', 'images/uploads')).replace(/^\/+/, ''); const destinationDir = path.resolve(root, 'public', relativeTarget); const publicRoot = path.resolve(root, 'public'); if (!destinationDir.startsWith(`${publicRoot}${path.sep}`) && destinationDir !== publicRoot) fail('Asset destination must remain inside public/.'); mkdirSync(destinationDir, { recursive: true }); const destination = path.join(destinationDir, path.basename(source)); if (existsSync(destination)) fail(`Refusing to overwrite public/${path.relative(publicRoot, destination)}.`); cpSync(source, destination); info(`Copied to public/${path.relative(publicRoot, destination)}`); }
function commandDoctor() { project(); const config = readConfig(); const checks = [ ['Node.js 20+', Number(process.versions.node.split('.')[0]) >= 20], ['Git repository', spawnSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: root, encoding: 'utf8' }).status === 0], ['Git remote origin', spawnSync('git', ['remote', 'get-url', 'origin'], { cwd: root, encoding: 'utf8' }).status === 0], ['Configured avatar exists', !config.profile?.avatar || existsSync(path.join(root, 'public', config.profile.avatar))], ['Configured hero image exists', !config.profile?.heroImage || existsSync(path.join(root, 'public', config.profile.heroImage))], ['Configured background exists', !config.appearance?.background || existsSync(path.join(root, 'public', config.appearance.background))] ]; let bad = false; for (const [label, ok] of checks) { console.log(`${ok ? '✓' : '✗'} ${label}`); bad ||= !ok; } if (bad) process.exit(1); }
function commandDeploy(args) { const { flags } = parseArgs(args); run('npm', ['run', 'build']); if (!flag(flags, 'no-test', false)) run('npm', ['test']); const status = spawnSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }); if (status.status !== 0) fail('Git is not available. Run wblog doctor for details.'); if (!status.stdout.trim()) { info('Nothing to deploy; working tree is clean.'); return; } run('git', ['add', '.']); run('git', ['commit', '-m', String(flag(flags, 'message', 'content: update wblog site'))]); run('git', ['push', 'origin', 'main']); info('Pushed to GitHub. GitHub Pages will publish after the workflow completes.'); }

const [command = 'help', ...rest] = process.argv.slice(2);
if (command === 'help' || command === '--help' || command === '-h') { console.log(rest[0] ? helpByCommand[rest[0]] || usage : usage); }
else if (command === 'config' && rest[0] === 'wizard') await commandSetup();
else if (command === 'config') commandConfig(rest);
else if (command === 'setup') await commandSetup();
else if (command === 'post') commandPost(rest);
else if (command === 'life') commandLife(rest);
else if (command === 'gallery') commandGallery(rest);
else if (command === 'asset') commandAsset(rest);
else if (command === 'build') run('npm', ['run', 'build']);
else if (command === 'preview') { run('npm', ['run', 'build']); run('npm', ['run', 'preview']); }
else if (command === 'test') run('npm', ['test']);
else if (command === 'status') { run('git', ['status', '--short', '--branch']); const config = readConfig(); console.log(`\nSite: ${config.site?.url || 'not configured'}${config.site?.base || ''}`); }
else if (command === 'doctor') commandDoctor();
else if (command === 'deploy') commandDeploy(rest);
else fail(`Unknown command: ${command}`);
