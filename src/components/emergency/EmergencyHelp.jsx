import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import EmergencyServiceCard from './EmergencyServiceCard.jsx';
import {
  EMERGENCY_CONFIG,
  mapsDirectionsUrl,
  mapsPinUrl,
  getCurrentUserLocation,
} from './emergency.config.js';

const telHref = (number) => 'tel:' + String(number).replace(/[^+\d]/g, '');

function isValidCoord(lat, lng) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180
  );
}

// Reveals content once it scrolls into view (fade + slide up). Respects
// prefers-reduced-motion via CSS (.reveal / .is-visible below).
function useInView(ref, threshold = 0.15) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [ref, threshold]);
  return inView;
}

export default function EmergencyHelp() {
  const sectionRef = useRef(null);
  const visible = useInView(sectionRef);

  const [dir, setDir] = useState({
    phase: 'idle',
    message: '',
    pinUrl: mapsPinUrl(
      EMERGENCY_CONFIG.emergencyDepartment.latitude,
      EMERGENCY_CONFIG.emergencyDepartment.longitude,
    ),
  });
  const busy = dir.phase === 'loading';

  // Real "Find Emergency Department" behaviour: uses the user's device GPS to
  // open Google Maps directions to the verified KIMS Emergency & Trauma centre.
  async function findEmergencyDepartment() {
    if (busy) return;
    setDir((prev) => ({ ...prev, phase: 'loading', message: 'Locating your position…' }));
    let user;
    try {
      user = await getCurrentUserLocation();
    } catch (e) {
      setDir((prev) => ({
        ...prev,
        phase: 'error',
        message: 'Could not access your location to plot directions.',
      }));
      return;
    }
    if (!isValidCoord(user.latitude, user.longitude)) {
      setDir((prev) => ({ ...prev, phase: 'error', message: 'Could not determine a valid location.' }));
      return;
    }
    const url = mapsDirectionsUrl({
      originLat: user.latitude,
      originLng: user.longitude,
      destination: EMERGENCY_CONFIG.emergencyDepartment,
      travelMode: 'driving',
    });
    window.open(url, '_blank', 'noopener,noreferrer');
    setDir((prev) => ({ ...prev, phase: 'idle', message: '' }));
  }

  const delays = [0, 70, 140, 210].map((d) => `${d}ms`);

  return (
    <section
      id="emergency"
      ref={sectionRef}
      aria-labelledby="emergency-heading"
      className="scroll-mt-24 py-16 lg:py-24"
    >
      <div className="mx-auto max-w-7xl px-4">
        {/* Eyebrow + heading */}
        <div className={`reveal mx-auto mb-10 max-w-2xl text-center ${visible ? 'is-visible' : ''}`}>
          <p className="text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: '#E50914' }}>
            Emergency Help
          </p>
          <h2
            id="emergency-heading"
            className="mt-3 text-3xl font-extrabold leading-tight sm:text-4xl"
            style={{ color: '#102A43' }}
          >
            Immediate medical assistance,<br className="hidden sm:block" /> without the wait.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base" style={{ color: '#6B8198' }}>
            If this is a medical emergency, do not wait for a regular queue token. Get emergency
            assistance immediately.
          </p>
        </div>

        {/* Primary emergency CTA card */}
        <div
          className={`reveal overflow-hidden rounded-[28px] border bg-white ${visible ? 'is-visible' : ''}`}
          style={{ borderColor: '#E1EAF2', boxShadow: '0 20px 50px -30px rgba(7,90,159,0.35)' }}
        >
          <div className="grid lg:grid-cols-2">
            {/* Left: message + actions */}
            <div
              className="border-b p-8 sm:p-10 lg:border-b-0 lg:border-r lg:p-12"
              style={{ borderColor: '#E1EAF2' }}
            >
              <p
                className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em]"
                style={{ color: '#E50914' }}
              >
                <span className="h-px w-8" style={{ backgroundColor: '#E50914' }} aria-hidden="true" />
                Emergency Assistance
              </p>
              <h3 className="mt-4 text-2xl font-extrabold leading-tight sm:text-3xl" style={{ color: '#102A43' }}>
                Need Immediate
                <br className="hidden sm:block" /> Medical Help?
              </h3>
              <p className="mt-4 max-w-md text-base" style={{ color: '#6B8198' }}>
                If this is an emergency, don’t wait for a queue token. Get immediate medical
                assistance now.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <a
                  href={telHref(EMERGENCY_CONFIG.emergencyNumber)}
                  className="btn-emergency !px-6 !py-3 !text-base"
                >
                  <span aria-hidden="true">📞</span> Call Emergency
                </a>
                <button
                  type="button"
                  onClick={findEmergencyDepartment}
                  disabled={busy}
                  className="btn-secondary !px-6 !py-3 !text-base"
                >
                  <span aria-hidden="true">📍</span> Find Emergency Department
                </button>
              </div>

              <p className="mt-3 text-xs" style={{ color: '#6B8198' }}>
                Call{' '}
                <a
                  href={telHref(EMERGENCY_CONFIG.emergencyNumber)}
                  className="font-semibold"
                  style={{ color: '#E50914' }}
                >
                  {EMERGENCY_CONFIG.emergencyNumber}
                </a>{' '}
                for immediate assistance.
              </p>

              {dir.phase === 'error' && (
                <div className="mt-3 rounded-xl border p-3" style={{ borderColor: '#FFC9C9', backgroundColor: '#FFF7F7' }}>
                  <p className="text-sm font-semibold" style={{ color: '#E50914' }}>{dir.message}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" className="btn-secondary !py-1.5" onClick={findEmergencyDepartment}>
                      Try Again
                    </button>
                    <a className="btn-ghost !py-1.5" target="_blank" rel="noopener noreferrer" href={dir.pinUrl}>
                      Open KIMS Location
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Right: subtle medical visual */}
            <div
              className="relative flex min-h-[220px] items-center justify-center overflow-hidden lg:min-h-full"
              style={{ backgroundColor: '#FFF0F0' }}
              aria-hidden="true"
            >
              <svg className="absolute -right-14 -top-14 h-64 w-64 opacity-20" viewBox="0 0 100 100" fill="none">
                <circle cx="50" cy="50" r="46" stroke="#E50914" strokeWidth="2" />
                <circle cx="50" cy="50" r="30" stroke="#E50914" strokeWidth="2" />
              </svg>
              <div className="relative flex items-center gap-5 p-6">
                <svg className="emergency-beat h-28 w-28 sm:h-32 sm:w-32" viewBox="0 0 120 120" fill="none">
                  <rect x="50" y="26" width="20" height="68" rx="6" fill="#FF1717" />
                  <rect x="26" y="50" width="68" height="20" rx="6" fill="#FF1717" />
                  <path
                    d="M6 60h16l8-16 12 34 7-18 5 0h5l8-14 10 18 8 0h8l8-14 8 12 5 0h8"
                    stroke="#075A9F"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest" style={{ color: '#E50914' }}>
                    24 × 7
                  </p>
                  <p className="mt-1 text-2xl font-black leading-tight" style={{ color: '#102A43' }}>
                    Emergency &amp;
                    <br />
                    Trauma Care
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Emergency services */}
        <div className="mt-12">
          <div className={`reveal mb-6 ${visible ? 'is-visible' : ''}`}>
            <p className="text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: '#1599C5' }}>
              Emergency Services
            </p>
            <h3 className="mt-2 text-2xl font-extrabold sm:text-3xl" style={{ color: '#102A43' }}>
              Help is close by, around the clock.
            </h3>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <EmergencyServiceCard
              icon="🏥"
              title="Emergency Department"
              description="For urgent and life-threatening medical conditions."
              visible={visible}
              delay={delays[0]}
              action={
                <button
                  type="button"
                  onClick={findEmergencyDepartment}
                  disabled={busy}
                  className="btn-primary !py-2"
                >
                  Get Directions
                </button>
              }
            />
            <EmergencyServiceCard
              icon="🚑"
              title="Ambulance Assistance"
              description="Request emergency transportation when immediate medical transport is required."
              visible={visible}
              delay={delays[1]}
              action={
                <a href={telHref(EMERGENCY_CONFIG.ambulanceNumber)} className="btn-emergency !py-2">
                  Call Ambulance
                </a>
              }
            />
            <EmergencyServiceCard
              icon="❤️"
              title="Critical Care"
              description="Immediate assistance for patients requiring urgent medical attention."
              visible={visible}
              delay={delays[2]}
              action={
                <a href={telHref(EMERGENCY_CONFIG.nationalNumber)} className="btn-emergency !py-2">
                  Contact Emergency
                </a>
              }
            />
            <EmergencyServiceCard
              icon="🛟"
              title="Emergency Help Desk"
              description="Get assistance with emergency registration, directions, and hospital services."
              visible={visible}
              delay={delays[3]}
              action={
                <Link to={EMERGENCY_CONFIG.helpDeskRoute} className="btn-primary !py-2">
                  Contact Help Desk
                </Link>
              }
            />
          </div>
        </div>

        {/* Important — emergency is NOT a normal queue */}
        <div
          className={`reveal mt-8 rounded-2xl border p-6 sm:p-7 ${visible ? 'is-visible' : ''}`}
          style={{ borderColor: '#FFC9C9', backgroundColor: '#FFF7F7' }}
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex max-w-xl items-start gap-3">
              <span
                className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl"
                style={{ backgroundColor: '#FFE3E3' }}
                aria-hidden="true"
              >
                ⚠️
              </span>
              <div>
                <p className="text-sm font-black uppercase tracking-[0.14em]" style={{ color: '#E50914' }}>
                  Important
                </p>
                <h4 className="mt-1 text-lg font-bold" style={{ color: '#102A43' }}>
                  Emergency cases should not use the normal queue system.
                </h4>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: '#6B8198' }}>
                  If the patient is experiencing a serious or life-threatening condition, seek
                  emergency medical assistance immediately instead of waiting for a regular token.
                </p>
              </div>
            </div>

            <div className="grid shrink-0 gap-3 sm:grid-cols-2 lg:w-[340px]">
              <div className="rounded-2xl border bg-white p-4" style={{ borderColor: '#E1EAF2' }}>
                <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#1599C5' }}>
                  Normal visit
                </p>
                <p className="mt-1 text-sm" style={{ color: '#102A43' }}>
                  Token → Queue → Wait
                </p>
              </div>
              <div className="rounded-2xl border bg-white p-4" style={{ borderColor: '#FFC9C9' }}>
                <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#E50914' }}>
                  Emergency
                </p>
                <p className="mt-1 text-sm font-semibold" style={{ color: '#102A43' }}>
                  Do NOT queue → Care now
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}