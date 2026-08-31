import { bilibiliProvider, mapBilibiliActivities, signBilibiliParams } from './activity-providers/bilibili';
import { githubProvider } from './activity-providers/github';
import { steamProvider } from './activity-providers/steam';
import type { ActivityCard, ActivityProvider } from './activity-providers/types';
import { activitySnapshotStore, type ActivitySnapshotStore } from './activity-snapshots';
import { siteConfig } from './site-config';
import { updateBuildReport } from '../../bin/build-report.mjs';

export type { ActivityCard, ActivityProvider } from './activity-providers/types';
export { mapBilibiliActivities, signBilibiliParams };

export const activityProviders: ActivityProvider[] = [githubProvider, steamProvider, bilibiliProvider];

export async function collectActivities(
  providers: ActivityProvider[],
  fallbacks: ActivityCard[],
  offline = process.env.WBLOG_OFFLINE === '1',
  snapshots?: ActivitySnapshotStore,
) {
  const activeProviders = providers.filter((provider) => provider.enabled());
  const results = offline
    ? activeProviders.map(() => ({ status: 'fulfilled', value: [] }) as PromiseFulfilledResult<ActivityCard[]>)
    : await Promise.allSettled(activeProviders.map((provider) => provider.load()));
  const cards = results.flatMap((result, index) => {
    const provider = activeProviders[index];
    const liveCards = result.status === 'fulfilled' ? result.value : [];
    const snapshotCards = liveCards.length ? [] : snapshots?.read(provider.type) || [];
    const fallbackCards = fallbacks.filter((card) => card.type === provider.type);
    if (liveCards.length) {
      snapshots?.write(provider.type, liveCards);
      updateBuildReport(provider.type, 'live', `${liveCards.length} items`);
      return liveCards;
    }
    if (snapshotCards.length) {
      updateBuildReport(provider.type, 'snapshot', `${snapshotCards.length} cached items`);
      return snapshotCards;
    }
    if (fallbackCards.length) {
      updateBuildReport(provider.type, 'fallback', `${fallbackCards.length} configured items`);
      return fallbackCards;
    }
    updateBuildReport(provider.type, 'unavailable', offline ? 'offline build; no snapshot' : 'no snapshot or fallback');
    return [];
  });
  const providerTypes = new Set(providers.map((provider) => provider.type));
  const fillers = fallbacks.filter((fallback) => !providerTypes.has(fallback.type));
  return [...cards, ...fillers]
    .filter((card, index, all) => all.findIndex((other) => other.href === card.href) === index)
    .slice(0, 9);
}

export function groupActivitiesByType(cards: ActivityCard[]) {
  return Map.groupBy(cards, (card) => card.type);
}

export function getActivities() {
  return collectActivities(activityProviders, siteConfig.integrations.fallbackActivities, process.env.WBLOG_OFFLINE === '1', activitySnapshotStore);
}
