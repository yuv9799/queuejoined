export default function ReviewAnalytics({ token }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .reviewAnalytics(token)
      .then((d) => setData(d.analytics))
      .catch((e) => setError(e.message));
  }, [token]);

  if (error) return <p className="text-sm text-rose-600">Unable to load analytics.</p>;
  if (!data) return <div className="space-y-2"><div className="skeleton" /><div className="skeleton w-2/3" /></div>;

  const s = data.summary;
  const fmt = (c) => String(c || 'GENERAL').toLowerCase().replace(/_/g, ' ');

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="card">
        <h3 className="mb-3 text-sm font-bold" style={{ color: '#102A43' }}>Ratings</h3>
        <div className="grid grid-cols-5 gap-1 text-center">
          {[5, 4, 3, 2, 1].map((r) => (
            <div key={r} className="rounded-lg bg-[#F5F9FC] p-2">
              <p className="text-lg font-extrabold" style={{ color: r === 5 ? '#00A866' : '#075A9F' }}>
                {s.distribution?.[{ 5: 'five', 4: 'four', 3: 'three', 2: 'two', 1: 'one' }[r]] || 0}
              </p>
              <p className="text-[11px] text-amber-500">{'★'.repeat(r)}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm" style={{ color: '#6B8198' }}>
          {s.count} reviews · avg {s.average || 0}/5
        </p>
      </div>

      <div className="card">
        <h3 className="mb-3 text-sm font-bold" style={{ color: '#102A43' }}>Top Improvement Requests</h3>
        {data.topRequests.length === 0 ? (
          <p className="text-sm" style={{ color: '#6B8198' }}>No requested improvements recorded.</p>
        ) : (
          <ol className="space-y-2">
            {data.topRequests.map((t) => (
              <li key={t.theme} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E6F3F9] text-[11px] font-bold" style={{ color: '#075A9F' }}>
                  {t.n}
                </span>
                <div>
                  <p className="text-sm font-semibold capitalize" style={{ color: '#102A43' }}>{fmt(t.theme)}</p>
                  {t.sample && <p className="text-xs" style={{ color: '#6B8198' }}>e.g. “{t.sample}”</p>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}