import { useEffect, useState, useCallback } from 'react';
import api from '../services/api.js';
import { subscribeAll } from '../services/socket.js';

function TokenPill({ token, big }) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl font-black text-white ${
        big ? 'h-28 w-28 text-5xl' : 'h-16 w-16 text-2xl'
      }`}
      style={{ backgroundColor: token.department_color || '#2563eb' }}
    >
      {token.token_number}
    </div>
  );
}

export default function LiveBoard() {
  const [data, setData] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filterDept, setFilterDept] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const d = await api.live();
      setData(d.areas);
      setError(null);
    } catch (e) {
      // Do NOT treat an API failure as an empty queue. Surface the real error so
      // the user knows the live service is unreachable rather than "no activity".
      setError(e.message || 'Unable to connect to the queue service.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    api.departments().then((d) => setDepartments(d.departments)).catch(() => {});
    refresh();
    const off = subscribeAll(() => refresh());
    const t = setInterval(refresh, 15000); // safety fallback
    return () => {
      off();
      clearInterval(t);
    };
  }, [refresh]);

  const filtered = filterDept ? data.filter((x) => x.area.department_id === Number(filterDept)) : data;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-extrabold text-slate-900">Live Queue Board</h1>
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> Live
          </span>
        </div>
        <label className="sr-only" htmlFor="live-dept-filter">Filter by department</label>
        <select
          id="live-dept-filter"
          className="input w-56"
          value={filterDept}
          onChange={(e) => setFilterDept(e.target.value)}
          aria-label="Filter by department"
        >
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card space-y-3"><div className="skeleton h-8" /><div className="skeleton h-24" /><div className="skeleton" /></div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl bg-rose-50 p-6 text-center text-rose-700">
          <p className="text-2xl" aria-hidden="true">⚠️</p>
          <p className="mt-1 text-sm font-semibold">
            Unable to connect to the queue service. Please try again.
          </p>
          {error !== 'Request failed (401)' ? <p className="mt-0.5 text-xs text-rose-400">{error}</p> : null}
          <button className="btn-secondary mt-3" onClick={refresh}>Retry Connection</button>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-slate-500">No active {filterDept ? 'queues for this department' : 'queues'} right now.</p>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map(({ area, serving, queue, held }) => (
            <div key={area.id} className="card overflow-hidden">
              <div
                className="-mx-5 -mt-5 mb-4 flex items-center justify-between px-5 py-3 text-white"
                style={{ backgroundColor: area.department_color || '#2563eb' }}
              >
                <div>
                  <p className="text-xs font-medium opacity-80">{area.department_name}</p>
                  <p className="text-lg font-bold">{area.name}</p>
                </div>
                <span className="rounded-lg bg-black/20 px-2 py-1 text-xs font-semibold">
                  {queue.length} waiting
                </span>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Now serving</p>
                  {serving.length > 0 ? (
                    <div className="flex flex-col items-center">
                      <div className="pulse-ring rounded-2xl">
                        <TokenPill token={serving[0]} big />
                      </div>
                      <p className="mt-2 text-xs font-semibold text-slate-600">
                        Counter {serving[0].counter_name || '—'}
                      </p>
                    </div>
                  ) : (
                    <div className="flex h-28 w-28 items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 text-sm text-slate-400">
                      —
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Next up</p>
                  <div className="flex flex-wrap gap-2">
                    {queue.slice(0, 6).map((t) => (
                      <TokenPill key={t.id} token={t} />
                    ))}
                    {queue.length === 0 && <p className="text-sm text-slate-400">Empty</p>}
                  </div>
                  {held.length > 0 && (
                    <p className="mt-3 text-xs font-semibold text-amber-600">
                      On hold: {held.map((h) => h.token_number).join(', ')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}