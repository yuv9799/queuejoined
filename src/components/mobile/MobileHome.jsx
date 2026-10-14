import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api.js';
import { subscribeAll } from '../../services/socket.js';
import { useEmergency } from '../../context/EmergencyContext.jsx';
import { PlusTicketIcon, BuildingIcon, StarIcon, SosIcon, ChevronIcon } from './icons.jsx';

const STATUS_LABEL = {
  queued: 'Waiting', called: 'Called — go in', serving: 'In consultation',
  in_consultation: 'In consultation', held: 'On hold',
};

// Compact token card: token number, status, people ahead. The estimated wait is
// shown ONLY in the header, never repeated here.
function TokenCard({ active }) {
  const { phase, token, peopleAhead } = active;
  if (phase === 'active' || (phase === 'unavailable' && token)) {
    return (
      <Link
        to={`/status?id=${token.id}`}
        className="flex items-center justify-between gap-3 rounded-2xl px-4 py-4 text-white shadow-md"
        style={{ backgroundColor: token.department_color || '#075A9F' }}
        aria-label={`Your token ${token.token_code || token.token_number}. Open details.`}
      >
        <span className="min-w-0">
          <span className="block text-[10px] font-semibold uppercase tracking-widest opacity-80">Your token</span>
          <span className="block text-3xl font-black leading-tight tracking-tight">{token.token_code || token.token_number}</span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1 text-right">
          <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-bold">{STATUS_LABEL[token.status] || token.status}</span>
          {peopleAhead !== null && token.status === 'queued' && (
            <span className="text-xs font-semibold opacity-95">{peopleAhead === 0 ? 'You are next' : `${peopleAhead} ahead`}</span>
          )}
        </span>
      </Link>
    );
  }
  if (phase === 'loading') {
    return <div className="skeleton h-[84px] rounded-2xl" aria-hidden="true" />;
  }
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-dashed px-4 py-4" style={{ borderColor: '#C9D8E5', backgroundColor: '#F5F9FC' }}>
      <span aria-hidden="true" className="text-2xl">🎫</span>
      <p className="text-sm" style={{ color: '#486581' }}>
        <b style={{ color: '#102A43' }}>No active token.</b> Generate one below to join the queue.
      </p>
    </div>
  );
}

function Tile({ icon: Icon, label, hint, stat, tone, to, onClick, accent }) {
  const inner = (
    <>
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: tone.bg, color: tone.fg }}>
        <Icon width={26} height={26} />
      </span>
      <span className="mt-auto block w-full">
        {stat && (
          <span className="mb-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ backgroundColor: tone.bg, color: tone.fg }}>{stat}</span>
        )}
        <span className="block text-[15px] font-extrabold leading-tight" style={{ color: '#102A43' }}>{label}</span>
        <span className="tile-hint mt-0.5 block text-xs leading-snug" style={{ color: '#6B8198' }}>{hint}</span>
      </span>
    </>
  );
  const cls = 'flex min-h-[96px] flex-col items-start gap-2 rounded-2xl border bg-white p-3.5 text-left shadow-sm active:scale-[0.98] transition';
  const style = { borderColor: accent ? tone.fg + '55' : '#E1EAF2' };
  return to
    ? <Link to={to} className={cls} style={style}>{inner}</Link>
    : <button type="button" onClick={onClick} className={cls} style={style}>{inner}</button>;
}

function Stat({ value, label }) {
  return (
    <div className="flex-1 text-center">
      <p className="text-lg font-extrabold leading-tight" style={{ color: '#102A43' }}>{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#6B8198' }}>{label}</p>
    </div>
  );
}

export default function MobileHome({ active, onOpenReviews }) {
  const { openEmergency } = useEmergency();
  const [overview, setOverview] = useState(null);
  const [deptCount, setDeptCount] = useState(null);
  const [rating, setRating] = useState(null);

  useEffect(() => {
    let alive = true;
    const load = () => api.overview().then((d) => { if (alive) setOverview(d.overview || null); }).catch(() => {});
    load();
    api.departments().then((d) => { if (alive) setDeptCount((d.departments || []).filter((x) => x.enabled !== 0).length); }).catch(() => {});
    api.reviewSummary().then((d) => { if (alive) setRating(d.summary || null); }).catch(() => {});
    const off = subscribeAll(load);
    return () => { alive = false; off(); };
  }, []);

  const waiting = overview?.queuedNow;
  return (
    <div className="m-home flex flex-1 flex-col gap-3">
      <TokenCard active={active} />

      <div className="grid flex-1 grid-cols-2 grid-rows-2 gap-3">
        <Tile
          icon={PlusTicketIcon} label="Generate Token" accent
          hint="Skip the line — join a department queue in seconds."
          stat={waiting != null ? `${waiting} waiting now` : null}
          tone={{ bg: '#E6F3F9', fg: '#075A9F' }} to="/kiosk"
        />
        <Tile
          icon={BuildingIcon} label="Departments"
          hint="Services, doctors and live queue counts."
          stat={deptCount != null ? `${deptCount} open` : null}
          tone={{ bg: '#EEF2FF', fg: '#4F46E5' }} to="/departments"
        />
        <Tile
          icon={StarIcon} label="Reviews"
          hint="See patient feedback and share your experience."
          stat={rating && rating.count > 0 ? `★ ${rating.average} · ${rating.count} reviews` : null}
          tone={{ bg: '#FEF6E0', fg: '#B7791F' }} onClick={onOpenReviews}
        />
        <Tile
          icon={SosIcon} label="Emergency" accent
          hint="Urgent help and SOS — tap to alert the hospital."
          stat="24×7"
          tone={{ bg: '#FDECEC', fg: '#D92D20' }} onClick={openEmergency}
        />
      </div>

      <div className="home-stats rounded-2xl border bg-white px-3 py-2.5" style={{ borderColor: "#E1EAF2" }}>
        <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: '#486581' }}>
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> Hospital right now
        </p>
        <div className="flex divide-x" style={{ '--tw-divide-opacity': 1 }}>
          <Stat value={overview?.queuedNow ?? '–'} label="Waiting" />
          <Stat value={overview?.servingNow ?? '–'} label="Being served" />
          <Stat value={overview?.completedToday ?? '–'} label="Served today" />
        </div>
      </div>

      <Link to="/login" className="flex items-center justify-center gap-1 text-xs font-semibold" style={{ color: '#6B8198' }}>
        Staff login <ChevronIcon />
      </Link>
    </div>
  );
}
