import { useEffect, useState } from 'react';
import Modal from './Modal.jsx';
import api from '../services/api.js';
import { getSocket } from '../services/socket.js';
import {
  EMERGENCY_PHONES, callLink, mapsDirectionsUrl, mapsPinUrl,
} from '../config/emergency.js';
import { KIMS_LOCATION } from '../config/location.js';
import { getCurrentUserLocation } from '../services/geolocation.js';

const ACTIONS = [
  { key: 'callEmergency', icon: '🚑', title: 'Emergency Assistance', desc: 'Immediate ambulance and urgent medical response.', action: 'Call Emergency', detail: 'Dial 108 (National) · 102 (Ambulance)' },
  { key: 'callDesk', icon: '📞', title: 'Contact Emergency Desk', desc: 'Reach the KIMS hospital emergency reception.', action: 'Call Desk', detail: EMERGENCY_PHONES.desk },
  { key: 'directions', icon: '🏥', title: 'Find Emergency Department', desc: 'Emergency & Trauma unit location and direction.', action: 'Get Directions', detail: 'Ground Floor · Main Entrance Right' },
  { key: 'locate', icon: '📍', title: 'Find Nearest Help', desc: 'Locate the nearest help desk or triage point.', action: 'Locate', detail: 'Triage desk · Emergency wing' },
  { key: 'sos', icon: '🆘', title: 'SOS', desc: 'Alert hospital staff to your location immediately.', action: 'Send SOS', detail: 'Notifies the nearest available staff' },
];

// Confirmation dialog rendered inside the modal.
function Confirm({ title, body, confirmLabel, cancelLabel = 'Cancel', onConfirm, onCancel }) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[20px] bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
        <p className="text-base font-bold" style={{ color: '#102A43' }}>{title}</p>
        <p className="mt-2 text-sm" style={{ color: '#6B8198' }}>{body}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="btn-secondary !py-2" onClick={onCancel}>{cancelLabel}</button>
          <button type="button" className="btn-emergency !py-2" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

function isValidCoord(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng)
    && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function locationErrorText(code) {
  switch (code) {
    case 'denied':
      return 'Location Access Required. Your current location is needed to provide directions from where you are to KIMS Hospital. Please enable Location permission for this website and try again.';
    case 'services-off':
      return 'Turn On Location. Your device location is currently turned off. Please enable Location Services and try again.';
    case 'timeout':
      return 'Unable to get your current location. Please make sure Location Services are enabled and try again.';
    case 'unsupported':
      return 'Geolocation is not supported on this device.';
    case 'invalid':
      return 'Unable to determine a valid location. Please try again.';
    case 'unavailable':
    default:
      return 'Unable to access your location. Please enable location access for this website in your browser settings and try again.';
  }
}

function sosLocationError() {
  return 'Unable to determine your location. For immediate emergency assistance, call 108 or contact the KIMS Emergency Desk.';
}

function sosKey() {
  try {
    let k = localStorage.getItem('kims_sos_key');
    if (!k) { k = 'k' + Math.random().toString(36).slice(2, 12); localStorage.setItem('kims_sos_key', k); }
    return k;
  } catch { return 'k' + Math.random().toString(36).slice(2, 12); }
}
export default function EmergencyModal({ open, onClose }) {
  const [conf, setConf] = useState(null);
  const [desktopMsg, setDesktopMsg] = useState('');
  const [loc, setLoc] = useState({ phase: 'idle', message: '', result: null });
  const [sos, setSos] = useState({ phase: 'idle', message: '', result: null });
  const [direction, setDirection] = useState({ phase: 'idle', message: '', code: null });
  const [permission, setPermission] = useState(null);
  let directionBusy = false;

  // Reset transient flows when the modal opens.
  useEffect(() => {
    if (open) {
      setConf(null);
      setDesktopMsg('');
      setLoc({ phase: 'idle', message: '', result: null });
      setSos({ phase: 'idle', message: '', result: null });
      setDirection({ phase: 'idle', message: '', code: null });
      setPermission(null);
      directionBusy = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function doTel(number) {
    const link = callLink(number);
    if (link) window.location.href = link;
    else setDesktopMsg(`Calling requires a phone. Please dial ${number} directly.`);
  }

  const confirmCall108 = () => { doTel(EMERGENCY_PHONES.national); setConf(null); };
  const confirmDesk = () => { doTel(EMERGENCY_PHONES.desk); setConf(null); };

  const openKimsPin = () => {
    window.open(
      mapsPinUrl(KIMS_LOCATION.emergency.latitude, KIMS_LOCATION.emergency.longitude),
      '_blank', 'noopener,noreferrer',
    );
  };

  function onAllowPermission() {
    const kind = permission?.for;
    if (kind === 'directions') runGetDirections();
    else if (kind === 'locate') runLocate();
    else if (kind === 'sos') runSos();
    else setPermission(null);
  }

  async function runGetDirections() {
    setPermission(null);
    if (directionBusy) return;
    directionBusy = true;
    setDirection({ phase: 'loading', message: '', code: null });

    // STEP 1 — obtain the user's REAL device GPS (never inferred/guessed).
    let position;
    try {
      position = await getCurrentUserLocation();
    } catch (e) {
      const code = e.code || 'unavailable';
      setDirection({ phase: 'error', code, message: locationErrorText(code) });
      directionBusy = false;
      return;
    }

    // Explicit, separate route values — the user's GPS may NEVER be reused as
    // the destination. These are two independent objects.
    const userOrigin = {
      type: 'user',
      latitude: position.latitude,
      longitude: position.longitude,
    };
    const kimsDestination = {
      type: 'kims',
      name: KIMS_LOCATION.emergency.name,
      latitude: KIMS_LOCATION.emergency.latitude,
      longitude: KIMS_LOCATION.emergency.longitude,
    };

    // STEP 4 — validate BOTH points before building any URL.
    if (!isValidCoord(userOrigin.latitude, userOrigin.longitude)) {
      setDirection({
        phase: 'error',
        code: 'invalid',
        message: 'We need your current location to start directions from where you are. Please allow location access and try again.',
      });
      directionBusy = false;
      return;
    }
    if (!isValidCoord(kimsDestination.latitude, kimsDestination.longitude)) {
      setDirection({ phase: 'error', code: 'invalid', message: locationErrorText('invalid') });
      directionBusy = false;
      return;
    }
    // The route must be USER -> KIMS. If the two points collapse to the same
    // value, the route is invalid — do NOT open Google Maps.
    if (Math.abs(userOrigin.latitude - kimsDestination.latitude) < 1e-9
        && Math.abs(userOrigin.longitude - kimsDestination.longitude) < 1e-9) {
      setDirection({ phase: 'error', code: 'invalid', message: locationErrorText('invalid') });
      directionBusy = false;
      return;
    }

    const origin = `${userOrigin.latitude},${userOrigin.longitude}`;
    const destination = `${kimsDestination.latitude},${kimsDestination.longitude}`;
    const url = mapsDirectionsUrl({
      originLat: userOrigin.latitude,
      originLng: userOrigin.longitude,
      destination: kimsDestination,
      travelMode: 'driving',
    });

    if (import.meta.env?.DEV) {
      console.log('USER LATITUDE:', userOrigin.latitude);
      console.log('USER LONGITUDE:', userOrigin.longitude);
      console.log('KIMS LATITUDE:', kimsDestination.latitude);
      console.log('KIMS LONGITUDE:', kimsDestination.longitude);
      console.log('ORIGIN:', origin);
      console.log('DESTINATION:', destination);
      console.log('FINAL GOOGLE MAPS URL:', url);
    }

    setDirection({ phase: 'opening', message: '', code: null });
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => { setDirection({ phase: 'idle', message: '', code: null }); directionBusy = false; }, 1600);
  }

  async function runLocate() {
    setPermission(null);
    setLoc({ phase: 'loading', message: '', result: null });
    let user;
    try {
      user = await getCurrentUserLocation();
    } catch (e) {
      setLoc({ phase: 'error', code: e.code || 'unavailable', message: locationErrorText(e.code || 'unavailable'), result: null });
      return;
    }
    if (!isValidCoord(user.latitude, user.longitude)) {
      setLoc({ phase: 'error', message: locationErrorText('invalid'), result: null });
      return;
    }
    try {
      const res = await api.nearestHelpPoint(user.latitude, user.longitude);
      setLoc({
        phase: 'done',
        result: { ...res.nearest, dirUrl: mapsDirectionsUrl({ originLat: user.latitude, originLng: user.longitude, destination: res.nearest.helpPoint, travelMode: 'driving' }) },
      });
    } catch (e) {
      setLoc({ phase: 'error', message: e.message || 'Could not find a nearby help point.', result: null });
    }
  }

  async function runSos() {
    setPermission(null);
    setSos({ phase: 'locating', message: '', result: null });
    let user;
    try {
      user = await getCurrentUserLocation();
    } catch (e) {
      setSos({ phase: 'location-error', code: e.code || 'unavailable', message: sosLocationError(), result: null });
      return;
    }
    if (!isValidCoord(user.latitude, user.longitude)) {
      setSos({ phase: 'location-error', message: sosLocationError(), result: null });
      return;
    }
    setSos({ phase: 'sending', message: '', result: null });
    try {
      const res = await api.sosCreate({
        latitude: user.latitude,
        longitude: user.longitude,
        accuracy: user.accuracy || null,
        idempotencyKey: sosKey(),
        source: 'web',
      });
      setSos({ phase: 'active', result: res.sos, team: res.team });
    } catch (e) {
      setSos({ phase: 'error', message: e.message || 'Emergency alert could not be confirmed.', result: null });
    }
  }

  // Live SOS status: realtime + polling.
  useEffect(() => {
    if (sos.phase !== 'active' || !sos.result) return;
    const s = getSocket();
    const handler = (payload) => {
      if (payload?.sos?.id === sos.result.id) setSos((prev) => ({ ...prev, result: payload.sos }));
    };
    s.on('sos:updated', handler);
    const t = setInterval(async () => {
      try { const d = await api.sosGet(sos.result.id); setSos((prev) => ({ ...prev, result: d.sos })); } catch {}
    }, 8000);
    return () => { s.off('sos:updated', handler); clearInterval(t); };
  }, [sos.phase, sos.result?.id]);

  async function cancelSos() {
    try {
      const d = await api.sosAction(sos.result.id, 'cancel', null);
      setSos((prev) => ({ ...prev, result: d.sos }));
    } catch (e) {
      setSos((prev) => ({ ...prev, message: 'Only authorized staff can cancel an SOS. Contact the emergency desk.' }));
    }
  }

  const confBtns = {
    call108: { title: 'Call Emergency Services?', body: `You are about to call ${EMERGENCY_PHONES.national} for emergency assistance.`, confirm: 'Call 108', act: confirmCall108 },
    desk: { title: 'Call Emergency Desk?', body: `KIMS Emergency Desk · ${EMERGENCY_PHONES.desk}`, confirm: 'Call Desk', act: confirmDesk },
    sos: { title: 'Send SOS Alert?', body: 'This will immediately alert the nearest available hospital staff and share your current location with them. Are you sure you want to send an SOS?', confirm: 'Send SOS', act: () => setPermission({ for: 'sos' }) },
  };

  function handleAction(key) {
    if (key === 'callEmergency') setConf({ kind: 'call108' });
    else if (key === 'callDesk') setConf({ kind: 'desk' });
    else if (key === 'directions') setPermission({ for: 'directions' });
    else if (key === 'locate') setPermission({ for: 'locate' });
    else if (key === 'sos') setConf({ kind: 'sos' });
  }
  function cardLabel(key) {
    if (key === 'locate') return loc.phase === 'loading' ? 'Getting location…' : 'Locate';
    if (key === 'directions') return direction.phase === 'loading' ? 'Locating…' : direction.phase === 'opening' ? 'Opening Maps…' : 'Get Directions';
    if (key === 'sos') return sos.phase === 'locating' ? 'Getting your location…' : sos.phase === 'sending' ? 'Sending SOS…' : 'Send SOS';
    return ACTIONS.find((a) => a.key === key)?.action || '';
  }
  function humanizeStatus(s) {
    return ({ ACTIVE: 'Active', STAFF_NOTIFIED: 'Staff notified', ACKNOWLEDGED: 'Acknowledged by staff', RESPONDING: 'Staff responding', RESOLVED: 'Resolved', CANCELLED: 'Cancelled', FAILED: 'Failed' })[s] || s;
  }

  if (!open) return null;
  return (
    <Modal labelledBy="emergency-help-title" onClose={onClose}>
<div className="relative mb-5 overflow-hidden rounded-2xl bg-[#FF1717] p-5 text-white">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close emergency help"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-lg font-bold text-white transition hover:bg-white/35"
        >
          ×
        </button>
        <p id="emergency-help-title" className="flex items-center gap-2 pr-10 text-xl font-extrabold">
          <span aria-hidden="true">🚨</span> Emergency Help
        </p>
        <p className="mt-2 text-sm text-white/90">
          If this is a life-threatening emergency, please dial <strong>108</strong> immediately or call our emergency desk.
        </p>
      </div>

      {desktopMsg && (
        <div className="mb-3 rounded-lg bg-[#FFF0F0] p-3 text-sm" style={{ color: '#E50914' }}>{desktopMsg}</div>
      )}

      {/* SOS ACTIVE panel replaces the action list */}
      {sos.phase === 'active' && sos.result ? (
        <div className="rounded-xl border p-4" style={{ borderColor: '#FFC9C9', backgroundColor: '#FFF7F7' }}>
          <p className="inline-flex items-center gap-2 text-lg font-extrabold" style={{ color: '#E50914' }}>
            <span aria-hidden="true">🚨</span> SOS Active
          </p>
          <p className="mt-1 text-sm" style={{ color: '#6B8198' }}>Emergency staff have been alerted.</p>
          <div className="mt-3 space-y-1 text-sm" style={{ color: '#102A43' }}>
            <p><span className="font-semibold">SOS ID:</span> {sos.result.sosNumber}</p>
            <p><span className="font-semibold">Status:</span> {humanizeStatus(sos.result.status)}</p>
            {sos.result.assigned && <p><span className="font-semibold">Nearest team:</span> {sos.result.assigned.name}</p>}
          </div>
          {sos.message && <p className="mt-2 text-xs" style={{ color: '#E50914' }}>{sos.message}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <a className="btn-ghost !py-2" target="_blank" rel="noopener noreferrer" href={mapsPinUrl(sos.result.latitude, sos.result.longitude)}>View Location</a>
            <button type="button" className="btn-secondary !py-2" onClick={() => doTel(EMERGENCY_PHONES.desk)}>Call Emergency Desk</button>
            <button type="button" className="btn-secondary !py-2" onClick={cancelSos}>Cancel SOS</button>
          </div>
        </div>
      ) : (
        <ul className="grid gap-2.5 sm:grid-cols-1">
          {ACTIONS.map((o) => (
            <li key={o.key}>
              <button
                type="button"
                className="flex w-full items-start gap-3 rounded-xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-cardhover disabled:opacity-60"
                style={{ borderColor: '#E1EAF2' }}
                onClick={() => handleAction(o.key)}
                disabled={loc.phase === 'loading' || sos.phase === 'locating' || sos.phase === 'sending' || direction.phase === 'loading' || direction.phase === 'opening'}
                aria-label={`${o.action} — ${o.title}`}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF0F0] text-xl" aria-hidden="true">{o.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold" style={{ color: '#102A43' }}>{o.title}</span>
                    <span className="hidden shrink-0 text-xs font-semibold sm:inline" style={{ color: '#E50914' }}>{cardLabel(o.key)}</span>
                  </span>
                  <span className="mt-0.5 block text-xs" style={{ color: '#6B8198' }}>{o.desc}</span>
                  <span className="mt-1 block text-xs font-semibold" style={{ color: '#075A9F' }}>{o.detail}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
<div className="mt-4 pt-1" style={{ borderTop: '1px solid #E1EAF2' }}>
        {loc.phase === 'loading' && <p className="text-sm" style={{ color: '#6B8198' }}>Getting location…</p>}

        {direction.phase === 'loading' && <p className="text-sm" style={{ color: '#6B8198' }}>Locating…</p>}
        {direction.phase === 'opening' && <p className="text-sm" style={{ color: '#6B8198' }}>Opening Maps…</p>}

        {direction.phase === 'error' && (
          <div className="rounded-xl border p-3" style={{ borderColor: '#FFC9C9', backgroundColor: '#FFF7F7' }}>
            <p className="text-sm font-semibold" style={{ color: '#E50914' }}>{direction.message}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" className="btn-secondary !py-1.5" onClick={() => setPermission({ for: 'directions' })}>Try Again</button>
              <button type="button" className="btn-ghost !py-1.5" onClick={openKimsPin}>Open KIMS Location</button>
              {(direction.code === 'services-off' || direction.code === 'unavailable' || direction.code === 'timeout') && (
                <button type="button" className="btn-emergency !py-1.5" onClick={() => doTel(EMERGENCY_PHONES.national)}>Call Emergency</button>
              )}
            </div>
          </div>
        )}

        {loc.phase === 'done' && loc.result && (
          <div className="rounded-xl border p-3" style={{ borderColor: '#E1EAF2', backgroundColor: '#F5F9FC' }}>
            <p className="text-sm font-bold" style={{ color: '#075A9F' }}>Nearest Help Point</p>
            <p className="mt-1 text-lg font-extrabold" style={{ color: '#102A43' }}>{loc.result.helpPoint.name}</p>
            <p className="text-sm" style={{ color: '#6B8198' }}>
              <span className="font-semibold" style={{ color: '#00A866' }}>{loc.result.distance} m away</span> · {loc.result.helpPoint.floor || 'Location'}
            </p>
            <a className="btn-ghost mt-2 !py-1.5" target="_blank" rel="noopener noreferrer" href={loc.result.dirUrl}>Get Directions</a>
          </div>
        )}

        {loc.phase === 'error' && (
          <div className="rounded-xl border p-3" style={{ borderColor: '#FFC9C9', backgroundColor: '#FFF7F7', color: '#102A43' }}>
            <p className="text-sm font-semibold" style={{ color: '#E50914' }}>{loc.message}</p>
            <button type="button" className="btn-secondary mt-2 !py-1.5" onClick={() => setPermission({ for: 'locate' })}>Try Again</button>
          </div>
        )}

        {sos.phase === 'location-error' && (
          <div className="rounded-xl border p-3" style={{ borderColor: '#FFC9C9', backgroundColor: '#FFF7F7' }}>
            <p className="text-sm font-medium" style={{ color: '#102A43' }}>{sos.message}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" className="btn-secondary !py-1.5" onClick={() => setPermission({ for: 'sos' })}>Try Again</button>
              <button type="button" className="btn-emergency !py-1.5" onClick={() => doTel(EMERGENCY_PHONES.national)}>Call 108</button>
              <button type="button" className="btn-emergency !py-1.5" onClick={() => doTel(EMERGENCY_PHONES.desk)}>Call Desk</button>
            </div>
          </div>
        )}

        {sos.phase === 'sending' && <p className="text-sm" style={{ color: '#6B8198' }}>Sending SOS…</p>}
        {sos.phase === 'error' && (
          <div className="rounded-xl border p-3" style={{ borderColor: '#FFC9C9', backgroundColor: '#FFF7F7' }}>
            <p className="text-sm font-medium" style={{ color: '#E50914' }}>{sos.message || 'Emergency alert could not be confirmed.'}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" className="btn-secondary !py-1.5" onClick={() => setPermission({ for: 'sos' })}>Retry SOS</button>
              <button type="button" className="btn-emergency !py-1.5" onClick={() => doTel(EMERGENCY_PHONES.national)}>Call 108</button>
              <button type="button" className="btn-emergency !py-1.5" onClick={() => doTel(EMERGENCY_PHONES.desk)}>Call Desk</button>
            </div>
          </div>
        )}
      </div>

      <p className="mt-4 text-center text-xs" style={{ color: '#6B8198' }}>
        For non-emergencies, use the token kiosk — blue/green queues for routine services.
      </p>

      {permission && (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-[20px] bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <p className="flex items-center gap-2 text-base font-bold" style={{ color: '#102A43' }}>
              <span aria-hidden="true">📍</span> Location Required
            </p>
            <p className="mt-2 text-sm" style={{ color: '#6B8198' }}>
              We need your current location to provide directions from your location to KIMS Hospital. Your browser or device will ask for permission with its native prompt.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="btn-secondary !py-2" onClick={() => setPermission(null)}>Cancel</button>
              <button type="button" className="btn-emergency !py-2" onClick={onAllowPermission}>Allow Location</button>
            </div>
          </div>
        </div>
      )}

      {conf && (
        <Confirm
          title={confBtns[conf.kind].title}
          body={confBtns[conf.kind].body}
          confirmLabel={confBtns[conf.kind].confirm}
          onCancel={() => setConf(null)}
          onConfirm={confBtns[conf.kind].act}
        />
      )}
    </Modal>
  );
}