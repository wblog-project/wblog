import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import type { ActivityCard } from './activity-providers/types';
import { siteDirectory } from './site-config';

const activityCardSchema = z.object({
  type: z.string(),
  label: z.string().optional(),
  icon: z.string().optional(),
  title: z.string(),
  subtitle: z.string(),
  metric: z.string(),
  href: z.url(),
  image: z.string(),
}).strict();

const activitySnapshotSchema = z.object({
  schemaVersion: z.literal(1),
  syncedAt: z.iso.datetime(),
  cards: z.array(activityCardSchema),
}).strict();

export type ActivitySnapshotStore = {
  read: (type: string) => ActivityCard[];
  write: (type: string, cards: ActivityCard[]) => void;
};

function snapshotPath(type: string) {
  if (!/^[a-z0-9-]+$/.test(type)) throw new Error(`Invalid activity provider type: ${type}`);
  return path.resolve(process.cwd(), siteDirectory, '.wblog', 'activities', `${type}.json`);
}

export const activitySnapshotStore: ActivitySnapshotStore = {
  read(type) {
    const file = snapshotPath(type);
    if (!fs.existsSync(file)) return [];
    try {
      return activitySnapshotSchema.parse(JSON.parse(fs.readFileSync(file, 'utf8'))).cards;
    } catch {
      return [];
    }
  },
  write(type, cards) {
    const file = snapshotPath(type);
    const temporaryFile = `${file}.next`;
    fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
    fs.writeFileSync(temporaryFile, `${JSON.stringify({ schemaVersion: 1, syncedAt: new Date().toISOString(), cards }, null, 2)}\n`, 'utf8');
    fs.renameSync(temporaryFile, file);
  },
};
