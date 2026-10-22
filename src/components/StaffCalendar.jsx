import { useEffect, useMemo, useRef, useState } from 'react';

// Staff-only schedule calendar (website version). Shows every token as a block on
// a week/day time grid, filterable by department, with a mini month, a live
// "Up next" panel and keyboard shortcuts. Data comes from the console's own
// token list, so it updates in real time with the rest of the staff screens.
const HOUR_PX = 56;
const ENDED = ['completed', 'cancelled', 'skipped', 'no_show', 'expired'];
const ACTIVE = ['queued', 'called', 'serving', 'in_consultation', 'held'];
const STATUS_LABEL = {
  queued: 'Waiting', called: 'Called', serving: 'In consultation', in_consultation: 'In consultation',
  held: 'On hold', completed: 'Completed', skipped: 'Skipped', no_show: 'No-show', cancelled: 'Cancelled', expired: 'Expired',
};

function parseTs(v) {
  if (!v) return null;
  const iso = String(v).includes('T') ? v : String(v).replace(' ', 'T');
  const d = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : iso + 'Z');
  return Number.isNaN(d.getTime()) ? null : d;
}
const dayKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const sod = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d, n) => { const x = sod(d); x.setDate(x.getDate() + n); return x; };
const weekStart = (d) => addDays(d, -((d.getDay() + 6) % 7));
const fmtT = (d) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const hourLabel = (h) => `${((h + 11) % 12) + 1} ${h < 12 ? 'AM' : 'PM'}`;

// Group overlapping blocks into clusters; inside a cluster, assign side-by-side
// lanes. A cluster needing more than MAX_LANES lanes (a burst of tokens in the
// same half hour) is shown as ONE "N tokens" block instead of unreadable slivers.
const MAX_LANES = 3;
function layout(evts) {
  const sorted = [...evts].sort((a, b) => a.start - b.start || a.end - b.end);
  const clusters = [];
  let cur = null;
  for (const e of sorted) {
    if (cur && e.start < cur.end) { cur.items.push(e); if (e.end > cur.end) cur.end = e.end; }
    else { cur = { start: e.start, end: e.end, items: [e] }; clusters.push(cur); }
  }
  const out = [];
  for (const c of clusters) {
    const lanesEnd = [];
    const placed = c.items.map((e) => {
      let lane = lanesEnd.findIndex((end) => end <= e.start);
      if (lane === -1) { lane = lanesEnd.length; lanesEnd.push(e.end); } else lanesEnd[lane] = e.end;
      return { ...e, lane };
    });
    const lanes = lanesEnd.length;
    if (lanes > MAX_LANES) out.push({ kind: 'group', start: c.start, end: c.end, items: c.items.map((i) => i.t) });
    else placed.forEach((e) => out.push({ kind: 'one', ...e, lanes }));
  }
  return out;
}

function MiniMonth({ selected, onPick, counts }) {
  const [cursor, setCursor] = useState(() => new Date(selected.getFullYear(), selected.getMonth(), 1));
  useEffect(() => { setCursor(new Date(selected.getFullYear(), selected.getMonth(), 1)); }, [selected]);
  const start = weekStart(cursor);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const selWeek = weekStart(selected).getTime();
  const today = dayKey(new Date());
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-bold text-slate-800">{cursor.toLocaleDateString([], { month: 'short', year: 'numeric' })}</span>
        <span className="flex gap-1">
          <button type="button" aria-label="Previous month" className="rounded px-1.5 text-slate-500 hover:bg-slate-100" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>‹</button>
          <button type="button" aria-label="Next month" className="rounded px-1.5 text-slate-500 hover:bg-slate-100" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>›</button>
        </span>
      </div>
      <div className="grid grid-cols-7 text-center text-[10px] font-semibold text-slate-400">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <span key={i} className="py-1">{d}</span>)}
      </div>
      <div className="grid grid-cols-7 text-center text-xs">
        {cells.map((d) => {
          const inWeek = weekStart(d).getTime() === selWeek;
          const isToday = dayKey(d) === today;
          const other = d.getMonth() !== cursor.getMonth();
          return (
            <button
              key={d.getTime()} type="button" onClick={() => onPick(d)}
              className={`relative my-px py-1.5 ${inWeek ? 'bg-slate-100' : ''} ${other ? 'text-slate-300' : 'text-slate-700'}`}
            >
              <span className={`mx-auto flex h-6 w-6 items-center justify-center rounded-md ${isToday ? 'bg-red-500 font-bold text-white' : ''}`}>{d.getDate()}</span>
              {counts[dayKey(d)] ? <span className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-blue-500" /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function StaffCalendar({ tokens, departments, onOpenToken }) {
  const [selected, setSelected] = useState(() => new Date());
  const [view, setView] = useState('week'); // week | day
  const [hidden, setHidden] = useState(() => new Set()); // hidden department ids
  const [openId, setOpenId] = useState(null);
  const [group, setGroup] = useState(null); // tokens of a clicked "N tokens" block
  const [now, setNow] = useState(() => new Date());
  const scroller = useRef(null);

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(t); }, []);
  useEffect(() => {
    // open scrolled to the working day (first event of the visible days, else ~8 AM)
    if (scroller.current) scroller.current.scrollTop = 0;
  }, [selected, view]);

  const deptColor = useMemo(() => Object.fromEntries((departments || []).map((d) => [d.id, d.color])), [departments]);

  const evts = useMemo(() => {
    const out = [];
    for (const t of tokens || []) {
      if (hidden.has(t.department_id)) continue;
      const start = parseTs(t.created_at);
      if (!start) continue;
      let end = parseTs(t.completed_at);
      // Block = the token's service window: created -> completed when known, else a 30 min slot.
      if (!end || end <= start || end - start > 4 * 3600000) end = new Date(start.getTime() + 30 * 60000);
      if (end - start < 30 * 60000) end = new Date(start.getTime() + 30 * 60000);
      out.push({ t, start, end });
    }
    return out;
  }, [tokens, hidden]);

  const counts = useMemo(() => { const m = {}; for (const e of evts) m[dayKey(e.start)] = (m[dayKey(e.start)] || 0) + 1; return m; }, [evts]);

  const visibleKeys = new Set((view === 'day' ? [sod(selected)] : Array.from({ length: 7 }, (_, i) => addDays(weekStart(selected), i))).map(dayKey));
  let START_H = 6; let END_H = 22;
  for (const e of evts) {
    if (!visibleKeys.has(dayKey(e.start))) continue;
    START_H = Math.min(START_H, e.start.getHours());
    END_H = Math.max(END_H, Math.min(24, e.end.getHours() + 1));
  }
  const days = view === 'day' ? [sod(selected)] : Array.from({ length: 7 }, (_, i) => addDays(weekStart(selected), i));
  const step = (dir) => setSelected((s) => addDays(s, (view === 'day' ? 1 : 7) * dir));
  const todayKey = dayKey(now);

  // keyboard shortcuts: T today · D day · W week · ←/→ navigate
  useEffect(() => {
    const onKey = (e) => {
      if (/input|textarea|select/i.test(e.target?.tagName) || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 't') setSelected(new Date());
      else if (k === 'd') setView('day');
      else if (k === 'w') setView('week');
      else if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'ArrowRight') step(1);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const upNext = useMemo(
    () => (tokens || [])
      .filter((t) => ACTIVE.includes(t.status) && !hidden.has(t.department_id))
      .sort((a, b) => (a.status === 'called' ? -1 : 0) - (b.status === 'called' ? -1 : 0) || String(a.created_at).localeCompare(String(b.created_at)))
      .slice(0, 6),
    [tokens, hidden]
  );
  const dayEvts = evts.filter((e) => dayKey(e.start) === dayKey(selected));
  const stat = (f) => dayEvts.filter((e) => f(e.t)).length;
  const open = (tokens || []).find((t) => t.id === openId);
  const hours = Array.from({ length: END_H - START_H }, (_, i) => START_H + i);
  const allOn = hidden.size === 0;

  return (
    <div className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white lg:grid-cols-[230px_1fr_280px]" style={{ minHeight: 640 }}>
      {/* Left: mini month + department filters */}
      <aside className="hidden border-r border-slate-200 p-4 lg:block">
        <MiniMonth selected={selected} onPick={setSelected} counts={counts} />
        <div className="mt-5 flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Departments</p>
          <button type="button" className="text-[11px] font-semibold text-blue-600 hover:underline" onClick={() => setHidden(allOn ? new Set((departments || []).map((d) => d.id)) : new Set())}>
            {allOn ? 'Hide all' : 'Show all'}
          </button>
        </div>
        <ul className="mt-2 max-h-72 space-y-0.5 overflow-y-auto pr-1">
          {(departments || []).map((d) => {
            const on = !hidden.has(d.id);
            return (
              <li key={d.id}>
                <label className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-sm text-slate-700 hover:bg-slate-50">
                  <input
                    type="checkbox" checked={on} className="sr-only"
                    onChange={() => setHidden((h) => { const n = new Set(h); if (on) n.add(d.id); else n.delete(d.id); return n; })}
                  />
                  <span className="flex h-4 w-4 items-center justify-center rounded border-2" style={{ borderColor: d.color, backgroundColor: on ? d.color : 'transparent' }} aria-hidden="true">
                    {on && <span className="text-[10px] leading-none text-white">✓</span>}
                  </span>
                  <span className={`truncate ${on ? '' : 'text-slate-400'}`}>{d.name}</span>
                </label>
              </li>
            );
          })}
        </ul>
      </aside>

      {/* Center: time grid */}
      <section className="flex min-w-0 flex-col">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
          <h2 className="text-2xl font-black text-slate-900">
            {days[0].toLocaleDateString([], { month: 'long' })}{' '}
            <span className="font-medium text-slate-500">{days[0].getFullYear()}</span>
          </h2>
          <div className="flex items-center gap-2">
            <select className="input !w-auto !py-1.5 text-sm" value={view} onChange={(e) => setView(e.target.value)} aria-label="Calendar view">
              <option value="week">Week</option>
              <option value="day">Day</option>
            </select>
            <button type="button" className="btn-secondary !py-1.5" onClick={() => setSelected(new Date())}>Today</button>
            <button type="button" className="btn-secondary !px-2.5 !py-1.5" aria-label="Previous" onClick={() => step(-1)}>‹</button>
            <button type="button" className="btn-secondary !px-2.5 !py-1.5" aria-label="Next" onClick={() => step(1)}>›</button>
          </div>
        </div>

        <div className="grid border-b border-slate-200" style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(0,1fr))` }}>
          <div />
          {days.map((d) => (
            <button key={d.getTime()} type="button" onClick={() => { setSelected(d); }} className="py-2 text-center">
              <span className="text-xs font-semibold text-slate-500">{d.toLocaleDateString([], { weekday: 'short' })}</span>{' '}
              <span className={`inline-flex h-6 min-w-6 items-center justify-center rounded-md px-1 text-sm font-bold ${dayKey(d) === todayKey ? 'bg-red-500 text-white' : 'text-slate-800'}`}>{d.getDate()}</span>
            </button>
          ))}
        </div>

        <div ref={scroller} className="relative overflow-y-auto" style={{ maxHeight: 600 }}>
          <div className="grid" style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(0,1fr))`, height: (END_H - START_H) * HOUR_PX }}>
            <div className="relative">
              {hours.map((h) => (
                <span key={h} className="absolute right-2 -translate-y-1/2 text-[10px] font-medium text-slate-400" style={{ top: (h - START_H) * HOUR_PX }}>{h === START_H ? '' : hourLabel(h)}</span>
              ))}
            </div>
            {days.map((d) => {
              const k = dayKey(d);
              const col = layout(evts.filter((e) => dayKey(e.start) === k));
              return (
                <div key={k} className="relative border-l border-slate-100">
                  {hours.map((h) => <div key={h} className="absolute inset-x-0 border-t border-slate-100" style={{ top: (h - START_H) * HOUR_PX }} />)}
                  {k === todayKey && now.getHours() >= START_H && now.getHours() < END_H && (
                    <div className="pointer-events-none absolute inset-x-0 z-20 border-t-2 border-red-500" style={{ top: ((now.getHours() - START_H) + now.getMinutes() / 60) * HOUR_PX }}>
                      <span className="absolute -left-1 -top-[5px] h-2 w-2 rounded-full bg-red-500" />
                    </div>
                  )}
                  {col.map((e) => {
                    const top = Math.max(0, ((e.start.getHours() - START_H) + e.start.getMinutes() / 60) * HOUR_PX);
                    const h = Math.max(24, Math.min(((e.end - e.start) / 3600000) * HOUR_PX, (END_H - START_H) * HOUR_PX - top));
                    if (e.kind === 'group') {
                      const gid = e.items.map((t) => t.id).join(',');
                      return (
                        <button
                          key={`g${gid}`} type="button" onClick={() => { setGroup(e.items); setOpenId(null); }}
                          title={`${e.items.length} tokens, ${fmtT(e.start)}`}
                          className="absolute z-10 overflow-hidden rounded-md border border-slate-300 bg-slate-100 px-1.5 py-0.5 text-left text-[11px] leading-tight hover:shadow-md"
                          style={{ top, height: h - 1, left: 2, right: 2 }}
                        >
                          <b className="block truncate text-slate-800">{e.items.length} tokens</b>
                          <span className="flex gap-0.5 pt-0.5">
                            {[...new Set(e.items.map((t) => deptColor[t.department_id] || t.department_color))].slice(0, 8).map((c) => <span key={c} className="h-1.5 w-3 rounded-sm" style={{ backgroundColor: c }} />)}
                          </span>
                          {h > 44 && <span className="block truncate text-slate-500">{fmtT(e.start)}</span>}
                        </button>
                      );
                    }
                    const c = deptColor[e.t.department_id] || e.t.department_color || '#2563eb';
                    const ended = ENDED.includes(e.t.status);
                    return (
                      <button
                        key={e.t.id} type="button" onClick={() => { setOpenId(e.t.id); setGroup(null); }}
                        title={`${e.t.token_code || e.t.token_number} · ${e.t.department_name} · ${STATUS_LABEL[e.t.status] || e.t.status}`}
                        className={`absolute z-10 overflow-hidden rounded-md px-1.5 py-0.5 text-left text-[11px] leading-tight transition hover:z-30 hover:shadow-md ${openId === e.t.id ? 'ring-2 ring-slate-900' : ''}`}
                        style={{
                          top, height: h - 1, left: `calc(${(e.lane / e.lanes) * 100}% + 2px)`, width: `calc(${100 / e.lanes}% - 4px)`,
                          backgroundColor: c + (ended ? '1F' : '33'), borderLeft: `3px solid ${c}`, color: '#102A43', opacity: ended ? 0.8 : 1,
                          textDecoration: ['cancelled', 'skipped', 'no_show'].includes(e.t.status) ? 'line-through' : 'none',
                        }}
                      >
                        <b className="block truncate">{e.t.token_code || e.t.token_number} · {e.t.department_name}</b>
                        {h > 34 && <span className="block truncate text-slate-500">{fmtT(e.start)} · {STATUS_LABEL[e.t.status] || e.t.status}</span>}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Right: details / up next / shortcuts */}
      <aside className="space-y-5 border-t border-slate-200 p-4 text-sm lg:border-l lg:border-t-0">
        {group && !open ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-base font-black text-slate-900">{group.length} tokens</p>
              <button type="button" aria-label="Close list" className="text-slate-400 hover:text-slate-700" onClick={() => setGroup(null)}>✕</button>
            </div>
            <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto">
              {group.map((t) => (
                <li key={t.id}>
                  <button type="button" onClick={() => setOpenId(t.id)} className="flex w-full items-center gap-2 rounded-lg bg-white px-2 py-1.5 text-left text-xs hover:bg-slate-100">
                    <span className="h-6 w-1 shrink-0 rounded" style={{ backgroundColor: deptColor[t.department_id] || t.department_color }} />
                    <span className="min-w-0 flex-1"><b className="block truncate">{t.token_code || t.token_number} · {t.department_name}</b><span className="text-slate-500">{STATUS_LABEL[t.status] || t.status}</span></span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : open ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-base font-black text-slate-900">{open.token_code || open.token_number}</p>
              <button type="button" aria-label="Close details" className="text-slate-400 hover:text-slate-700" onClick={() => setOpenId(null)}>✕</button>
            </div>
            <p className="text-xs font-bold" style={{ color: deptColor[open.department_id] || '#2563eb' }}>{STATUS_LABEL[open.status] || open.status}</p>
            <dl className="mt-2 space-y-1 text-xs text-slate-600">
              <div><dt className="inline font-semibold">Department: </dt><dd className="inline">{open.department_name}</dd></div>
              <div><dt className="inline font-semibold">Area: </dt><dd className="inline">{[open.area_name, open.area_floor].filter(Boolean).join(' · ') || '—'}</dd></div>
              <div><dt className="inline font-semibold">Doctor: </dt><dd className="inline">{open.doctor_name || 'Unassigned'}{open.doctor_room ? ` (${open.doctor_room})` : ''}</dd></div>
              {open.patient_name && <div><dt className="inline font-semibold">Patient: </dt><dd className="inline">{open.patient_name}</dd></div>}
              <div><dt className="inline font-semibold">Created: </dt><dd className="inline">{parseTs(open.created_at) ? fmtT(parseTs(open.created_at)) : '—'}</dd></div>
              {open.completed_at && <div><dt className="inline font-semibold">Completed: </dt><dd className="inline">{fmtT(parseTs(open.completed_at))}</dd></div>}
            </dl>
            {onOpenToken && <button type="button" className="btn-secondary mt-3 w-full !py-1.5" onClick={() => onOpenToken(open)}>Manage in Tokens tab</button>}
          </div>
        ) : (
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {selected.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'short' })}
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-center">
              {[['Tokens', dayEvts.length], ['Waiting', stat((t) => t.status === 'queued')], ['Completed', stat((t) => t.status === 'completed')], ['Cancelled / skipped', stat((t) => ['cancelled', 'skipped', 'no_show'].includes(t.status))]].map(([l, v]) => (
                <div key={l} className="rounded-xl bg-slate-50 p-2"><p className="text-lg font-black text-slate-900">{v}</p><p className="text-[10px] font-semibold text-slate-500">{l}</p></div>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Up next · {upNext.length ? 'live queue' : 'queue empty'}</p>
          <ul className="mt-2 space-y-1.5">
            {upNext.map((t) => (
              <li key={t.id}>
                <button type="button" onClick={() => { setOpenId(t.id); const d = parseTs(t.created_at); if (d) setSelected(d); }} className="flex w-full items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-2 text-left hover:bg-slate-100">
                  <span className="h-8 w-1 shrink-0 rounded" style={{ backgroundColor: deptColor[t.department_id] || t.department_color }} />
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-xs text-slate-800">{t.token_code || t.token_number} · {t.department_name}</b>
                    <span className="text-[11px] text-slate-500">{STATUS_LABEL[t.status]} · {parseTs(t.created_at) ? fmtT(parseTs(t.created_at)) : ''}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Shortcuts</p>
          <ul className="mt-2 space-y-1 text-xs text-slate-500">
            {[['Go to today', 'T'], ['Day view', 'D'], ['Week view', 'W'], ['Previous / next', '← →']].map(([l, k]) => (
              <li key={l} className="flex items-center justify-between">{l}<kbd className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600">{k}</kbd></li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
