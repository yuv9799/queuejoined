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
        className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-white shadow-md"
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
    return <div className="skeleton h-[72px] rounded-2xl" aria-hidden="true" />;
  }
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-dashed px-4 py-3" style={{ borderColor: '#C9D8E5', backgroundColor: '#F5F9FC' }}>
      <span aria-hidden="true" className="text-2xl">🎫</span>
      <p className="text-sm" style={{ color: '#486581' }}>
        <b style={{ color: '#102A43' }}>No active token.</b> Generate one below to join the queue.
      </p>
    </div>
  );
}

function Tile({ icon: Icon, label, hint, tone, to, onClick }) {
  const inner = (
    <>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: tone.bg, color: tone.fg }}>
        <Icon width={20} height={20} />
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-bold leading-tight" style={{ color: '#102A43' }}>{label}</span>
        <span className="block truncate text-[11px] leading-tight" style={{ color: '#6B8198' }}>{hint}</span>
      </span>
    </>
  );
  const cls = 'flex items-center gap-2.5 rounded-2xl border bg-white p-2.5 text-left shadow-sm active:scale-[0.98] transition';
  const style = { borderColor: '#E1EAF2' };
  return to
    ? <Link to={to} className={cls} style={style}>{inner}</Link>
    : <button type="button" onClick={onClick} className={cls} style={style}>{inner}</button>;
}

export default function MobileHome({ active, onOpenReviews }) {
  const { openEmergency } = useEmergency();
  const [overview, setOverview] = useState(null);

  useEffect(() => {
    let alive = true;
    const load = () => api.overview().then((d) => { if (alive) setOverview(d.overview || null); }).catch(() => {});
    load();
    const off = subscribeAll(load);
    return () => { alive = false; off(); };
  }, []);

  return (
    <div className="space-y-3">
      <TokenCard active={active} />

      <div className="grid grid-cols-2 gap-2.5">
        <Tile icon={PlusTicketIcon} label="Generate Token" hint="Join a queue" tone={{ bg: '#E6F3F9', fg: '#075A9F' }} to="/kiosk" />
        <Tile icon={BuildingIcon} label="Departments" hint="Live counts" tone={{ bg: '#EEF2FF', fg: '#4F46E5' }} to="/departments" />
        <Tile icon={StarIcon} label="Reviews" hint="Patient feedback" tone={{ bg: '#FEF6E0', fg: '#B7791F' }} onClick={onOpenReviews} />
        <Tile icon={SosIcon} label="Emergency" hint="SOS help" tone={{ bg: '#FDECEC', fg: '#D92D20' }} onClick={openEmergency} />
      </div>

      {overview && (
        <div className="flex items-center justify-between rounded-2xl border bg-white px-3.5 py-2.5 text-xs" style={{ borderColor: '#E1EAF2', color: '#486581' }}>
          <span className="flex items-center gap-1.5 font-semibold"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> Hospital right now</span>
          <span><b style={{ color: '#102A43' }}>{overview.queuedNow ?? 0}</b> waiting · <b style={{ color: '#102A43' }}>{overview.servingNow ?? 0}</b> being served</span>
        </div>
      )}

      <Link to="/login" className="flex items-center justify-center gap-1 pt-1 text-xs font-semibold" style={{ color: '#6B8198' }}>
        Staff login <ChevronIcon />
      </Link>
    </div>
  );
}
