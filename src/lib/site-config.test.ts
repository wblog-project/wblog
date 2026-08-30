import { describe, expect, it } from 'vitest';
import { readSiteConfig, withBase } from './site-config';

describe('site configuration', () => {
  it('loads the example configuration', () => {
    expect(readSiteConfig().profile.name).toBe('Boru');
  });
  it('prefixes links with the configured GitHub Pages project base', () => {
    expect(withBase('/blog')).toBe('/wblog/blog');
  });
});
