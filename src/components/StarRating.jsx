// StarRating — display-only (value) or interactive (onChange).
export default function StarRating({ value, onChange, size = 'text-lg' }) {
  const interactive = typeof onChange === 'function';
  const label = value ? `${value} out of 5 stars` : 'No rating yet';

  if (!interactive) {
    return (
      <span className="inline-flex items-center gap-0.5 text-amber-400" role="img" aria-label={label}>
        {[1, 2, 3, 4, 5].map((s) => (
          <span key={s} className={size} aria-hidden="true">
            {s <= value ? '★' : '☆'}
          </span>
        ))}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          className={`star-btn ${s <= value ? 'text-amber-400' : 'text-slate-300'}`}
          aria-label={`${s} star${s > 1 ? 's' : ''}`}
          aria-pressed={value === s}
          onClick={() => onChange(s)}
        >
          ★
        </button>
      ))}
      <span className="ml-1 text-sm text-slate-500">{value > 0 ? `${value} / 5` : 'Tap to rate'}</span>
    </div>
  );
}