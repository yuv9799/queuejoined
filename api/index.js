// Vercel serverless entry: the whole Express API lives behind /api/*.
import '../server/env.js';

let appPromise;

async function loadApp() {
  const [{ createApp }, { all }, { seed }] = await Promise.all([
    import('../server/app.js'),
    import('../server/config/db.js'),
    import('../server/seed/seed.js'),
  ]);

  // Serverless instances start with an empty /tmp database: seed it once per
  // cold start (departments, areas, counters, doctors, demo staff, sample data).
  if (all('SELECT id FROM departments LIMIT 1').length === 0) seed();

  const app = createApp();
  // Socket.io can't run on serverless; routes broadcast through this no-op and
  // the frontend refreshes by polling instead.
  app.set('io', { emit() {}, to() { return this; }, in() { return this; } });
  return app;
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

export default async function handler(req, res) {
  try {
    appPromise ||= loadApp();
    const app = await appPromise;
    await adoptParsedBody(req);
    return app(req, res);
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
