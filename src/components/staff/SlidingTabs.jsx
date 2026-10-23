import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

// Pill navigation with a single dark "active" pill that glides to the chosen tab
// (leading edge moves first, the trailing edge follows) and optional count badges.
export default function SlidingTabs({ tabs, active, onChange }) {
  const box = useRef(null);
  const [pos, setPos] = useState(null);
  const [ready, setReady] = useState(false);

  const measure = useCallback(() => {
    const el = box.current?.querySelector(`[data-k="${active}"]`);
    if (el) setPos({ l: el.offsetLeft, w: el.offsetWidth });
  }, [active, tabs.length]);

  useLayoutEffect(measure, [measure, tabs.map((t) => t.l).join('|')]);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 50); // no glide on the very first paint
    window.addEventListener('resize', measure);
    document.fonts?.ready?.then(measure);
    return () => { clearTimeout(t); window.removeEventListener('resize', measure); };
  }, [measure]);

  return (
    <nav aria-label="Console sections" className="max-w-full overflow-x-auto">
      <div ref={box} role="tablist" className="relative inline-flex gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-sm">
        {pos && (
          <span
            aria-hidden="true"
            className="sliding-pill absolute bottom-1 top-1 rounded-full bg-slate-900 shadow"
            style={{ left: pos.l, width: pos.w, transition: ready ? 'left .34s cubic-bezier(.22,1,.36,1), width .5s cubic-bezier(.22,1,.36,1)' : 'none' }}
          />
        )}
        {tabs.map((t) => {
          const on = active === t.k;
          return (
            <button
              key={t.k} data-k={t.k} type="button" role="tab" aria-selected={on}
              onClick={() => onChange(t.k)}
              className={`relative z-10 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors ${on ? 'text-white' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <span aria-hidden="true">{t.icon}</span>
              <span>{t.l}</span>
              {t.badge ? (
                <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white" style={{ backgroundColor: t.badgeColor || '#f97316' }}>{t.badge}</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
