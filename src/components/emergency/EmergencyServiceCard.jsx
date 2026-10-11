// Presentational card used inside the Emergency Help services grid.
// The parent owns the actual action element (tel: link, maps button, or
// internal router Link) and passes it in as `action`, so this card stays
// fully reusable and contains no business logic.
export default function EmergencyServiceCard({
  icon,
  title,
  description,
  action,
  visible = true,
  delay = 0,
}) {
  return (
    <div
      className={`reveal h-full ${visible ? 'is-visible' : ''}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <article
        className="flex h-full flex-col rounded-3xl border bg-white p-6 shadow-sm transition duration-150 hover:-translate-y-1 hover:shadow-cardhover"
        style={{ borderColor: '#E1EAF2' }}
      >
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl"
          style={{ backgroundColor: '#E6F3F9' }}
          aria-hidden="true"
        >
          {icon}
        </span>
        <h4 className="mt-4 text-lg font-bold" style={{ color: '#102A43' }}>
          {title}
        </h4>
        <p className="mt-2 flex-1 text-sm leading-relaxed" style={{ color: '#6B8198' }}>
          {description}
        </p>
        <div className="mt-5">{action}</div>
      </article>
    </div>
  );
}