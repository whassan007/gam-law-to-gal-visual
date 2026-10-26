import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { sha256 } from './lib.mjs';

/** Archive the currently fetched text before a changed source replaces it. */
export async function archivePriorVersion({ outDir, id, previous, nextSha256 }) {
  const history = Array.isArray(previous?.history) ? previous.history : [];
  if (previous?.status !== 'fetched' || !previous.sha256 || previous.sha256 === nextSha256) return history;
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(id)) throw new Error(`Unsafe source id for history archive: ${id}`);

  const root = path.resolve(outDir);
  const sourcePath = path.resolve(root, previous.file ?? '');
  if (!previous.file || !sourcePath.startsWith(root + path.sep)) {
    throw new Error(`Previous source file is missing or outside source directory for ${id}`);
  }

  const priorText = await readFile(sourcePath, 'utf8');
  if (sha256(priorText) !== previous.sha256) {
    throw new Error(`Previous source hash does not match manifest for ${id}; refusing to replace it`);
  }

  const relativeFile = path.posix.join('history', id, `${previous.sha256}.txt`);
  const archivePath = path.join(root, relativeFile);
  await mkdir(path.dirname(archivePath), { recursive: true });
  if (!existsSync(archivePath)) {
    try {
      await writeFile(archivePath, priorText, { flag: 'wx' });
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error;
    }
  }
  if (sha256(await readFile(archivePath, 'utf8')) !== previous.sha256) {
    throw new Error(`Archived source hash does not match manifest for ${id}; refusing to replace it`);
  }

  const priorSnapshot = { ...previous, file: relativeFile };
  delete priorSnapshot.history;
  const deduped = history.filter((item) => item.sha256 !== previous.sha256);
  return [...deduped, priorSnapshot];
}

/** Preserve the last successful source record while recording a failed refresh attempt. */
/** @param {Record<string, unknown> | undefined} previous @param {{attemptedAt?: string, error?: unknown, status?: string, note?: string}} options */
export function failedFetchMetadata(previous, { attemptedAt, error, status = 'failed', note } = {}) {
  const message = String(error?.message ?? error ?? 'Unknown source fetch error').slice(0, 300);
  return {
    ...(previous ?? {}),
    status,
    error: message,
    lastFetchError: message,
    ...(attemptedAt ? { lastAttemptAt: attemptedAt } : {}),
    ...(note ? { note } : {}),
  };
}
