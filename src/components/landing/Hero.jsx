import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api.js';
import { useEmergency } from '../../context/EmergencyContext.jsx';

function useNowServing() {
  const [data, setData] = useState({ token: null, dept: '', counter: '' });
  useEffect(() => {
    let on = true;
    api
      .live()
      .then((d) => {
        if (!on) return;
        const active = d.areas.find((a) => a.serving.length > 0);
        if (active) setData({ token: active.serving[0].token_number, dept: active.area.department_name, counter: active.serving[0].counter_name || '—' });
      })
      .catch(() => {});
    return () => { on = false; };
  }, []);
  return data;
}

export default function Hero() {
  const serving = useNowServing();
  const { openEmergency } = useEmergency();
  return (
    <section className="relative overflow-hidden">
      {/* Emergency — upper-right action reusing the existing Emergency flow */}
      <button
        type="button"
        onClick={openEmergency}
        aria-haspopup="dialog"
        aria-label="Emergency — immediate medical assistance"
        className="btn-emergency absolute right-4 top-4 z-10 !rounded-full !px-3.5 !py-2"
      >
        <span aria-hidden="true">🚨</span> Emergency
      </button>

      {/* soft background wash */}
      <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(900px 500px at 85% -10%, #E6F3F9 0%, rgba(229,247,249,0) 60%)' }} aria-hidden="true" />

      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 lg:grid-cols-2 lg:py-24">
        {/* Left: editorial typography */}
        <div>
          <p className="mb-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: '#1599C5' }}>
            <span className="h-px w-8" style={{ backgroundColor: '#1599C5' }} aria-hidden="true" />
            KIMS Queue · Bhubaneswar
          </p>
          <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl xl:text-6xl" style={{ color: '#102A43' }}>
            Smarter Queues.
            <br />
            Better <span className="gradient-text">Hospital</span> Experiences.
          </h1>
          <p className="mt-6 max-w-lg text-base sm:text-lg" style={{ color: '#6B8198' }}>
            Get your token digitally, track your queue in real time, and spend less time waiting — from registration to every service across KIMS.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a href="#token" className="btn-primary !px-6 !py-3 !text-base">Get Your Token</a>
            <Link to="/live" className="btn-secondary !px-6 !py-3 !text-base">
              <span className="inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: '#00C878' }} aria-hidden="true" />
              View Live Queue
            </Link>
          </div>

          <p className="mt-8 text-sm" style={{ color: '#6B8198' }}>
            Trusted by patients and hospital staff to simplify the queue experience.
          </p>
        </div>

        {/* Right: premium medical visual */}
        <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
          <div className="gradient-brand relative aspect-[4/3] overflow-hidden rounded-3xl shadow-cardhover">
            {/* abstract medical motif */}
            <svg className="absolute -right-10 -top-10 h-72 w-72 opacity-20" viewBox="0 0 100 100" fill="none" aria-hidden="true">
              <circle cx="50" cy="50" r="46" stroke="white" strokeWidth="2" />
              <circle cx="50" cy="50" r="32" stroke="white" strokeWidth="2" />
              <path d="M38 50h24M50 38v24" stroke="white" strokeWidth="6" strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col justify-end p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">KIMS Queue</p>
              <p className="mt-2 max-w-xs text-2xl font-bold text-white">
                Your hospital visit, without the unnecessary wait.
              </p>
            </div>
          </div>

          {/* Floating: token generated */}
          <div className="rise-in absolute -left-4 top-10 rounded-2xl border border-[#E1EAF2] bg-white px-4 py-3 shadow-cardhover sm:-left-8">
            <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: '#6B8198' }}>✓ Token Generated</p>
            <p className="mt-1 text-2xl font-black" style={{ color: '#075A9F' }}>C-027</p>
            <p className="text-xs" style={{ color: '#6B8198' }}>Cardiology · 8 people ahead</p>
          </div>

          {/* Floating: live queue */}
          <div className="rise-in absolute -bottom-5 right-2 rounded-2xl border border-[#E1EAF2] bg-white px-4 py-3 shadow-cardhover sm:right-6" style={{ animationDelay: '120ms' }}>
            <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: '#00A866' }}>
              <span className="h-1.5 w-1.5 rounded-full bg-[#00C878] animate-pulse" aria-hidden="true" />
              Live Queue
            </p>
            <p className="mt-1 text-2xl font-black" style={{ color: '#102A43' }}>{serving.token || '—'}</p>
            <p className="text-xs" style={{ color: '#6B8198' }}>Now serving · {serving.counter || '—'}</p>
          </div>
        </div>
      </div>
    </section>
  );
}