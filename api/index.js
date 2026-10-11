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

export default async function handler(req, res) {
  try {
    appPromise ||= loadApp();
    const app = await appPromise;
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
