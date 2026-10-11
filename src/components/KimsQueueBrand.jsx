import { Link } from 'react-router-dom';

// PRECONDITION:  Color/typography/spacing/sizes are UNCHANGED — this only makes
// the existing branding block a semantic, context-aware link.
//
//  Public:  [K] KIMS Queue        -> Link to home (default "/")
//              Bhubaneswar · Medical Sciences   "Go to homepage"
//  Staff:   [K] KIMS Queue        -> Link to staff home
//              Staff Console                    "Go to dashboard"
export default function KimsQueueBrand({ variant = 'public', home = '/', label = null }) {
  const staff = variant === 'staff';
  const subtitle = staff ? 'Staff Console' : 'Bhubaneswar · Medical Sciences';
  const titleColor = staff ? '#ffffff' : '#102A43';
  const subColor = staff ? '#9db4c8' : '#6B8198';
  const logoClass = staff ? '' : 'gradient-brand';
  const logoStyle = staff
    ? { backgroundColor: '#075A9F', color: '#ffffff' }
    : { boxShadow: '0 6px 16px rgba(7,90,159,0.30)' };
  const ariaLabel = label || (staff ? 'KIMS Queue — Go to dashboard' : 'KIMS Queue — Go to homepage');

  return (
    <Link
      to={home}
      aria-label={ariaLabel}
      title={ariaLabel}
      className="group flex shrink-0 items-center gap-2.5 rounded-md transition hover:opacity-90 focus-visible:opacity-90"
    >
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-2xl text-lg font-black text-white ${logoClass}`}
        style={logoStyle}
        aria-hidden="true"
      >
        K
      </span>
      <span className="leading-tight text-left">
        <span className="block text-sm font-extrabold tracking-tight" style={{ color: titleColor }}>
          KIMS Queue
        </span>
        <span className="block text-[11px]" style={{ color: subColor }}>
          {subtitle}
        </span>
      </span>
    </Link>
  );
}