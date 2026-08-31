import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import { z } from 'zod';

const hexColor = z.string().regex(/^#[0-9a-f]{6}$/i, 'Expected a six-digit hex color');
const siteImagePath = z.string().refine(
  (value) => value === '' || (!path.isAbsolute(value) && !value.split(/[\\/]/).includes('..')),
  'Image paths must be relative to site/images and may not contain ..',
);

const activitySchema = z.object({
  type: z.string().min(1),
  label: z.string().min(1).optional(),
  icon: z.string().min(1).optional(),
  title: z.string().min(1),
  subtitle: z.string(),
  metric: z.string(),
  href: z.url(),
  image: z.string(),
}).strict();

export const configSchema = z.object({
  site: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    url: z.url(),
    base: z.string().regex(/^(|\/[a-z0-9._~-]+)$/i, 'Use an empty base or /repository-name').default(''),
    locale: z.enum(['en', 'zh-CN']).default('en'),
    ogImage: siteImagePath.default(''),
    favicon: siteImagePath.default(''),
  }).strict(),
  profile: z.object({
    name: z.string().min(1),
    greeting: z.string().min(1),
    bio: z.string().min(1),
    avatar: siteImagePath,
    heroImage: siteImagePath,
    status: z.string().min(1),
    contactEmail: z.email(),
  }).strict(),
  appearance: z.object({ accent: hexColor, accentSoft: hexColor, background: siteImagePath }).strict(),
  navigation: z.array(z.object({ label: z.string().min(1), href: z.string().startsWith('/') }).strict()).min(1),
  socials: z.array(z.object({ name: z.string().min(1), icon: z.string().min(1), url: z.url() }).strict()),
  integrations: z.object({
    github: z.object({ enabled: z.boolean(), username: z.string(), maxRepos: z.number().int().min(1).max(12).default(3) }).strict(),
    steam: z.object({ enabled: z.boolean(), steamId: z.string().regex(/^(|\d{17})$/, 'Steam ID must be empty or 17 digits') }).strict(),
    bilibili: z.object({ enabled: z.boolean(), mid: z.string().regex(/^(|\d+)$/), maxVideos: z.number().int().min(1).max(6).default(3) }).strict(),
    vrchat: z.object({ enabled: z.boolean(), maxRecentWorlds: z.number().int().min(1).max(12).default(6) }).strict().default({ enabled: false, maxRecentWorlds: 6 }),
    fallbackActivities: z.array(activitySchema),
  }).strict(),
  home: z.object({
    modules: z.object({ vrchat: z.boolean().default(true), activities: z.boolean(), dailyLife: z.boolean(), blog: z.boolean(), gallery: z.boolean(), music: z.boolean(), about: z.boolean() }).strict(),
    music: z.object({ title: z.string().min(1), artist: z.string().min(1), cover: siteImagePath, link: z.url() }).strict(),
    aboutTags: z.array(z.string().min(1)),
  }).strict(),
  footer: z.string(),
  deployment: z.object({ githubPagesRepository: z.string() }).strict().default({ githubPagesRepository: '' }),
}).strict();

export type SiteConfig = z.infer<typeof configSchema>;
export const siteDirectory = process.env.WBLOG_SITE_DIR === 'template' ? 'template' : 'site';
export const configPath = path.resolve(process.cwd(), siteDirectory, 'config.yml');

export function readSiteConfig(): SiteConfig {
  try {
    return configSchema.parse(parse(fs.readFileSync(configPath, 'utf8')));
  } catch (error) {
    const detail = error instanceof z.ZodError ? z.prettifyError(error) : error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid ${siteDirectory}/config.yml:\n${detail}`);
  }
}

export const siteConfig = readSiteConfig();
export const deployedSiteUrl = process.env.WBLOG_SITE_URL || siteConfig.site.url;
export const deployedSiteBase = process.env.WBLOG_BASE ?? siteConfig.site.base;

export function withBase(pathname: string) {
  if (/^(https?:|mailto:|tel:)/.test(pathname)) return pathname;
  const base = deployedSiteBase.replace(/\/$/, '');
  const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`;
  if (base && (normalized === base || normalized.startsWith(`${base}/`))) return normalized;
  return `${base}${normalized}`;
}

export function absoluteUrl(pathname: string) {
  return new URL(withBase(pathname), deployedSiteUrl).toString();
}
