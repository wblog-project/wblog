import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { readSiteConfig } from './src/lib/site-config.ts';

const config = readSiteConfig();

export default defineConfig({
  site: config.site.url,
  base: config.site.base || undefined,
  integrations: [sitemap()],
  markdown: { shikiConfig: { theme: 'github-dark' } },
});
