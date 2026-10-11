import { Link } from 'react-router-dom';
import { useEmergency } from '../context/EmergencyContext.jsx';

const MAIN = [
  { to: '/', label: 'Token Kiosk' },
  { to: '/status', label: 'My Token' },
  { to: '/live', label: 'Live Queue' },
  { to: '/departments', label: 'Departments' },
  { to: '/help', label: 'Help' },
];

const SUPPORT = [
  { label: 'Emergency Help', emergency: true },
  { label: 'Contact' },
  { label: 'Privacy' },
  { label: 'Terms' },
];

export default function Footer() {
  const { openEmergency } = useEmergency();
  return (
    <footer style={{ backgroundColor: '#102A43', color: '#cdd9e4' }}>
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-base font-black text-white">K</span>
            <span className="leading-tight">
              <span className="block text-sm font-bold text-white">KIMS Queue</span>
              <span className="block text-[11px]">Bhubaneswar</span>
            </span>
          </div>
          <p className="mt-4 max-w-xs text-sm">
            Hospital queue & token management for a calmer, faster KIMS experience.
          </p>
        </div>

        <div>
          <p className="mb-3 text-sm font-semibold text-white">Navigate</p>
          <ul className="space-y-2">
            {MAIN.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="text-sm transition hover:text-white">{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-3 text-sm font-semibold text-white">Support</p>
          <ul className="space-y-2">
            {SUPPORT.map((l) => (
              <li key={l.label}>
                {l.emergency ? (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold transition hover:text-white"
                    style={{ color: '#FF8A8A' }}
                    onClick={openEmergency}
                    aria-label="Open Emergency Help"
                  >
                    <span aria-hidden="true">🚨</span> {l.label}
                  </button>
                ) : (
                  <span className="text-sm">{l.label}</span>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-3 text-sm font-semibold text-white">Emergency</p>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold"
            style={{ backgroundColor: '#FF1717', color: '#ffffff' }}
            onClick={openEmergency}
            aria-label="Open Emergency Help"
          >
            🚨 Emergency Help
          </button>
          <p className="mt-3 text-xs">Use only for immediate medical assistance.</p>
        </div>
      </div>

      <div className="border-t px-4 py-4 text-center text-xs" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
        KIMS Queue Management System · Kalinga Institute of Medical Sciences, Bhubaneswar
      </div>
    </footer>
  );
}