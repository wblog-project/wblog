import { z } from 'zod';
import { formatDate, formatNumber } from '../i18n';
import { siteConfig } from '../site-config';
import { fetchJson } from './http';
import type { ActivityProvider } from './types';

const githubRepoSchema = z.object({
  name: z.string(), description: z.string().nullable(), fork: z.boolean(), stargazers_count: z.number(),
  updated_at: z.string(), html_url: z.url(),
});

async function loadGithubActivities() {
  const { username, maxRepos } = siteConfig.integrations.github;
  if (!username) return [];
  const token = import.meta.env.GITHUB_TOKEN || process.env.GITHUB_TOKEN;
  const data = await fetchJson(`https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=${maxRepos * 2}`, {
    headers: { Accept: 'application/vnd.github+json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  return z.array(githubRepoSchema).parse(data).filter((repo) => !repo.fork).slice(0, maxRepos).map((repo) => ({
    type: 'github', label: 'GitHub', icon: 'github', title: repo.name,
    subtitle: repo.description || 'Open source project',
    metric: `${formatNumber(repo.stargazers_count)} stars · ${formatDate(new Date(repo.updated_at), { month: 'short', day: 'numeric' })}`,
    href: repo.html_url, image: '',
  }));
}

export const githubProvider: ActivityProvider = {
  type: 'github',
  enabled: () => siteConfig.integrations.github.enabled,
  load: loadGithubActivities,
};
