import { Link } from 'react-router-dom';
import { waitLabel } from '../../hooks/useActiveToken.js';

// Compact mobile header: brand on the left, the visitor's REAL estimated wait on
// the right. No avatar/profile icon and no "Hospital Queue" style subtitle.
export default function MobileHeader({ active }) {
  const { main, sub } = waitLabel(active);
  const hasTime = /min$/.test(main);
  const live = active.phase === 'active' || active.phase === 'unavailable';

  return (
    <header
      className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur"
      style={{ borderColor: '#E1EAF2', paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="flex h-12 items-center justify-between gap-3 px-3">
        <Link to="/" aria-label="KIMS Queue — Go to homepage" className="flex min-w-0 items-center gap-2">
          <span
            className="gradient-brand flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-base font-black text-white"
            aria-hidden="true"
          >
            K
          </span>
          <span className="truncate text-[15px] font-extrabold tracking-tight" style={{ color: '#102A43' }}>KIMS Queue</span>
        </Link>

        <Link
          to={live && active.token ? `/status?id=${active.token.id}` : '/status'}
          className="flex shrink-0 items-baseline gap-1.5 rounded-lg px-2 py-1"
          style={{ backgroundColor: live ? '#E6F3F9' : 'transparent' }}
          aria-live="polite"
          aria-label={sub ? `${sub}: ${main}` : main}
        >
          {sub && hasTime && <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#6B8198' }}>{sub}</span>}
          <span
            className={hasTime ? 'text-base font-extrabold leading-none' : 'text-xs font-semibold leading-tight'}
            style={{ color: hasTime ? '#075A9F' : '#6B8198' }}
          >
            {main}
          </span>
          {sub && !hasTime && live && <span className="text-[10px] font-semibold" style={{ color: '#6B8198' }}>· {sub}</span>}
        </Link>
      </div>
    </header>
  );
}
