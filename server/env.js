// Must be imported BEFORE any module that reads process.env at load time.
// The hosted demo keeps the seeded staff accounts' OTP bypass (123456) on so
// phone login works. Set ALLOW_DEMO_OTP=0 in Vercel to turn it off.
if (process.env.ALLOW_DEMO_OTP === undefined) process.env.ALLOW_DEMO_OTP = '1';
if (process.env.ALLOW_DEMO_OTP === '0') delete process.env.ALLOW_DEMO_OTP;

// Local convenience only: never applies on Vercel or in production.
if (!process.env.JWT_SECRET && !process.env.VERCEL && process.env.NODE_ENV !== 'production') {
  process.env.JWT_SECRET = 'local-dev-only-secret-change-me-0123456789abcdef';
}

// Vercel safety net: if JWT_SECRET was not added in the dashboard, derive a
// stable per-project secret so the API still starts. Set JWT_SECRET yourself
// for real use — this fallback is derived from project identifiers, not random.
if (!process.env.JWT_SECRET && process.env.VERCEL) {
  const { createHash } = await import('node:crypto');
  const seedParts = [
    process.env.VERCEL_PROJECT_ID,
    process.env.VERCEL_GIT_REPO_ID,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
    'kims-queue-fallback',
  ].filter(Boolean).join('|');
  process.env.JWT_SECRET = createHash('sha256').update(`kims|${seedParts}`).digest('hex');
}
