import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';

const created: string[] = [];
const cli = path.resolve('bin/wblog.mjs');

function fixture() {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'wblog-cli-'));
  created.push(directory);
  mkdirSync(path.join(directory, 'site'), { recursive: true });
  writeFileSync(path.join(directory, 'package.json'), '{"type":"module"}');
  writeFileSync(path.join(directory, 'site/config.yml'), 'site: {}\n');
  writeFileSync(path.join(directory, 'photo.png'), 'fixture');
  return directory;
}

afterEach(() => created.splice(0).forEach((directory) => rmSync(directory, { recursive: true, force: true })));

describe('portable content CLI', () => {
  it('creates a post and copies its cover only inside site/', () => {
    const directory = fixture();
    const result = spawnSync(process.execPath, [cli, 'post', 'new', 'Hello Site', '--cover', 'photo.png', '--cover-alt', 'A test cover'], { cwd: directory, encoding: 'utf8' });
    expect(result.status).toBe(0);
    const markdown = readFileSync(path.join(directory, 'site/content/posts/hello-site.md'), 'utf8');
    expect(markdown).toContain('cover: ../../images/posts/hello-site/photo.png');
    expect(markdown).toContain('coverAlt: A test cover');
  });

  it('rejects asset destinations outside site/images', () => {
    const directory = fixture();
    const result = spawnSync(process.execPath, [cli, 'asset', 'add', 'photo.png', '--to', '../../escape'], { cwd: directory, encoding: 'utf8' });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('must remain inside site/images');
  });
});
