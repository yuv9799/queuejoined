# KIMS Queue — single Vercel project (frontend + backend)

- `src/`, `index.html` — React + Vite frontend
- `api/index.js` — Vercel serverless function; serves the whole Express API at `/api/*`
- `server/` — Express routes, models, SQLite (`node:sqlite`) and seed data
- Frontend and API share one domain, so there is no CORS and no `VITE_API_URL` to set.

## Deploy on Vercel
1. Push this folder to a GitHub repo (or `vercel` CLI from this folder).
2. Import it in Vercel. Framework: **Vite** (auto-detected). Leave build settings as they are.
3. Recommended: add `JWT_SECRET` (if you skip it, a project-derived fallback secret is used so the site still works)
   — = a long random string, e.g.
   `node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"`
4. Deploy. Node 22 is selected from `package.json` (needed for `node:sqlite`).

Demo logins (auto-seeded): `admin@kims.in / admin123`, `officer@kims.in / officer123`,
`reception@kims.in / reception123`. Phone login OTP for demo staff is `123456`
(disable with `ALLOW_DEMO_OTP=0`).

## Make data permanent and shared (one-time, free, ~2 minutes)
Vercel runs the API on many instances, each with its own temporary disk. To make them behave
like one server, connect a free Redis store; the app then saves the database there.
1. Vercel dashboard -> your project -> **Storage** -> **Create Database** -> choose **Redis** or **Upstash for Redis** (free plan) -> connect it to this project (all environments).
2. Vercel adds the connection variables automatically (`REDIS_URL` for Redis, or `KV_REST_API_URL`/`KV_REST_API_TOKEN` for Upstash — both are supported).
3. **Redeploy** (Deployments -> ... -> Redeploy). Check `/api/health` shows `"sharedStorage":true`.

Without it the site still works, but each instance has its own data, so stats and tokens can differ between requests.

## Other limits
- No WebSockets on Vercel: live updates use 5-second polling instead of Socket.io.
- Writes are serialised with a short lock, so very high write traffic will be slower. Fine for a demo / college project; for heavy production use, migrate to a real database (Turso/Neon).
- SMS/WhatsApp/AI settings are optional env vars (see `.env.example`).

## Performance: how live updates avoid overloading the server
The frontend used to re-download the whole live queue every 5 seconds on every page (24-48
requests/min per visitor). It now works like this:
- **Version-gated polling**: one shared timer asks `GET /api/version` (a few bytes). Heavy data
  (`/tokens/live`, `/stats/overview`, ...) is re-fetched only when the version actually changed.
- **Adaptive back-off + jitter**: 5s while data is changing, slowing to 30s when idle; resets on any change,
  tab focus, or the user's own write.
- **Zero requests when the tab is hidden or the browser is offline**; one catch-up check when it returns.
- **Request de-duplication**: identical GETs in flight share one network call.
- **Version-keyed CDN caching**: public reads carry `?_v=<version>` and are cached at the Vercel edge, so
  many viewers cost about one function call per version instead of one per viewer. A write changes the
  version, which changes the cache key, so cached data is never stale.
- Measured locally on an idle page for 60 s: 24-48 requests -> 5 tiny version checks (-80% to -90%),
  and a token created elsewhere appears on screen within ~3-6 s.

## Local development
```
npm install
npm run dev:all     # Vite on :5173 + API on :8080 (Vite proxies /api)
```
