// Shared persistence for serverless hosting.
//
// Vercel runs the API on many short-lived instances, each with its own /tmp.
// To make them behave like ONE server, the SQLite file is snapshotted into a
// shared Redis (Upstash, via Vercel Storage / Marketplace):
//   - every request first loads the newest snapshot (only if its version changed)
//   - every write request takes a short global lock, runs, then saves a snapshot
// Without the Redis env vars this module is inert and the app uses local /tmp only.
import { gzipSync, gunzipSync } from 'node:zlib';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import { DB_FILE, db, replaceDatabaseFile, migrate } from './db.js';

// Accept the standard names AND any custom prefix chosen in the Vercel integration
// (e.g. STORAGE_KV_REST_API_URL / STORAGE_KV_REST_API_TOKEN).
function findEnv(suffixes) {
  for (const name of suffixes) if (process.env[name]) return process.env[name];
  const key = Object.keys(process.env).find(
    (k) => suffixes.some((suf) => k.endsWith(`_${suf}`)) && process.env[k]
  );
  return key ? process.env[key] : undefined;
}
const URL_ = findEnv(['KV_REST_API_URL', 'UPSTASH_REDIS_REST_URL']);
const TOKEN = findEnv(['KV_REST_API_TOKEN', 'UPSTASH_REDIS_REST_TOKEN']);
// Standard Redis connection string (Vercel "Redis" / Redis Cloud integration).
const REDIS_URL = findEnv(['REDIS_URL']);

export const persistenceEnabled = Boolean(process.env.VERCEL && ((URL_ && TOKEN) || REDIS_URL));

const DATA_KEY = 'kims:db:data';
const VER_KEY = 'kims:db:ver';
const LOCK_KEY = 'kims:db:lock';

let localVersion = null;

let redisClient = null;
async function getRedis() {
  if (redisClient?.isOpen) return redisClient;
  const { createClient } = await import('redis');
  const client = createClient({
    url: REDIS_URL,
    socket: { connectTimeout: 5000, reconnectStrategy: false },
  });
  client.on('error', (err) => console.error('Redis client error:', err.message));
  await client.connect();
  redisClient = client;
  return client;
}

// One command, via node-redis (REDIS_URL) or the Upstash REST API.
async function cmd(...args) {
  if (REDIS_URL) {
    try {
      const client = await getRedis();
      return await client.sendCommand(args.map(String));
    } catch (err) {
      try { await redisClient?.disconnect(); } catch { /* ignore */ }
      redisClient = null; // reconnect on the next call
      throw err;
    }
  }
  const res = await fetch(URL_, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) throw new Error(`Redis error: ${json.error || res.status}`);
  return json.result;
}

// Load the latest shared snapshot if ours is stale. Returns false if none exists yet.
export async function syncFromRemote() {
  const remoteVersion = await cmd('GET', VER_KEY);
  if (!remoteVersion) return false;
  if (remoteVersion === localVersion) return true;
  const data = await cmd('GET', DATA_KEY);
  if (!data) return false;
  replaceDatabaseFile(gunzipSync(Buffer.from(data, 'base64')));
  migrate(); // bring an older snapshot up to the current schema (idempotent)
  localVersion = remoteVersion;
  return true;
}

export async function pushToRemote() {
  const buf = gzipSync(fs.readFileSync(DB_FILE));
  const version = randomUUID();
  await cmd('MSET', DATA_KEY, buf.toString('base64'), VER_KEY, version);
  localVersion = version;
}

// Global write lock so two instances never overwrite each other's changes.
export async function acquireLock() {
  const owner = randomUUID();
  for (let i = 0; i < 80; i++) {
    const ok = await cmd('SET', LOCK_KEY, owner, 'NX', 'PX', '8000');
    if (ok === 'OK') return owner;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('Could not acquire write lock');
}

export async function releaseLock(owner) {
  try {
    const current = await cmd('GET', LOCK_KEY);
    if (current === owner) await cmd('DEL', LOCK_KEY);
  } catch { /* lock expires on its own after 8s */ }
}

// Small per-conversation state for the AI assistant. On serverless the next chat
// message can hit a different instance, so the state lives in shared Redis.
export async function sessionGet(id) {
  const raw = await cmd('GET', `kims:ai:${id}`);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}
export async function sessionSet(id, state, ttlSeconds) {
  await cmd('SET', `kims:ai:${id}`, JSON.stringify(state), 'EX', String(ttlSeconds));
}

export function localHasData() {
  return Boolean(db.prepare('SELECT id FROM departments LIMIT 1').get());
}
