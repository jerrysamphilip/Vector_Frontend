#!/usr/bin/env node
/* global console, process */
// Blocking dependency audit: `npm audit` at severity high/critical with a documented, dated ignore list
// (ci/npm_audit_ignore.txt). Fails on an unlisted advisory, an entry past its review date, a malformed
// entry, or an entry that is no longer reported (the list may only shrink).
// Usage: node scripts/check-audit.mjs   (npm run audit:check)
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const listFile = path.join(root, 'ci', 'npm_audit_ignore.txt');
const today = new Date().toISOString().slice(0, 10);
const errors = [];
const accepted = new Map();
readFileSync(listFile, 'utf8').split('\n').forEach((line, i) => {
  if (!line.trim() || line.trimStart().startsWith('#')) return;
  const parts = line.split('|').map((p) => p.trim());
  if (parts.length < 5 || parts.some((p) => !p)) {
    errors.push(`${listFile}:${i + 1}: expected 'GHSA id | package | added | review by | reason'`);
    return;
  }
  const [id, pkg, added, review] = parts;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(added) || !/^\d{4}-\d{2}-\d{2}$/.test(review)) {
    errors.push(`${listFile}:${i + 1}: dates must be YYYY-MM-DD`);
  } else if (review < today) {
    errors.push(`${listFile}:${i + 1}: ${id} (${pkg}) review date ${review} has passed: re-assess it`);
  }
  accepted.set(id, pkg);
});

let raw;
try {
  raw = execFileSync('npm', ['audit', '--json'], { cwd: root, encoding: 'utf8', maxBuffer: 64 << 20 });
} catch (e) {
  raw = e.stdout; // npm audit exits non-zero when it finds anything
}
const report = JSON.parse(raw || '{}');
if (!report.vulnerabilities) {
  console.error('npm audit did not return a report:', (raw || '').slice(0, 2000));
  process.exit(2);
}
const found = new Map();
for (const v of Object.values(report.vulnerabilities)) {
  for (const via of v.via) {
    if (typeof via === 'object' && ['high', 'critical'].includes(via.severity)) {
      found.set(via.url.split('/').pop(), `${via.name} ${via.severity}: ${via.title}`);
    }
  }
}
const fresh = [...found].filter(([id]) => !accepted.has(id));
const stale = [...accepted].filter(([id]) => !found.has(id));
fresh.forEach(([id, d]) => console.log(`VULN     ${id} ${d}`));
stale.forEach(([id, pkg]) => console.log(`STALE    ${id} (${pkg}) no longer reported: delete it from ci/npm_audit_ignore.txt`));
errors.forEach((e) => console.log(e));
console.log(`npm audit (high+): ${fresh.length} new, ${found.size - fresh.length} accepted, ${stale.length} stale, ${errors.length} list error(s)`);
process.exit(fresh.length || stale.length || errors.length ? 1 : 0);
