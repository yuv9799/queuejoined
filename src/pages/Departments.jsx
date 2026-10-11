import { useEffect, useState, useCallback } from 'react';
import api from '../services/api.js';

export default function Departments() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
  }, [load]);

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