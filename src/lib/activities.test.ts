import { describe, expect, it, vi } from 'vitest';
import { getActivities } from './activities';

describe('activity fallback', () => {
  it('uses configured cards when providers fail', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const cards = await getActivities();
    expect(cards.length).toBeGreaterThan(0);
    vi.unstubAllGlobals();
  });
});
