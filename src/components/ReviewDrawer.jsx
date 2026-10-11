import { useEffect, useRef, useState } from 'react';
import ReviewsPanel from './ReviewsPanel.jsx';

// Right-side slide-out drawer hosting the reviews interface.
export default function ReviewDrawer({ open, onClose }) {
  const drawerRef = useRef(null);
  // Mount the reviews content on first open and keep it mounted so the
  // close animation isn't empty and scroll position/data persist.
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    if (open) setRendered(true);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    // Prevent background scrolling while the drawer is open.
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Move focus into the drawer when it opens.
    drawerRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        style={{ backgroundColor: 'rgba(0,0,0,0.25)', zIndex: 44 }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Reviews"
        tabIndex={-1}
        className={`fixed top-0 right-0 flex h-full flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ width: 'min(420px, 100vw)', zIndex: 45, outline: 'none' }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: '#E1EAF2', backgroundColor: '#F5F9FC' }}>
          <div>
            <h2 className="text-lg font-extrabold" style={{ color: '#102A43' }}>Reviews</h2>
            <p className="text-xs" style={{ color: '#6B8198' }}>Community feedback</p>
          </div>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-xl transition hover:bg-white"
            style={{ color: '#6B8198' }}
            onClick={onClose}
            aria-label="Close reviews"
          >
            ×
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto" style={{ backgroundColor: '#F5F9FC' }}>
          {rendered && (
            <div className="p-4">
              <ReviewsPanel />
            </div>
          )}
        </div>
      </aside>
    </>
  );
}