import { useEffect, useState, useCallback } from 'react';
import api from '../services/api.js';
import { subscribeAll } from '../services/socket.js';

function fmtMins(sec) {
  if (!sec) return '—';
  return `~${Math.round(sec / 60)} min`;
}

export default function LiveQueueCard() {
  const [data, setData] = useState([]);
  const [avg, setAvg] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const d = await api.live();
      setData(d.areas);
      const o = await api.overview().catch(() => ({ overview: { avgWaitSeconds: 0 } }));
      setAvg(o.overview?.avgWaitSeconds || 0);
    } catch {
      /* keep last */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const off = subscribeAll(() => refresh());
    return off;
  }, [refresh]);

  // Pick the most relevant active area (one with a currently-serving token).
  const active = data.find((a) => a.serving.length > 0) || data[0];
  const serving = active?.serving?.[0] || null;
  const next = active?.queue || [];

  const servingCount = data.reduce((s, a) => s + a.serving.length, 0);
  const waiting = data.reduce((s, a) => s + a.queue.length, 0);
  const activeCounters = data.filter((a) => a.serving.length > 0).length;
  const estWait = servingCount > 0 ? avg * Math.max(1, waiting / Math.max(1, activeCounters)) : 0;

  const tiles = [
    { label: 'Currently Serving', value: servingCount },
    { label: 'People Waiting', value: waiting },
    { label: 'Estimated Wait', value: loading ? '…' : fmtMins(estWait) },
    { label: 'Active Counters', value: activeCounters },
  ];

  return (
    <section aria-label="Live queue status" className="card">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-extrabold" style={{ color: '#102A43' }}>Live Queue</h2>
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-white" style={{ backgroundColor: '#00C878' }}>
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" aria-hidden="true" />
          Live
        </span>
      </div>

      {/* Now serving */}
      <div className="rounded-2xl p-4 text-center text-white" style={{ background: 'linear-gradient(135deg,#075A9F 0%,#1599C5 100%)' }}>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/75">Now Serving</p>
        <p className="pulse-ring mx-auto my-2 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-3xl font-black">
          {serving ? serving.token_number : '—'}
        </p>
        <p className="text-sm font-semibold">{serving ? `Counter ${serving.counter_name || '—'}` : 'No active token'}</p>
        {active && (
          <p className="mt-1 text-[11px] text-white/70">{active.area.department_name} · {active.area.name}</p>
        )}
      </div>

      {/* Next up */}
      <div className="mt-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: '#6B8198' }}>Next</p>
        {next.length === 0 ? (
          <p className="text-sm" style={{ color: '#6B8198' }}>No tokens waiting.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {next.slice(0, 4).map((t) => (
              <span key={t.id} className="flex h-11 w-11 items-center justify-center rounded-xl border text-base font-black" style={{ borderColor: '#E1EAF2', color: '#102A43', backgroundColor: '#F5F9FC' }}>
                {t.token_number}
              </span>
            ))}
            {next.length > 4 && (
              <span className="flex h-11 items-center justify-center rounded-xl px-2 text-sm font-semibold" style={{ color: '#6B8198' }}>
                +{next.length - 4}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Aggregate stats */}
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-xl border p-3" style={{ borderColor: '#E1EAF2', backgroundColor: '#F5F9FC' }}>
            <p className="text-xl font-extrabold" style={{ color: t.label === 'Active Counters' ? '#00A866' : '#102A43' }}>
              {loading && t.label !== 'Estimated Wait' ? '…' : t.value}
            </p>
            <p className="text-[11px]" style={{ color: '#6B8198' }}>{t.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}