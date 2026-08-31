import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { siteDirectory } from './site-config';

const worldSchema = z.object({
  id: z.string().startsWith('wrld_'),
  name: z.string().min(1),
  description: z.string(),
  image: z.string(),
  visits: z.number().int().nonnegative(),
  favorites: z.number().int().nonnegative(),
  capacity: z.number().int().nonnegative(),
  href: z.url(),
}).strict();

export const vrchatSnapshotSchema = z.object({
  schemaVersion: z.literal(1),
  syncedAt: z.iso.datetime(),
  profile: z.object({
    id: z.string().startsWith('usr_'),
    displayName: z.string().min(1),
    bio: z.string(),
    status: z.string(),
    statusDescription: z.string(),
    friendCount: z.number().int().nonnegative(),
    image: z.string(),
  }).strict(),
  recentWorlds: z.array(worldSchema).max(12),
}).strict();

export type VrchatSnapshot = z.infer<typeof vrchatSnapshotSchema>;

export function readVrchatSnapshot(): VrchatSnapshot | undefined {
  const snapshotPath = path.resolve(process.cwd(), siteDirectory, '.wblog', 'vrchat', 'snapshot.json');
  if (!fs.existsSync(snapshotPath)) return undefined;
  try {
    return vrchatSnapshotSchema.parse(JSON.parse(fs.readFileSync(snapshotPath, 'utf8')));
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid VRChat snapshot at ${snapshotPath}: ${detail}`);
  }
}
