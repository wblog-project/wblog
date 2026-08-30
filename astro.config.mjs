import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { deployedSiteBase, deployedSiteUrl } from './src/lib/site-config.ts';

export default defineConfig({
  site: deployedSiteUrl,
  base: deployedSiteBase || undefined,
  integrations: [sitemap()],
  markdown: { shikiConfig: { theme: 'github-dark' } },
});
