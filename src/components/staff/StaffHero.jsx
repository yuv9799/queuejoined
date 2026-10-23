import { useEffect, useMemo, useState } from 'react';

const SH = 7; const EH = 19; // timeline 7 AM – 7 PM
const parseTs = (v) => {
  if (!v) return null;
  const iso = String(v).includes('T') ? v : String(v).replace(' ', 'T');
  const d = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : iso + 'Z');
  return Number.isNaN(d.getTime()) ? null : d;
};
const sameDay = (a, b) => a.toDateString() === b.toDateString();
const hourOf = (d) => d.getHours() + d.getMinutes() / 60;
const fmt = (d) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

export function Sparkline({ values, color = '#2563eb', fill = true, height = 44 }) {
  const w = 160; const pad = 3;
  const max = Math.max(1, ...values); const n = Math.max(2, values.length);
  const pts = values.map((v, i) => [pad + (i * (w - pad * 2)) / (n - 1), height - pad - (v / max) * (height - pad * 2)]);
  if (pts.length < 2) return <svg viewBox={`0 0 ${w} ${height}`} className="h-11 w-full" aria-hidden="true" />;
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1]; const [x1, y1] = pts[i]; const mx = (x0 + x1) / 2;
    d += ` C${mx},${y0} ${mx},${y1} ${x1},${y1}`;
  }
  const area = `${d} L${pts[pts.length - 1][0]},${height} L${pts[0][0]},${height} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="h-11 w-full" preserveAspectRatio="none" aria-hidden="true">
      {fill && <path d={area} fill={color} opacity="0.12" />}
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

// Greeting card: real counts in a sentence + a "today" timeline of every token.
export default function StaffHero({ name, dash, tokens, unassigned, doctorsAvailable, onOpenCalendar, onOpenQueue }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(t); }, []);
  const h = now.getHours();
  const greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const first = String(name || 'there').replace(/^Dr\.?\s*/i, '').split(/\s+/)[0];

  const today = useMemo(() => (tokens || [])
    .map((t) => ({ t, d: parseTs(t.created_at) }))
    .filter((x) => x.d && sameDay(x.d, now)), [tokens, now]);

  const pct = (d) => Math.min(100, Math.max(0, ((hourOf(d) - SH) / (EH - SH)) * 100));
  const nowPct = pct(now);
  const inRange = hourOf(now) >= SH && hourOf(now) <= EH;
  const waiting = dash?.patientsWaiting ?? 0;
  const serving = dash?.activeConsultations ?? 0;
  const ticks = [7, 9, 11, 13, 15, 17, 19];

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-white to-sky-50 p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-widest text-orange-600">
            {now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <h2 className="mt-1 text-3xl font-black tracking-tight text-slate-900">{greet}, {first}.</h2>
          <p className="mt-1 max-w-xl text-sm text-slate-600">
            <b className="text-slate-900">{waiting}</b> patient{waiting === 1 ? '' : 's'} waiting, <b className="text-slate-900">{serving}</b> in consultation and <b className="text-slate-900">{doctorsAvailable}</b> doctor{doctorsAvailable === 1 ? '' : 's'} free right now.{' '}
            {unassigned > 0
              ? <b className="text-red-600">{unassigned} token{unassigned === 1 ? '' : 's'} need a doctor assigned.</b>
              : <span className="text-emerald-700">Every token has a doctor.</span>}
          </p>
        </div>
        <div className="flex gap-2">
          {onOpenCalendar && <button type="button" className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800" onClick={onOpenCalendar}>Open calendar</button>}
          <button type="button" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={onOpenQueue}>Live queue</button>
        </div>
      </div>

      <div className="mt-8 px-2">
        <div className="relative h-8">
          <div className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 rounded bg-slate-200" />
          {inRange && <div className="absolute left-0 top-1/2 h-0.5 -translate-y-1/2 rounded bg-slate-400" style={{ width: `${nowPct}%` }} />}
          {today.map(({ t, d }) => (
            <span
              key={t.id} title={`${t.token_code || t.token_number} · ${t.department_name} · ${fmt(d)}`}
              className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white"
              style={{ left: `${pct(d)}%`, backgroundColor: t.department_color || '#2563eb', opacity: ['completed', 'cancelled', 'skipped', 'no_show'].includes(t.status) ? 0.55 : 1 }}
            />
          ))}
          {inRange && (
            <span className="absolute -top-1 -translate-x-1/2 rounded-md bg-orange-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow" style={{ left: `${nowPct}%` }}>
              {fmt(now)}
            </span>
          )}
        </div>
        <div className="relative mt-1 h-4 text-[10px] font-medium text-slate-400">
          {ticks.map((tk) => (
            <span key={tk} className="absolute -translate-x-1/2" style={{ left: `${((tk - SH) / (EH - SH)) * 100}%` }}>
              {tk === 12 ? '12p' : tk > 12 ? `${tk - 12}p` : `${tk}a`}
            </span>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">{today.length} token{today.length === 1 ? '' : 's'} issued today · each dot is a token, coloured by department</p>
      </div>
    </div>
  );
}
