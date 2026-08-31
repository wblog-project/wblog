import { existsSync, readFileSync, writeFileSync } from 'node:fs';

export function updateBuildReport(name, source, detail = '') {
  const reportPath = process.env.WBLOG_BUILD_REPORT;
  if (!reportPath) return;
  let report = {};
  try {
    if (existsSync(reportPath)) report = JSON.parse(readFileSync(reportPath, 'utf8'));
  } catch {
    report = {};
  }
  report[name] = { source, detail };
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

export function readBuildReport(reportPath) {
  try {
    return JSON.parse(readFileSync(reportPath, 'utf8'));
  } catch {
    return {};
  }
}
