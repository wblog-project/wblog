import { describe, expect, it, vi } from 'vitest';
import { getActivities, mapBilibiliActivities } from './activities';

describe('activity fallback', () => {
  it('uses configured cards when providers fail', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const cards = await getActivities();
    expect(cards.length).toBeGreaterThan(0);
    vi.unstubAllGlobals();
  });

  it('turns public Bilibili uploads into image activity cards', () => {
    const [video] = mapBilibiliActivities(
      { data: { list: { vlist: [{ title: 'New world tour', description: 'VRChat clips', play: 1280, created: 1_700_000_000, bvid: 'BV1xx', pic: 'http://i0.hdslb.com/cover.jpg' }] } } },
      '123456',
    );
    expect(video).toMatchObject({ title: 'New world tour', href: 'https://www.bilibili.com/video/BV1xx/', image: 'https://i0.hdslb.com/cover.jpg' });
  });
});
