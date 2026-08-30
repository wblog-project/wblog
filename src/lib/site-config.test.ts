import { describe, expect, it } from 'vitest';
import { readSiteConfig, withBase } from './site-config';

describe('site configuration', () => {
  it('loads the configured profile', () => {
    const config = readSiteConfig();
    expect(config.profile.name).toBeTruthy();
    expect(config.profile.contactEmail).toContain('@');
    expect(config.site.locale).toMatch(/^(en|zh-CN)$/);
  });
  it('prefixes links with the configured GitHub Pages project base', () => {
    const base = readSiteConfig().site.base.replace(/\/$/, '');
    expect(withBase('/blog')).toBe(`${base}/blog`);
  });
  it('does not prefix an already based path twice', () => {
    const base = readSiteConfig().site.base.replace(/\/$/, '');
    expect(withBase(`${base}/blog`)).toBe(`${base}/blog`);
  });
});
