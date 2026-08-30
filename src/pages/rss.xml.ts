import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { byNewest, entrySlug } from '../lib/content';
import { siteConfig, withBase } from '../lib/site-config';

export async function GET(context: { site?: URL }) {
  const posts = byNewest((await getCollection('posts')).filter((post) => !post.data.draft));
  return rss({
    title: siteConfig.site.title,
    description: siteConfig.site.description,
    site: context.site || siteConfig.site.url,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      link: withBase(`/blog/${entrySlug(post.id)}`),
      categories: post.data.tags,
    })),
  });
}
