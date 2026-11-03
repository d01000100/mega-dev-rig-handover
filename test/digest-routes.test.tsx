import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

describe('digest routes', () => {
  let runsDir: string;

  function makeConfig() {
    return {
      adapter: 'shim',
      installed: '2026-10-29T14:06:00+01:00',
      beatEverySeconds: 60,
      runsDir,
    };
  }

  beforeAll(() => {
    runsDir = mkdtempSync(join(tmpdir(), 'rig-runs-'));

    // Good night: two jobs, one with 3 retries, one fail with error, one with owner null
    writeFileSync(
      join(runsDir, '2026-01-01.jsonl'),
      [
        JSON.stringify({
          at: '2026-01-01T00:00:00+00:00',
          job: 'job-a',
          status: 'ok',
          owner: 'alice',
        }),
        JSON.stringify({
          at: '2026-01-01T00:05:00+00:00',
          job: 'job-a',
          status: 'retry',
          owner: 'alice',
        }),
        JSON.stringify({
          at: '2026-01-01T00:10:00+00:00',
          job: 'job-a',
          status: 'retry',
          owner: 'alice',
        }),
        JSON.stringify({
          at: '2026-01-01T00:15:00+00:00',
          job: 'job-a',
          status: 'retry',
          owner: 'alice',
        }),
        JSON.stringify({
          at: '2026-01-01T00:20:00+00:00',
          job: 'job-a',
          status: 'ok',
          owner: 'alice',
        }),
        JSON.stringify({
          at: '2026-01-01T01:00:00+00:00',
          job: 'job-b',
          status: 'fail',
          owner: null,
          error: 'timeout occurred',
        }),
      ].join('\n'),
    );

    // Empty night
    writeFileSync(join(runsDir, '2026-01-02.jsonl'), '');

    // Night with a bad line
    writeFileSync(
      join(runsDir, '2026-01-03.jsonl'),
      [
        JSON.stringify({
          at: '2026-01-03T00:00:00+00:00',
          job: 'job-c',
          status: 'ok',
          owner: 'bob',
        }),
        'not json at all',
        JSON.stringify({
          at: '2026-01-03T00:10:00+00:00',
          job: 'job-c',
          status: 'ok',
          owner: 'bob',
        }),
      ].join('\n'),
    );
  });

  afterAll(() => {
    rmSync(runsDir, { recursive: true, force: true });
  });

  describe('GET /digest/:night (page)', () => {
    it('200 for good night; page contains both job names and — for null owner', async () => {
      const res = await createApp(makeConfig()).request('/digest/2026-01-01');
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain('job-a');
      expect(html).toContain('job-b');
      expect(html).toContain('—');
    });

    it('404 for night with no file', async () => {
      const res = await createApp(makeConfig()).request('/digest/2026-02-01');
      expect(res.status).toBe(404);
      const html = await res.text();
      expect(html).toContain('404');
    });

    it('empty night renders with "nothing ran"', async () => {
      const res = await createApp(makeConfig()).request('/digest/2026-01-02');
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain('nothing ran');
    });

    it('night with bad line contains "1 line did not parse"', async () => {
      const res = await createApp(makeConfig()).request('/digest/2026-01-03');
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain('1 line did not parse');
    });

    it('invalid night pattern returns 404', async () => {
      const res = await createApp(makeConfig()).request('/digest/abc');
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/digest/:night (JSON)', () => {
    it('200 for good night; JSON rows have same job order as page', async () => {
      const res = await createApp(makeConfig()).request('/api/digest/2026-01-01');
      expect(res.status).toBe(200);
      const json = (await res.json()) as { rows: Array<{ job: string }> };
      expect(json.rows.map((r) => r.job)).toEqual(['job-a', 'job-b']);
    });

    it('404 for night with no file; JSON body has error', async () => {
      const res = await createApp(makeConfig()).request('/api/digest/2026-02-01');
      expect(res.status).toBe(404);
      const json = (await res.json()) as { error: string };
      expect(json.error).toBeDefined();
    });

    it('empty night returns 200 with rows []', async () => {
      const res = await createApp(makeConfig()).request('/api/digest/2026-01-02');
      expect(res.status).toBe(200);
      const json = (await res.json()) as { rows: Array<object> };
      expect(json.rows).toEqual([]);
    });

    it('bad line night returns 200; badLines === 1', async () => {
      const res = await createApp(makeConfig()).request('/api/digest/2026-01-03');
      expect(res.status).toBe(200);
      const json = (await res.json()) as { badLines: number };
      expect(json.badLines).toBe(1);
    });

    it('invalid night pattern returns 404', async () => {
      const res = await createApp(makeConfig()).request('/api/digest/abc');
      expect(res.status).toBe(404);
    });
  });
});
