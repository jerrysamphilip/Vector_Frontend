#!/usr/bin/env node
/* global console, process */
// Release identity gate: package.json version == package-lock.json root versions == newest CHANGELOG.md section,
// and every image of this app in manifests/*.yaml is the <ECR_IMAGE_URI> placeholder or tagged with that version.
// Usage: node scripts/check-version.mjs   (npm run version:check)
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(path.join(root, rel), 'utf8');
const errors = [];
const { version } = JSON.parse(read('package.json'));
if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(version || '')) errors.push(`package.json: version ${version} is not SemVer`);

const lock = JSON.parse(read('package-lock.json'));
if (lock.version !== version) errors.push(`package-lock.json: version ${lock.version} != ${version}`);
if (lock.packages?.['']?.version !== version) errors.push(`package-lock.json: packages[""].version ${lock.packages?.['']?.version} != ${version}`);

const sections = [...read('CHANGELOG.md').matchAll(/^## \[(\d+\.\d+\.\d+[^\]]*)\]/gm)].map((m) => m[1]);
if (!sections.includes(version)) errors.push(`CHANGELOG.md: no '## [${version}]' section`);
else if (sections[0] !== version) errors.push(`CHANGELOG.md: newest section is ${sections[0]}, package.json is ${version}`);

const dir = path.join(root, 'manifests');
if (existsSync(dir)) {
  for (const f of readdirSync(dir).filter((x) => /\.ya?ml$/.test(x))) {
    read(`manifests/${f}`).split('\n').forEach((line, i) => {
      const m = line.match(/^\s*image:\s*(\S+)/);
      // our image only: digest-pinned third-party images carry no release number
      if (!m || m[1].replace(/['"]/g, '') === '<ECR_IMAGE_URI>' || m[1].includes('@sha256:')) return;
      if (!/vector|outreach|sales360|frontend/i.test(m[1].split('/').pop())) return;
      const last = m[1].split('/').pop();
      const tag = last.includes(':') ? last.split(':').pop() : '';
      if (tag.replace(/^v/, '') !== version) errors.push(`manifests/${f}:${i + 1}: image ${m[1]} is not tagged ${version}`);
    });
  }
}
errors.forEach((e) => console.log(`FAIL  ${e}`));
console.log(`release identity: version ${version}, ${errors.length} problem(s)`);
process.exit(errors.length ? 1 : 0);
