import Hero from '../components/landing/Hero.jsx';
import EmergencyHelp from '../components/emergency/EmergencyHelp.jsx';
import StatsSection from '../components/landing/StatsSection.jsx';
import DepartmentShowcase from '../components/landing/DepartmentShowcase.jsx';
import HowItWorks from '../components/landing/HowItWorks.jsx';
import ExperienceSections from '../components/landing/ExperienceSections.jsx';
import HomeFAQ from '../components/landing/HomeFAQ.jsx';
import FinalCTA from '../components/landing/FinalCTA.jsx';
import TokenKiosk from '../components/TokenKiosk.jsx';
import LiveQueueCard from '../components/LiveQueueCard.jsx';

export default function Home({ onOpenReviews }) {
  return (
    <main>
      <Hero />

      {/* Emergency help — direct continuation of the hero */}
      <EmergencyHelp />

      {/* Trust / statistics */}
      <StatsSection />

      {/* Token CTA — editorial split wrapping the existing functional form */}
      <section id="token" className="py-16 lg:py-24">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: '#1599C5' }}>Get Your Token</p>
            <h2 className="mt-3 text-3xl font-extrabold leading-tight sm:text-4xl" style={{ color: '#102A43' }}>
              Choose your department and join the queue instantly.
            </h2>
            <p className="mt-4 max-w-md text-base" style={{ color: '#6B8198' }}>
              Select a department, then a service area. Your token, position and estimated wait appear immediately — no standing in line.
            </p>
            <ul className="mt-6 space-y-3 text-base" style={{ color: '#102A43' }}>
              {['Real departments & services', 'Instant queue position', 'Live updates'].map((t) => (
                <li key={t} className="flex items-center gap-2.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full" style={{ backgroundColor: '#E5F9F1' }} aria-hidden="true">✓</span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl border p-6 sm:p-8" style={{ borderColor: '#E1EAF2', backgroundColor: '#ffffff', boxShadow: '0 20px 50px -30px rgba(7,90,159,0.35)' }}>
            <TokenKiosk />
          </div>
        </div>
      </section>

      {/* Live queue — large visual panel */}
      <section id="live" className="py-16 lg:py-24" style={{ backgroundColor: '#F5F9FC' }}>
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: '#1599C5' }}>Live Queue</p>
              <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl" style={{ color: '#102A43' }}>What’s happening right now.</h2>
            </div>
          </div>
          <div className="mx-auto max-w-3xl">
            <LiveQueueCard />
          </div>
        </div>
      </section>

      {/* Departments showcase */}
      <DepartmentShowcase />

      {/* How it works */}
      <HowItWorks />

      {/* Patient + staff experience */}
      <ExperienceSections />

      {/* Reviews CTA (opens the slide-out drawer) */}
      {onOpenReviews && (
        <section className="py-8">
          <div className="mx-auto max-w-7xl px-4">
            <div className="flex flex-col items-center justify-between gap-5 rounded-3xl border px-6 py-8 sm:flex-row sm:px-10" style={{ borderColor: '#E1EAF2', backgroundColor: '#ffffff' }}>
              <div>
                <h2 className="text-2xl font-extrabold" style={{ color: '#102A43' }}>How was your experience?</h2>
                <p className="mt-1" style={{ color: '#6B8198' }}>Share feedback to help us improve the queue experience for patients and staff.</p>
              </div>
              <button type="button" className="btn-primary !py-3 !px-6 shrink-0" onClick={onOpenReviews}>★ Read &amp; Write Reviews</button>
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      <HomeFAQ />

      {/* Final CTA */}
      <FinalCTA />
    </main>
  );
}