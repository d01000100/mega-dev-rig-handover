import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestRow, ReadNight, RunLine, RunStatus } from './types.js';

const STATUSES: readonly RunStatus[] = ['ok', 'retry', 'fail'];

function isRunStatus(value: unknown): value is RunStatus {
  return STATUSES.some((status) => status === value);
}

// Returns null for a line that is not JSON or lacks a usable at, job or status.
// A missing or non-string owner reads as null.
function parseLine(text: string): RunLine | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return null;
  }

  const record: Record<string, unknown> = { ...parsed };
  const { at, job, status, owner, error } = record;
  if (typeof at !== 'string' || at === '' || typeof job !== 'string' || job === '' || !isRunStatus(status)) {
    return null;
  }

  const line: RunLine = { at, job, status, owner: typeof owner === 'string' ? owner : null };
  if (typeof error === 'string') {
    line.error = error;
  }
  return line;
}

export const readNight: ReadNight = (runsDir, night) => {
  const path = join(runsDir, `${night}.jsonl`);
  if (!existsSync(path)) {
    return null;
  }

  const rowsByJob = new Map<string, DigestRow>();
  const counts: Record<RunStatus, number> = { ok: 0, retry: 0, fail: 0 };
  let badLines = 0;

  for (const text of readFileSync(path, 'utf8').split('\n')) {
    if (text.trim() === '') {
      continue;
    }

    const line = parseLine(text);
    if (line === null) {
      badLines += 1;
      continue;
    }

    counts[line.status] += 1;
    const retryIncrement = line.status === 'retry' ? 1 : 0;
    const existing = rowsByJob.get(line.job);
    if (existing === undefined) {
      rowsByJob.set(line.job, {
        job: line.job,
        owner: line.owner,
        runs: 1,
        retries: retryIncrement,
        lastStatus: line.status,
        lastError: line.error ?? null,
        firstAt: line.at,
        lastAt: line.at,
      });
      continue;
    }

    existing.owner = line.owner;
    existing.runs += 1;
    existing.retries += retryIncrement;
    existing.lastStatus = line.status;
    existing.lastError = line.error ?? null;
    existing.lastAt = line.at;
  }

  const rows = [...rowsByJob.values()].sort((left, right) => (left.job < right.job ? -1 : left.job > right.job ? 1 : 0));
  return { night, rows, counts, badLines };
};
