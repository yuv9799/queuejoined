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

## Important limits of running the backend on Vercel
- **Data is not permanent.** SQLite lives in `/tmp`, which is per-instance and wiped on cold
  starts / redeploys. The database re-seeds itself automatically, so the site always works,
  but tokens/reviews created by users can disappear and different instances may not share
  data. Fine for a demo or project submission; for real use move to a hosted database
  (Turso/libSQL, Neon Postgres, Supabase).
- **No WebSockets on Vercel.** Live updates use 5-second polling instead of Socket.io.
- SMS/WhatsApp/AI settings are optional env vars (see `.env.example`).

## Local development
```
npm install
npm run dev:all     # Vite on :5173 + API on :8080 (Vite proxies /api)
```
