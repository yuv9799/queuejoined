import { io } from 'socket.io-client';
import { api, IS_EXTERNAL_API } from './api.js';

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
// merged same-origin deployment we emulate the socket with lightweight polling.
// It exposes the same on/off/emit surface and periodically fires the "refresh"
// events every page already listens to (each page re-fetches over REST).
// The payload { polled: true } lets listeners tell it apart from a real event.
const POLL_MS = 5000;
const POLL_EVENTS = ['token:updated', 'queue:updated', 'staff:update', 'doctor:status', 'poll'];

function createPollingSocket() {
  const listeners = new Map();
  let timer = null;

  const fire = () => {
    if (typeof document !== 'undefined' && document.hidden) return;
    for (const ev of POLL_EVENTS) {
      for (const cb of [...(listeners.get(ev) || [])]) {
        try { cb({ polled: true }); } catch { /* a bad listener must not stop the others */ }
      }
    }
  };
  const syncTimer = () => {
    const any = [...listeners.values()].some((set) => set.size > 0);
    if (any && !timer) timer = setInterval(fire, POLL_MS);
    if (!any && timer) { clearInterval(timer); timer = null; }
  };

  const s = {
    connected: true,
    on(ev, cb) {
      if (!listeners.has(ev)) listeners.set(ev, new Set());
      listeners.get(ev).add(cb);
      syncTimer();
      return s;
    },
    once(ev, cb) {
      const wrapper = (...a) => { s.off(ev, wrapper); cb(...a); };
      return s.on(ev, wrapper);
    },
    off(ev, cb) {
      listeners.get(ev)?.delete(cb);
      syncTimer();
      return s;
    },
    emit() { return s; }, // subscribe:* rooms are not needed when polling
    removeAllListeners() { listeners.clear(); syncTimer(); return s; },
    close() { listeners.clear(); syncTimer(); },
  };
  return s;
}

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