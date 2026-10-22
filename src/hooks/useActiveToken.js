import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api.js';
import { getSocket } from '../services/socket.js';

// The visitor's OWN active token, identified only by the id saved on THIS device
// (localStorage, written when they generate a token). Nobody else's token is
// ever looked up, so other users' information is never exposed.
const ENDED = ['completed', 'cancelled', 'skipped', 'no_show', 'expired'];
const KEY = 'kims_active_token_id';

// Tokens this device has generated/tracked (ids only, newest first), so the
// Visits calendar can show the visitor's OWN history. Never other people's.
const HISTORY_KEY = 'kims_token_history';
export function readHistory() {
  try { const v = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; }
}
function remember(id) {
  try {
    const list = readHistory().filter((x) => String(x) !== String(id));
    list.unshift(String(id));
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, 60)));
  } catch { /* storage unavailable */ }
}

function readId() {
  try { return localStorage.getItem(KEY); } catch { return null; }
}

/**
 * phase: 'none' | 'loading' | 'active' | 'ended' | 'unavailable'
 * Wait time comes from the backend estimate (/tokens/:id/status), never hardcoded.
 */
export function useActiveToken() {
  const location = useLocation();
  const [state, setState] = useState({ phase: readId() ? 'loading' : 'none', token: null, waitMinutes: null, peopleAhead: null });
  const idRef = useRef(readId());
  const reqRef = useRef(0);

  const load = useCallback(async () => {
    const id = readId();
    idRef.current = id;
    if (id) remember(id);
    if (!id) { setState({ phase: 'none', token: null, waitMinutes: null, peopleAhead: null }); return; }
    const mine = ++reqRef.current;
    try {
      const d = await api.tokenStatus(id);
      if (mine !== reqRef.current) return; // a newer request superseded this one
      const token = d.token;
      if (!token) { setState({ phase: 'ended', token: null, waitMinutes: null, peopleAhead: null }); return; }
      const ended = ENDED.includes(token.status);
      const wait = Number.isFinite(Number(d.estimatedWaitMinutes)) && d.estimatedWaitMinutes !== null
        ? Number(d.estimatedWaitMinutes) : null;
      const ahead = Number.isFinite(Number(d.peopleAhead)) && d.peopleAhead !== null ? Number(d.peopleAhead) : null;
      setState({
        phase: ended ? 'ended' : 'active',
        token,
        waitMinutes: ended ? null : wait,
        peopleAhead: ended ? null : ahead,
      });
    } catch (e) {
      if (mine !== reqRef.current) return;
      // 404 = token no longer exists (expired / cleared) -> treat as ended.
      if (e?.status === 404) setState({ phase: 'ended', token: null, waitMinutes: null, peopleAhead: null });
      else setState((prev) => (prev.token ? { ...prev, phase: 'unavailable' } : { phase: 'unavailable', token: null, waitMinutes: null, peopleAhead: null }));
    }
  }, []);

  // Initial load + whenever the route changes (e.g. right after generating a token).
  useEffect(() => { load(); }, [load, location.pathname, location.search]);

  // Live updates: same version-gated poller the rest of the app uses.
  useEffect(() => {
    const s = getSocket();
    const onChange = () => { if (readId()) load(); };
    s.on('token:updated', onChange);
    s.on('queue:updated', onChange);
    const onStorage = (e) => { if (e.key === KEY) load(); };
    const onWrite = () => setTimeout(load, 600); // the user's own write may have created/changed a token
    window.addEventListener('storage', onStorage);
    window.addEventListener('kims:write', onWrite);
    return () => {
      s.off('token:updated', onChange);
      s.off('queue:updated', onChange);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('kims:write', onWrite);
    };
  }, [load]);

  return { ...state, reload: load };
}

// Short text for the header pill, derived from real data only.
export function waitLabel({ phase, token, waitMinutes }) {
  if (phase === 'none') return { main: 'No active token', sub: null };
  if (phase === 'ended') return { main: 'No active token', sub: null };
  if (phase === 'loading') return { main: '…', sub: 'Est. wait' };
  if (phase === 'unavailable' && waitMinutes === null) return { main: 'Est. wait unavailable', sub: null };
  if (token?.status === 'called') return { main: 'Your turn', sub: 'Please go in' };
  if (token?.status === 'serving' || token?.status === 'in_consultation') return { main: 'In consultation', sub: null };
  if (waitMinutes === null) return { main: 'Est. wait unavailable', sub: null };
  if (waitMinutes <= 0) return { main: '< 1 min', sub: 'Est. wait' };
  return { main: `${waitMinutes} min`, sub: 'Est. wait' };
}
