import { Link, useLocation, useNavigate } from 'react-router-dom';
import { waitLabel } from '../../hooks/useActiveToken.js';
import { BackIcon } from './icons.jsx';

const TITLES = {
  '/kiosk': 'Generate Token', '/status': 'My Token', '/live': 'Live Queue',
  '/departments': 'Departments', '/help': 'Help', '/login': 'Staff Login',
};

// App-style header. Home: greeting + brand on the left. Inner pages: round back
// button + page title. Right side is always the visitor's REAL estimated wait
// (no avatar, no "Hospital Queue" subtitle).
export default function MobileHeader({ active }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { main, sub } = waitLabel(active);
  const hasTime = /min$/.test(main);
  const live = active.phase === 'active' || active.phase === 'unavailable';
  const isHome = pathname === '/';

  return (
    <header className="m-header sticky top-0 z-40" style={{ paddingTop: 'env(safe-area-inset-top)', backgroundColor: '#F3F4F6' }}>
      <div className="flex h-14 items-center justify-between gap-3 px-4">
        {isHome ? (
          <Link to="/" aria-label="KIMS Queue — Go to homepage" className="min-w-0">
            <span className="block truncate text-[19px] font-extrabold leading-tight tracking-tight" style={{ color: '#17191C' }}>Hello 👋</span>
            <span className="block truncate text-[11px] font-medium" style={{ color: '#6B7280' }}>Welcome to KIMS Queue</span>
          </Link>
        ) : (
          <div className="flex min-w-0 items-center gap-2.5">
            <button
              type="button"
              onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
              aria-label="Go back"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-sm"
              style={{ color: '#17191C' }}
            >
              <BackIcon />
            </button>
            <span className="truncate text-[17px] font-extrabold tracking-tight" style={{ color: '#17191C' }}>{TITLES[pathname] || 'KIMS Queue'}</span>
          </div>
        )}

        <Link
          to={live && active.token ? `/status?id=${active.token.id}` : '/status'}
          className="flex shrink-0 items-baseline gap-1.5 rounded-full px-3.5 py-2"
          style={{ backgroundColor: live ? '#17191C' : '#FFFFFF', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}
          aria-live="polite"
          aria-label={sub ? `${sub}: ${main}` : main}
        >
          {sub && hasTime && <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: live ? '#A7B0BA' : '#6B7280' }}>{sub}</span>}
          <span
            className={hasTime ? 'text-[15px] font-extrabold leading-none' : 'text-xs font-semibold leading-tight'}
            style={{ color: live ? '#FFFFFF' : '#6B7280' }}
          >
            {main}
          </span>
          {sub && !hasTime && live && <span className="text-[10px] font-semibold" style={{ color: '#A7B0BA' }}>· {sub}</span>}
        </Link>
      </div>
    </header>
  );
}
