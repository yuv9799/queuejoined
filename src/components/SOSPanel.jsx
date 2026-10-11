import { useEffect, useState, useCallback } from 'react';
import api from '../services/api.js';
import { getSocket } from '../services/socket.js';
import { mapsPinUrl } from '../config/emergency.js';

const STATUS_UI = {
  ACTIVE: { t: 'Active', c: '#E50914', bg: '#FFF0F0' },
  STAFF_NOTIFIED: { t: 'Staff notified', c: '#E50914', bg: '#FFF0F0' },
  ACKNOWLEDGED: { t: 'Acknowledged', c: '#075A9F', bg: '#E6F3F9' },
  RESPONDING: { t: 'Responding', c: '#1599C5', bg: '#E6F3F9' },
  RESOLVED: { t: 'Resolved', c: '#00A866', bg: '#E5F9F1' },
  CANCELLED: { t: 'Cancelled', c: '#6B8198', bg: '#F1F5F9' },
  FAILED: { t: 'Failed', c: '#6B8198', bg: '#F1F5F9' },
};

export default function SOSPanel({ token }) {
  const [sosList, setSosList] = useState([]);
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    try { const d = await api.sosList({}, token); setSosList(d.sosList || []); } catch {}
  }, [token]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const s = getSocket();
    const onNew = (p) => { if (p?.sos) setSosList((l) => [p.sos, ...l.filter((x) => x.id !== p.sos.id)]); };
    const onUpd = (p) => { if (p?.sos) setSosList((l) => l.map((x) => (x.id === p.sos.id ? p.sos : x))); };
    s.on('sos:new', onNew);
    s.on('sos:updated', onUpd);
    s.on('poll', load); // same-origin deployment: refresh by polling
    return () => { s.off('sos:new', onNew); s.off('sos:updated', onUpd); s.off('poll', load); };
  }, [load]);

  async function act(id, action) {
    setBusy(id + ':' + action);
    try { await api.sosAction(id, action, token); await load(); } catch { /* keep */ }
    finally { setBusy(null); }
  }

  if (sosList.length === 0) {
    return <div className="card text-center"><p className="text-sm" style={{ color: '#6B8198' }}>No SOS alerts.</p></div>;
  }
  const open = sosList.filter((x) => !['RESOLVED', 'CANCELLED'].includes(x.status));
  const closed = sosList.filter((x) => ['RESOLVED', 'CANCELLED'].includes(x.status));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        {open.length === 0 && <p className="text-sm" style={{ color: '#6B8198' }}>No active SOS alerts.</p>}
        {open.map((sos) => {
          const u = STATUS_UI[sos.status] || STATUS_UI.ACTIVE;
          return (
            <div key={sos.id} className="card overflow-hidden">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 text-sm font-extrabold" style={{ color: '#E50914' }}>
                  <span className="h-2 w-2 animate-pulse rounded-full bg-[#FF1717]" aria-hidden="true" /> 🚨 NEW SOS ALERT
                </span>
                <span className="badge" style={{ color: u.c, backgroundColor: u.bg }}>{u.t}</span>
              </div>
              <p className="text-sm font-semibold" style={{ color: '#102A43' }}>SOS ID: {sos.sosNumber}</p>
              <p className="mt-1 text-xs" style={{ color: '#6B8198' }}>
                {sos.latitude.toFixed(5)}, {sos.longitude.toFixed(5)} · accuracy {sos.accuracy ? `${Math.round(sos.accuracy)}m` : '—'}
              </p>
              <p className="text-xs" style={{ color: '#6B8198' }}>
                Nearest team: {sos.assigned?.name || '—'} {sos.nearestDistance ? `(${sos.nearestDistance}m)` : ''} · {new Date((sos.createdAt + 'Z').replace(' ', 'T')).toLocaleTimeString()}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {sos.status === 'STAFF_NOTIFIED' && <button className="btn-secondary !py-1.5 text-xs" disabled={busy} onClick={() => act(sos.id, 'acknowledge')}>Acknowledge</button>}
                {(sos.status === 'ACKNOWLEDGED' || sos.status === 'STAFF_NOTIFIED') && <button className="btn-ghost !py-1.5 text-xs" disabled={busy} onClick={() => act(sos.id, 'respond')}>Responding</button>}
                <button className="btn-success !py-1.5 text-xs" disabled={busy} onClick={() => act(sos.id, 'resolve')}>Resolve</button>
                <button className="btn-secondary !py-1.5 text-xs" disabled={busy} onClick={() => act(sos.id, 'cancel')}>Cancel</button>
                <a className="btn-secondary !py-1.5 text-xs" target="_blank" rel="noopener noreferrer" href={mapsPinUrl(sos.latitude, sos.longitude)}>View Location</a>
              </div>
            </div>
          );
        })}
      </div>

      {closed.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: '#6B8198' }}>History</p>
          <div className="flex flex-col gap-2">
            {closed.map((sos) => {
              const u = STATUS_UI[sos.status] || STATUS_UI.RESOLVED;
              return (
                <div key={sos.id} className="flex items-center justify-between gap-2 rounded-xl border p-3" style={{ borderColor: '#E1EAF2' }}>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#102A43' }}>{sos.sosNumber} · {sos.assigned?.name || '—'}</p>
                    <p className="text-xs" style={{ color: '#6B8198' }}>{new Date((sos.createdAt + 'Z').replace(' ', 'T')).toLocaleString()}</p>
                  </div>
                  <span className="badge" style={{ color: u.c, backgroundColor: u.bg }}>{u.t}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}