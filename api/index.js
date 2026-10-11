// Vercel serverless entry: the whole Express API lives behind /api/*.
import '../server/env.js';

let appPromise;

async function loadApp() {
  const [{ createApp }, { all }, { seed }, persist] = await Promise.all([
    import('../server/app.js'),
    import('../server/config/db.js'),
    import('../server/seed/seed.js'),
    import('../server/config/persist.js'),
  ]);

  // Without shared storage: seed this instance's own /tmp database once.
  if (!persist.persistenceEnabled && all('SELECT id FROM departments LIMIT 1').length === 0) seed();

  const app = createApp();
  // Socket.io can't run on serverless; routes broadcast through this no-op and
  // the frontend refreshes by polling instead.
  app.set('io', { emit() {}, to() { return this; }, in() { return this; } });
  return { app, persist, seed };
}

// Vercel's Node helpers may already have read + parsed the request body, which
// leaves nothing for express.json() to read (POST would hang or fail). If a body
// is already there, hand Express the parsed object and mark it as handled.
async function adoptParsedBody(req) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return;
  let body = req.body;
  if (body === undefined) return; // no helper: express.json() reads the stream itself
  if (Buffer.isBuffer(body)) body = body.toString('utf8');
  if (typeof body === 'string') {
    try { body = body ? JSON.parse(body) : {}; } catch { body = {}; }
  }
  Object.defineProperty(req, 'body', { value: body ?? {}, writable: true, configurable: true });
  req._body = true;
}

// With shared storage on: make every instance act like one server.
async function withSharedState({ persist, seed }, req, res) {
  const writes = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
  let lockOwner = null;
  if (writes) lockOwner = await persist.acquireLock();
  let released = false;
  const release = async () => {
    if (lockOwner && !released) { released = true; await persist.releaseLock(lockOwner); }
  };

  try {
    const found = await persist.syncFromRemote();
    if (!found) {
      // First ever request (or storage was cleared): seed and publish the baseline.
      if (!persist.localHasData()) seed();
      await persist.pushToRemote();
    }
  } catch (err) {
    await release();
    throw err;
  }

  if (writes) {
    // Save the snapshot BEFORE the response is sent, then free the lock.
    const originalEnd = res.end.bind(res);
    res.end = (...args) => {
      const done = async () => {
        try { if (res.statusCode < 500) await persist.pushToRemote(); }
        catch (err) { console.error('Failed to save shared state:', err); }
        finally { await release(); }
      };
      done().finally(() => originalEnd(...args));
      return res;
    };
    res.on('close', release);
  }
}

export default async function handler(req, res) {
  try {
    appPromise ||= loadApp();
    const ctx = await appPromise;
    await adoptParsedBody(req);
    if (ctx.persist.persistenceEnabled) await withSharedState(ctx, req, res);
    return ctx.app(req, res);
  } catch (err) {
    appPromise = undefined; // allow a retry on the next request
    console.error('API failed to start:', err);
    const missingSecret = /JWT_SECRET/.test(String(err?.message));
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      error: missingSecret
        ? 'Server is not configured: add a JWT_SECRET environment variable in Vercel (Project → Settings → Environment Variables) and redeploy.'
        : 'API failed to start',
      detail: String(err?.message || err),
    }));
  }
}
