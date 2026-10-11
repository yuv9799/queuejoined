import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api.js';

const SHELVES = ['Cardiology', 'Pediatrics', 'Orthopedics', 'Radiology', 'General Medicine', 'Emergency'];

export default function DepartmentShowcase() {
  const [depts, setDepts] = useState([]);

  useEffect(() => {
    let on = true;
    (async () => {
      const d = (await api.departments().catch(() => ({ departments: [] }))).departments;
      const withAreas = await Promise.all(
        d.slice(0, 6).map(async (x) => {
          const a = await api.areas(null, x.id).catch(() => ({ areas: [] }));
          return { ...x, serviceCount: a.areas.length };
        })
      );
      if (on) setDepts(withAreas);
    })();
    return () => { on = false; };
  }, []);

  if (depts.length === 0) return null;

  return (
    <section className="py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: '#1599C5' }}>Healthcare Services</p>
            <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl" style={{ color: '#102A43' }}>Departments &amp; Services</h2>
          </div>
          <Link to="/departments" className="btn-ghost !py-2">Browse all departments →</Link>
        </div>

        {/* Asymmetric editorial grid */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3 md:grid-rows-2">
          {depts.map((d, i) => {
            const big = i === 0;
            return (
              <Link
                key={d.id}
                to="/departments"
                className={`group relative overflow-hidden rounded-2xl ${big ? 'md:col-span-2 md:row-span-2 min-h-72' : 'min-h-48'} flex flex-col justify-end p-6 text-left transition-transform duration-300 hover:-translate-y-1`}
                style={{
                  background: `linear-gradient(160deg, ${d.color || '#075A9F'} 0%, #102A43 130%)`,
                  backgroundColor: d.color || '#075A9F',
                }}
              >
                <span className="pointer-events-none absolute -right-6 -top-6 text-8xl font-black text-white/10" aria-hidden="true">
                  {d.name.charAt(0)}
                </span>
                <span className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-lg font-black text-white" style={{ color: '#fff' }}>
                  {d.name.charAt(0)}
                </span>
                <h3 className={`font-bold text-white ${big ? 'text-2xl' : 'text-lg'}`}>{d.name}</h3>
                <p className="mt-1 text-sm text-white/75">
                  {d.serviceCount} {d.serviceCount === 1 ? 'service' : 'services'}
                  {big ? ' · browse and join any queue' : ''}
                </p>
              </Link>
            );
          })}
        </div>

        <p className="mt-6 text-center text-sm" style={{ color: '#6B8198' }}>
          Shown: {SHELVES.length} departments · view the full list on the Departments page.
        </p>
      </div>
    </section>
  );
}