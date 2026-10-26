#!/usr/bin/env node
/**
 * Fetch authoritative source texts for catalogued instruments.
 *
 *   node scripts/fetch-sources.mjs                 # everything in the registry
 *   node scripts/fetch-sources.mjs --only a,b      # specific catalogue ids
 *   node scripts/fetch-sources.mjs --missing       # only ids without a stored text
 *
 * Output: public/source-texts/<id>.txt plus manifest.json (provenance).
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ADAPTERS } from './source-fetch/adapters.mjs';
import { contentCheck, sha256 } from './source-fetch/lib.mjs';
import { REGISTRY } from './source-fetch/registry.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public', 'source-texts');
const manifestPath = path.join(outDir, 'manifest.json');

const args = process.argv.slice(2);
const only = args.includes('--only') ? new Set(args[args.indexOf('--only') + 1].split(',')) : null;
const missingOnly = args.includes('--missing');

await mkdir(outDir, { recursive: true });
const manifest = existsSync(manifestPath)
  ? JSON.parse(await readFile(manifestPath, 'utf8'))
  : { entries: {} };

const todo = REGISTRY.filter((e) => (!only || only.has(e.id)) && (!missingOnly || manifest.entries[e.id]?.status !== 'fetched'));

// One lane per host family keeps each publisher at a polite request rate.
const laneOf = (e) => {
  const p = e.parts?.[0];
  return p ? p.kind + ':' + (p.url ? new URL(p.url).host : '') : 'none';
};
const lanes = new Map();
for (const e of todo) lanes.set(laneOf(e), [...(lanes.get(laneOf(e)) ?? []), e]);

async function run(entry) {
  const prev = manifest.entries[entry.id];
  if (!entry.parts?.length) {
    manifest.entries[entry.id] = { status: entry.status ?? 'no-source', note: entry.note ?? 'No automated source configured.' };
    return;
  }
  const texts = [];
  const sources = [];
  try {
    for (const part of entry.parts) {
      const { text, url } = await ADAPTERS[part.kind](part);
      texts.push(part.label ? `${part.label}\n\n${text}` : text);
      sources.push({ url, kind: part.kind });
    }
    const text = texts.join('\n\n────────────────────────────────────────\n\n');
    const check = contentCheck(text, entry.expect);
    const file = `${entry.id}.txt`;
    await writeFile(path.join(outDir, file), text);
    manifest.entries[entry.id] = {
      status: 'fetched',
      file,
      chars: text.length,
      sha256: sha256(text),
      retrievedAt: new Date().toISOString(),
      sources,
      contentCheck: check.result,
      ...(check.missing.length ? { missingPhrases: check.missing } : {}),
      ...(entry.note ? { note: entry.note } : {}),
    };
    console.log(`ok    ${entry.id.padEnd(36)} ${String(text.length).padStart(9)} chars  ${check.result}`);
  } catch (e) {
    manifest.entries[entry.id] = {
      status: entry.status === 'blocked' ? 'blocked' : 'failed',
      error: String(e.message ?? e).slice(0, 300),
      ...(prev?.file ? { file: prev.file } : {}),
      ...(entry.note ? { note: entry.note } : {}),
    };
    console.log(`FAIL  ${entry.id.padEnd(36)} ${String(e.message ?? e).slice(0, 110)}`);
  }
}

await Promise.all([...lanes.values()].map(async (list) => { for (const e of list) await run(e); }));

manifest.generatedAt = new Date().toISOString();
await writeFile(manifestPath, JSON.stringify(manifest, null, 1));
const counts = {};
for (const v of Object.values(manifest.entries)) counts[v.status] = (counts[v.status] ?? 0) + 1;
console.log('\nmanifest:', counts);
