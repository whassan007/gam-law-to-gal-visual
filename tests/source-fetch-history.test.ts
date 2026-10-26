import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { sha256 } from '../scripts/source-fetch/lib.mjs';
import { archivePriorVersion, failedFetchMetadata } from '../scripts/source-fetch/history.mjs';

const tempDirs: string[] = [];
async function makeSourceDir() {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'gam-source-history-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('source fetch history', () => {
  it('archives changed text once and retains the previous manifest metadata by hash', async () => {
    const outDir = await makeSourceDir();
    await writeFile(path.join(outDir, 'sample.txt'), 'previous official text\n');
    const oldHash = sha256('previous official text\n');
    const previous = {
      status: 'fetched', file: 'sample.txt', sha256: oldHash, chars: 23,
      retrievedAt: '2026-01-01T00:00:00.000Z', sources: [{ url: 'https://example.gov/law', kind: 'html' }],
    };

    const history = await archivePriorVersion({ outDir, id: 'sample', previous, nextSha256: sha256('new official text\n') });
    const archived = await readFile(path.join(outDir, 'history', 'sample', `${oldHash}.txt`), 'utf8');

    expect(archived).toBe('previous official text\n');
    expect(history).toEqual([{ ...previous, file: `history/sample/${oldHash}.txt` }]);
    expect(await archivePriorVersion({ outDir, id: 'sample', previous: { ...previous, history }, nextSha256: sha256('newer text') }))
      .toEqual(history);
  });

  it('refuses to overwrite when the previous file does not match its manifest hash', async () => {
    const outDir = await makeSourceDir();
    await mkdir(outDir, { recursive: true });
    await writeFile(path.join(outDir, 'sample.txt'), 'modified behind the manifest');
    await expect(archivePriorVersion({
      outDir,
      id: 'sample',
      previous: { status: 'fetched', file: 'sample.txt', sha256: 'wrong-hash' },
      nextSha256: sha256('new text'),
    })).rejects.toThrow(/does not match manifest/);
  });

  it('records a failed refresh without discarding the last successful source metadata', () => {
    const previous = {
      status: 'fetched', file: 'sample.txt', sha256: 'abc123', retrievedAt: '2026-01-01T00:00:00.000Z',
      sources: [{ url: 'https://example.gov/law', kind: 'html' }], contentCheck: 'match',
      history: [{ sha256: 'prior', file: 'history/sample/prior.txt' }],
    };

    const result = failedFetchMetadata(previous, {
      status: 'failed', error: new Error('publisher unavailable'), attemptedAt: '2026-02-01T00:00:00.000Z',
    });

    expect(result).toMatchObject({
      status: 'failed', file: 'sample.txt', sha256: 'abc123', retrievedAt: previous.retrievedAt,
      sources: previous.sources, contentCheck: 'match', history: previous.history,
      lastAttemptAt: '2026-02-01T00:00:00.000Z', lastFetchError: 'publisher unavailable',
    });
  });
});
