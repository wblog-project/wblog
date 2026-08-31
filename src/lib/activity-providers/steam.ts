import { z } from 'zod';
import { formatNumber } from '../i18n';
import { siteConfig } from '../site-config';
import { fetchJson } from './http';
import type { ActivityProvider } from './types';

const steamSchema = z.object({ response: z.object({ games: z.array(z.object({
  name: z.string(), appid: z.number(), playtime_forever: z.number().optional(), img_logo_url: z.string().optional(),
})).optional() }) });

async function loadSteamActivities() {
  const { steamId } = siteConfig.integrations.steam;
  const key = import.meta.env.STEAM_API_KEY || process.env.STEAM_API_KEY;
  if (!steamId || !key) return [];
  const data = steamSchema.parse(await fetchJson(`https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v0001/?key=${encodeURIComponent(key)}&steamid=${encodeURIComponent(steamId)}&format=json`));
  return (data.response.games || []).slice(0, 3).map((game) => ({
    type: 'steam', label: 'Steam', icon: 'gamepad-2', title: game.name,
    subtitle: 'Recently played on Steam',
    metric: `${formatNumber(Math.round((game.playtime_forever || 0) / 60))}h total playtime`,
    href: `https://store.steampowered.com/app/${game.appid}/`,
    image: game.img_logo_url ? `https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/${game.appid}/${game.img_logo_url}.jpg` : '',
  }));
}

export const steamProvider: ActivityProvider = {
  type: 'steam',
  enabled: () => siteConfig.integrations.steam.enabled,
  load: loadSteamActivities,
};
