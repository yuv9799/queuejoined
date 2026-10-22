import { useEffect, useMemo, useRef, useState } from 'react';

// Doctor availability for one day: every doctor's duty shift split into
// consultation slots (avg consultation minutes), each marked
//   allotted  – a token is/was assigned to that slot (actual, from the token times)
//   queued    – a waiting token is projected into the next free slot (today only)
//   free      – open and still in the future
//   past      – open but already elapsed
// Doctors who are offline / on break are shown as unavailable.
const PX_PER_MIN = 2;
const NAME_W = 220;
const ENDED = ['completed', 'cancelled', 'skipped', 'no_show', 'expired'];
const WAITING = ['queued', 'held'];
const UNAVAILABLE = ['offline', 'break'];
const STATUS_TXT = { available: 'Available', busy: 'Busy', in_consultation: 'In consultation', break: 'On break', offline: 'Offline', emergency: 'Emergency' };
const STATUS_CLR = { available: '#16a34a', busy: '#d97706', in_consultation: '#0891b2', break: '#a16207', offline: '#94a3b8', emergency: '#dc2626' };

function parseTs(v) {
  if (!v) return null;
  const iso = String(v).includes('T') ? v : String(v).replace(' ', 'T');
  const d = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : iso + 'Z');
  return Number.isNaN(d.getTime()) ? null : d;
}
const mins = (hhmm, fb) => { const m = /^(\d\d):(\d\d)$/.exec(hhmm || ''); return m ? +m[1] * 60 + +m[2] : fb; };
const sod = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const sameDay = (a, b) => sod(a).getTime() === sod(b).getTime();
const clock = (m) => { const h = Math.floor(m / 60) % 24; const mm = m % 60; return `${((h + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };
const minOfDay = (d) => d.getHours() * 60 + d.getMinutes();

export function buildSlots(doc, tokens, day, now) {
  const start = mins(doc.shift_start, 540);
  const end = Math.max(start + 15, mins(doc.shift_end, 1020));
  const len = Math.min(60, Math.max(5, Number(doc.avg_consultation_minutes) || 10));
  const n = Math.floor((end - start) / len);
  const slots = Array.from({ length: n }, (_, i) => ({ from: start + i * len, to: start + (i + 1) * len, kind: 'free', token: null }));
  const isToday = sameDay(day, now);
  const nowMin = isToday ? minOfDay(now) : day < sod(now) ? 24 * 60 : -1;
  const mine = tokens.filter((t) => Number(t.doctor_id) === Number(doc.id));

  // actual: tokens served / being served that day -> occupy the slots they overlap
  for (const t of mine) {
    if (WAITING.includes(t.status)) continue;
    const s = parseTs(t.called_at) || parseTs(t.created_at);
    if (!s || !sameDay(s, day)) continue;
    const from = minOfDay(s);
    let to = parseTs(t.completed_at) ? minOfDay(parseTs(t.completed_at)) : from + len;
    if (!ENDED.includes(t.status)) to = Math.max(to, isToday ? nowMin : from + len);
    if (to <= from) to = from + len;
    for (const sl of slots) if (sl.from < to && sl.to > from && !sl.token) { sl.kind = 'allotted'; sl.token = t; }
  }
  // projected: waiting tokens fill the next free slots, in arrival order (today only)
  let overflow = 0;
  if (isToday && !UNAVAILABLE.includes(doc.status)) {
    const waiting = mine.filter((t) => WAITING.includes(t.status)).sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
    let i = 0;
    for (const t of waiting) {
      while (i < slots.length && (slots[i].kind !== 'free' || slots[i].to <= nowMin)) i++;
      if (i >= slots.length) { overflow++; continue; }
      slots[i].kind = 'queued'; slots[i].token = t; i++;
    }
  }
  for (const sl of slots) {
    if (sl.kind === 'free') {
      if (UNAVAILABLE.includes(doc.status) && sl.to > nowMin) sl.kind = 'unavailable';
      else if (sl.to <= nowMin) sl.kind = 'past';
    }
  }
  const count = (k) => slots.filter((s) => s.kind === k).length;
  const nextFree = slots.find((s) => s.kind === 'free');
  const onDuty = isToday && nowMin >= start && nowMin < end && !UNAVAILABLE.includes(doc.status);
  const current = slots.find((s) => s.from <= nowMin && nowMin < s.to);
  const freeNow = onDuty && current && (current.kind === 'free');
  return { slots, start, end, len, allotted: count('allotted') + count('queued'), free: count('free'), nextFree, overflow, onDuty, freeNow };
}

const SLOT_STYLE = {
  free: { backgroundColor: '#ECFDF5', border: '1px solid #6EE7B7', color: '#047857' },
  past: { backgroundColor: '#F1F5F9', border: '1px solid #E2E8F0', color: '#94A3B8' },
  unavailable: { backgroundColor: '#FEF2F2', border: '1px dashed #FCA5A5', color: '#B91C1C' },
};

export default function DoctorSchedule({ day, doctors, tokens, hiddenDepts, selectedId, onSelect }) {
  const [now, setNow] = useState(() => new Date());
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all'); // all | free | busy | off
  const [limit, setLimit] = useState(30);
  const box = useRef(null);
  const scrolled = useRef(false);
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(t); }, []);
  useEffect(() => { setLimit(30); }, [q, filter, hiddenDepts]);

  const rows = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return (doctors || [])
      .filter((d) => d.active !== false && !hiddenDepts.has(d.department_id))
      .filter((d) => !ql || [d.name, d.specialization, d.room, d.department_name].some((v) => String(v || '').toLowerCase().includes(ql)))
      .map((d) => ({ d, s: buildSlots(d, tokens || [], day, now) }));
  }, [doctors, tokens, day, now, q, hiddenDepts]);

  const shown = rows.filter(({ d, s }) => (
    filter === 'all' ? true
      : filter === 'free' ? s.freeNow || (s.free > 0 && !UNAVAILABLE.includes(d.status))
      : filter === 'busy' ? s.allotted > 0
      : UNAVAILABLE.includes(d.status)
  ));

  const startMin = Math.min(540, ...shown.map((r) => r.s.start));
  const endMin = Math.max(1020, ...shown.map((r) => r.s.end));
  const hours = []; for (let m = Math.ceil(startMin / 60) * 60; m <= endMin; m += 60) hours.push(m);
  const width = (endMin - startMin) * PX_PER_MIN;
  const nowMin = sameDay(day, now) ? minOfDay(now) : null;

  const tot = rows.reduce((a, { d, s }) => ({
    onDuty: a.onDuty + (s.onDuty ? 1 : 0), freeNow: a.freeNow + (s.freeNow ? 1 : 0), allotted: a.allotted + s.allotted, free: a.free + (UNAVAILABLE.includes(d.status) ? 0 : s.free),
  }), { onDuty: 0, freeNow: 0, allotted: 0, free: 0 });

  // open scrolled to "now" (an hour of context to the left) the first time rows appear
  useEffect(() => {
    if (scrolled.current || !box.current || shown.length === 0 || nowMin == null) return;
    box.current.scrollLeft = Math.max(0, (nowMin - startMin - 60) * PX_PER_MIN);
    scrolled.current = true;
  });

  const sel = rows.find((r) => r.d.id === selectedId);
  const soonest = rows.filter((r) => r.s.nextFree && !UNAVAILABLE.includes(r.d.status)).sort((a, b) => a.s.nextFree.from - b.s.nextFree.from).slice(0, 8);

  return (
    <>
      <section className="flex min-w-0 flex-col">
        <div className="space-y-3 border-b border-slate-200 px-4 py-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[['On duty now', tot.onDuty], ['Free right now', tot.freeNow], ['Allotted slots', tot.allotted], ['Free slots left', tot.free]].map(([l, v]) => (
              <div key={l} className="rounded-xl bg-slate-50 px-3 py-2"><p className="text-lg font-black text-slate-900">{v}</p><p className="text-[11px] font-semibold text-slate-500">{l}</p></div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input className="input !w-56 !py-1.5 text-sm" placeholder="Search doctor, room, specialty…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search doctors" />
            <select className="input !w-auto !py-1.5 text-sm" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter doctors">
              <option value="all">All doctors</option><option value="free">Has free slots</option><option value="busy">Has allotted slots</option><option value="off">Offline / on break</option>
            </select>
            <span className="ml-auto flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
              <span className="flex items-center gap-1"><i className="h-3 w-4 rounded-sm" style={{ background: '#2563eb' }} />Allotted</span>
              <span className="flex items-center gap-1"><i className="h-3 w-4 rounded-sm border border-dashed" style={{ borderColor: '#2563eb', background: '#DBEAFE' }} />Queued (next)</span>
              <span className="flex items-center gap-1"><i className="h-3 w-4 rounded-sm" style={SLOT_STYLE.free} />Free</span>
              <span className="flex items-center gap-1"><i className="h-3 w-4 rounded-sm" style={SLOT_STYLE.past} />Elapsed</span>
            </span>
          </div>
        </div>

        <div ref={box} className="overflow-auto" style={{ maxHeight: 600 }}>
          <div style={{ width: NAME_W + width, minWidth: '100%' }}>
            <div className="sticky top-0 z-30 flex border-b border-slate-200 bg-white">
              <div className="sticky left-0 z-40 shrink-0 border-r border-slate-200 bg-white px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400" style={{ width: NAME_W }}>Doctor · {shown.length}</div>
              <div className="relative h-8" style={{ width }}>
                {hours.map((m) => <span key={m} className="absolute top-2 -translate-x-1/2 text-[10px] font-medium text-slate-400" style={{ left: (m - startMin) * PX_PER_MIN }}>{clock(m)}</span>)}
              </div>
            </div>

            {shown.length === 0 && <p className="p-8 text-center text-sm text-slate-400">No doctors match.</p>}
            {shown.slice(0, limit).map(({ d, s }) => {
              const off = UNAVAILABLE.includes(d.status);
              const color = d.department_color || '#2563eb';
              return (
                <div key={d.id} className={`flex border-b border-slate-100 ${selectedId === d.id ? 'bg-slate-50' : ''}`}>
                  <button type="button" onClick={() => onSelect(selectedId === d.id ? null : d.id)} className="sticky left-0 z-20 flex shrink-0 items-center gap-2 border-r border-slate-200 bg-white px-3 py-2 text-left hover:bg-slate-50" style={{ width: NAME_W }}>
                    <span className="h-9 w-1 shrink-0 rounded" style={{ backgroundColor: color }} />
                    <span className="min-w-0">
                      <b className="block truncate text-[13px] text-slate-800">{d.name}</b>
                      <span className="block truncate text-[11px] text-slate-500">{d.specialization || d.department_name}{d.room ? ` · ${d.room}` : ''}</span>
                      <span className="flex items-center gap-1.5 text-[10px] font-semibold" style={{ color: STATUS_CLR[d.status] || '#64748b' }}>
                        <i className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: STATUS_CLR[d.status] || '#64748b' }} />{STATUS_TXT[d.status] || d.status}
                        <span className="font-medium text-slate-400">· {s.allotted} allotted · {off ? 0 : s.free} free</span>
                      </span>
                    </span>
                  </button>
                  <div className="relative" style={{ width, height: 56 }}>
                    {hours.map((m) => <span key={m} className="absolute inset-y-0 border-l border-slate-100" style={{ left: (m - startMin) * PX_PER_MIN }} />)}
                    {s.slots.map((sl) => {
                      const st = sl.kind === 'allotted' ? { backgroundColor: color, color: '#fff', border: `1px solid ${color}` }
                        : sl.kind === 'queued' ? { backgroundColor: color + '26', color: '#102A43', border: `1px dashed ${color}` }
                        : SLOT_STYLE[sl.kind];
                      const label = sl.token ? (sl.token.token_code || sl.token.token_number) : sl.kind === 'free' ? 'Free' : '';
                      return (
                        <div
                          key={sl.from}
                          title={`${clock(sl.from)}–${clock(sl.to)} · ${sl.kind === 'allotted' ? `Allotted: ${sl.token.token_code || sl.token.token_number}` : sl.kind === 'queued' ? `Next: ${sl.token.token_code || sl.token.token_number} (waiting)` : sl.kind === 'free' ? 'Free' : sl.kind === 'unavailable' ? `Unavailable (${STATUS_TXT[d.status]})` : 'Elapsed, free'}`}
                          className="absolute top-2 flex items-center justify-center overflow-hidden rounded-md text-[10px] font-bold"
                          style={{ left: (sl.from - startMin) * PX_PER_MIN + 1, width: (sl.to - sl.from) * PX_PER_MIN - 2, height: 40, ...st }}
                        >{(sl.to - sl.from) * PX_PER_MIN > 34 ? label : ''}</div>
                      );
                    })}
                    {nowMin != null && nowMin >= startMin && nowMin <= endMin && <span className="pointer-events-none absolute inset-y-0 z-10 border-l-2 border-red-500" style={{ left: (nowMin - startMin) * PX_PER_MIN }} />}
                  </div>
                </div>
              );
            })}
            {shown.length > limit && (
              <div className="sticky left-0 p-3 text-center"><button type="button" className="btn-secondary !py-1.5" onClick={() => setLimit((l) => l + 30)}>Show more ({shown.length - limit} left)</button></div>
            )}
          </div>
        </div>
      </section>

      <aside className="space-y-5 border-t border-slate-200 p-4 text-sm lg:border-l lg:border-t-0">
        {sel ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-base font-black text-slate-900">{sel.d.name}</p>
              <button type="button" aria-label="Close details" className="text-slate-400 hover:text-slate-700" onClick={() => onSelect(null)}>✕</button>
            </div>
            <p className="text-xs text-slate-500">{sel.d.specialization || sel.d.department_name}{sel.d.room ? ` · ${sel.d.room}` : ''}</p>
            <dl className="mt-2 space-y-1 text-xs text-slate-600">
              <div><dt className="inline font-semibold">Status: </dt><dd className="inline">{STATUS_TXT[sel.d.status] || sel.d.status}</dd></div>
              <div><dt className="inline font-semibold">Shift: </dt><dd className="inline">{clock(sel.s.start)} – {clock(sel.s.end)} · {sel.s.len} min slots</dd></div>
              <div><dt className="inline font-semibold">Slots: </dt><dd className="inline">{sel.s.allotted} allotted · {UNAVAILABLE.includes(sel.d.status) ? 0 : sel.s.free} free</dd></div>
              <div><dt className="inline font-semibold">Next free: </dt><dd className="inline">{UNAVAILABLE.includes(sel.d.status) ? 'Unavailable' : sel.s.nextFree ? clock(sel.s.nextFree.from) : 'No free slot'}</dd></div>
              {sel.s.overflow > 0 && <div className="font-semibold text-amber-700">{sel.s.overflow} waiting token{sel.s.overflow > 1 ? 's' : ''} beyond today&apos;s shift</div>}
            </dl>
            <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Allotted slots</p>
            <ul className="mt-1 max-h-60 space-y-1 overflow-y-auto">
              {sel.s.slots.filter((x) => x.token).map((x) => (
                <li key={x.from} className="flex items-center justify-between rounded-lg bg-white px-2 py-1.5 text-xs">
                  <b>{x.token.token_code || x.token.token_number}</b>
                  <span className="text-slate-500">{clock(x.from)} · {x.kind === 'queued' ? 'waiting' : x.token.status.replace('_', ' ')}</span>
                </li>
              ))}
              {!sel.s.slots.some((x) => x.token) && <li className="text-xs text-slate-400">No tokens allotted.</li>}
            </ul>
          </div>
        ) : (
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Earliest free slots</p>
            <ul className="mt-2 space-y-1.5">
              {soonest.map(({ d, s }) => (
                <li key={d.id}>
                  <button type="button" onClick={() => onSelect(d.id)} className="flex w-full items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-2 text-left hover:bg-slate-100">
                    <span className="h-8 w-1 shrink-0 rounded" style={{ backgroundColor: d.department_color }} />
                    <span className="min-w-0 flex-1"><b className="block truncate text-xs text-slate-800">{d.name}</b><span className="text-[11px] text-slate-500">{d.department_name}</span></span>
                    <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-bold text-emerald-700">{clock(s.nextFree.from)}</span>
                  </button>
                </li>
              ))}
              {soonest.length === 0 && <li className="text-xs text-slate-400">No free slots left for this day.</li>}
            </ul>
          </div>
        )}
      </aside>
    </>
  );
}
