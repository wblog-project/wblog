import { z } from 'zod';
import { formatDate, formatNumber } from './i18n';
import { siteConfig } from './site-config';

export type ActivityCard = {
  type: string;
  title: string;
  subtitle: string;
  metric: string;
  href: string;
  image: string;
};

const githubRepoSchema = z.object({
  name: z.string(), description: z.string().nullable(), fork: z.boolean(), stargazers_count: z.number(),
  updated_at: z.string(), html_url: z.url(),
});
const steamSchema = z.object({ response: z.object({ games: z.array(z.object({
  name: z.string(), appid: z.number(), playtime_forever: z.number().optional(), img_logo_url: z.string().optional(),
})).optional() }) });
const bilibiliSchema = z.object({ data: z.object({ list: z.object({ vlist: z.array(z.object({
  title: z.string().optional(), description: z.string().optional(), play: z.union([z.string(), z.number()]).optional(),
  created: z.number().optional(), bvid: z.string().optional(), pic: z.string().optional(),
})) }) }).optional() });

async function fetchJson(url: string, init?: RequestInit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function githubActivities(): Promise<ActivityCard[]> {
  const { enabled, username, maxRepos } = siteConfig.integrations.github;
  if (!enabled || !username) return [];
  const token = import.meta.env.GITHUB_TOKEN || process.env.GITHUB_TOKEN;
  const data = await fetchJson(`https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=${maxRepos * 2}`, {
    headers: { Accept: 'application/vnd.github+json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  return z.array(githubRepoSchema).parse(data).filter((repo) => !repo.fork).slice(0, maxRepos).map((repo) => ({
    type: 'github', title: repo.name, subtitle: repo.description || 'Open source project',
    metric: `${formatNumber(repo.stargazers_count)} stars · ${formatDate(new Date(repo.updated_at), { month: 'short', day: 'numeric' })}`,
    href: repo.html_url, image: '',
  }));
}

async function steamActivities(): Promise<ActivityCard[]> {
  const { enabled, steamId } = siteConfig.integrations.steam;
  const key = import.meta.env.STEAM_API_KEY || process.env.STEAM_API_KEY;
  if (!enabled || !steamId || !key) return [];
  const data = steamSchema.parse(await fetchJson(`https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v0001/?key=${encodeURIComponent(key)}&steamid=${encodeURIComponent(steamId)}&format=json`));
  return (data.response.games || []).slice(0, 3).map((game) => ({
    type: 'steam', title: game.name, subtitle: 'Recently played on Steam',
    metric: `${formatNumber(Math.round((game.playtime_forever || 0) / 60))}h total playtime`,
    href: `https://store.steampowered.com/app/${game.appid}/`,
    image: game.img_logo_url ? `https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/${game.appid}/${game.img_logo_url}.jpg` : '',
  }));
}

export function mapBilibiliActivities(input: unknown, mid: string): ActivityCard[] {
  const data = bilibiliSchema.parse(input);
  return (data.data?.list.vlist || []).map((video) => ({
    type: 'bilibili', title: video.title || 'New Bilibili video', subtitle: video.description || 'Latest upload on Bilibili',
    metric: `${formatNumber(Number(video.play || 0))} plays${video.created ? ` · ${formatDate(new Date(video.created * 1000), { month: 'short', day: 'numeric' })}` : ''}`,
    href: video.bvid ? `https://www.bilibili.com/video/${video.bvid}/` : `https://space.bilibili.com/${mid}`,
    image: video.pic?.replace(/^http:/, 'https:') || '',
  }));
}

async function bilibiliActivities(): Promise<ActivityCard[]> {
  const { enabled, mid, maxVideos } = siteConfig.integrations.bilibili;
  if (!enabled || !mid) return [];
  const data = await fetchJson(`https://api.bilibili.com/x/space/arc/search?mid=${encodeURIComponent(mid)}&pn=1&ps=${maxVideos}&order=pubdate&jsonp=jsonp`);
  return mapBilibiliActivities(data, mid);
}

export async function getActivities(): Promise<ActivityCard[]> {
  const providers = [
    { type: 'github', enabled: siteConfig.integrations.github.enabled, load: githubActivities },
    { type: 'steam', enabled: siteConfig.integrations.steam.enabled, load: steamActivities },
    { type: 'bilibili', enabled: siteConfig.integrations.bilibili.enabled, load: bilibiliActivities },
  ];
  const results = process.env.WBLOG_OFFLINE === '1'
    ? providers.map(() => ({ status: 'fulfilled', value: [] }) as PromiseFulfilledResult<ActivityCard[]>)
    : await Promise.allSettled(providers.map((provider) => provider.load()));
  const cards: ActivityCard[] = [];
  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value.length) cards.push(...result.value);
    else if (providers[index].enabled) cards.push(...siteConfig.integrations.fallbackActivities.filter((card) => card.type === providers[index].type));
  });
  const fillers = siteConfig.integrations.fallbackActivities.filter((fallback) => !cards.some((card) => card.href === fallback.href));
  return [...cards, ...fillers].filter((card, index, all) => all.findIndex((other) => other.href === card.href) === index).slice(0, 9);
}
