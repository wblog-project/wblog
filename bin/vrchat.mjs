import { chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import prompts from 'prompts';
import { KeyvFile } from 'keyv-file';
import { VRChat } from 'vrchat';
import { parse, stringify } from 'yaml';
import { updateBuildReport } from './build-report.mjs';

const snapshotVersion = 1;
const imageLimit = 12 * 1024 * 1024;

function pathsFor(root, siteRoot) {
  const stateRoot = path.join(siteRoot, '.wblog', 'vrchat');
  return {
    config: path.join(siteRoot, 'config.yml'),
    stateRoot,
    session: path.join(stateRoot, 'session.json'),
    snapshot: path.join(stateRoot, 'snapshot.json'),
    imagesRoot: path.join(siteRoot, 'images'),
    generatedImages: path.join(siteRoot, 'images', 'generated', 'vrchat'),
    package: path.join(root, 'package.json'),
  };
}

function readConfig(file) {
  return parse(readFileSync(file, 'utf8'));
}

function applicationFor(root, config) {
  const packageJson = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
  return { name: packageJson.name || 'wblog', version: packageJson.version || '0.0.0', contact: config.profile.contactEmail };
}

function hasSnapshot(file) {
  try {
    const snapshot = JSON.parse(readFileSync(file, 'utf8'));
    return snapshot?.schemaVersion === snapshotVersion;
  } catch {
    return false;
  }
}

function ensurePrivateDirectory(directory) {
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  chmodSync(directory, 0o700);
}

function sessionStore(file) {
  ensurePrivateDirectory(path.dirname(file));
  return new KeyvFile({ filename: file, writeDelay: 0 });
}

function createClient(root, config, sessionFile) {
  const store = sessionStore(sessionFile);
  const client = new VRChat({
    application: applicationFor(root, config),
    keyv: store,
  });
  return { client, store };
}

function imageExtension(contentType) {
  const type = contentType.split(';')[0].trim().toLowerCase();
  return ({ 'image/avif': '.avif', 'image/gif': '.gif', 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' })[type];
}

async function downloadImage(url, basename, generatedImages, userAgent) {
  if (!url) return '';
  let parsed;
  try { parsed = new URL(url); } catch { return ''; }
  if (parsed.protocol !== 'https:') return '';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(parsed, { headers: { 'User-Agent': userAgent }, signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const extension = imageExtension(response.headers.get('content-type') || '');
    if (!extension) throw new Error('response is not a supported image');
    const declaredSize = Number(response.headers.get('content-length') || 0);
    if (declaredSize > imageLimit) throw new Error('image is larger than 12 MB');
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > imageLimit) throw new Error('image is larger than 12 MB');
    mkdirSync(generatedImages, { recursive: true });
    const filename = `${basename}${extension}`;
    const destination = path.join(generatedImages, filename);
    const temporary = `${destination}.tmp`;
    writeFileSync(temporary, bytes, { mode: 0o600 });
    renameSync(temporary, destination);
    return `generated/vrchat/${filename}`;
  } finally {
    clearTimeout(timer);
  }
}

function previousImage(snapshotFile, kind, id = '') {
  try {
    const previous = JSON.parse(readFileSync(snapshotFile, 'utf8'));
    if (kind === 'profile') return previous.profile?.image || '';
    return previous.recentWorlds?.find((world) => world.id === id)?.image || '';
  } catch {
    return '';
  }
}

async function withImageFallback(url, basename, stagingImages, paths, userAgent, previousKind, previousId = '') {
  try {
    return await downloadImage(url, basename, stagingImages, userAgent);
  } catch (error) {
    const oldImage = previousImage(paths.snapshot, previousKind, previousId);
    const oldFile = oldImage ? path.join(paths.imagesRoot, oldImage) : '';
    if (oldFile && existsSync(oldFile)) {
      mkdirSync(stagingImages, { recursive: true });
      copyFileSync(oldFile, path.join(stagingImages, path.basename(oldImage)));
      return oldImage;
    }
    console.warn(`Warning: VRChat image ${basename} was skipped: ${error instanceof Error ? error.message : String(error)}`);
    return '';
  }
}

async function retryAfterRateLimit(action) {
  try {
    return await action();
  } catch (error) {
    if (error?.statusCode !== 429) throw error;
    const retryHeader = error?.response?.headers?.get?.('retry-after');
    const seconds = Math.min(Math.max(Number(retryHeader) || 1, 1), 15);
    await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
    return action();
  }
}

function apiErrorMessage(data) {
  return typeof data?.error?.message === 'string' ? data.error.message.trim() : '';
}

function requireCurrentUser(data) {
  if (data?.id) return data;
  const detail = apiErrorMessage(data);
  if (/missing credentials/i.test(detail)) {
    throw new Error('VRChat session expired or is no longer valid. Run `npm run wblog -- vrchat login` again.');
  }
  throw new Error(`VRChat did not return a current user${detail ? `: ${detail}` : '.'}`);
}

function requireRecentWorlds(data) {
  if (Array.isArray(data)) return data;
  const detail = apiErrorMessage(data);
  if (/missing credentials/i.test(detail)) {
    throw new Error('VRChat session expired or is no longer valid. Run `npm run wblog -- vrchat login` again.');
  }
  throw new Error(`VRChat returned an invalid recent-worlds response${detail ? `: ${detail}` : '.'}`);
}

async function createSnapshot(client, root, config, paths, stagingImages) {
  const currentUserResponse = await retryAfterRateLimit(() => client.getCurrentUser({ throwOnError: true, responseTransformer: undefined }));
  const user = requireCurrentUser(currentUserResponse.data);
  // VRChat.js 2.22.8 transforms this endpoint with an unconditional data.map().
  // Validate the raw response ourselves so an expired session reports its real error.
  const recentWorldsResponse = await retryAfterRateLimit(() => client.getRecentWorlds({ query: { n: config.integrations.vrchat.maxRecentWorlds }, throwOnError: true, responseTransformer: undefined }));
  const worlds = requireRecentWorlds(recentWorldsResponse.data);
  const application = applicationFor(root, config);
  const userAgent = `${application.name}/${application.version} (${application.contact})`;
  const profileSource = user.userIcon || user.profilePicOverride || user.currentAvatarImageUrl || '';
  const profileImage = await withImageFallback(profileSource, 'profile', stagingImages, paths, userAgent, 'profile');
  const recentWorlds = [];
  for (const world of worlds.slice(0, config.integrations.vrchat.maxRecentWorlds)) {
    const image = await withImageFallback(world.imageUrl || world.thumbnailImageUrl || '', `world-${world.id.replace(/[^a-z0-9_-]/gi, '')}`, stagingImages, paths, userAgent, 'world', world.id);
    recentWorlds.push({
      id: world.id,
      name: world.name,
      description: String(world.description || '').slice(0, 280),
      image,
      visits: Number(world.visits || 0),
      favorites: Number(world.favorites || 0),
      capacity: Number(world.recommendedCapacity || world.capacity || 0),
      href: `https://vrchat.com/home/world/${encodeURIComponent(world.id)}`,
    });
  }
  return {
    schemaVersion: snapshotVersion,
    syncedAt: new Date().toISOString(),
    profile: {
      id: user.id,
      displayName: user.displayName,
      bio: String(user.bio || '').slice(0, 500),
      status: String(user.status || ''),
      statusDescription: String(user.statusDescription || '').slice(0, 280),
      friendCount: Array.isArray(user.friends) ? user.friends.length : 0,
      image: profileImage,
    },
    recentWorlds,
  };
}

function recoverAssetTransactions(paths) {
  ensurePrivateDirectory(paths.stateRoot);
  const entries = readdirSync(paths.stateRoot, { withFileTypes: true });
  const backups = entries.filter((entry) => entry.isDirectory() && entry.name.startsWith('assets-backup-')).map((entry) => path.join(paths.stateRoot, entry.name));
  const nextSnapshot = `${paths.snapshot}.next`;
  if (existsSync(nextSnapshot)) {
    rmSync(paths.generatedImages, { recursive: true, force: true });
    const backup = backups.shift();
    if (backup) {
      mkdirSync(path.dirname(paths.generatedImages), { recursive: true });
      renameSync(backup, paths.generatedImages);
    }
    rmSync(nextSnapshot, { force: true });
  } else if (!existsSync(paths.generatedImages)) {
    const backup = backups.shift();
    if (backup) {
      mkdirSync(path.dirname(paths.generatedImages), { recursive: true });
      renameSync(backup, paths.generatedImages);
    }
  }
  for (const backup of backups) rmSync(backup, { recursive: true, force: true });
  for (const entry of entries) if (entry.isDirectory() && entry.name.startsWith('assets-staging-')) rmSync(path.join(paths.stateRoot, entry.name), { recursive: true, force: true });
}

function commitSnapshot(paths, stagingImages, snapshot) {
  ensurePrivateDirectory(paths.stateRoot);
  mkdirSync(path.dirname(paths.generatedImages), { recursive: true });
  const nextSnapshot = `${paths.snapshot}.next`;
  const backup = path.join(paths.stateRoot, `assets-backup-${Date.now()}`);
  writeFileSync(nextSnapshot, `${JSON.stringify(snapshot, null, 2)}\n`, { mode: 0o600 });
  let movedOld = false;
  let movedNew = false;
  try {
    if (existsSync(paths.generatedImages)) {
      renameSync(paths.generatedImages, backup);
      movedOld = true;
    }
    renameSync(stagingImages, paths.generatedImages);
    movedNew = true;
    chmodSync(paths.generatedImages, 0o700);
    renameSync(nextSnapshot, paths.snapshot);
    chmodSync(paths.snapshot, 0o600);
    if (movedOld) rmSync(backup, { recursive: true, force: true });
  } catch (error) {
    if (movedNew) rmSync(paths.generatedImages, { recursive: true, force: true });
    if (movedOld && existsSync(backup)) renameSync(backup, paths.generatedImages);
    rmSync(nextSnapshot, { force: true });
    throw error;
  }
}

function syncSkipReason(environment = process.env) {
  if (environment.WBLOG_OFFLINE === '1') return 'offline';
  if (environment.WBLOG_SKIP_VRCHAT_SYNC === '1') return 'explicitly skipped';
  return undefined;
}

async function disconnectWithTimeout(store, timeoutMs = 1000) {
  if (!store) return;
  let timer;
  try {
    await Promise.race([
      store.disconnect(),
      new Promise((resolve) => { timer = setTimeout(resolve, timeoutMs); }),
    ]);
  } catch {
    // Synchronization has already completed or fallen back; cleanup must not block the build.
  } finally {
    clearTimeout(timer);
  }
}

async function sync(root, siteRoot, { buildHook = false, client: suppliedClient } = {}) {
  const paths = pathsFor(root, siteRoot);
  const config = readConfig(paths.config);
  if (!config.integrations?.vrchat?.enabled) {
    updateBuildReport('VRChat', 'disabled');
    return { skipped: true, reason: 'disabled' };
  }
  const skipReason = syncSkipReason();
  if (skipReason) {
    updateBuildReport('VRChat', hasSnapshot(paths.snapshot) ? 'snapshot' : 'unavailable', skipReason);
    return { skipped: true, reason: skipReason };
  }
  if (!suppliedClient && !existsSync(paths.session)) {
    if (hasSnapshot(paths.snapshot)) {
      console.warn('Warning: VRChat session is missing; using the last saved snapshot.');
      updateBuildReport('VRChat', 'snapshot', 'session missing');
      return { stale: true };
    }
    throw new Error('VRChat is enabled but has no session or snapshot. Run `npm run wblog -- vrchat login`.');
  }
  recoverAssetTransactions(paths);
  const stagingImages = mkdtempSync(path.join(paths.stateRoot, 'assets-staging-'));
  chmodSync(stagingImages, 0o700);
  let connection;
  try {
    connection = suppliedClient ? undefined : createClient(root, config, paths.session);
    const client = suppliedClient || connection.client;
    const snapshot = await createSnapshot(client, root, config, paths, stagingImages);
    commitSnapshot(paths, stagingImages, snapshot);
    updateBuildReport('VRChat', 'live', `${snapshot.recentWorlds.length} recent worlds`);
    if (existsSync(paths.session)) chmodSync(paths.session, 0o600);
    if (!buildHook) console.log(`✓ Synced VRChat profile and ${snapshot.recentWorlds.length} recent world(s).`);
    return { snapshot };
  } catch (error) {
    rmSync(stagingImages, { recursive: true, force: true });
    if (hasSnapshot(paths.snapshot)) {
      console.warn(`Warning: VRChat sync failed; using the last saved snapshot. ${error instanceof Error ? error.message : String(error)}`);
      updateBuildReport('VRChat', 'snapshot', 'live sync failed');
      return { stale: true };
    }
    throw error;
  } finally {
    try {
      await disconnectWithTimeout(connection?.store);
    } catch {
      // The snapshot commit is already durable; a cookie-store shutdown error must not invalidate it.
    }
  }
}

async function login(root, siteRoot) {
  if (!process.stdin.isTTY) throw new Error('`vrchat login` requires an interactive terminal.');
  const paths = pathsFor(root, siteRoot);
  const config = readConfig(paths.config);
  const answers = await prompts([
    { name: 'username', type: 'text', message: 'VRChat username' },
    { name: 'password', type: 'password', message: 'VRChat password' },
  ], { onCancel: () => { throw new Error('VRChat login cancelled.'); } });
  if (!answers.username || !answers.password) throw new Error('VRChat username and password are required.');
  const { client, store } = createClient(root, config, paths.session);
  const { data: user } = await client.login({
    username: answers.username,
    password: answers.password,
    twoFactorCode: async () => {
      const { code } = await prompts({ name: 'code', type: 'password', message: 'VRChat 2FA or recovery code' });
      if (!code) throw new Error('A VRChat 2FA code is required.');
      return code;
    },
    throwOnError: true,
  });
  if (!user?.id) throw new Error('VRChat login did not return a current user.');
  config.integrations ||= {};
  config.integrations.vrchat = { enabled: true, maxRecentWorlds: config.integrations.vrchat?.maxRecentWorlds || 6 };
  writeFileSync(paths.config, `# wblog site configuration\n# Everything you own lives in site/. Image paths are relative to site/images/.\n\n${stringify(config)}`, 'utf8');
  await sync(root, siteRoot, { client });
  await store.disconnect();
  if (existsSync(paths.session)) chmodSync(paths.session, 0o600);
  console.log(`✓ Logged in to VRChat as ${user.displayName}. Credentials were not saved.`);
}

function status(root, siteRoot) {
  const paths = pathsFor(root, siteRoot);
  let snapshot;
  try { snapshot = JSON.parse(readFileSync(paths.snapshot, 'utf8')); } catch { snapshot = undefined; }
  console.log(`Session: ${existsSync(paths.session) ? 'saved locally' : 'not found'}`);
  console.log(`Snapshot: ${snapshot ? `${snapshot.syncedAt} (${snapshot.recentWorlds?.length || 0} recent worlds)` : 'not found'}`);
}

function logout(root, siteRoot) {
  const paths = pathsFor(root, siteRoot);
  rmSync(paths.session, { force: true });
  rmSync(`${paths.session}.lock`, { force: true });
  console.log('✓ Removed the local VRChat session. The public snapshot was kept.');
}

export async function commandVrchat(root, siteRoot, args) {
  const [action, ...rest] = args;
  const templateMode = path.resolve(siteRoot) === path.resolve(root, 'template');
  if (templateMode && action !== 'status' && !(action === 'sync' && rest.includes('--build-hook'))) throw new Error('VRChat account commands are disabled for the public template. Use the private site/ directory.');
  if (action === 'login') return login(root, siteRoot);
  if (action === 'sync') return sync(root, siteRoot, { buildHook: rest.includes('--build-hook') });
  if (action === 'status') return status(root, siteRoot);
  if (action === 'logout') return logout(root, siteRoot);
  throw new Error('Use: vrchat login | sync | status | logout');
}

export const testing = { commitSnapshot, disconnectWithTimeout, imageExtension, pathsFor, recoverAssetTransactions, requireCurrentUser, requireRecentWorlds, retryAfterRateLimit, syncSkipReason };
