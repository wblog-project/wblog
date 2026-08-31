import type { ImageMetadata } from 'astro';

const privateImageModules = import.meta.glob<{ default: ImageMetadata }>('/site/images/**/*.{avif,gif,jpeg,jpg,png,webp}');
const templateImageModules = import.meta.glob<{ default: ImageMetadata }>('/template/images/**/*.{avif,gif,jpeg,jpg,png,webp}');
const siteDirectory = process.env.WBLOG_SITE_DIR === 'template' ? 'template' : 'site';
const imageModules = siteDirectory === 'template' ? templateImageModules : privateImageModules;

export async function resolveSiteImage(imagePath: string): Promise<ImageMetadata | undefined> {
  if (!imagePath) return undefined;
  const normalized = imagePath.replace(/^\/+/, '');
  const load = imageModules[`/${siteDirectory}/images/${normalized}`];
  if (!load) throw new Error(`Image "${imagePath}" was not found under ${siteDirectory}/images/.`);
  return (await load()).default;
}

export function isRemoteImage(imagePath: string) {
  return /^https?:\/\//.test(imagePath);
}
