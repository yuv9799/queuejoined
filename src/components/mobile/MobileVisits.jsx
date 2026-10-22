import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api.js';
import { subscribeAll } from '../../services/socket.js';
import { readHistory } from '../../hooks/useActiveToken.js';
import { BackIcon, ChevronIcon, TicketIcon } from './icons.jsx';

// "Visits" calendar: the visitor's OWN tokens (ids saved on this device) laid out
// by day — week strip on top, that day's visits below. No one else's data.
const STATUS = {
  queued: { label: 'Waiting', color: '#2563EB' },
  issued: { label: 'Scheduled', color: '#2563EB' },
  called: { label: 'Called — go in', color: '#B45309' },
  serving: { label: 'In progress', color: '#EA580C' },
  in_consultation: { label: 'In progress', color: '#EA580C' },
  held: { label: 'On hold', color: '#B45309' },
  completed: { label: 'Complete', color: '#15803D' },
  skipped: { label: 'Skipped', color: '#DC2626' },
  no_show: { label: 'Missed', color: '#DC2626' },
  cancelled: { label: 'Cancelled', color: '#6B7280' },
  expired: { label: 'Expired', color: '#6B7280' },
};
const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// Server timestamps are UTC ("YYYY-MM-DD HH:MM:SS") -> local Date.
function parseTs(v) {
  if (!v) return null;
  const iso = v.includes('T') ? v : v.replace(' ', 'T');
  const d = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : iso + 'Z');
  return Number.isNaN(d.getTime()) ? null : d;
}
const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const startOfWeek = (d) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const initials = (n) => (n || 'Dr').replace(/^Dr\.?\s*/i, '').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || 'DR';

export default function MobileVisits() {
  const [items, setItems] = useState(null); // null = loading
  const [selected, setSelected] = useState(() => new Date());
  const [month, setMonth] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const ids = readHistory();
      const out = await Promise.all(ids.map((id) => api.tokenById(id).then((d) => d.token).catch(() => null)));
      if (alive) setItems(out.filter(Boolean));
    };
    load();
    const off = subscribeAll(load);
    return () => { alive = false; off(); };
  }, []);

  const byDay = useMemo(() => {
    const m = {};
    for (const t of items || []) {
      const d = parseTs(t.created_at);
      if (!d) continue;
      (m[dayKey(d)] ||= []).push({ t, d });
    }
    for (const k of Object.keys(m)) m[k].sort((a, b) => a.d - b.d);
    return m;
  }, [items]);

  const weekStart = startOfWeek(selected);
  const days = month
    ? (() => {
        const first = new Date(selected.getFullYear(), selected.getMonth(), 1);
        const start = startOfWeek(first);
        const count = Math.ceil(((first.getDay() + 6) % 7 + new Date(selected.getFullYear(), selected.getMonth() + 1, 0).getDate()) / 7) * 7;
        return Array.from({ length: count }, (_, i) => addDays(start, i));
      })()
    : Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const todayKey = dayKey(new Date());
  const selKey = dayKey(selected);
  const list = byDay[selKey] || [];
  const step = (dir) => setSelected((s) => (month ? new Date(s.getFullYear(), s.getMonth() + dir, 1) : addDays(s, 7 * dir)));

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-[24px] bg-white p-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <button type="button" onClick={() => step(-1)} aria-label={month ? 'Previous month' : 'Previous week'} className="flex h-8 w-8 items-center justify-center rounded-full" style={{ color: '#17191C' }}><BackIcon width={18} height={18} /></button>
          <button type="button" onClick={() => setMonth((m) => !m)} className="text-[15px] font-extrabold" style={{ color: '#17191C' }} aria-label={month ? 'Show week view' : 'Show month view'}>
            {selected.toLocaleDateString([], { month: 'long', year: 'numeric' })} <span className="text-[11px] font-semibold" style={{ color: '#6B7280' }}>{month ? '· Week' : '· Month'}</span>
          </button>
          <button type="button" onClick={() => step(1)} aria-label={month ? 'Next month' : 'Next week'} className="flex h-8 w-8 items-center justify-center rounded-full" style={{ color: '#17191C' }}><ChevronIcon width={18} height={18} /></button>
        </div>
        <div className="grid grid-cols-7 text-center text-[11px] font-semibold" style={{ color: '#6B7280' }}>
          {DOW.map((d, i) => <span key={i}>{d}</span>)}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-y-1 text-center">
          {days.map((d) => {
            const k = dayKey(d); const sel = k === selKey; const has = !!byDay[k];
            const other = month && d.getMonth() !== selected.getMonth();
            return (
              <button
                key={k} type="button" onClick={() => setSelected(d)}
                aria-label={`${d.toDateString()}${has ? ', has visits' : ''}`} aria-pressed={sel}
                className="mx-auto flex h-10 w-10 flex-col items-center justify-center rounded-xl text-[15px] font-semibold"
                style={{ backgroundColor: sel ? '#17191C' : 'transparent', color: sel ? '#fff' : other ? '#C0C6CE' : '#17191C', boxShadow: !sel && k === todayKey ? 'inset 0 0 0 1.5px #17191C' : 'none' }}
              >
                {d.getDate()}
                <span className="mt-0.5 h-1 w-1 rounded-full" style={{ backgroundColor: has ? (sel ? '#fff' : '#2563EB') : 'transparent' }} />
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-center text-xs font-medium" style={{ color: '#6B7280' }}>
        {selected.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </p>

      {items === null ? (
        <div className="space-y-2" aria-hidden="true"><div className="skeleton h-24 rounded-[24px]" /><div className="skeleton h-24 rounded-[24px]" /></div>
      ) : list.length === 0 ? (
        <div className="rounded-[24px] bg-white p-6 text-center shadow-sm">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: '#F3F4F6', color: '#17191C' }}><TicketIcon width={24} height={24} /></span>
          <p className="mt-2 text-sm font-bold" style={{ color: '#17191C' }}>{(items || []).length === 0 ? 'No visits yet' : 'No visits on this day'}</p>
          <p className="mt-0.5 text-xs" style={{ color: '#6B7280' }}>Tokens you generate on this phone show up here.</p>
          <Link to="/kiosk" className="btn-primary mt-3 inline-flex">Generate Token</Link>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {list.map(({ t, d }) => {
            const st = STATUS[t.status] || { label: t.status, color: '#6B7280' };
            return (
              <li key={t.id} className="flex gap-3">
                <div className="w-12 shrink-0 pt-3 text-right text-xs font-semibold leading-tight" style={{ color: '#17191C' }}>
                  {d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).replace(' ', ' ')}
                </div>
                <Link to={`/status?id=${t.id}`} className="block min-w-0 flex-1 rounded-[20px] bg-white p-3.5 shadow-sm active:scale-[0.99] transition">
                  <span className="block text-[11px] font-extrabold uppercase tracking-wide" style={{ color: st.color }}>{st.label}</span>
                  <span className="mt-0.5 block text-[17px] font-extrabold leading-snug" style={{ color: '#17191C' }}>
                    {t.token_code || t.token_number} · {t.department_name}
                  </span>
                  <span className="block truncate text-xs" style={{ color: '#6B7280' }}>{[t.area_name, t.area_floor, t.doctor_room].filter(Boolean).join(' · ')}</span>
                  <span className="mt-2 flex items-center justify-between">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold" style={{ backgroundColor: '#E8EEF6', color: '#075A9F' }}>{initials(t.doctor_name)}</span>
                      <span className="truncate text-sm font-medium" style={{ color: '#17191C' }}>{t.doctor_name || 'Department consultant'}</span>
                    </span>
                    <ChevronIcon width={18} height={18} style={{ color: '#6B7280' }} />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
