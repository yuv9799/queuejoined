const STEPS = [
  { n: '01', title: 'Select Department', desc: 'Choose the department and service you need from the live list.' },
  { n: '02', title: 'Choose Service', desc: 'Pick your exact service area — OPD, lab, pharmacy, radiology and more.' },
  { n: '03', title: 'Get Your Token', desc: 'Receive your token instantly with a live queue position.' },
  { n: '04', title: 'Track Your Queue', desc: 'Watch your position and get notified when your turn arrives.' },
];

export default function HowItWorks() {
  return (
    <section className="py-16 lg:py-24" style={{ backgroundColor: '#F5F9FC' }}>
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-12 max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: '#1599C5' }}>How It Works</p>
          <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl" style={{ color: '#102A43' }}>From start to serving, in four steps.</h2>
        </div>

        <ol className="grid gap-px overflow-hidden rounded-2xl border sm:grid-cols-2 lg:grid-cols-4" style={{ borderColor: '#E1EAF2' }}>
          {STEPS.map((s) => (
            <li key={s.n} className="bg-white p-6">
              <p className="text-sm font-black tracking-widest" style={{ color: '#1599C5' }}>{s.n}</p>
              <h3 className="mt-3 text-lg font-bold" style={{ color: '#102A43' }}>{s.title}</h3>
              <p className="mt-2 text-sm" style={{ color: '#6B8198' }}>{s.desc}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}