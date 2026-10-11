import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api.js';
import { getSocket } from '../services/socket.js';

const STATUS_META = {
  queued: {
    label: 'Waiting',
    desc: 'Your token is waiting in the doctor consultation queue.',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    dot: 'bg-blue-500 animate-pulse',
    banner: null,
  },
  called: {
    label: 'Called — Please Enter',
    desc: 'YOUR TOKEN IS BEING CALLED! Please proceed to the consultation room now.',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold',
    dot: 'bg-emerald-500 animate-ping',
    banner: 'bg-emerald-500 text-white',
  },
  serving: {
    label: 'In Consultation',
    desc: 'You are currently inside consultation with your doctor.',
    color: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    dot: 'bg-cyan-500 animate-pulse',
    banner: 'bg-cyan-600 text-white',
  },
  in_consultation: {
    label: 'In Consultation',
    desc: 'You are currently inside consultation with your doctor.',
    color: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    dot: 'bg-cyan-500 animate-pulse',
    banner: 'bg-cyan-600 text-white',
  },
  held: {
    label: 'On Hold',
    desc: 'Your token is temporarily held. Staff will recall you shortly.',
    color: 'bg-amber-100 text-amber-800 border-amber-200',
    dot: 'bg-amber-500',
    banner: null,
  },
  completed: {
    label: 'Completed',
    desc: 'Your consultation has been completed. Thank you!',
    color: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-400',
    banner: null,
  },
  skipped: {
    label: 'Skipped',
    desc: 'This token was skipped. Please contact the reception desk.',
    color: 'bg-rose-100 text-rose-800 border-rose-200',
    dot: 'bg-rose-500',
    banner: null,
  },
  cancelled: {
    label: 'Cancelled',
    desc: 'This token is no longer active.',
    color: 'bg-slate-100 text-slate-500 border-slate-200',
    dot: 'bg-slate-300',
    banner: null,
  },
  issued: {
    label: 'Issued',
    desc: 'Token generated.',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
    banner: null,
  },
};

function getStoredId() {
  try {
    return localStorage.getItem('kims_active_token_id');
  } catch {
    return null;
  }
}

function formatTime(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr.includes('T') ? isoStr : isoStr.replace(' ', 'T'));
  return isNaN(d.getTime())
    ? isoStr
    : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function TokenStatus() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState(null);
  const [position, setPosition] = useState(null);
  const [peopleAhead, setPeopleAhead] = useState(0);
  const [estimatedWaitMinutes, setEstimatedWaitMinutes] = useState(0);
  const [estimatedServiceTime, setEstimatedServiceTime] = useState('');
  const [number, setNumber] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | ready | notfound | error
  const currentId = useRef(null);
  const tokenRef = useRef(null);
  const loadAbortRef = useRef(null);
  const loadTimerRef = useRef(null);
  const [lastUpdated, setLastUpdated] = useState('');

  async function load(id) {
    if (!id) return;
    loadAbortRef.current?.abort();
    const controller = new AbortController();
    loadAbortRef.current = controller;
    if (!tokenRef.current) setStatus('loading');
    try {
      const d = await api.tokenById(id, controller.signal);
      tokenRef.current = d.token;
      setToken(d.token);
      setPosition(d.position);
      setPeopleAhead(d.peopleAhead != null ? d.peopleAhead : (d.position ? Math.max(0, Number(d.position) - 1) : 0));
      setEstimatedWaitMinutes(d.estimatedWaitMinutes || 0);
      setEstimatedServiceTime(d.estimatedServiceTime || '');
      currentId.current = id;
      setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setStatus('ready');
    } catch (e) {
      if (e.name === 'AbortError') return;
      tokenRef.current = null;
      setToken(null);
      setStatus(e.status === 404 ? 'notfound' : 'error');
    }
  }

  function scheduleLoad(id) {
    if (!id) return;
    clearTimeout(loadTimerRef.current);
    loadTimerRef.current = setTimeout(() => load(id), 100);
  }

  async function search(e) {
    e.preventDefault();
    if (!number.trim()) return;
    setStatus('loading');
    try {
      const d = await api.tokenByNumber(number.trim());
      try {
        localStorage.setItem('kims_active_token_id', String(d.token.id));
      } catch {}
      tokenRef.current = d.token;
      setToken(d.token);
      setPosition(d.position);
      setPeopleAhead(d.peopleAhead != null ? d.peopleAhead : (d.position ? Math.max(0, Number(d.position) - 1) : 0));
      setEstimatedWaitMinutes(d.estimatedWaitMinutes || 0);
      setEstimatedServiceTime(d.estimatedServiceTime || '');
      currentId.current = d.token.id;
      setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setStatus('ready');
    } catch (err) {
      setToken(null);
      setStatus(err.status === 404 ? 'notfound' : 'error');
    }
  }

  // On mount: use ?id= if present, otherwise persisted active token.
  useEffect(() => {
    const qid = params.get('id');
    if (qid) {
      load(qid);
      return;
    }
    const stored = getStoredId();
    if (stored) load(stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  // Realtime updates via Socket.IO
  useEffect(() => {
    const s = getSocket();
    const handler = (payload) => {
      // If event pertains to current token or queue, refresh
      if (currentId.current) {
        if (!payload?.token || String(payload.token.id) === String(currentId.current)) {
          scheduleLoad(currentId.current);
        } else {
          scheduleLoad(currentId.current);
        }
      }
    };

    s.on('token:updated', handler);
    s.on('token:called', handler);
    s.on('token:started', handler);
    s.on('token:completed', handler);
    s.on('token:skipped', handler);
    s.on('queue:updated', handler);
    s.on('doctor:status', handler);

    return () => {
      clearTimeout(loadTimerRef.current);
      loadAbortRef.current?.abort();
      s.off('token:updated', handler);
      s.off('token:called', handler);
      s.off('token:started', handler);
      s.off('token:completed', handler);
      s.off('token:skipped', handler);
      s.off('queue:updated', handler);
      s.off('doctor:status', handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Polling fallback (6s)
  useEffect(() => {
    const t = setInterval(() => {
      if (currentId.current) scheduleLoad(currentId.current);
    }, 6000);
    return () => {
      clearInterval(t);
      clearTimeout(loadTimerRef.current);
      loadAbortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const meta = token ? STATUS_META[token.status] || STATUS_META.queued : null;
  const isCalled = token && token.status === 'called';
  const isServing = token && (token.status === 'serving' || token.status === 'in_consultation');
  const isWaiting = token && token.status === 'queued';
  const isCompleted = token && token.status === 'completed';
  const isTerminated = token && ['completed', 'cancelled', 'skipped', 'no_show'].includes(token.status);

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-black text-slate-900">Patient Live Token Tracker</h1>
        <p className="mt-1 text-sm text-slate-500">Live queue position, doctor details and estimated consultation wait</p>
      </div>

      {/* Search Bar */}
      <form onSubmit={search} className="mb-6 flex gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <input
          className="input font-medium border-0 bg-transparent shadow-none focus:ring-0"
          placeholder="Enter token number (e.g. 24 or CARD-024)"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          inputMode="text"
          aria-label="Token number"
        />
        <button className="btn-primary shrink-0 font-bold" disabled={status === 'loading'}>
          {status === 'loading' ? 'Searching…' : 'Track'}
        </button>
      </form>

      {status === 'loading' && (
        <div className="card space-y-3 text-center">
          <div className="mx-auto h-20 w-20 animate-pulse rounded-3xl bg-blue-100" aria-hidden="true" />
          <div className="skeleton" />
          <div className="skeleton w-2/3" />
          <p className="text-sm text-slate-400">Fetching live queue status from hospital server...</p>
        </div>
      )}

      {status === 'notfound' && (
        <div className="card text-center">
          <p className="empty-icon" aria-hidden="true">🔍</p>
          <p className="mt-3 text-base font-bold text-slate-800">Token Not Found</p>
          <p className="mt-1 text-sm text-slate-500">Please verify your token number or generate a new token from the kiosk.</p>
        </div>
      )}

      {status === 'error' && (
        <div className="card text-center">
          <p className="text-sm font-semibold text-rose-600">Unable to update queue. Please try again.</p>
          <button className="btn-secondary mt-3" onClick={() => currentId.current && load(currentId.current)}>
            Retry Connection
          </button>
        </div>
      )}

      {status === 'idle' && !token && (
        <div className="card text-center">
          <p className="empty-icon" aria-hidden="true">🎫</p>
          <p className="mt-3 text-base font-bold text-slate-800">No Active Token Selected</p>
          <p className="mt-1 text-sm text-slate-500">Generate a token from the Kiosk or enter your token number above to track your position in real-time.</p>
          <div className="mt-5">
            <button className="btn-primary font-bold" onClick={() => navigate('/#token')}>
              🎟️ Get a Token Now
            </button>
          </div>
        </div>
      )}

      {/* Main Token Card */}
      {token && meta && (
        <div className="card token-shell pop-in relative overflow-hidden text-center shadow-xl">
          {/* Urgent Call Alert Banner */}
          {isCalled && (
            <div className="animate-pulse rounded-2xl bg-emerald-600 p-4 text-white shadow-lg">
              <p className="text-lg font-black tracking-wide">🔔 YOUR TOKEN IS BEING CALLED!</p>
              <p className="text-sm font-semibold opacity-95">
                Please proceed immediately to <strong>{token.doctor_room || 'Consultation Room'}</strong>
              </p>
            </div>
          )}

          {/* In Consultation Banner */}
          {isServing && (
            <div className="rounded-2xl bg-cyan-600 p-3.5 text-white shadow-md">
              <p className="text-base font-extrabold tracking-wide">🩺 CONSULTATION IN PROGRESS</p>
              <p className="text-xs opacity-90">Currently attending consultation with {token.doctor_name}</p>
            </div>
          )}

          {/* Status Badge */}
          <div className="mt-4 flex items-center justify-center gap-2">
            <span className={`status-dot ${meta.dot}`} aria-hidden="true" />
            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${meta.color}`}>
              {meta.label}
            </span>
          </div>

          {/* Prominent Token Display */}
          <div
            className="pulse-ring mx-auto my-4 flex flex-col items-center justify-center rounded-3xl p-6 text-white shadow-xl transition-all"
            style={{ backgroundColor: token.department_color || '#2563eb' }}
            aria-label={`Token ${token.token_code || token.token_number}`}
          >
            <span className="text-xs uppercase tracking-widest opacity-80">YOUR TOKEN</span>
            <span className="text-6xl font-black tracking-tight">{token.token_code || token.token_number}</span>
            <span className="mt-1 text-sm font-bold opacity-95">{token.department_name}</span>
          </div>

          {/* Doctor Details Card */}
          <div className="my-4 rounded-2xl border border-blue-200 bg-gradient-to-r from-slate-50 to-blue-50 p-4 text-left shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600">Assigned Doctor</p>
                <h3 className="text-lg font-black text-slate-900">{token.doctor_name || 'Department Consultant'}</h3>
                <p className="text-xs text-slate-600">
                  {token.doctor_qualification ? `${token.doctor_qualification} · ` : ''}
                  {token.doctor_specialization || token.department_name}
                </p>
                {token.patient_name && (
                  <p className="mt-2 text-xs text-slate-500">
                    Patient: <strong className="text-slate-700">{token.patient_name}</strong>
                  </p>
                )}
              </div>
              <div className="text-right">
                <span className="inline-block rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-black text-white shadow-sm">
                  {token.doctor_room || 'Room 101'}
                </span>
                <p className="mt-1 text-[11px] text-slate-400">{token.area_name}</p>
              </div>
            </div>
          </div>

          {/* Dynamic Queue Metrics */}
          {!isTerminated && (
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="metric-card rounded-2xl">
                <p className="text-2xl font-black text-slate-800">
                  {isCalled
                    ? '0'
                    : isWaiting
                    ? peopleAhead === 0
                      ? 'You are next'
                      : `${peopleAhead} ahead`
                    : '—'}
                </p>
                <p className="text-xs font-semibold text-slate-500">
                  {isWaiting && peopleAhead > 0 ? `Queue Position #${position}` : 'Queue Status'}
                </p>
              </div>

              <div className="metric-card metric-card--primary rounded-2xl">
                <p className="text-2xl font-black text-blue-700">
                  {isCalled
                    ? 'Now'
                    : isWaiting
                    ? estimatedWaitMinutes > 0
                      ? `~${estimatedWaitMinutes} min`
                      : '< 5 min'
                    : '—'}
                </p>
                <p className="text-xs font-semibold text-blue-600">
                  {estimatedServiceTime ? `Est. Service: ${estimatedServiceTime}` : 'Estimated Wait'}
                </p>
              </div>
            </div>
          )}

          {/* Completed State */}
          {isCompleted && (
            <div className="my-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-base font-bold text-emerald-800">✓ Consultation Completed</p>
              <p className="mt-0.5 text-xs text-emerald-600">
                Completed at {formatTime(token.completed_at) || 'Today'}
              </p>
            </div>
          )}

          {/* Footer details */}
          <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-400">
            <span>Created: {formatTime(token.created_at)}</span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Live sync: {lastUpdated || 'Just now'}
            </span>
          </div>

          {/* Action buttons */}
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {isTerminated ? (
              <button className="btn-primary font-bold" onClick={() => navigate('/#token')}>
                🎟️ Get New Token
              </button>
            ) : (
              <>
                <button className="btn-secondary !px-4" onClick={() => currentId.current && load(currentId.current)}>
                  🔄 Refresh Status
                </button>
                <button className="btn-ghost !px-4" onClick={() => navigate('/live')}>
                  📺 Live Board
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}