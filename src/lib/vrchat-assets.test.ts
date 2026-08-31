import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { testing } from '../../bin/vrchat.mjs';

const created: string[] = [];

function fixture() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'wblog-vrchat-assets-'));
  created.push(root);
  const siteRoot = path.join(root, 'site');
  const paths = testing.pathsFor(root, siteRoot);
  mkdirSync(paths.stateRoot, { recursive: true });
  mkdirSync(paths.generatedImages, { recursive: true });
  return { root, paths };
}

afterEach(() => created.splice(0).forEach((directory) => rmSync(directory, { recursive: true, force: true })));

describe('VRChat generated image lifecycle', () => {
  it('replaces the generated directory as one clean snapshot', () => {
    const { paths } = fixture();
    writeFileSync(path.join(paths.generatedImages, 'old.png'), 'old');
    writeFileSync(path.join(paths.generatedImages, 'abandoned.tmp'), 'garbage');
    const staging = mkdtempSync(path.join(paths.stateRoot, 'assets-staging-'));
    writeFileSync(path.join(staging, 'new.png'), 'new');
    const snapshot = { schemaVersion: 1, profile: { image: 'generated/vrchat/new.png' }, recentWorlds: [] };

    testing.commitSnapshot(paths, staging, snapshot);

    expect(readdirSync(paths.generatedImages)).toEqual(['new.png']);
    expect(JSON.parse(readFileSync(paths.snapshot, 'utf8'))).toEqual(snapshot);
    expect(readdirSync(paths.stateRoot).some((name) => name.startsWith('assets-'))).toBe(false);
  });

  it('restores the previous images after an interrupted transaction', () => {
    const { paths } = fixture();
    writeFileSync(path.join(paths.generatedImages, 'incomplete.png'), 'incomplete');
    const backup = path.join(paths.stateRoot, 'assets-backup-test');
    mkdirSync(backup);
    writeFileSync(path.join(backup, 'previous.png'), 'previous');
    const staging = path.join(paths.stateRoot, 'assets-staging-test');
    mkdirSync(staging);
    writeFileSync(path.join(staging, 'garbage.tmp'), 'garbage');
    writeFileSync(`${paths.snapshot}.next`, '{}');

    testing.recoverAssetTransactions(paths);

    expect(readdirSync(paths.generatedImages)).toEqual(['previous.png']);
    expect(existsSync(`${paths.snapshot}.next`)).toBe(false);
    expect(existsSync(staging)).toBe(false);
  });

  it('restores an orphaned backup when the final directory is missing', () => {
    const { paths } = fixture();
    rmSync(paths.generatedImages, { recursive: true });
    const backup = path.join(paths.stateRoot, 'assets-backup-orphaned');
    mkdirSync(backup);
    writeFileSync(path.join(backup, 'previous.png'), 'previous');

    testing.recoverAssetTransactions(paths);

    expect(readdirSync(paths.generatedImages)).toEqual(['previous.png']);
    expect(existsSync(backup)).toBe(false);
  });
});
