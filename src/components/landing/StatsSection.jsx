import { useEffect, useState } from 'react';
import api from '../../services/api.js';

export default function StatsSection() {
  const [stats, setStats] = useState({ departments: 0, areas: 0, tokensToday: 0, waiting: 0 });

  useEffect(() => {
    let on = true;
    Promise.all([
      api.departments().catch(() => ({ departments: [] })),
      api.areas().catch(() => ({ areas: [] })),
      api.overview().catch(() => ({ overview: {} })),
      api.live().catch(() => ({ areas: [] })),
    ]).then(([d, a, o, l]) => {
      if (!on) return;
      setStats({
        departments: d.departments.length,
        areas: a.areas.length,
        tokensToday: o.overview?.issuedToday || 0,
        waiting: (l.areas || []).reduce((s, x) => s + x.queue.length, 0),
      });
    });
    return () => { on = false; };
  }, []);

  const items = [
    { value: `${stats.departments}+`, label: 'Departments & services', note: 'Live departments' },
    { value: stats.tokensToday.toLocaleString(), label: 'Tokens managed today', note: 'Real-time count' },
    { value: stats.waiting, label: 'Waiting now', note: 'In active queues' },
    { value: '24/7', label: 'Queue visibility', note: 'Live board always on' },
  ];

  return (
    <section className="border-y py-12" style={{ borderColor: '#E1EAF2', backgroundColor: '#ffffff' }}>
      <div className="mx-auto grid max-w-7xl gap-8 px-4 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <p className="text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: '#1599C5' }}>Why KIMS Queue</p>
          <h2 className="mt-3 text-3xl font-extrabold leading-tight sm:text-4xl" style={{ color: '#102A43' }}>
            A calmer, faster
            <br />
            hospital visit.
          </h2>
          <p className="mt-4 max-w-sm text-base" style={{ color: '#6B8198' }}>
            Live numbers from the KIMS Queue system — see real departments, active services and how many patients are waiting right now.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border lg:col-span-3" style={{ borderColor: '#E1EAF2' }}>
          {items.map((s) => (
            <div key={s.label} className="bg-[#F5F9FC] p-6 sm:p-8">
              <p className="text-3xl font-black sm:text-4xl" style={{ color: '#075A9F' }}>{s.value}</p>
              <p className="mt-1 text-sm font-semibold" style={{ color: '#102A43' }}>{s.label}</p>
              <p className="mt-0.5 text-xs" style={{ color: '#6B8198' }}>{s.note}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}