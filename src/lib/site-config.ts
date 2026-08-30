import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import { z } from 'zod';

const activitySchema = z.object({
  type: z.string(), title: z.string(), subtitle: z.string(), metric: z.string(),
  href: z.string().url(), image: z.string(),
});

const configSchema = z.object({
  site: z.object({ title: z.string(), description: z.string(), url: z.string().url(), base: z.string().default(''), locale: z.string().default('en') }),
  profile: z.object({ name: z.string(), greeting: z.string(), bio: z.string(), avatar: z.string(), heroImage: z.string(), status: z.string(), contactEmail: z.string().email() }),
  appearance: z.object({ accent: z.string(), accentSoft: z.string(), background: z.string() }),
  navigation: z.array(z.object({ label: z.string(), href: z.string() })),
  socials: z.array(z.object({ name: z.string(), icon: z.string(), url: z.string().url() })),
  integrations: z.object({
    github: z.object({ enabled: z.boolean(), username: z.string(), maxRepos: z.number().int().min(1).max(12).default(3) }),
    steam: z.object({ enabled: z.boolean(), steamId: z.string() }),
    bilibili: z.object({ enabled: z.boolean(), mid: z.string(), maxVideos: z.number().int().min(1).max(6).default(3) }),
    fallbackActivities: z.array(activitySchema),
  }),
  home: z.object({
    modules: z.object({ activities: z.boolean(), dailyLife: z.boolean(), blog: z.boolean(), gallery: z.boolean(), music: z.boolean(), about: z.boolean() }),
    music: z.object({ title: z.string(), artist: z.string(), cover: z.string(), link: z.string().url() }),
    aboutTags: z.array(z.string()),
  }),
  footer: z.string(),
});

export type SiteConfig = z.infer<typeof configSchema>;
const configPath = path.resolve(process.cwd(), 'config.yml');

export function readSiteConfig(): SiteConfig {
  try {
    return configSchema.parse(parse(fs.readFileSync(configPath, 'utf8')));
  } catch (error) {
    throw new Error(`Invalid config.yml: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export const siteConfig = readSiteConfig();
export const deployedSiteUrl = process.env.WBLOG_SITE_URL || siteConfig.site.url;
export const deployedSiteBase = process.env.WBLOG_BASE ?? siteConfig.site.base;

export function withBase(pathname: string) {
  if (/^https?:\/\//.test(pathname)) return pathname;
  const base = deployedSiteBase.replace(/\/$/, '');
  return `${base}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
}

export function assetUrl(pathname: string) {
  return pathname ? withBase(pathname) : '';
}
