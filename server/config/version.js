// "Data version": a cheap value that changes whenever data changes.
// Clients poll GET /api/version (tiny, edge-cached) and only re-download the
// heavy queue data when this value differs from the one they last saw.
import { persistenceEnabled, getLocalVersion } from './persist.js';

const bootId = Date.now().toString(36);
let counter = 0;

// Called after every successful write request (single-instance / local mode).
export function bumpVersion() { counter += 1; }

export function currentVersion() {
  // Shared mode: the Redis snapshot id is the version (changes on every write,
  // on every instance). Local mode: an in-process write counter.
  return persistenceEnabled ? String(getLocalVersion() || 'init') : `${bootId}.${counter}`;
}
