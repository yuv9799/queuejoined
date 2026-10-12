import { useEffect, useState, useCallback } from 'react';
import api from '../services/api.js';
import { subscribeAll } from '../services/socket.js';

export default function Departments() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // department id -> { waiting: [tokens], serving: [tokens], held: n }
  const [liveByDept, setLiveByDept] = useState({});

  const loadLive = useCallback(async () => {
    try {
      const { areas } = await api.live();
      const map = {};
      for (const section of areas || []) {
        const id = section.area?.department_id;
        if (id == null) continue;
        const entry = (map[id] ||= { waiting: [], serving: [], held: 0 });
        entry.waiting.push(...(section.queue || []));
        entry.serving.push(...(section.serving || []));
        entry.held += (section.held || []).length;
      }
      setLiveByDept(map);
    } catch { /* keep the last known numbers */ }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const depts = await api.departments();
      const withAreas = await Promise.all(
        depts.departments.map(async (d) => {
          const a = await api.areas(null, d.id).catch(() => ({ areas: [] }));
          return { ...d, areas: a.areas };
        })
      );
      setItems(withAreas);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    loadLive();
    // Refresh the live numbers whenever the queue changes (and on the polling tick).
    return subscribeAll(() => loadLive());
  }, [load, loadLive]);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-1 text-2xl font-extrabold text-slate-900">Departments &amp; Services</h1>
      <p className="mb-6 text-slate-500">Browse hospital departments and the service areas available under each.</p>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card space-y-2">
              <div className="skeleton h-5" />
              <div className="skeleton" />
              <div className="skeleton w-2/3" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl bg-rose-50 p-6 text-center text-rose-700">
          <p className="mb-1 text-2xl" aria-hidden="true">⚠️</p>
          <p className="text-sm">Unable to load departments. Try again.</p>
          <button className="btn-secondary mt-3" onClick={load}>Retry</button>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
          <p className="empty-icon" aria-hidden="true">🏥</p>
          <p className="mt-3 text-sm">No departments available.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((d) => (
            <div key={d.id} className="card card-hover overflow-hidden">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl text-lg text-white" style={{ backgroundColor: d.color || '#2563eb' }} aria-hidden="true">
                  {d.name.charAt(0)}
                </span>
                <div className="min-w-0">
                  <h2 className="truncate text-base font-bold text-slate-800">{d.name}</h2>
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">{d.code} · {d.areas.length} service{d.areas.length === 1 ? '' : 's'}</p>
                </div>
              </div>
              {(() => {
                const live = liveByDept[d.id] || { waiting: [], serving: [], held: 0 };
                const code = (t) => t.token_code || `#${t.token_number}`;
                const all = [...live.serving, ...live.waiting];
                const latest = all.reduce((best, t) => (!best || t.id > best.id ? t : best), null);
                return (
                  <div className="mt-3 rounded-xl bg-slate-50 p-2.5 text-xs text-slate-600">
                    <p className="flex flex-wrap gap-x-4 gap-y-1 font-semibold">
                      <span>⏳ Waiting: <b className="text-slate-900">{live.waiting.length}</b></span>
                      <span>🩺 Serving: <b className="text-slate-900">{live.serving.length}</b></span>
                      {live.held > 0 && <span>⏸ On hold: <b className="text-slate-900">{live.held}</b></span>}
                      {latest && <span>🎟️ Latest: <b className="text-slate-900">{code(latest)}</b></span>}
                    </p>
                    {live.serving.length + live.waiting.length > 0 ? (
                      <ul className="mt-1.5 flex flex-wrap gap-1" aria-label={`Live tokens for ${d.name}`}>
                        {live.serving.slice(0, 4).map((t) => (
                          <li key={`s${t.id}`} className="chip bg-emerald-100 text-emerald-800">{code(t)} · now</li>
                        ))}
                        {live.waiting.slice(0, 12).map((t) => (
                          <li key={`w${t.id}`} className="chip bg-sky-100 text-sky-800">{code(t)}</li>
                        ))}
                        {live.waiting.length > 12 && (
                          <li className="chip bg-slate-200 text-slate-500">+{live.waiting.length - 12} more</li>
                        )}
                      </ul>
                    ) : (
                      <p className="mt-1 text-slate-400">No one waiting right now.</p>
                    )}
                  </div>
                );
              })()}
              {d.areas.length > 0 ? (
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {d.areas.slice(0, 6).map((a) => (
                    <li key={a.id} className="chip bg-slate-100 text-slate-600">
                      {a.name}
                      {a.floor ? <span className="ml-0.5 text-slate-400">· {a.floor}</span> : null}
                    </li>
                  ))}
                  {d.areas.length > 6 && (
                    <li className="chip bg-slate-200 text-slate-500">+{d.areas.length - 6} more</li>
                  )}
                </ul>
              ) : (
                <p className="mt-3 text-xs text-slate-400">No service areas assigned yet.</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}