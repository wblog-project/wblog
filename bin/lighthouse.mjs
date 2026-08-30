#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const url = 'http://127.0.0.1:4321/wblog/';
const runCount = process.env.CI ? 3 : 1;
const reports = Array.from({ length: runCount }, (_, index) => path.join(root, `.lighthouse-report-${index + 1}.json`));
const preview = spawn('npm', ['run', 'preview', '--', '--host', '127.0.0.1', '--port', '4321'], {
  cwd: root,
  env: { ...process.env, WBLOG_OFFLINE: '1' },
  stdio: 'ignore',
});

async function waitForSite() {
  for (let attempt = 0; attempt < 60; attempt++) {
    try { if ((await fetch(url)).ok) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Preview did not become ready at ${url}`);
}

try {
  await waitForSite();
  const executable = path.join(root, 'node_modules/.bin/lighthouse');
  const runs = [];
  for (const [index, report] of reports.entries()) {
    const result = spawnSync(executable, [url, '--quiet', '--chrome-flags=--headless --no-sandbox', '--only-categories=performance,accessibility,seo', '--skip-audits=robots-txt', '--output=json', `--output-path=${report}`], { cwd: root, stdio: 'inherit' });
    if (result.status !== 0) process.exit(result.status ?? 1);
    const data = JSON.parse(readFileSync(report, 'utf8'));
    const scores = Object.fromEntries(Object.entries(data.categories).map(([name, category]) => [name, category.score]));
    const cls = data.audits['cumulative-layout-shift'].numericValue;
    const failedSeoAudits = data.categories.seo.auditRefs
      .filter(({ id, weight }) => weight > 0 && data.audits[id]?.score !== 1)
      .map(({ id }) => `${id}: ${data.audits[id]?.title}`);
    runs.push({ scores, cls, failedSeoAudits });
    console.log(`Lighthouse run ${index + 1}/${runCount}: performance ${scores.performance}, accessibility ${scores.accessibility}, SEO ${scores.seo}, CLS ${cls}`);
  }
  const median = (values) => [...values].sort((left, right) => left - right)[Math.floor(values.length / 2)];
  const scores = Object.fromEntries(['performance', 'accessibility', 'seo'].map((name) => [name, median(runs.map((run) => run.scores[name]))]));
  const cls = median(runs.map((run) => run.cls));
  const failedSeoAudits = [...new Set(runs.flatMap((run) => run.failedSeoAudits))].join('; ');
  console.log(`Lighthouse median: performance ${scores.performance}, accessibility ${scores.accessibility}, SEO ${scores.seo}, CLS ${cls}`);
  if (scores.performance < .9 || scores.accessibility < .95 || scores.seo < .95 || cls > .1) {
    if (process.env.GITHUB_ACTIONS) {
      console.error(`::error title=Lighthouse thresholds::Performance ${scores.performance}, accessibility ${scores.accessibility}, SEO ${scores.seo}, CLS ${cls}. Failed SEO audits: ${failedSeoAudits || 'none'}`);
    }
    process.exitCode = 1;
  }
} finally {
  preview.kill('SIGTERM');
  for (const report of reports) rmSync(report, { force: true });
}
