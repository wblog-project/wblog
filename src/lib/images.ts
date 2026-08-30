import type { ImageMetadata } from 'astro';

const imageModules = import.meta.glob<{ default: ImageMetadata }>('/site/images/**/*.{avif,gif,jpeg,jpg,png,webp}');

export async function resolveSiteImage(imagePath: string): Promise<ImageMetadata | undefined> {
  if (!imagePath) return undefined;
  const normalized = imagePath.replace(/^\/+/, '');
  const load = imageModules[`/site/images/${normalized}`];
  if (!load) throw new Error(`Image "${imagePath}" was not found under site/images/.`);
  return (await load()).default;
}

export function isRemoteImage(imagePath: string) {
  return /^https?:\/\//.test(imagePath);
}
