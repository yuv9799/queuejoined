import { io } from 'socket.io-client';
import { api, IS_EXTERNAL_API } from './api.js';
import { setDataVersion } from './dataVersion.js';

let socket = null;

// When the API base isn't configured (e.g. a production build made without
// VITE_API_URL) we can't open a real-time connection. Return a harmless,
// NON-NULL stub so every subscriber API (.on/.off/.emit/.once) stays callable.
// This guarantees a missing backend can NEVER crash the React tree — it only
// disables live events, while the app shell still renders (REST shows a
// connection error). Never return null from getSocket().
function createNoopSocket() {
  return {
    on() { return this; },
    once() { return this; },
    off() { return this; },
    emit() { return this; },
    removeAllListeners() { return this; },
    close() {},
    connected: false,
  };
}

// Vercel serverless functions cannot hold WebSocket connections, so in the
// merged same-origin deployment we emulate the socket with SMART polling:
//
//  * ONE shared timer for the whole app (not one per component).
//  * Each tick calls GET /api/version - a tiny, edge-cached response - and only
//    tells listeners to re-fetch their data when the version actually CHANGED.
//  * Adaptive back-off: 5s while things change, slowing to 30s when idle;
//    snaps back to 5s on any change, on tab focus, or after the user's own write.
//  * Paused while the tab is hidden or the browser is offline.
//
// It exposes the same on/off/emit surface as a socket.io client, so every page
// keeps working unchanged. The payload { polled: true } marks synthetic events.
const BASE_MS = 5000;
const MAX_MS = 30000;
const BACKOFF = [5000, 5000, 10000, 10000, 20000, 30000]; // by consecutive idle ticks
const CHANGE_EVENTS = ['token:updated', 'queue:updated', 'staff:update', 'doctor:status', 'sos:updated', 'poll'];

const pollStats = { versionChecks: 0, changes: 0 }; // handy for demos / debugging

function createPollingSocket() {
  const listeners = new Map();
  let timer = null;
  let lastVersion = null;
  let idleTicks = 0;
  let inFlight = false;

  const hasListeners = () => [...listeners.values()].some((set) => set.size > 0);
  const canPoll = () =>
    !(typeof document !== 'undefined' && document.hidden)
    && !(typeof navigator !== 'undefined' && navigator.onLine === false);

  const nextDelay = () => {
    const base = BACKOFF[Math.min(idleTicks, BACKOFF.length - 1)] ?? MAX_MS;
    return Math.round(base * (0.9 + Math.random() * 0.2)); // +-10% jitter: no thundering herd
  };

  const schedule = (delay = nextDelay()) => {
    clearTimeout(timer);
    timer = null;
    if (!hasListeners() || !canPoll()) return;
    timer = setTimeout(tick, delay);
  };

  const fire = () => {
    for (const ev of CHANGE_EVENTS) {
      for (const cb of [...(listeners.get(ev) || [])]) {
        try { cb({ polled: true }); } catch { /* one bad listener must not stop the others */ }
      }
    }
  };

  async function tick() {
    if (inFlight) return;
    inFlight = true;
    try {
      pollStats.versionChecks += 1;
      const res = await fetch(`${api.BASE}/version`, { cache: 'no-cache' });
      const { v } = await res.json();
      setDataVersion(v);
      if (lastVersion === null) {
        lastVersion = v; // first reading = baseline; pages load their own data on mount
        idleTicks += 1;
      } else if (v !== lastVersion) {
        lastVersion = v;
        idleTicks = 0;
        pollStats.changes += 1;
        fire(); // data changed -> listeners re-fetch
      } else {
        idleTicks += 1;
      }
    } catch {
      idleTicks += 1; // server hiccup: back off instead of hammering it
    } finally {
      inFlight = false;
      schedule();
    }
  }

  // Speed up when it matters: user came back to the tab / network is back.
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { clearTimeout(timer); timer = null; return; }
      idleTicks = 0;
      if (hasListeners()) { clearTimeout(timer); tick(); }
    });
    window.addEventListener('kims:write', () => { idleTicks = 0; if (hasListeners()) { clearTimeout(timer); timer = setTimeout(tick, 400); } });
    window.addEventListener('online', () => { idleTicks = 0; if (hasListeners()) tick(); });
    window.addEventListener('offline', () => { clearTimeout(timer); timer = null; });
  }

  const s = {
    connected: true,
    on(ev, cb) {
      if (!listeners.has(ev)) listeners.set(ev, new Set());
      listeners.get(ev).add(cb);
      // First listener: read the baseline version right away (so a change made just
      // after the page loaded isn't mistaken for the starting point).
      if (!timer && !inFlight) { if (lastVersion === null) tick(); else schedule(BASE_MS); }
      return s;
    },
    once(ev, cb) {
      const wrapper = (...a) => { s.off(ev, wrapper); cb(...a); };
      return s.on(ev, wrapper);
    },
    off(ev, cb) {
      listeners.get(ev)?.delete(cb);
      if (!hasListeners()) { clearTimeout(timer); timer = null; }
      return s;
    },
    emit() { return s; }, // subscribe:* rooms are not needed when polling
    // The user just changed something: check for changes right away.
    pokeNow() { idleTicks = 0; if (hasListeners() && canPoll()) { clearTimeout(timer); tick(); } },
    removeAllListeners() { listeners.clear(); clearTimeout(timer); timer = null; return s; },
    close() { listeners.clear(); clearTimeout(timer); timer = null; },
  };
  return s;
}

// Call after the user's own write so their screen (and others') refreshes quickly.
export function pokeSocket() {
  if (socket && typeof socket.pokeNow === 'function') socket.pokeNow();
}

export const __pollStats = pollStats;

export function getSocket() {
  if (!socket) {
    socket = IS_EXTERNAL_API
      ? io(api.BASE, {
          transports: import.meta.env.PROD ? ['websocket'] : ['websocket', 'polling'],
        })
      : createPollingSocket();
  }
  return socket;
}

export function subscribeAll(cb) {
  const s = getSocket();
  const subscribe = () => s.emit('subscribe:all');
  s.on('connect', subscribe);
  if (s.connected) subscribe();
  s.on('token:updated', cb);
  s.on('queue:updated', cb);
  return () => {
    s.off('connect', subscribe);
    s.off('token:updated', cb);
    s.off('queue:updated', cb);
  };
}

// Staff Control Center real-time subscription.
export function subscribeStaff(cb) {
  const s = getSocket();
  const subscribe = () => s.emit('subscribe:staff');
  s.on('connect', subscribe);
  if (s.connected) subscribe();
  s.on('staff:update', cb);
  s.on('staff:activity', cb);
  s.on('token:updated', cb);
  s.on('queue:updated', cb);
  return () => {
    s.off('connect', subscribe);
    s.off('staff:update', cb);
    s.off('staff:activity', cb);
    s.off('token:updated', cb);
    s.off('queue:updated', cb);
  };
}

export default getSocket;