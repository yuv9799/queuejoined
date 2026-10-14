import { NavLink } from 'react-router-dom';
import { HomeIcon, TicketIcon, QueueIcon, HelpIcon } from './icons.jsx';

// Global navigation only. Contextual actions (Generate Token, Departments,
// Reviews, Emergency) live on the home screen so nothing appears twice.
const ITEMS = [
  { to: '/', label: 'Home', Icon: HomeIcon, end: true },
  { to: '/status', label: 'My Token', Icon: TicketIcon },
  { to: '/live', label: 'Live Queue', Icon: QueueIcon },
  { to: '/help', label: 'Help', Icon: HelpIcon },
];

export default function MobileBottomNav() {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 backdrop-blur"
      style={{ borderColor: '#E1EAF2', paddingBottom: 'env(safe-area-inset-bottom)', boxShadow: '0 -2px 10px rgba(16,42,67,0.06)' }}
    >
      <ul className="mx-auto grid h-14 max-w-md grid-cols-4">
        {ITEMS.map(({ to, label, Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className="flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-semibold"
              style={({ isActive }) => ({ color: isActive ? '#075A9F' : '#6B8198' })}
              aria-label={label}
            >
              {({ isActive }) => (
                <>
                  <span className="flex h-6 items-center justify-center rounded-full px-3" style={{ backgroundColor: isActive ? '#E6F3F9' : 'transparent' }}>
                    <Icon width={20} height={20} />
                  </span>
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
