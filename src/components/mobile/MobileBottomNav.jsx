import { NavLink } from 'react-router-dom';
import { HomeIcon, TicketIcon, QueueIcon, HelpIcon, CalendarIcon } from './icons.jsx';

// Global navigation only. Contextual actions (Generate Token, Departments,
// Reviews, Emergency) live on the home screen so nothing appears twice.
// Floating dark pill; the active destination is a white circle.
const ITEMS = [
  { to: '/', label: 'Home', Icon: HomeIcon, end: true },
  { to: '/status', label: 'My Token', Icon: TicketIcon },
  { to: '/visits', label: 'Visits', Icon: CalendarIcon },
  { to: '/live', label: 'Live Queue', Icon: QueueIcon },
  { to: '/help', label: 'Help', Icon: HelpIcon },
];

export default function MobileBottomNav() {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 px-5 pointer-events-none"
      style={{ paddingBottom: 'calc(10px + env(safe-area-inset-bottom))' }}
    >
      <ul
        className="pointer-events-auto mx-auto grid h-16 max-w-sm grid-cols-5 items-center rounded-full px-2"
        style={{ backgroundColor: '#17191C', boxShadow: '0 10px 24px rgba(0,0,0,0.22)' }}
      >
        {ITEMS.map(({ to, label, Icon, end }) => (
          <li key={to} className="flex justify-center">
            <NavLink to={to} end={end} aria-label={label} title={label} className="flex flex-col items-center">
              {({ isActive }) => (
                <span
                  className="flex h-12 w-12 items-center justify-center rounded-full transition"
                  style={{ backgroundColor: isActive ? '#FFFFFF' : 'transparent', color: isActive ? '#17191C' : '#B8C0CA' }}
                >
                  <Icon width={22} height={22} />
                  <span className="sr-only">{label}</span>
                </span>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
