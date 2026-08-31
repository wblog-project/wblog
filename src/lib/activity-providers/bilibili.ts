import { createHash } from 'node:crypto';
import { z } from 'zod';
import { formatDate, formatNumber } from '../i18n';
import { siteConfig } from '../site-config';
import { fetchJson } from './http';
import type { ActivityCard, ActivityProvider } from './types';

const bilibiliSchema = z.object({ code: z.number().optional(), data: z.object({ list: z.object({ vlist: z.array(z.object({
  title: z.string().optional(), description: z.string().optional(), play: z.union([z.string(), z.number()]).optional(),
  created: z.number().optional(), bvid: z.string().optional(), pic: z.string().optional(),
})) }) }).optional() });
const bilibiliNavSchema = z.object({ data: z.object({ wbi_img: z.object({ img_url: z.url(), sub_url: z.url() }) }) });
const bilibiliMixinKeyOrder = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35,
  27, 43, 5, 49, 33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13,
  37, 48, 7, 16, 24, 55, 40, 61, 26, 17, 0, 1, 60, 51, 30, 4,
  22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36, 20, 34, 44, 52,
];

export function mapBilibiliActivities(input: unknown, mid: string): ActivityCard[] {
  const data = bilibiliSchema.parse(input);
  return (data.data?.list.vlist || []).map((video) => ({
    type: 'bilibili', label: 'Bilibili', icon: 'tv', title: video.title || 'New Bilibili video',
    subtitle: video.description || 'Latest upload on Bilibili',
    metric: `${formatNumber(Number(video.play || 0))} plays${video.created ? ` · ${formatDate(new Date(video.created * 1000), { month: 'short', day: 'numeric' })}` : ''}`,
    href: video.bvid ? `https://www.bilibili.com/video/${video.bvid}/` : `https://space.bilibili.com/${mid}`,
    image: video.pic?.replace(/^http:/, 'https:') || '',
  }));
}

function bilibiliKeyPart(url: string) {
  const filename = url.slice(url.lastIndexOf('/') + 1);
  return filename.slice(0, filename.lastIndexOf('.'));
}

export function signBilibiliParams(params: Record<string, string>, imgUrl: string, subUrl: string, timestamp = Math.floor(Date.now() / 1000)) {
  const source = bilibiliKeyPart(imgUrl) + bilibiliKeyPart(subUrl);
  const mixinKey = bilibiliMixinKeyOrder.map((index) => source[index]).join('').slice(0, 32);
  const values: Record<string, string> = { ...params, wts: String(timestamp) };
  const query = Object.keys(values).sort().map((key) => {
    const value = values[key].replace(/[!'()*]/g, '');
    return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
  }).join('&');
  return `${query}&w_rid=${createHash('md5').update(query + mixinKey).digest('hex')}`;
}

async function loadBilibiliActivities() {
  const { mid, maxVideos } = siteConfig.integrations.bilibili;
  if (!mid) return [];
  const headers = { 'User-Agent': 'Mozilla/5.0', Referer: `https://space.bilibili.com/${mid}/video` };
  const nav = bilibiliNavSchema.parse(await fetchJson('https://api.bilibili.com/x/web-interface/nav', { headers }));
  const query = signBilibiliParams(
    { mid, pn: '1', ps: String(maxVideos), order: 'pubdate' },
    nav.data.wbi_img.img_url,
    nav.data.wbi_img.sub_url,
  );
  const data = await fetchJson(`https://api.bilibili.com/x/space/wbi/arc/search?${query}`, { headers });
  const parsed = bilibiliSchema.parse(data);
  if (parsed.code !== undefined && parsed.code !== 0) throw new Error(`Bilibili API error ${parsed.code}`);
  return mapBilibiliActivities(data, mid);
}

export const bilibiliProvider: ActivityProvider = {
  type: 'bilibili',
  enabled: () => siteConfig.integrations.bilibili.enabled,
  load: loadBilibiliActivities,
};
