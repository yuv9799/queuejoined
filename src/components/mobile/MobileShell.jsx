import { Routes, Route, Navigate } from 'react-router-dom';
import MobileHeader from './MobileHeader.jsx';
import MobileBottomNav from './MobileBottomNav.jsx';
import MobileHome from './MobileHome.jsx';
import MobileKiosk from './MobileKiosk.jsx';
import ReviewDrawer from '../ReviewDrawer.jsx';
import AIAssistant from '../ai/AIAssistant.jsx';
import TokenStatus from '../../pages/TokenStatus.jsx';
import LiveBoard from '../../pages/LiveBoard.jsx';
import Departments from '../../pages/Departments.jsx';
import Help from '../../pages/Help.jsx';
import Login from '../../pages/Login.jsx';
import { useActiveToken } from '../../hooks/useActiveToken.js';

// Mobile-only app shell (phones, < 768px). Reuses the existing pages and
// services; only the chrome (header, bottom nav, home) is new. The `m-app`
// class scopes the compact-spacing rules in index.css to this shell, so the
// desktop layout is never affected.
export default function MobileShell({ reviewsOpen, setReviewsOpen }) {
  const active = useActiveToken();
  return (
    <div className="m-app flex min-h-full flex-col">
      <MobileHeader active={active} />
      <main className="m-main flex flex-1 flex-col px-3 pb-[calc(76px+env(safe-area-inset-bottom))] pt-3">
        <Routes>
          <Route path="/" element={<MobileHome active={active} onOpenReviews={() => setReviewsOpen(true)} />} />
          <Route path="/kiosk" element={<MobileKiosk />} />
          <Route path="/status" element={<TokenStatus />} />
          <Route path="/live" element={<LiveBoard />} />
          <Route path="/departments" element={<Departments />} />
          <Route path="/help" element={<Help />} />
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <MobileBottomNav />
      <ReviewDrawer open={reviewsOpen} onClose={() => setReviewsOpen(false)} />
      <AIAssistant />
    </div>
  );
}
