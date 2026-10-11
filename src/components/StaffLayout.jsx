import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import KimsQueueBrand from './KimsQueueBrand.jsx';

// Dedicated staff chrome. This is deliberately separate from the public
// Navbar/Footer — no patient-facing items (Token Kiosk, My Token, Live Board,
// Departments, Help, Reviews, Staff Login) are shown here.
export default function StaffLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const role = user?.role || 'staff';

  return (
    <div className="flex min-h-full flex-col">
      <header
        className="sticky top-0 z-40"
        style={{ backgroundColor: '#102A43', boxShadow: '0 1px 3px rgba(16,42,67,0.20)' }}
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          {/* Brand (clickable ->/staff dashboard, staff context) */}
          <KimsQueueBrand variant="staff" home="/staff" />

          {/* User + role + logout (no patient nav) */}
          <div className="flex items-center gap-2">
            <span className="hidden text-sm font-medium xl:block" style={{ color: '#ffffff' }}>{user?.name}</span>
            <span className="badge bg-blue-100 text-blue-700">{role}</span>
            <button className="btn-secondary !py-1.5" onClick={() => { logout(); navigate('/'); }}>
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}