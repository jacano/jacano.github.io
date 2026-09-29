/**
 * Take the numbers the CV shows from the services that own them.
 *
 * A static site copies a star count, a fork count or a download count at the
 * moment of the build. This script takes the copy again: GitHub owns the stars,
 * the forks and the search that counts pull requests, and NuGet owns the
 * downloads.
 *
 * Run `npm run sync:stats` before a release, or `npm run sync:stats:check` to
 * report drift without writing. A field stays as written when its value cannot
 * be read: a network problem must not erase a number.
 *
 * Two fields are editorial, so this script never rewrites them:
 *
 * - `lang` is what a reader needs. GitHub reports the largest group of files,
 *   and it calls WasmSample "Shell", which is a C# and .NET project.
 * - `updated` is the last year the project changed. GitHub reports `pushed_at`,
 *   which counts a README edit: the four projects under 2023 have a README
 *   commit in 2026 and their code has not moved since 2018. A timestamp from
 *   the API would make the badge claim more than the project did.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const CV_PATH = fileURLToPath(new URL('../src/data/cv.json', import.meta.url));
const CHECK = process.argv.includes('--check');
const REPO_URL = /^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/?$/;
const PACKAGE_URL = /^https:\/\/www\.nuget\.org\/packages\/([\w.-]+)/;

const headers = { 'user-agent': 'jacano.github.io sync-stats', accept: 'application/vnd.github+json' };
if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

async function read(url) {
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`${url} answered ${response.status}`);
  return response.json();
}

/** The stars and the forks of a GitHub project. */
async function statsOfRepository(url) {
  const [, owner, name] = REPO_URL.exec(url) ?? [];
  if (!owner) return null;
  const repo = await read(`https://api.github.com/repos/${owner}/${name}`);
  return { stars: repo.stargazers_count, forks: repo.forks_count };
}

/** The downloads of a NuGet package. */
async function statsOfPackage(url) {
  const [, id] = PACKAGE_URL.exec(url) ?? [];
  if (!id) return null;
  const result = await read(
    `https://azuresearch-usnc.nuget.org/query?q=packageid:${encodeURIComponent(id)}&prerelease=true`,
  );
  const downloads = result.data?.[0]?.totalDownloads;
  return downloads === undefined ? null : { downloads };
}

/** Replace a numeric or quoted field of one project entry, and report the move. */
function setField(entry, key, value, moves, label) {
  const pattern = new RegExp(`("${key}":\\s*)("[^"]*"|\\d+)`);
  const found = pattern.exec(entry);
  if (!found) {
    console.warn(`  ${label}: the entry has no ${key}, so it was skipped`);
    return entry;
  }
  const next = `${found[1]}${typeof value === 'number' ? value : `"${value}"`}`;
  if (next !== found[0]) moves.push(`${label} ${key}: ${found[0].replace(pattern, '$2')} -> ${value}`);
  return entry.replace(pattern, next);
}

const before = readFileSync(CV_PATH, 'utf8');
const projectsStart = before.indexOf('"projects": [');
const projectsEnd = before.indexOf('\n  ],', projectsStart);
if (projectsStart < 0 || projectsEnd < 0) {
  throw new Error('cv.json: the projects array was not found');
}

const entries = [...before.slice(projectsStart, projectsEnd).matchAll(/\{[^{}]*\}/g)];
const moves = [];
const rewritten = new Map();

for (const match of entries) {
  const entry = match[0];
  const name = /"name":\s*"([^"]+)"/.exec(entry)?.[1] ?? 'unnamed';
  const url = /"url":\s*"([^"]+)"/.exec(entry)?.[1] ?? '';
  let stats = null;
  try {
    stats = (await statsOfRepository(url)) ?? (await statsOfPackage(url));
  } catch (error) {
    console.warn(`  ${name}: ${error.message}. The current values stay.`);
  }
  let next = entry;
  if (stats?.stars !== undefined) {
    next = setField(next, 'stars', stats.stars, moves, name);
    next = setField(next, 'forks', stats.forks, moves, name);
  }
  if (stats?.downloads !== undefined) {
    next = setField(next, 'downloads', `${stats.downloads} on NuGet`, moves, name);
  }
  rewritten.set(entry, next);
}

let after = before;
for (const [entry, next] of rewritten) {
  if (entry !== next) after = after.replace(entry, next);
}

const contributions = await read('https://api.github.com/search/issues?q=author:jacano+type:pr&per_page=1');
const inMicrosoft = (before.match(/"number":/g) ?? []).length;
after = setField(after, 'verified', new Date().toISOString().slice(0, 10), moves, 'contributions');
after = setField(after, 'total', contributions.total_count, moves, 'contributions');
after = setField(after, 'inMicrosoft', inMicrosoft, moves, 'contributions');

if (moves.length === 0) {
  console.log('cv.json is up to date.');
  process.exit(0);
}

console.log(`${moves.length} value(s) moved:`);
for (const move of moves) console.log(`  ${move}`);
if (CHECK) {
  console.error('cv.json is out of date. Run npm run sync:stats.');
  process.exit(1);
}
writeFileSync(CV_PATH, after);
console.log('cv.json updated. Review the diff, then run npm run build.');
