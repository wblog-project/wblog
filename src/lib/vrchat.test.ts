import { describe, expect, it } from 'vitest';
import { testing } from '../../bin/vrchat.mjs';
import { vrchatSnapshotSchema } from './vrchat';

const snapshot = {
  schemaVersion: 1,
  syncedAt: '2026-08-31T03:00:00.000Z',
  profile: {
    id: 'usr_f263e7c7-44d8-416a-855d-65839b1cfd32',
    displayName: 'REXWind',
    bio: 'VRChat player',
    status: 'active',
    statusDescription: 'Exploring worlds',
    friendCount: 42,
    image: 'generated/vrchat/profile.jpg',
  },
  recentWorlds: [{
    id: 'wrld_ba913a96-fac4-4048-a062-9aa5db092812',
    name: 'A quiet world',
    description: 'A place to relax.',
    image: 'generated/vrchat/world-wrld_ba913a96.jpg',
    visits: 1200,
    favorites: 80,
    capacity: 24,
    href: 'https://vrchat.com/home/world/wrld_ba913a96-fac4-4048-a062-9aa5db092812',
  }],
};

describe('VRChat public snapshot', () => {
  it('accepts the versioned public data contract', () => {
    expect(vrchatSnapshotSchema.parse(snapshot).profile.friendCount).toBe(42);
  });

  it('rejects accidental private fields', () => {
    const unsafe = structuredClone(snapshot);
    Object.assign(unsafe.profile, { email: 'private@example.com', friends: ['usr_private'], location: 'wrld_private:1' });
    expect(vrchatSnapshotSchema.safeParse(unsafe).success).toBe(false);
  });
});

describe('VRChat API response validation', () => {
  it('turns the SDK missing-credentials payload into an actionable login error', () => {
    const response = { error: { message: 'Missing Credentials', status_code: 200 } };

    expect(() => testing.requireCurrentUser(response)).toThrow('vrchat login');
    expect(() => testing.requireRecentWorlds(response)).toThrow('vrchat login');
  });

  it('rejects malformed recent-world responses before the SDK can map them', () => {
    expect(() => testing.requireRecentWorlds({ worlds: [] })).toThrow('invalid recent-worlds response');
    expect(testing.requireRecentWorlds([{ id: 'wrld_test' }])).toEqual([{ id: 'wrld_test' }]);
  });
});
