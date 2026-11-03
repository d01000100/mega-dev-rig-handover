import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/read.js';

describe('readNight', () => {
  it('reads runs/2026-10-28.jsonl into one row per job', () => {
    const digest = readNight('runs', '2026-10-28');
    expect(digest).not.toBeNull();
    if (digest === null) {
      return;
    }

    expect(digest.night).toBe('2026-10-28');
    expect(digest.badLines).toBe(1);
    expect(digest.counts).toEqual({ ok: 10, retry: 4, fail: 1 });
    expect(digest.rows.map((row) => row.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);

    const byJob = new Map(digest.rows.map((row) => [row.job, row]));
    expect(byJob.get('fixtures/refresh')).toEqual({
      job: 'fixtures/refresh',
      owner: 'rook',
      runs: 4,
      retries: 3,
      lastStatus: 'ok',
      lastError: null,
      firstAt: '2026-10-29T01:30:00+01:00',
      lastAt: '2026-10-29T01:37:00+01:00',
    });
    expect(byJob.get('digest/render')?.owner).toBeNull();
    expect(byJob.get('notes/backup')).toMatchObject({ lastStatus: 'fail', lastError: 'quota exceeded' });
  });

  it('returns null for a night with no file', () => {
    expect(readNight('runs', '1999-01-01')).toBeNull();
  });

  it('reads an empty file as a night with no rows', () => {
    const runsDir = mkdtempSync(join(tmpdir(), 'rig-runs-'));
    try {
      writeFileSync(join(runsDir, '2026-11-01.jsonl'), '');
      expect(readNight(runsDir, '2026-11-01')).toEqual({
        night: '2026-11-01',
        rows: [],
        counts: { ok: 0, retry: 0, fail: 0 },
        badLines: 0,
      });
    } finally {
      rmSync(runsDir, { recursive: true, force: true });
    }
  });
});
