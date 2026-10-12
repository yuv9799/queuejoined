// Quick check for an Indian mobile number: 10 digits, starting with 6-9,
// optionally written with +91 / 91 / 0 in front. Returns "+91XXXXXXXXXX" or null.
export function normalizeIndianPhone(input) {
  const value = String(input ?? '').trim();
  if (!value) return null;
  if (!/^[+\d\s().-]+$/.test(value)) return null;
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('0091')) digits = digits.slice(4);
  else if (digits.startsWith('91') && digits.length === 12) digits = digits.slice(2);
  else if (digits.startsWith('0') && digits.length === 11) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? `+91${digits}` : null;
}
