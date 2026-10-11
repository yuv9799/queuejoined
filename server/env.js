// Must be imported BEFORE any module that reads process.env at load time.
// The hosted demo keeps the seeded staff accounts' OTP bypass (123456) on so
// phone login works. Set ALLOW_DEMO_OTP=0 in Vercel to turn it off.
if (process.env.ALLOW_DEMO_OTP === undefined) process.env.ALLOW_DEMO_OTP = '1';
if (process.env.ALLOW_DEMO_OTP === '0') delete process.env.ALLOW_DEMO_OTP;

// Local convenience only: never applies on Vercel or in production.
if (!process.env.JWT_SECRET && !process.env.VERCEL && process.env.NODE_ENV !== 'production') {
  process.env.JWT_SECRET = 'local-dev-only-secret-change-me-0123456789abcdef';
}
