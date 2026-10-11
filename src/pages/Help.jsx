import { useState } from 'react';

const FAQS = [
  {
    q: 'How do I get a token?',
    a: 'Select your department from the Token Kiosk, choose a service area, and tap "Get Token". Your token number and queue position appear immediately.',
  },
  {
    q: 'How does the queue work?',
    a: 'Each department and service area has its own queue. Tokens are served in order (FIFO). Counters call the next token only when the current patient has finished.',
  },
  {
    q: 'Can I leave the hospital after getting a token?',
    a: 'Yes. Keep your token number handy and check the Live Queue or My Token page to see how many people are ahead. Return to the counter before your turn is called.',
  },
  {
    q: 'How do I track my token?',
    a: 'Go to "My Token" and enter your token number (or use the link right after generating a token). You will see your position, the current token being served, and the assigned counter.',
  },
  {
    q: 'What happens when my token is called?',
    a: 'The Live Queue board shows your token and the serving counter. A sound/visual notification and your status page will reflect your turn. Proceed to the indicated counter.',
  },
  {
    q: 'Can I cancel my token?',
    a: 'Staff at the reception or counter can cancel a token if you no longer need the service. Tokens cannot be cancelled by patients from the public kiosk to keep queues fair.',
  },
  {
    q: 'How can I submit feedback?',
    a: 'Use the "Write a Review" button in the Reviews & Feedback section on the home page. Rate your experience and leave a comment. Your review appears as soon as you submit it.',
  },
  {
    q: 'Who can manage the queues?',
    a: 'Authorized staff use the Staff Console to call the next token, complete a service, or place a token on hold. Admins manage departments, counters, users, and review moderation.',
  },
];

function Item({ q, a, open, onToggle, id }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white ${open ? 'shadow-sm' : ''}`}>
      <h3 className="flex items-center justify-between">
        <button
          type="button"
          className="flex flex-1 items-center justify-between px-4 py-3.5 text-left text-sm font-semibold text-slate-800"
          aria-expanded={open}
          aria-controls={`faq-panel-${id}`}
          onClick={onToggle}
        >
          {q}
          <span className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true">
            ▾
          </span>
        </button>
      </h3>
      {open && (
        <div id={`faq-panel-${id}`} className="px-4 py-3 text-sm text-slate-600">
          {a}
        </div>
      )}
    </div>
  );
}

export default function Help() {
  const [openIdx, setOpenIdx] = useState(0);
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-2xl font-extrabold text-slate-900">Help &amp; FAQ</h1>
      <p className="mb-6 text-slate-500">Find quick answers about tokens, queues, and feedback.</p>

      <div className="flex flex-col gap-3">
        {FAQS.map((f, i) => (
          <Item key={i} q={f.q} a={f.a} id={i} open={openIdx === i} onToggle={() => setOpenIdx(openIdx === i ? -1 : i)} />
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-blue-200 bg-blue-50 p-6">
        <h2 className="text-base font-bold text-blue-700">Still need help?</h2>
        <p className="mt-1 text-sm text-blue-800">
          Visit the front desk or contact the hospital helpdesk at <span className="font-semibold">+91 674 000 0000</span>.
        </p>
      </div>
    </div>
  );
}