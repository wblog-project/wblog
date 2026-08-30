import { describe, expect, it } from 'vitest';
import { readSiteConfig, withBase } from './site-config';

describe('site configuration', () => {
  it('loads the configured profile', () => {
    const config = readSiteConfig();
    expect(config.profile.name).toBeTruthy();
    expect(config.profile.contactEmail).toContain('@');
  });
  it('prefixes links with the configured GitHub Pages project base', () => {
    expect(withBase('/blog')).toBe('/wblog/blog');
  });
});
