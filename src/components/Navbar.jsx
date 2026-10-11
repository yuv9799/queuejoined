import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getSocket } from '../services/socket.js';
import KimsQueueBrand from './KimsQueueBrand.jsx';

const NAV = [
  { to: '/', label: 'Token Kiosk' },
  { to: '/status', label: 'My Token' },
  { to: '/live', label: 'Live Board' },
  { to: '/departments', label: 'Departments' },
  { to: '/help', label: 'Help' },
];

export default function Navbar({ reviewsOpen, onOpenReviews }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const bellRef = useRef(null);

  // Live notification feed driven by real socket events.
  useEffect(() => {
    const s = getSocket();
    const handler = (payload) => {
      if (payload?.polled) return; // background refresh tick, not a real event
      const token = payload?.token;
      const label = token
        ? {
            called: `Token #${token.token_number} called — proceed to ${token.counter_name || 'your counter'}`,
            completed: `Token #${token.token_number} service completed`,
            held: `Token #${token.token_number} placed on hold`,
            skipped: `Token #${token.token_number} skipped`,
            cancelled: `Token #${token.token_number} cancelled`,
          }[token.status]
        : token === undefined
          ? 'Queue updated'
          : null;
      if (label) {
        setNotifications((prev) =>
          [{ id: Date.now(), icon: '🔔', dept: token?.department_name || 'Live', text: label }, ...prev].slice(0, 12)
        );
      }
    };
    s.on('token:updated', handler);
    s.on('queue:updated', handler);
    return () => {
      s.off('token:updated', handler);
      s.off('queue:updated', handler);
    };
  }, []);

  useEffect(() => {
    const close = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const navClass = (to) =>
    `rounded-lg px-3 py-2 text-sm font-medium text-ink-muted transition hover:bg-[#E6F3F9] hover:text-medical-primary`;

  return (
    <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur" style={{ borderColor: '#E1EAF2', boxShadow: '0 1px 3px rgba(16,42,67,0.05)' }}>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-3 sm:px-4">
        <div className="min-w-0 flex-1">
          <KimsQueueBrand variant="public" />
        </div>

        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Primary">
          {NAV.map((l) => (
            <Link key={l.to} to={l.to} className={navClass(l.to)}>
              {l.label}
            </Link>
          ))}
          {user && (
            <Link to="/console" className={navClass('/console')}>Staff Console</Link>
          )}
          {user?.role === 'admin' && (
            <Link to="/admin" className={navClass('/admin')}>Admin</Link>
          )}
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <div className="relative hidden sm:block" ref={bellRef}>
            <button
              type="button"
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border text-ink-muted transition hover:bg-[#F5F9FC]"
              style={{ borderColor: '#E1EAF2' }}
              aria-label={`Notifications${notifications.length ? `, ${notifications.length} new` : ''}`}
              aria-expanded={bellOpen}
              onClick={() => setBellOpen(!bellOpen)}
            >
              🔔
              {notifications.length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white" style={{ backgroundColor: '#075A9F' }}>
                  {notifications.length > 9 ? '9+' : notifications.length}
                </span>
              )}
            </button>
            {bellOpen && (
              <div className="absolute right-0 z-50 mt-2 w-80 rounded-2xl border bg-white p-3 shadow-xl" style={{ borderColor: '#E1EAF2' }}>
                <p className="mb-2 text-sm font-bold" style={{ color: '#102A43' }}>Notifications</p>
                {notifications.length === 0 ? (
                  <p className="py-4 text-center text-sm" style={{ color: '#6B8198' }}>No notifications yet.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {notifications.map((n) => (
                      <li key={n.id} className="flex gap-2 rounded-lg bg-[#F5F9FC] p-2 text-xs">
                        <span aria-hidden="true">{n.icon}</span>
                        <span className="flex-1" style={{ color: '#102A43' }}>{n.text}</span>
                        <span className="shrink-0 font-semibold" style={{ color: '#6B8198' }}>{n.dept}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onOpenReviews}
            className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition sm:inline-flex"
            style={{ color: '#075A9F', backgroundColor: reviewsOpen ? '#E6F3F9' : 'transparent' }}
            onMouseEnter={(e) => { if (!reviewsOpen) e.currentTarget.style.backgroundColor = '#E6F3F9'; }}
            onMouseLeave={(e) => { if (!reviewsOpen) e.currentTarget.style.backgroundColor = 'transparent'; }}
            aria-expanded={reviewsOpen}
            aria-haspopup="dialog"
          >
            <span aria-hidden="true">☆</span> Reviews
          </button>

          {user ? (
            <>
              <span className="hidden text-sm font-medium xl:block" style={{ color: '#102A43' }}>{user.name}</span>
              <button
                onClick={() => { logout(); navigate('/'); }}
                className="hidden btn-secondary !py-1.5 sm:inline-flex"
              >
                Logout
              </button>
            </>
          ) : (
            <Link to="/login" className="hidden btn-primary !py-1.5 sm:inline-flex">Staff Login</Link>
          )}

          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-xl border text-ink lg:hidden"
            style={{ borderColor: '#E1EAF2' }}
            aria-label="Toggle menu"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {open && (
        <nav className="flex flex-col border-t bg-white px-3 py-2 lg:hidden" style={{ borderColor: '#E1EAF2' }} aria-label="Mobile">
          {NAV.map((l) => (
            <Link key={l.to} to={l.to} className="block rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-[#F5F9FC]" style={{ color: '#102A43' }} onClick={() => setOpen(false)}>
              {l.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => { setOpen(false); onOpenReviews(); }}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium hover:bg-[#F5F9FC]"
            style={{ color: '#075A9F' }}
          >
            <span aria-hidden="true">☆</span> Reviews
          </button>
          {user && (
            <Link to="/console" className="block rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-[#F5F9FC]" style={{ color: '#102A43' }} onClick={() => setOpen(false)}>
              Staff Console
            </Link>
          )}
          {user?.role === 'admin' && (
            <Link to="/admin" className="block rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-[#F5F9FC]" style={{ color: '#102A43' }} onClick={() => setOpen(false)}>
              Admin
            </Link>
          )}
          {!user && (
            <Link to="/login" className="mt-2 btn-primary !w-full !justify-center" onClick={() => setOpen(false)}>
              Staff Login
            </Link>
          )}
          {user && (
            <button
              type="button"
              onClick={() => { logout(); setOpen(false); navigate('/'); }}
              className="mt-2 btn-secondary !w-full !justify-center"
            >
              Logout
            </button>
          )}
        </nav>
      )}
    </header>
  );
}