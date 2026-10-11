import { Link } from 'react-router-dom';

const PATIENT_POINTS = ['Digital token', 'Queue position', 'Estimated wait', 'Live updates', 'Near-turn notifications'];
const STAFF_POINTS = ['Counter management', 'Queue prioritization', 'Live queue monitoring', 'Token calling', 'Department & analytics', 'Patient feedback'];

function Check({ text }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: '#E5F9F1' }} aria-hidden="true">
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: '#00A866' }} />
      </span>
      <span className="text-base" style={{ color: '#102A43' }}>{text}</span>
    </li>
  );
}

export default function ExperienceSections() {
  return (
    <>
      {/* Patient experience */}
      <section className="py-16 lg:py-24">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 lg:grid-cols-2">
          <div className="order-2 lg:order-1">
            <div className="gradient-brand relative aspect-[4/3] overflow-hidden rounded-3xl">
              <svg className="absolute -left-8 -top-8 h-56 w-56 opacity-20" viewBox="0 0 100 100" fill="none" aria-hidden="true">
                <circle cx="50" cy="50" r="46" stroke="white" strokeWidth="2" />
                <path d="M36 50h28M50 36v28" stroke="white" strokeWidth="6" strokeLinecap="round" />
              </svg>
              <div className="absolute bottom-0 w-full p-8">
                <p className="text-sm font-semibold uppercase tracking-wide text-white/70">For patients</p>
                <p className="mt-1 text-2xl font-bold text-white">Less waiting. More time for what matters.</p>
              </div>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <p className="text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: '#1599C5' }}>Patient Experience</p>
            <h2 className="mt-3 text-3xl font-extrabold leading-tight sm:text-4xl" style={{ color: '#102A43' }}>
              Less Waiting. More Time for What Matters.
            </h2>
            <p className="mt-4 max-w-lg text-base" style={{ color: '#6B8198' }}>
              Track your position from your phone, get notified when your turn is close, and spend less time standing around.
            </p>
            <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {PATIENT_POINTS.map((p) => <Check key={p} text={p} />)}
            </ul>
          </div>
        </div>
      </section>

      {/* Staff experience */}
      <section className="py-16 lg:py-24" style={{ backgroundColor: '#ffffff' }}>
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: '#1599C5' }}>Staff Experience</p>
            <h2 className="mt-3 text-3xl font-extrabold leading-tight sm:text-4xl" style={{ color: '#102A43' }}>
              A smarter way to manage hospital queues.
            </h2>
            <p className="mt-4 max-w-lg text-base" style={{ color: '#6B8198' }}>
              Staff see live counter load, call tokens in one tap, and get patient feedback — all from a single console.
            </p>
            <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {STAFF_POINTS.map((p) => <Check key={p} text={p} />)}
            </ul>
            <div className="mt-6">
              <Link to="/login" className="btn-primary !py-2.5">Open Staff Console</Link>
            </div>
          </div>
          <div className="order-first lg:order-last">
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl" style={{ background: 'linear-gradient(160deg,#075A9F 0%,#1599C5 100%)' }}>
              <div className="absolute inset-0 flex items-center justify-center">
                <svg viewBox="0 0 200 200" className="h-64 w-64 opacity-25" aria-hidden="true">
                  <rect x="10" y="10" width="180" height="180" rx="24" fill="none" stroke="white" strokeWidth="2" />
                  <rect x="40" y="40" width="120" height="120" rx="16" fill="none" stroke="white" strokeWidth="2" />
                  <path d="M70 100h60M100 70v60" stroke="white" strokeWidth="8" strokeLinecap="round" />
                </svg>
              </div>
              <div className="absolute bottom-0 w-full p-8">
                <p className="text-sm font-semibold uppercase tracking-wide text-white/70">For staff</p>
                <p className="mt-1 text-2xl font-bold text-white">Every counter, every queue, at a glance.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}