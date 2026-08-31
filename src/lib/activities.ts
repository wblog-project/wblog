import { bilibiliProvider, mapBilibiliActivities, signBilibiliParams } from './activity-providers/bilibili';
import { githubProvider } from './activity-providers/github';
import { steamProvider } from './activity-providers/steam';
import type { ActivityCard, ActivityProvider } from './activity-providers/types';
import { siteConfig } from './site-config';

export type { ActivityCard, ActivityProvider } from './activity-providers/types';
export { mapBilibiliActivities, signBilibiliParams };

export const activityProviders: ActivityProvider[] = [githubProvider, steamProvider, bilibiliProvider];

export async function collectActivities(
  providers: ActivityProvider[],
  fallbacks: ActivityCard[],
  offline = process.env.WBLOG_OFFLINE === '1',
) {
  const activeProviders = providers.filter((provider) => provider.enabled());
  const results = offline
    ? activeProviders.map(() => ({ status: 'fulfilled', value: [] }) as PromiseFulfilledResult<ActivityCard[]>)
    : await Promise.allSettled(activeProviders.map((provider) => provider.load()));
  const cards = results.flatMap((result, index) => (
    result.status === 'fulfilled' && result.value.length
      ? result.value
      : fallbacks.filter((card) => card.type === activeProviders[index].type)
  ));
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
  return collectActivities(activityProviders, siteConfig.integrations.fallbackActivities);
}
