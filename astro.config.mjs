import path from 'node:path';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { deployedSiteBase, deployedSiteUrl, siteDirectory } from './src/lib/site-config.ts';

export default defineConfig({
  site: deployedSiteUrl,
  base: deployedSiteBase || undefined,
  integrations: [sitemap()],
  compressHTML: true,
  markdown: { shikiConfig: { theme: 'github-dark' } },
  vite: { resolve: { alias: { '@site': path.resolve(process.cwd(), siteDirectory) } } },
});
