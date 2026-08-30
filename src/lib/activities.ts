import { siteConfig } from './site-config';

export type ActivityCard = {
  type: 'github' | 'steam' | string;
  title: string;
  subtitle: string;
  metric: string;
  href: string;
  image: string;
};

const fetchJson = async (url: string, init?: RequestInit) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7000);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  } finally { clearTimeout(timer); }
};

async function githubActivities(): Promise<ActivityCard[]> {
  const { username, maxRepos } = siteConfig.integrations.github;
  if (!siteConfig.integrations.github.enabled || !username) return [];
  const token = import.meta.env.GITHUB_TOKEN || process.env.GITHUB_TOKEN;
  const repos = await fetchJson(`https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=${maxRepos}`, {
    headers: { Accept: 'application/vnd.github+json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!Array.isArray(repos)) return [];
  return repos.filter((repo) => !repo.fork).map((repo) => ({
    type: 'github', title: repo.name, subtitle: repo.description || 'Open source project',
    metric: `${repo.stargazers_count || 0} stars · updated ${new Date(repo.updated_at).toLocaleDateString()}`,
    href: repo.html_url, image: '',
  }));
}

async function steamActivities(): Promise<ActivityCard[]> {
  const { enabled, steamId } = siteConfig.integrations.steam;
  const key = import.meta.env.STEAM_API_KEY || process.env.STEAM_API_KEY;
  if (!enabled || !steamId || !key) return [];
  const url = `https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v0001/?key=${encodeURIComponent(key)}&steamid=${encodeURIComponent(steamId)}&format=json`;
  const data = await fetchJson(url);
  const games = data?.response?.games;
  if (!Array.isArray(games)) return [];
  return games.slice(0, 3).map((game) => ({
    type: 'steam', title: game.name, subtitle: 'Recently played on Steam',
    metric: `${Math.round((game.playtime_forever || 0) / 60)}h total playtime`,
    href: `https://store.steampowered.com/app/${game.appid}/`,
    image: game.img_logo_url ? `https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/${game.appid}/${game.img_logo_url}.jpg` : '',
  }));
}

export async function getActivities(): Promise<ActivityCard[]> {
  const results = await Promise.allSettled([githubActivities(), steamActivities()]);
  const cards = results.flatMap((result) => result.status === 'fulfilled' ? result.value : []);
  return cards.length ? cards : siteConfig.integrations.fallbackActivities;
}
