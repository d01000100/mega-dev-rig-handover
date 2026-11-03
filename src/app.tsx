import { Hono } from 'hono';
import { readNight } from './digest/read.js';
import type { NightDigest } from './digest/types.js';
import { loadConfig, type RigConfig } from './config.js';
import { lane } from './lane.js';
import { readStatus } from './status.js';
import { DigestPage } from './views/digest.js';
import { Layout } from './views/layout.js';
import { StatusBoard } from './views/status.js';

const NIGHT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function getDigestForNight(config: RigConfig, night: string): NightDigest | null {
  if (!NIGHT_PATTERN.test(night)) {
    return null;
  }
  return readNight(config.runsDir, night);
}

export function createApp(config: RigConfig = loadConfig()) {
  const app = new Hono();

  app.get('/health', (c) => c.json({ ok: true, lane: lane().id }));

  app.get('/', (c) =>
    c.html(
      <Layout title="status" lane={lane()}>
        <StatusBoard status={readStatus(config)} />
      </Layout>,
    ),
  );

  app.get('/digest/:night', (c) => {
    const night = c.req.param('night');
    const digest = getDigestForNight(config, night);

    if (digest === null) {
      return c.html(
        <Layout title="not found" lane={lane()}>
          <h1>404</h1>
          <p class="mute">no digest for this night</p>
        </Layout>,
        404,
      );
    }

    return c.html(
      <Layout title={`digest ${night}`} lane={lane()}>
        <DigestPage digest={digest} />
      </Layout>,
    );
  });

  app.get('/api/digest/:night', (c) => {
    const night = c.req.param('night');
    const digest = getDigestForNight(config, night);

    if (digest === null) {
      return c.json({ error: 'no digest for this night' }, 404);
    }

    return c.json(digest);
  });

  return app;
}
