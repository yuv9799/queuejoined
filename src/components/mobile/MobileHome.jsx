import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api.js';
import { subscribeAll } from '../../services/socket.js';
import { applyTextSize, getTextSize, setTextSize, TEXT_SIZES } from '../../utils/textSize.js';
import { useEmergency } from '../../context/EmergencyContext.jsx';
import { PlusTicketIcon, BuildingIcon, StarIcon, SosIcon, ChevronIcon, ArrowIcon } from './icons.jsx';

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
        className="relative block overflow-hidden rounded-[28px] p-4 text-white shadow-md"
        style={{ backgroundColor: token.department_color || '#075A9F' }}
        aria-label={`Your token ${token.token_code || token.token_number}. Open details.`}
      >
        <span className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10" aria-hidden="true" />
        <span className="relative flex items-start justify-between gap-3">
          <span className="min-w-0">
            <span className="block text-[10px] font-semibold uppercase tracking-widest opacity-80">Your token</span>
            <span className="block text-4xl font-black leading-tight tracking-tight">{token.token_code || token.token_number}</span>
          </span>
          <span className="flex shrink-0 flex-col items-end gap-1 text-right">
            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold">{STATUS_LABEL[token.status] || token.status}</span>
            {peopleAhead !== null && token.status === 'queued' && (
              <span className="text-xs font-semibold opacity-95">{peopleAhead === 0 ? 'You are next' : `${peopleAhead} ahead`}</span>
            )}
          </span>
        </span>
        <span className="relative mt-3 flex items-center justify-between rounded-full bg-black/35 py-1.5 pl-5 pr-1.5 text-sm font-semibold">
          See details
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-900"><ArrowIcon /></span>
        </span>
      </Link>
    );
  }
  if (phase === 'loading') {
    return <div className="skeleton h-[128px] rounded-[28px]" aria-hidden="true" />;
  }
  return (
    <div className="flex items-center gap-3 rounded-[28px] px-4 py-4 text-white" style={{ backgroundColor: '#17191C' }}>
      <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-xl">🎫</span>
      <p className="text-sm opacity-90">
        <b className="text-white">No active token.</b> Generate one below to join the queue.
      </p>
    </div>
  );
}

function Tile({ icon: Icon, label, hint, stat, tone, to, onClick }) {
  const inner = (
    <>
      <span className="flex h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: tone.bg, color: tone.fg }}>
        <Icon width={24} height={24} />
      </span>
      <span className="mt-auto block w-full">
        {stat && (
          <span className="mb-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ backgroundColor: tone.bg, color: tone.fg }}>{stat}</span>
        )}
        <span className="block pr-9 text-[15px] font-extrabold leading-tight" style={{ color: "#17191C" }}>{label}</span>
        <span className="tile-hint mt-0.5 block pr-9 text-xs leading-snug" style={{ color: '#6B7280' }}>{hint}</span>
      </span>
      <span className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full text-white" style={{ backgroundColor: '#17191C' }} aria-hidden="true">
        <ArrowIcon width={16} height={16} />
      </span>
    </>
  );
  const cls = 'relative flex min-h-[96px] flex-col items-start gap-2 rounded-[24px] bg-white p-3.5 text-left shadow-sm active:scale-[0.98] transition';
  return to
    ? <Link to={to} className={cls}>{inner}</Link>
    : <button type="button" onClick={onClick} className={cls}>{inner}</button>;
}

function Stat({ value, label }) {
  return (
    <div className="flex-1 text-center">
      <p className="text-lg font-extrabold leading-tight" style={{ color: '#17191C' }}>{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#6B8198' }}>{label}</p>
    </div>
  );
}

function TextSizeControl() {
  const [size, setSize] = useState(getTextSize);
  useEffect(() => { applyTextSize(size); }, [size]);
  return (
    <div className="flex items-center gap-1" role="group" aria-label="Text size">
      <span className="text-size-label mr-1 text-[11px] font-semibold" style={{ color: '#6B7280' }}>Text size</span>
      {TEXT_SIZES.map((t) => (
        <button
          key={t.id} type="button" aria-label={t.aria} aria-pressed={size === t.id}
          onClick={() => { setTextSize(t.id); setSize(t.id); }}
          className="h-7 min-w-[34px] rounded-full px-2 text-xs font-bold"
          style={size === t.id ? { backgroundColor: '#17191C', color: '#fff' } : { backgroundColor: '#fff', color: '#17191C', boxShadow: '0 0 0 1px #E5E7EB' }}
        >{t.label}</button>
      ))}
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

      <h2 className="home-heading -mb-1 px-1 text-base font-extrabold" style={{ color: '#17191C' }}>Quick actions</h2>

      <div className="grid flex-1 grid-cols-2 grid-rows-2 gap-3">
        <Tile
          icon={PlusTicketIcon} label="Generate Token" 
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
          icon={SosIcon} label="Emergency" 
          hint="Urgent help and SOS — tap to alert the hospital."
          stat="24×7"
          tone={{ bg: '#FDECEC', fg: '#D92D20' }} onClick={openEmergency}
        />
      </div>

      <div className="home-stats rounded-[24px] bg-white px-3 py-2.5 shadow-sm">
        <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: '#486581' }}>
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> Hospital right now
        </p>
        <div className="flex divide-x" style={{ '--tw-divide-opacity': 1 }}>
          <Stat value={overview?.queuedNow ?? '–'} label="Waiting" />
          <Stat value={overview?.servingNow ?? '–'} label="Being served" />
          <Stat value={overview?.completedToday ?? '–'} label="Served today" />
        </div>
      </div>

      <div className="flex items-center justify-between px-1">
        <TextSizeControl />
        <Link to="/login" className="flex items-center gap-1 text-xs font-semibold" style={{ color: '#6B7280' }}>
          Staff login <ChevronIcon />
        </Link>
      </div>
    </div>
  );
}
