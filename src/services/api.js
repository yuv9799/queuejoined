import { getDataVersion } from './dataVersion.js';
// API base URL.
// Merged deployment: the backend runs as a Vercel serverless function on the
// SAME origin under /api, so no configuration is needed. In local dev, Vite
// proxies /api to the Express server (see vite.config.js). Set VITE_API_URL
// only if you want to point the frontend at a separate, external backend.
const CONFIGURED_BASE = String(import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
const BASE = CONFIGURED_BASE || '/api';
export const IS_EXTERNAL_API = Boolean(CONFIGURED_BASE);

// Identical GETs that are already in flight share ONE network request (e.g. the
// navbar, the live card and the page all asking for /tokens/live at once).
// Requests with an AbortSignal are never shared, so cancelling stays per-caller.
const inflight = new Map();

// Public, identical-for-everyone reads that the CDN may cache. They are keyed by
// the current data version (?_v=...) so a cached copy can never be stale.
const VERSION_KEYED = /^\/(?:tokens\/live|departments|areas|stats\/overview|doctors\/public)(?:\?|$)/;
function withVersion(path, method, token) {
  const v = getDataVersion();
  if (method !== 'GET' || token || !v || !VERSION_KEYED.test(path)) return path;
  return `${path}${path.includes('?') ? '&' : '?'}_v=${encodeURIComponent(v)}`;
}

function request(rawPath, opts = {}) {
  const method = opts.method || 'GET';
  const path = withVersion(rawPath, method, opts.token);
  if (method !== 'GET' || opts.signal) return rawRequest(path, opts).then(afterWrite(method));
  const key = `${path}|${opts.token || ''}|${opts.ownerKey || ''}`;
  if (inflight.has(key)) return inflight.get(key);
  const p = rawRequest(path, opts).finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

// After the user's own successful write, nudge the polling socket to check for
// changes right away (so their screen updates without waiting for the next tick).
function afterWrite(method) {
  return (data) => {
    if (method !== 'GET' && typeof window !== 'undefined') window.dispatchEvent(new Event('kims:write'));
    return data;
  };
}

async function rawRequest(path, { method = 'GET', body, token, ownerKey, signal } = {}) {
  if (!BASE) {
    const err = new Error(
      'Backend API is not configured. Set VITE_API_URL at build time to your deployed backend URL.'
    );
    err.status = 0;
    throw err;
  }
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (ownerKey) headers['X-Review-Owner-Key'] = ownerKey;
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (cause) {
    if (cause?.name === 'AbortError') throw cause;
    const err = new Error('Unable to connect to the KIMS Queue server. Please try again.', { cause });
    err.status = 0;
    throw err;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = res.status >= 500
      ? 'The KIMS Queue server is temporarily unavailable. Please try again.'
      : data.error || `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  BASE,

  // Auth
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  me: (token) => request('/auth/me', { token }),
  register: (payload, token) => request('/auth/register', { method: 'POST', body: payload, token }),
  users: (token) => request('/auth/users', { token }),
  deleteUser: (id, token) => request(`/auth/users/${id}`, { method: 'DELETE', token }),

  // Departments / Areas / Counters
  departments: (token, signal) => request('/departments', { token, signal }),
  createDepartment: (p, token) => request('/departments', { method: 'POST', body: p, token }),
  updateDepartment: (id, p, token) => request(`/departments/${id}`, { method: 'PUT', body: p, token }),
  deleteDepartment: (id, token) => request(`/departments/${id}`, { method: 'DELETE', token }),

  areas: (token, departmentId) =>
    request(`/areas${departmentId ? `?departmentId=${departmentId}` : ''}`, { token }),
  createArea: (p, token) => request('/areas', { method: 'POST', body: p, token }),
  updateArea: (id, p, token) => request(`/areas/${id}`, { method: 'PUT', body: p, token }),
  deleteArea: (id, token) => request(`/areas/${id}`, { method: 'DELETE', token }),

  counters: (token, areaId) =>
    request(`/counters${areaId ? `?areaId=${areaId}` : ''}`, { token }),
  createCounter: (p, token) => request('/counters', { method: 'POST', body: p, token }),
  updateCounter: (id, p, token) => request(`/counters/${id}`, { method: 'PUT', body: p, token }),
  deleteCounter: (id, token) => request(`/counters/${id}`, { method: 'DELETE', token }),

  // Tokens
  issueToken: (departmentId, areaId, patientName, preferredDoctorId, phone, whatsappOptIn = false) =>
    request('/tokens', {
      method: 'POST',
      body: { departmentId, areaId, patientName, preferredDoctorId, phone, whatsappOptIn },
    }),
  issueTokenFull: (body, token) => request('/tokens', { method: 'POST', body, token }),
  tokenById: (id, signal) => request(`/tokens/${id}`, { signal }),
  tokenStatus: (id) => request(`/tokens/${id}/status`),
  tokenByNumber: (number) => request(`/tokens/by-number/${number}`),
  live: (areaId) => request(`/tokens/live${areaId ? `?areaId=${areaId}` : ''}`),
  tokens: (params = {}, token, signal) => {
    const q = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== ''))
    ).toString();
    return request(`/tokens${q ? `?${q}` : ''}`, { token, signal });
  },
  callToken: (id, counterId, token) =>
    request(`/tokens/${id}/call`, { method: 'POST', body: { counterId }, token }),
  nextToken: (areaId, counterId, token) =>
    request('/tokens/next', { method: 'POST', body: { areaId, counterId }, token }),
  skipToken: (id, token) => request(`/tokens/${id}/skip`, { method: 'POST', token }),
  holdToken: (id, token) => request(`/tokens/${id}/hold`, { method: 'POST', token }),
  completeToken: (id, token) => request(`/tokens/${id}/complete`, { method: 'POST', token }),
  cancelToken: (id, token) => request(`/tokens/${id}/cancel`, { method: 'POST', token }),
  tokenServe: (id, token) => request(`/tokens/${id}/serve`, { method: 'POST', token }),
  tokenStart: (id, token) => request(`/tokens/${id}/start`, { method: 'POST', token }),
  tokenRecall: (id, counterId, token) =>
    request(`/tokens/${id}/recall`, { method: 'POST', body: { counterId }, token }),
  tokenNoShow: (id, token) => request(`/tokens/${id}/no-show`, { method: 'POST', token }),
  tokenEstimate: (id, payload, token) =>
    request(`/tokens/${id}/estimate`, { method: 'POST', body: payload, token }),
  tokenPriority: (id, priority, reason, token) =>
    request(`/tokens/${id}/priority`, { method: 'POST', body: { priority, reason }, token }),
  tokenReassignDoctor: (id, doctorId, reason, token) =>
    request(`/tokens/${id}/assign-doctor`, { method: 'POST', body: { doctorId, reason }, token }),
  tokenAssignDoctor: (id, doctorId, note, token) =>
    request(`/tokens/${id}/assign-doctor`, { method: 'POST', body: { doctorId, reason: note }, token }),

  // Doctors
  doctors: (params = {}, token, signal) => {
    if (typeof params === 'string') {
      return request('/doctors', { token: params });
    }
    const q = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== ''))
    ).toString();
    return request(`/doctors${q ? `?${q}` : ''}`, { token, signal });
  },

  // Public doctors endpoint — no auth required, always returns active doctors without patient names
  doctorsPublic: (params = {}) => {
    const q = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== ''))
    ).toString();
    return request(`/doctors/public${q ? `?${q}` : ''}`);
  },
  doctorById: (id, token) => request(`/doctors/${id}`, { token }),
  doctorQueue: (id, token) => request(`/doctors/${id}/queue`, { token }),
  createDoctor: (p, token) => request('/doctors', { method: 'POST', body: p, token }),
  updateDoctor: (id, p, token) => request(`/doctors/${id}`, { method: 'PUT', body: p, token }),
  deleteDoctor: (id, token) => request(`/doctors/${id}`, { method: 'DELETE', token }),
  doctorStatus: (id, status, token) =>
    request(`/doctors/${id}/status`, { method: 'POST', body: { status }, token }),

  // Stats
  overview: (token) => request('/stats/overview', { token }),
  hourly: (token) => request('/stats/hourly', { token }),
  queueDepth: (token) => request('/stats/queue-depth', { token }),
  byDepartment: (token) => request('/stats/by-department', { token }),
  statusToday: (token) => request('/stats/status', { token }),

  // Reviews
  toQueryString: (params) => {
    const chunks = [];
    for (const [k, v] of Object.entries(params || {})) {
      if (v === undefined || v === null || v === '') continue;
      chunks.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
    }
    return chunks.join('&');
  },
  reviews: (params) => {
    const q = api.toQueryString(params);
    return request(`/reviews${q ? `?${q}` : ''}`);
  },
  reviewSummary: () => request('/reviews/summary'),
  reviewAnalytics: (token) => request('/reviews/analytics', { token }),
  submitReview: (payload, token) =>
    request('/reviews', { method: 'POST', body: payload, token: token || undefined }),
  updateOwnReview: (id, payload, ownerKey) =>
    request(`/reviews/${id}`, { method: 'PATCH', body: payload, ownerKey }),
  deleteOwnReview: (id, ownerKey) =>
    request(`/reviews/${id}`, { method: 'DELETE', ownerKey }),
  reviewsAdmin: (params, token) => {
    const q = api.toQueryString(params);
    return request(`/reviews/admin${q ? `?${q}` : ''}`, { token });
  },
  reviewStatus: (id, status, token) =>
    request(`/reviews/${id}/status`, { method: 'PATCH', body: { status }, token }),
  deleteReview: (id, token) => request(`/reviews/${id}`, { method: 'DELETE', token }),

  // Emergency
  sosCreate: (payload) => request('/emergency/sos', { method: 'POST', body: payload }),
  sosGet: (id) => request(`/emergency/sos/${id}`),
  sosList: (params, token) => {
    const q = api.toQueryString(params);
    return request(`/emergency/sos${q ? `?${q}` : ''}`, { token });
  },

  // Patient-facing assistant. Conversation state is kept on the backend.
  aiChat: (payload) => request('/ai/chat', { method: 'POST', body: payload }),
  sosAction: (id, action, token) =>
    request(`/emergency/sos/${id}/${action}`, { method: 'POST', token }),
  helpPoints: () => request('/emergency/help-points'),
  nearestHelpPoint: (lat, lng) => request(`/emergency/help-points/nearest?lat=${lat}&lng=${lng}`),

  // ================= Staff Control Center =================
  otpRequest: (phone) => request('/auth/otp/request', { method: 'POST', body: { phone } }),
  otpVerify: (phone, otp) => request('/auth/otp/verify', { method: 'POST', body: { phone, otp } }),

  // Patients
  patientSearch: (q, token) => request(`/patients/search?q=${encodeURIComponent(q)}`, { token }),
  createPatient: (p, token) => request('/patients', { method: 'POST', body: p, token }),
  patient: (id, token) => request(`/patients/${id}`, { token }),
  patientTokens: (id, token) => request(`/patients/${id}/tokens`, { token }),

  // Queues
  queueLive: (token, signal) => request('/queues/live', { token, signal }),
  queueUnassigned: (token, signal) => request('/queues/unassigned', { token, signal }),

  // Assignments
  assignmentRecommend: (tokenId, preferDoctorId, token) =>
    request('/assignments/recommend', { method: 'POST', body: { tokenId, preferDoctorId }, token }),
  assignmentCreate: (p, token) => request('/assignments', { method: 'POST', body: p, token }),
  redistributePreview: (doctorId, token) =>
    request('/assignments/redistribute-preview', { method: 'POST', body: { doctorId }, token }),

  // Notifications / Audit / Dashboard
  notifications: (tokenId, token) => request(`/notifications${tokenId ? `?tokenId=${tokenId}` : ''}`, { token }),
  audit: (limit, token, signal) => request(`/audit${limit ? `?limit=${limit}` : ''}`, { token, signal }),
  // Staff Control Center = Staff Dashboard
  staffDashboard: (token, _unused, signal) => request('/staff/dashboard', { token, signal }),
};

export default api;