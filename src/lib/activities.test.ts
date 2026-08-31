import { describe, expect, it, vi } from 'vitest';
import { collectActivities, getActivities, groupActivitiesByType, mapBilibiliActivities, signBilibiliParams } from './activities';

describe('activity fallback', () => {
  it('uses configured cards when providers fail', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const cards = await getActivities();
    expect(cards.length).toBeGreaterThan(0);
    vi.unstubAllGlobals();
  });

  it('isolates provider failures and keeps new platform cards without changing the aggregator', async () => {
    const fallback = { type: 'steam', title: 'Fallback game', subtitle: '', metric: '', href: 'https://example.com/fallback', image: '' };
    const neteaseCard = { type: 'netease', label: 'NetEase Music', icon: 'music', title: 'A song', subtitle: 'An artist', metric: 'Now playing', href: 'https://example.com/song', image: '' };
    const cards = await collectActivities([
      { type: 'steam', enabled: () => true, load: async () => { throw new Error('offline'); } },
      { type: 'netease', enabled: () => true, load: async () => [neteaseCard] },
      { type: 'disabled', enabled: () => false, load: async () => { throw new Error('must not run'); } },
    ], [fallback], false);

    expect(cards).toEqual([fallback, neteaseCard]);
    expect(groupActivitiesByType(cards).get('netease')).toEqual([neteaseCard]);
  });

  it('stores successful provider data and reuses its snapshot after a later failure', async () => {
    const saved = new Map();
    const snapshots = {
      read: (type: string) => saved.get(type) || [],
      write: (type: string, cards: unknown[]) => saved.set(type, cards),
    };
    const githubCard = { type: 'github', title: 'wblog', subtitle: 'Blog', metric: '1 star', href: 'https://github.com/example/wblog', image: '' };
    const live = await collectActivities(
      [{ type: 'github', enabled: () => true, load: async () => [githubCard] }],
      [],
      false,
      snapshots,
    );
    const cached = await collectActivities(
      [{ type: 'github', enabled: () => true, load: async () => { throw new Error('rate limited'); } }],
      [],
      false,
      snapshots,
    );

    expect(live).toEqual([githubCard]);
    expect(cached).toEqual([githubCard]);
  });

  it('turns public Bilibili uploads into image activity cards', () => {
    const [video] = mapBilibiliActivities(
      { data: { list: { vlist: [{ title: 'New world tour', description: 'VRChat clips', play: 1280, created: 1_700_000_000, bvid: 'BV1xx', pic: 'http://i0.hdslb.com/cover.jpg' }] } } },
      '123456',
    );
    expect(video).toMatchObject({ title: 'New world tour', href: 'https://www.bilibili.com/video/BV1xx/', image: 'https://i0.hdslb.com/cover.jpg' });
  });

  it('signs the WBI upload request required by the current Bilibili API', () => {
    const query = signBilibiliParams(
      { mid: '123456', pn: '1', ps: '3', order: 'pubdate' },
      'https://i0.hdslb.com/bfs/wbi/7cd084941338484aae1ad9425b84077c.png',
      'https://i0.hdslb.com/bfs/wbi/4932caff0ff746eab6f01bf08b70ac45.png',
      1_788_168_863,
    );
    expect(query).toContain('mid=123456&order=pubdate&pn=1&ps=3&wts=1788168863&w_rid=');
    expect(query.match(/w_rid=([a-f0-9]{32})$/)?.[1]).toHaveLength(32);
  });
});
