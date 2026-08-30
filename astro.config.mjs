import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { deployedSiteBase, deployedSiteUrl } from './src/lib/site-config.ts';

// Markdown is rendered before Astro knows the final page route. Rewrite the
// documented /images/... convention so it also works on GitHub project Pages.
function prefixPublicMarkdownImages() {
  const prefix = deployedSiteBase.replace(/\/$/, '');
  const walk = (node) => {
    if (node?.type === 'element' && node.tagName === 'img' && typeof node.properties?.src === 'string' && node.properties.src.startsWith('/images/')) {
      node.properties.src = `${prefix}${node.properties.src}`;
    }
    if (Array.isArray(node?.children)) node.children.forEach(walk);
  };
  return (tree) => walk(tree);
}

export default defineConfig({
  site: deployedSiteUrl,
  base: deployedSiteBase || undefined,
  integrations: [sitemap()],
  markdown: { shikiConfig: { theme: 'github-dark' }, rehypePlugins: [prefixPublicMarkdownImages] },
});
