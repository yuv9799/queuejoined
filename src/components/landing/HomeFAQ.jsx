import { useState } from 'react';

const FAQS = [
  { q: 'How do I get a token?', a: 'Select a department and service area on the Token Kiosk, then tap "Get Your Token". Your token and queue position appear instantly.' },
  { q: 'Can I track my queue remotely?', a: 'Yes. Open My Token, enter your token number, and see your position, people ahead and estimated wait from anywhere.' },
  { q: 'How is the waiting time calculated?', a: 'Estimates are based on live queue depth and average service times so you know roughly how long to plan for.' },
  { q: 'Can I cancel my token?', a: 'Staff at the counter or reception can cancel a token if you no longer need the service, keeping queues fair for everyone.' },
  { q: 'How do I know when my token is called?', a: 'The Live Queue board and your My Token page update in real time; you can also enable turn notifications.' },
  { q: 'Can staff manage multiple counters?', a: 'Yes. The Staff Console lets you call, hold, skip and complete tokens and monitor every counter live.' },
  { q: 'How do I provide feedback?', a: 'Click "Reviews" in the header to open the review drawer and share your experience. Your review appears as soon as you submit it.' },
  { q: 'What should I do in an emergency?', a: 'Use the red Emergency Help strip at the top of the page for immediate assistance options.' },
];

export default function HomeFAQ() {
  const [open, setOpen] = useState(0);
  return (
    <section className="py-16 lg:py-24">
      <div className="mx-auto max-w-3xl px-4">
        <p className="text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: '#1599C5' }}>FAQ</p>
        <h2 className="mt-3 mb-10 text-3xl font-extrabold sm:text-4xl" style={{ color: '#102A43' }}>Frequently asked questions</h2>

        <div className="flex flex-col gap-3">
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={i} className="rounded-2xl border px-5 py-4" style={{ borderColor: '#E1EAF2', backgroundColor: '#ffffff' }}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 text-left"
                  aria-expanded={isOpen}
                  aria-controls={`faq-${i}`}
                  onClick={() => setOpen(isOpen ? -1 : i)}
                >
                  <span className="text-base font-semibold" style={{ color: '#102A43' }}>{f.q}</span>
                  <span className={`text-xl transition-transform duration-200 ${isOpen ? 'rotate-45' : ''}`} style={{ color: '#1599C5' }} aria-hidden="true">+</span>
                </button>
                {isOpen && (
                  <p id={`faq-${i}`} className="mt-3 text-base" style={{ color: '#6B8198' }}>{f.a}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}