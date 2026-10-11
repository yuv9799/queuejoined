import { useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import StaffLayout from './components/StaffLayout.jsx';
import Navbar from './components/Navbar.jsx';
import ReviewDrawer from './components/ReviewDrawer.jsx';
import Footer from './components/Footer.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { EmergencyProvider } from './context/EmergencyContext.jsx';
import { useAuth } from './context/AuthContext.jsx';
import Home from './pages/Home.jsx';
import TokenStatus from './pages/TokenStatus.jsx';
import LiveBoard from './pages/LiveBoard.jsx';
import StaffConsole from './pages/StaffConsole.jsx';
import Admin from './pages/Admin.jsx';
import Login from './pages/Login.jsx';
import Departments from './pages/Departments.jsx';
import Help from './pages/Help.jsx';
import AIAssistant from './components/ai/AIAssistant.jsx';

const STAFF_ROLES = ['admin', 'officer', 'reception', 'doctor'];

// Gate staff routes. Waits for auth resolution (avoids the "patient nav flash"),
// redirects anonymous users to login, and denies non-staff roles outright.
// This is UI routing; the backend remains the authority for authorization.
function RequireStaff({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-10 text-center text-slate-500">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!STAFF_ROLES.includes(user.role)) {
    return <div className="p-10 text-center text-slate-600">Access denied — staff only.</div>;
  }
  return children;
}

function RequireAdmin({ children }) {
  const { user } = useAuth();
  if (!user || user.role !== 'admin') {
    return <div className="p-10 text-center text-slate-600">Admin access required.</div>;
  }
  return children;
}

export default function App() {
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const location = useLocation();
  const pathname = location?.pathname || '';

  // Staff paths render the dedicated StaffLayout (with login-then-redirect);
  // every other path renders the public/patient layout.
  const isStaffPath =
    pathname.startsWith('/staff') || pathname === '/console' || pathname === '/admin';

  return (
    <ToastProvider>
      <EmergencyProvider>
        {isStaffPath ? (
          <Routes>
            <Route path="/staff" element={<RequireStaff><StaffLayout><StaffConsole /></StaffLayout></RequireStaff>} />
            <Route path="/staff/*" element={<RequireStaff><StaffLayout><StaffConsole /></StaffLayout></RequireStaff>} />
            <Route path="/console" element={<RequireStaff><StaffLayout><StaffConsole /></StaffLayout></RequireStaff>} />
            <Route path="/admin" element={<RequireStaff><StaffLayout><RequireAdmin><Admin /></RequireAdmin></StaffLayout></RequireStaff>} />
            <Route path="*" element={<div className="p-10 text-center text-slate-500">Not found.</div>} />
          </Routes>
        ) : (
          <div className="flex min-h-full flex-col">
            <Navbar reviewsOpen={reviewsOpen} onOpenReviews={() => setReviewsOpen(true)} />
            <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
              <Routes>
                <Route path="/" element={<Home onOpenReviews={() => setReviewsOpen(true)} />} />
                <Route path="/status" element={<TokenStatus />} />
                <Route path="/live" element={<LiveBoard />} />
                <Route path="/departments" element={<Departments />} />
                <Route path="/help" element={<Help />} />
                <Route path="/login" element={<Login />} />
                <Route path="*" element={<div className="p-10 text-center text-slate-500">Not found.</div>} />
              </Routes>
            </main>
            <Footer />
            <ReviewDrawer open={reviewsOpen} onClose={() => setReviewsOpen(false)} />
            <AIAssistant />
          </div>
        )}
      </EmergencyProvider>
    </ToastProvider>
  );
}