import { useEffect, useState, useMemo, useRef } from 'react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { subscribeStaff } from '../services/socket.js';

const STATUS_UI = {
  available: { c: '#16a34a', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: '🟢', label: 'Available' },
  busy: { c: '#dc2626', bg: 'bg-rose-50 text-rose-700 border-rose-200', dot: '🔴', label: 'Busy' },
  in_consultation: { c: '#0891b2', bg: 'bg-cyan-50 text-cyan-700 border-cyan-200', dot: '🔵', label: 'In consultation' },
  break: { c: '#f59e0b', bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: '🟡', label: 'Break' },
  offline: { c: '#6b7280', bg: 'bg-slate-100 text-slate-600 border-slate-200', dot: '⚫', label: 'Offline' },
  emergency: { c: '#e11d48', bg: 'bg-red-100 text-red-800 border-red-300', dot: '🚨', label: 'Emergency' },
};

const TOKEN_STATUS = {
  queued: { c: '#2563eb', bg: 'bg-blue-50 text-blue-700', t: 'Waiting' },
  called: { c: '#16a34a', bg: 'bg-emerald-50 text-emerald-700 font-bold', t: 'Called' },
  serving: { c: '#0891b2', bg: 'bg-cyan-50 text-cyan-700 font-bold', t: 'In consultation' },
  in_consultation: { c: '#0891b2', bg: 'bg-cyan-50 text-cyan-700 font-bold', t: 'In consultation' },
  completed: { c: '#64748b', bg: 'bg-slate-100 text-slate-600', t: 'Completed' },
  no_show: { c: '#9ca3af', bg: 'bg-slate-100 text-slate-500', t: 'No show' },
  held: { c: '#f59e0b', bg: 'bg-amber-50 text-amber-700', t: 'Held' },
  skipped: { c: '#dc2626', bg: 'bg-rose-50 text-rose-700', t: 'Skipped' },
  cancelled: { c: '#9ca3af', bg: 'bg-slate-100 text-slate-500', t: 'Cancelled' },
};

const PRIORITIES = ['NORMAL', 'APPOINTMENT', 'URGENT', 'EMERGENCY'];
const PRIORITY_UI = {
  NORMAL: '#64748b',
  APPOINTMENT: '#0891b2',
  URGENT: '#f59e0b',
  EMERGENCY: '#dc2626',
};

function time(s) {
  if (!s) return '—';
  return new Date(String(s).includes('T') ? s : s.replace(' ', 'T')).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fulldate(s) {
  if (!s) return '—';
  return new Date(String(s).includes('T') ? s : s.replace(' ', 'T')).toLocaleString();
}

export default function StaffConsole() {
  const { user, token } = useAuth();
  const toast = useToast();
  const role = user?.role || 'officer';
  const isAdmin = role === 'admin';
  const isOps = ['officer', 'admin'].includes(role);
  const isReception = role === 'reception';

  const [tab, setTab] = useState('overview');
  const [dash, setDash] = useState(null);
  const [queues, setQueues] = useState([]);
  const [unassigned, setUnassigned] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [allTokens, setAllTokens] = useState([]);
  const [logs, setLogs] = useState([]);
  const [activity, setActivity] = useState([]);
  const [busy, setBusy] = useState(false);

  // Abort controller: cancel in-flight loadData calls on re-invocation or unmount
  const abortRef = useRef(null);

  // Debounce: prevent socket events from spamming loadData (G3 rule: useRef, NOT useEffect deps)
  const debounceTimerRef = useRef(null);
  const debounceFnRef = useRef(null);

  // Track busy state via ref so the socket callback reads the current value (not stale closure)
  const busyRef = useRef(false);

  // Keep token in a ref so _loadData always uses the current value (avoids stale closure)
  const tokenRef = useRef(token);
  tokenRef.current = token;

  // Doctor Filters & Search
  const [docSearch, setDocSearch] = useState('');
  const [docDeptFilter, setDocDeptFilter] = useState('');
  const [docStatusFilter, setDocStatusFilter] = useState('');

  // Modals & Selected items
  const [selectedDoctorQueue, setSelectedDoctorQueue] = useState(null);
  const [reassignModalToken, setReassignModalToken] = useState(null);
  const [reassignDoctorId, setReassignDoctorId] = useState('');
  const [reassignReason, setReassignReason] = useState('');

  // Assign Doctor modal (for UNASSIGNED tokens — separate from Reassign)
  const [assignModalToken, setAssignModalToken] = useState(null);
  const [assignDoctorId, setAssignDoctorId] = useState('');
  const [assignNote, setAssignNote] = useState('');

  const [addDoctorOpen, setAddDoctorOpen] = useState(false);

  // Doctor Form
  const [docForm, setDocForm] = useState({
    name: '',
    departmentId: '',
    specialization: '',
    qualification: 'MBBS, MD',
    experience_years: 8,
    avg_consultation_minutes: 10,
    room: '',
    capacity: 20,
    status: 'available',
  });

  // Tokens Tab Filters
  const [tokenStatusFilter, setTokenStatusFilter] = useState('');
  const [tokenDeptFilter, setTokenDeptFilter] = useState('');
  const [tokenSearch, setTokenSearch] = useState('');

  // Internal loader: aborts any previous in-flight requests before starting.
  async function _loadData() {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const currentToken = tokenRef.current;
    try {
      const d = await api.staffDashboard(currentToken, controller.signal);
      setDash(d.summary);
      setActivity(d.activity || []);
    } catch (e) { if (e.name !== 'AbortError') {} }

    try {
      const res = await api.doctors({}, currentToken, controller.signal);
      setDoctors(res.doctors || []);
    } catch (e) { if (e.name !== 'AbortError') {} }

    try {
      const qRes = await api.queueLive(currentToken, controller.signal);
      setQueues(qRes.queues || []);
    } catch (e) { if (e.name !== 'AbortError') {} }

    try {
      const unRes = await api.queueUnassigned(currentToken, controller.signal);
      setUnassigned(unRes.tokens || []);
    } catch (e) { if (e.name !== 'AbortError') {} }

    try {
      const depRes = await api.departments(currentToken, controller.signal);
      setDepartments(depRes.departments || []);
    } catch (e) { if (e.name !== 'AbortError') {} }

    try {
      const tokRes = await api.tokens({ limit: 400 }, currentToken, controller.signal);
      setAllTokens(tokRes.tokens || []);
    } catch (e) { if (e.name !== 'AbortError') {} }

    try {
      const logRes = await api.audit(100, currentToken, controller.signal);
      setLogs(logRes.logs || []);
    } catch (e) { if (e.name !== 'AbortError') {} }
  }

  // Debounced entry point — always go through this so socket events don't storm loadData.
  function debouncedLoadData() {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      debounceFnRef.current = _loadData;
      _loadData();
    }, 100);
  }

  // Exposed alias for manual refresh calls
  function loadData() {
    debouncedLoadData();
  }

  useEffect(() => {
    debouncedLoadData();
    const off = subscribeStaff(() => {
      if (busyRef.current) return; // don't race with an in-flight action
      debouncedLoadData();
    });
    return () => {
      off();
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runAction(fn, okMsg) {
    setBusy(true);
    busyRef.current = true;
    try {
      await fn();
      if (okMsg) toast.success(okMsg);
      debouncedLoadData();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
      busyRef.current = false;
    }
  }

  // Doctor Status Change
  const updateDocStatus = (doc, newStatus) => {
    runAction(
      () => api.doctorStatus(doc.id, newStatus, token),
      `${doc.name} status set to ${newStatus.replace('_', ' ')}`
    );
  };

  // Queue Operations
  const callToken = (t) =>
    runAction(() => api.callToken(t.id, undefined, token), `Token #${t.token_number} called`);

  const startConsultation = (t) =>
    runAction(() => api.tokenServe(t.id, token), `Consultation started for #${t.token_number}`);

  const completeToken = (t) =>
    runAction(() => api.completeToken(t.id, token), `Token #${t.token_number} consultation completed`);

  const recallToken = (t) =>
    runAction(() => api.tokenRecall(t.id, undefined, token), `Token #${t.token_number} recalled`);

  const skipToken = (t) =>
    runAction(() => api.skipToken(t.id, token), `Token #${t.token_number} skipped`);

  const cancelToken = (t) =>
    runAction(() => api.cancelToken(t.id, token), `Token #${t.token_number} cancelled`);

  const handleReassign = async () => {
    if (!reassignModalToken || !reassignDoctorId) {
      return toast.error('Please select a doctor to assign');
    }
    await runAction(
      () =>
        api.tokenReassignDoctor(
          reassignModalToken.id,
          Number(reassignDoctorId),
          reassignReason.trim() || 'Staff reassignment',
          token
        ),
      `Token #${reassignModalToken.token_number} reassigned successfully`
    );
    setReassignModalToken(null);
    setReassignDoctorId('');
    setReassignReason('');
  };

  // Assign Doctor (initial assignment for an UNASSIGNED token).
  // Distinct from reassignment: the patient has no doctor yet, so we never
  // overwrite an existing assignment here.
  const handleAssignDoctor = async () => {
    if (!assignModalToken || !assignDoctorId) return toast.error('Please select a doctor');
    if (assignModalToken.doctor_id) {
      return toast.error('This patient already has a doctor. Use Reassign instead.');
    }
    if (busy) return;
    const doc = doctors.find((d) => Number(d.id) === Number(assignDoctorId));
    await runAction(
      () =>
        api.tokenAssignDoctor(
          assignModalToken.id,
          Number(assignDoctorId),
          assignNote.trim() || 'Initial doctor assignment',
          token
        ),
      doc ? `Patient successfully assigned to Dr. ${doc.name}.` : 'Patient successfully assigned to a doctor.'
    );
    setAssignModalToken(null);
    setAssignDoctorId('');
    setAssignNote('');
  };

  const handleAddDoctor = async (e) => {
    e.preventDefault();
    if (!docForm.name.trim()) return toast.error('Doctor name is required');
    if (!docForm.departmentId) return toast.error('Please select a department');
    await runAction(
      () =>
        api.createDoctor(
          {
            ...docForm,
            name: docForm.name.trim(),
            departmentId: Number(docForm.departmentId),
            experience_years: Number(docForm.experience_years),
            avg_consultation_minutes: Number(docForm.avg_consultation_minutes),
            capacity: Number(docForm.capacity),
          },
          token
        ),
      `Doctor ${docForm.name} added successfully`
    );
    setAddDoctorOpen(false);
    setDocForm({
      name: '',
      departmentId: '',
      specialization: '',
      qualification: 'MBBS, MD',
      experience_years: 8,
      avg_consultation_minutes: 10,
      room: '',
      capacity: 20,
      status: 'available',
    });
  };

  // Filtered Doctors
  const filteredDoctors = useMemo(() => {
    return doctors.filter((d) => {
      if (docDeptFilter && Number(d.department_id) !== Number(docDeptFilter)) return false;
      if (docStatusFilter && d.status !== docStatusFilter) return false;
      if (docSearch.trim()) {
        const q = docSearch.toLowerCase();
        const matchName = d.name?.toLowerCase().includes(q);
        const matchSpec = d.specialization?.toLowerCase().includes(q);
        const matchQual = d.qualification?.toLowerCase().includes(q);
        const matchRoom = d.room?.toLowerCase().includes(q);
        const matchDept = d.department_name?.toLowerCase().includes(q);
        if (!matchName && !matchSpec && !matchQual && !matchRoom && !matchDept) return false;
      }
      return true;
    });
  }, [doctors, docDeptFilter, docStatusFilter, docSearch]);

  // Filtered Tokens
  const filteredTokens = useMemo(() => {
    return allTokens.filter((t) => {
      if (tokenStatusFilter && t.status !== tokenStatusFilter) return false;
      if (tokenDeptFilter && Number(t.department_id) !== Number(tokenDeptFilter)) return false;
      if (tokenSearch.trim()) {
        const q = tokenSearch.toLowerCase();
        const matchNum = String(t.token_number).includes(q) || t.token_code?.toLowerCase().includes(q);
        const matchPat = t.patient_name?.toLowerCase().includes(q);
        const matchDoc = t.doctor_name?.toLowerCase().includes(q);
        if (!matchNum && !matchPat && !matchDoc) return false;
      }
      return true;
    });
  }, [allTokens, tokenStatusFilter, tokenDeptFilter, tokenSearch]);

  // Quick Action Buttons for Token
  function renderTokenActionButtons(t) {
    const isCalled = t.status === 'called';
    const isServing = t.status === 'serving' || t.status === 'in_consultation';
    const isWaiting = t.status === 'queued';

    return (
      <div className="flex flex-wrap items-center gap-1">
        {isWaiting && (
          <button
            className="btn-primary !px-2.5 !py-1 text-xs font-bold"
            disabled={busy}
            onClick={() => callToken(t)}
          >
            📢 Call
          </button>
        )}
        {isCalled && (
          <button
            className="rounded-lg bg-cyan-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-cyan-700"
            disabled={busy}
            onClick={() => startConsultation(t)}
          >
            🩺 Start Consult
          </button>
        )}
        {(isCalled || isServing) && (
          <button
            className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-700"
            disabled={busy}
            onClick={() => completeToken(t)}
          >
            ✓ Complete
          </button>
        )}
        {isCalled && (
          <button
            className="btn-ghost !px-2 !py-1 text-xs font-semibold"
            disabled={busy}
            onClick={() => recallToken(t)}
          >
            Recall
          </button>
        )}
        {isWaiting && (
          <button
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            disabled={busy}
            onClick={() => {
              setReassignModalToken(t);
              setReassignDoctorId(t.doctor_id ? String(t.doctor_id) : '');
            }}
          >
            🔄 Reassign
          </button>
        )}
        {(isWaiting || isCalled) && (
          <button
            className="btn-ghost !px-2 !py-1 text-xs text-rose-600 hover:bg-rose-50"
            disabled={busy}
            onClick={() => skipToken(t)}
          >
            Skip
          </button>
        )}
      </div>
    );
  }

  // 1. OVERVIEW TAB
  function renderOverview() {
    const s = dash || {};
    const cards = [
      { l: 'Patients Waiting', v: s.patientsWaiting || 0, tone: '#2563eb', desc: 'Active in queue' },
      { l: 'In Consultation', v: s.activeConsultations || 0, tone: '#0891b2', desc: 'Currently attending' },
      { l: 'Doctors Available', v: s.doctorsAvailable || 0, tone: '#16a34a', desc: 'Ready for patients' },
      { l: 'Doctors Busy', v: s.doctorsBusy || 0, tone: '#dc2626', desc: 'In consult or busy' },
      { l: 'Total Doctors', v: doctors.length, tone: '#7c3aed', desc: 'Hospital active roster' },
      { l: 'Completed Today', v: s.completedToday || 0, tone: '#16a34a', desc: 'Consultations served' },
      { l: 'Urgent Patients', v: s.urgent || 0, tone: '#e11d48', desc: 'High priority queue' },
      { l: 'Unassigned Tokens', v: unassigned.length, tone: '#f59e0b', desc: 'Needs assignment' },
    ];

    return (
      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c) => (
            <div key={c.l} className="card shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{c.l}</p>
              <p className="mt-1 text-3xl font-black" style={{ color: c.tone }}>
                {c.v}
              </p>
              <p className="mt-1 text-xs text-slate-400">{c.desc}</p>
            </div>
          ))}
        </div>

        {/* Attention Panel */}
        {unassigned.length > 0 && (
          <div className="card border-amber-200 bg-amber-50/40">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">⚠️ Attention Required: Unassigned Tokens</h3>
              <span className="badge bg-amber-100 text-amber-800">{unassigned.length} pending</span>
            </div>
            <ul className="divide-y divide-amber-100">
              {unassigned.slice(0, 6).map((t) => (
                <li key={t.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <span className="font-bold text-slate-900">#{t.token_number}</span> · {t.patient_name || 'Walk-in'} (
                    {t.department_name})
                  </div>
                  <button
                    className="btn-primary !px-3 !py-1 text-xs"
                    onClick={() => {
                      setAssignModalToken(t);
                      setAssignDoctorId('');
                      setAssignNote('');
                    }}
                  >
                    Assign Doctor
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Live Activity Feed */}
        <div className="card shadow-sm">
          <h3 className="mb-3 text-base font-bold text-slate-900">Live Hospital Activity Feed</h3>
          {activity.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">No activity logged yet today.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {activity.slice(0, 12).map((a) => (
                <li key={a.id} className="flex items-center justify-between py-2 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-800">
                      {a.action.replace(/_/g, ' ')} {a.tokenNumber ? `· Token #${a.tokenNumber}` : ''}
                    </p>
                    <p className="text-xs text-slate-400">
                      {a.actor_name || 'System'} · {fulldate(a.created_at)}
                    </p>
                  </div>
                  {a.reason && <span className="badge bg-slate-100 text-slate-600 text-xs">{a.reason}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  // 2. DOCTORS MANAGEMENT TAB
  function renderDoctors() {
    return (
      <div className="space-y-6">
        {/* Controls Bar */}
        <div className="card shadow-sm space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">Doctor Directory & Availability</h2>
              <p className="text-xs text-slate-500">
                Manage {doctors.length} doctors, live consultation rooms, queues, and availability statuses.
              </p>
            </div>
            {isAdmin && (
              <button className="btn-primary font-bold shadow-sm" onClick={() => setAddDoctorOpen(true)}>
                + Add New Doctor
              </button>
            )}
          </div>

          {/* Search and Filters */}
          <div className="grid gap-2 sm:grid-cols-3">
            <input
              className="input text-sm"
              placeholder="🔍 Search doctor name, spec, room..."
              value={docSearch}
              onChange={(e) => setDocSearch(e.target.value)}
            />

            <select
              className="input text-sm"
              value={docDeptFilter}
              onChange={(e) => setDocDeptFilter(e.target.value)}
            >
              <option value="">All Departments ({departments.length})</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({doctors.filter((doc) => doc.department_id === d.id).length})
                </option>
              ))}
            </select>

            <select
              className="input text-sm"
              value={docStatusFilter}
              onChange={(e) => setDocStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="available">🟢 Available</option>
              <option value="busy">🔴 Busy</option>
              <option value="in_consultation">🔵 In consultation</option>
              <option value="break">🟡 On Break</option>
              <option value="offline">⚫ Offline</option>
            </select>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
            <span>
              Showing <strong>{filteredDoctors.length}</strong> of {doctors.length} doctors
            </span>
            {(docSearch || docDeptFilter || docStatusFilter) && (
              <button
                className="text-blue-600 hover:underline font-semibold"
                onClick={() => {
                  setDocSearch('');
                  setDocDeptFilter('');
                  setDocStatusFilter('');
                }}
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Doctor Cards Grid */}
        {filteredDoctors.length === 0 ? (
          <div className="card text-center py-12">
            <p className="empty-icon" aria-hidden="true">👨‍⚕️</p>
            <p className="mt-3 font-bold text-slate-800">No doctors match your filter</p>
            <p className="text-xs text-slate-500">Try adjusting your department or search query.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredDoctors.map((doc) => {
              const u = STATUS_UI[doc.status] || { c: '#64748b', bg: 'bg-slate-100 text-slate-600', dot: '◽', label: doc.status };
              const currentTok = doc.currentToken;
              const nextPats = doc.nextPatients || [];

              return (
                <div
                  key={doc.id}
                  className="doctor-card flex flex-col justify-between"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-extrabold text-slate-900 text-base">{doc.name}</h3>
                          {!doc.active && <span className="badge bg-slate-100 text-slate-400">Inactive</span>}
                        </div>
                        <p className="text-xs font-semibold text-blue-600">{doc.department_name}</p>
                        <p className="text-xs text-slate-500 truncate max-w-[220px]">
                          {doc.qualification} · {doc.experience_years} yrs exp
                        </p>
                        <p className="text-[11px] text-slate-400 truncate max-w-[220px]">
                          {doc.specialization}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="inline-block rounded-xl bg-slate-900 px-2.5 py-1 text-xs font-bold text-white">
                          {doc.room || 'Room 101'}
                        </span>
                        <div className="mt-1">
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold ${u.bg}`}>
                            {u.dot} {u.label}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Metrics Grid */}
                    <div className="my-3 grid grid-cols-3 gap-1.5 text-center text-xs">
                      <div className="metric-card rounded-xl">
                        <p className="font-bold text-slate-400 text-[10px] uppercase">Current</p>
                        <p className="font-black text-slate-900 text-sm">
                          {currentTok ? `#${currentTok.token_number}` : 'None'}
                        </p>
                      </div>
                      <div className="metric-card metric-card--primary rounded-xl">
                        <p className="font-bold text-blue-500 text-[10px] uppercase">Waiting</p>
                        <p className="font-black text-blue-700 text-sm">{doc.waiting || 0}</p>
                      </div>
                      <div className="metric-card metric-card--success rounded-xl">
                        <p className="font-bold text-emerald-500 text-[10px] uppercase">Served</p>
                        <p className="font-black text-emerald-700 text-sm">{doc.totalServed || doc.servedCount || 0}</p>
                      </div>
                    </div>

                    {/* Next in line snippet */}
                    <div className="mb-3 rounded-xl bg-slate-50 p-2.5 text-xs text-slate-600">
                      <div className="flex items-center justify-between font-semibold">
                        <span>Avg consult: ~{doc.avg_consultation_minutes || 10} min</span>
                        <span>Est. clear: ~{doc.estimatedQueueMinutes || 0} min</span>
                      </div>
                      {nextPats.length > 0 ? (
                        <p className="mt-1 text-[11px] text-slate-500 truncate">
                          Next: {nextPats.map((p) => `#${p.token_number} (${p.patient_name || 'Walk-in'})`).join(', ')}
                        </p>
                      ) : (
                        <p className="mt-1 text-[11px] text-slate-400">Queue is currently clear.</p>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="border-t border-slate-100 pt-3 space-y-2">
                    {/* Fast Status Switcher */}
                    {isOps && (
                      <div className="flex items-center justify-between gap-1 text-[11px]">
                        <span className="text-slate-400 font-medium">Status:</span>
                        <div className="flex flex-wrap gap-1">
                          {['available', 'busy', 'in_consultation', 'break', 'offline'].map((st) => (
                            <button
                              key={st}
                              disabled={busy || doc.status === st}
                              className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                doc.status === st
                                  ? 'bg-slate-900 text-white'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                              onClick={() => updateDocStatus(doc, st)}
                            >
                              {st === 'in_consultation' ? 'Consult' : st.charAt(0).toUpperCase() + st.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        className="btn-primary w-full !py-1.5 text-xs font-bold"
                        onClick={() => setSelectedDoctorQueue(doc)}
                      >
                        📋 View Live Queue ({doc.waiting || 0})
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // 3. LIVE QUEUE TAB (Grouped by doctor)
  function renderLiveQueue() {
    return (
      <div className="space-y-6">
        <div className="card shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">Live Consultation Queues</h2>
            <p className="text-xs text-slate-500">Live queue actions: Call next patient, start consultation, complete service, or reassign.</p>
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary text-xs" onClick={() => loadData()}>
              🔄 Refresh
            </button>
          </div>
        </div>

        {queues.filter((q) => q.doctors.length > 0).length === 0 ? (
          <div className="card text-center py-10">
            <p className="text-slate-400">No active doctor queues available.</p>
          </div>
        ) : (
          queues.map((deptQueue) => (
            <div key={deptQueue.department.id} className="card shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <span
                    className="h-3.5 w-3.5 rounded-full"
                    style={{ backgroundColor: deptQueue.department.color || '#2563eb' }}
                  />
                  <h3 className="text-lg font-bold text-slate-900">{deptQueue.department.name}</h3>
                </div>
                <span className="text-xs text-slate-400">
                  {deptQueue.doctors.length} Doctors Assigned
                </span>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {deptQueue.doctors.map((d) => {
                  const u = STATUS_UI[d.status] || { c: '#64748b', dot: '◽', label: d.status, bg: 'bg-slate-100' };
                  const docTokens = allTokens.filter(
                    (t) => Number(t.doctor_id) === Number(d.id) && ['queued', 'called', 'serving', 'in_consultation', 'held'].includes(t.status)
                  );
                  const serving = docTokens.find((t) => ['called', 'serving', 'in_consultation'].includes(t.status));
                  const waitingList = docTokens.filter((t) => t.status === 'queued');

                  return (
                    <div key={d.id} className="doctor-card space-y-3">
                      {/* Doctor header */}
                      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                        <div>
                          <p className="font-extrabold text-slate-900">{d.name}</p>
                          <p className="text-xs text-slate-500">{d.specialization} · Room {d.room || '—'}</p>
                        </div>
                        <div className="text-right">
                          <span className={`doctor-pill ${u.bg}`}>
                            {u.dot} {u.label}
                          </span>
                        </div>
                      </div>

                      {/* Currently Serving Section */}
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Currently Serving</p>
                        {serving ? (
                          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3 shadow-sm">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-lg font-black text-emerald-800">#{serving.token_number}</span>
                                <span className="rounded-md bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white uppercase">
                                  {serving.status === 'called' ? 'Called' : 'In Consult'}
                                </span>
                              </div>
                              <p className="text-xs font-semibold text-slate-800">{serving.patient_name || 'Walk-in'}</p>
                              <p className="text-[11px] text-slate-500">Called at {time(serving.called_at)}</p>
                            </div>
                            {renderTokenActionButtons(serving)}
                          </div>
                        ) : (
                          <div className="mt-1.5 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-2.5 text-center text-xs text-slate-400">
                            No patient currently in consultation.
                          </div>
                        )}
                      </div>

                      {/* Waiting Queue List */}
                      <div>
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Waiting Patients ({waitingList.length})
                          </p>
                          {waitingList.length > 0 && (
                            <button
                              className="btn-primary !px-2.5 !py-1 text-[11px] font-bold"
                              disabled={busy}
                              onClick={() => callToken(waitingList[0])}
                            >
                              📢 Call Next (#{waitingList[0].token_number})
                            </button>
                          )}
                        </div>

                        {waitingList.length === 0 ? (
                          <p className="mt-2 text-xs text-slate-400">Queue is clear.</p>
                        ) : (
                          <ul className="mt-2 divide-y divide-slate-100 max-h-56 overflow-auto">
                            {waitingList.map((t, idx) => (
                              <li key={t.id} className="queue-row py-2 text-xs">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-400">#{idx + 1}</span>
                                  <span className="font-black text-slate-900">#{t.token_number}</span>
                                  <span className="text-slate-700 font-medium">{t.patient_name || 'Walk-in'}</span>
                                  {t.priority !== 'NORMAL' && (
                                    <span className="badge font-bold" style={{ color: PRIORITY_UI[t.priority] }}>
                                      {t.priority}
                                    </span>
                                  )}
                                </div>
                                {renderTokenActionButtons(t)}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    );
  }

  // 4. TOKENS TAB
  function renderTokens() {
    return (
      <div className="space-y-6">
        <div className="card shadow-sm space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">Token Management Center</h2>
              <p className="text-xs text-slate-500">Track, call, complete, reassign, or search all active & historical tokens.</p>
            </div>
          </div>

          {/* Filter Row */}
          <div className="grid gap-2 sm:grid-cols-3">
            <input
              className="input text-sm"
              placeholder="🔍 Search patient name, token number..."
              value={tokenSearch}
              onChange={(e) => setTokenSearch(e.target.value)}
            />
            <select
              className="input text-sm"
              value={tokenDeptFilter}
              onChange={(e) => setTokenDeptFilter(e.target.value)}
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <select
              className="input text-sm"
              value={tokenStatusFilter}
              onChange={(e) => setTokenStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="queued">Waiting</option>
              <option value="called">Called</option>
              <option value="in_consultation">In consultation</option>
              <option value="completed">Completed</option>
              <option value="skipped">Skipped</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Tokens Table */}
        <div className="card shadow-sm overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 text-slate-400 font-bold uppercase">
              <tr>
                <th className="py-2.5">Token #</th>
                <th className="py-2.5">Patient</th>
                <th className="py-2.5">Department</th>
                <th className="py-2.5">Assigned Doctor</th>
                <th className="py-2.5">Status</th>
                <th className="py-2.5">Priority</th>
                <th className="py-2.5">Created</th>
                <th className="py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTokens.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-400">
                    No tokens found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredTokens.slice(0, 100).map((t) => {
                  const st = TOKEN_STATUS[t.status] || { c: '#64748b', bg: 'bg-slate-100', t: t.status };
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/60">
                      <td className="py-2.5 font-black text-slate-900 text-sm">
                        {t.token_code || `#${t.token_number}`}
                      </td>
                      <td className="py-2.5 font-semibold text-slate-800">{t.patient_name || 'Walk-in'}</td>
                      <td className="py-2.5 text-slate-600">{t.department_name}</td>
                      <td className="py-2.5">
                        {t.doctor_name ? (
                          <span className="font-bold text-slate-800">
                            {t.doctor_name} <span className="text-[10px] text-slate-400">({t.doctor_room || 'Room'})</span>
                          </span>
                        ) : (
                          <span className="badge bg-amber-100 text-amber-800 font-bold">Unassigned</span>
                        )}
                      </td>
                      <td className="py-2.5">
                        <span className={`inline-block rounded-full px-2 py-0.5 font-bold ${st.bg}`}>
                          {st.t}
                        </span>
                      </td>
                      <td className="py-2.5">
                        <span className="font-bold" style={{ color: PRIORITY_UI[t.priority] || '#64748b' }}>
                          {t.priority}
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-400">{time(t.created_at)}</td>
                      <td className="py-2.5 text-right">{renderTokenActionButtons(t)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // 5. PATIENTS TAB
  const [patientSearchQ, setPatientSearchQ] = useState('');
  const [patientSearchResults, setPatientSearchResults] = useState([]);
  const [newPatient, setNewPatient] = useState({ name: '', phone: '', age: '', gender: '' });

  async function searchPatients() {
    if (!patientSearchQ.trim()) return;
    try {
      const res = await api.patientSearch(patientSearchQ.trim(), token);
      setPatientSearchResults(res.patients || []);
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function registerPatient(e) {
    e.preventDefault();
    if (!newPatient.name.trim()) return toast.error('Patient name is required');
    await runAction(
      () =>
        api.createPatient(
          {
            name: newPatient.name.trim(),
            phone: newPatient.phone.trim() || null,
            age: newPatient.age ? Number(newPatient.age) : null,
            gender: newPatient.gender || null,
          },
          token
        ),
      `Patient ${newPatient.name} registered successfully`
    );
    setNewPatient({ name: '', phone: '', age: '', gender: '' });
  }

  function renderPatients() {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Search Patient */}
          <div className="card shadow-sm space-y-3">
            <h3 className="text-base font-bold text-slate-900">Search Patient Database</h3>
            <div className="flex gap-2">
              <input
                className="input"
                placeholder="Name, Phone, or Patient ID"
                value={patientSearchQ}
                onChange={(e) => setPatientSearchQ(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchPatients()}
              />
              <button className="btn-secondary shrink-0 font-bold" onClick={searchPatients}>
                Search
              </button>
            </div>
            {patientSearchResults.length > 0 && (
              <ul className="mt-2 divide-y divide-slate-100 max-h-64 overflow-auto">
                {patientSearchResults.map((p) => (
                  <li key={p.id} className="py-2 text-sm flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-800">{p.name}</p>
                      <p className="text-xs text-slate-400">
                        {p.patient_no} · {p.phone || 'No phone'} · {p.age ? `${p.age} yrs` : ''} {p.gender || ''}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Register Patient */}
          <form onSubmit={registerPatient} className="card shadow-sm space-y-3">
            <h3 className="text-base font-bold text-slate-900">Register New Patient</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                className="input text-sm"
                placeholder="Full Name *"
                value={newPatient.name}
                onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                required
              />
              <input
                className="input text-sm"
                placeholder="Phone Number"
                value={newPatient.phone}
                onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
              />
              <input
                className="input text-sm"
                type="number"
                placeholder="Age"
                value={newPatient.age}
                onChange={(e) => setNewPatient({ ...newPatient, age: e.target.value })}
              />
              <select
                className="input text-sm"
                value={newPatient.gender}
                onChange={(e) => setNewPatient({ ...newPatient, gender: e.target.value })}
              >
                <option value="">Gender</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <button type="submit" className="btn-primary w-full font-bold">
              Register Patient
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 6. HISTORY / AUDIT TAB
  function renderAudit() {
    return (
      <div className="card shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-slate-900">Hospital System Audit Trail</h2>
          <span className="badge bg-slate-100 text-slate-600 font-bold">{logs.length} logged entries</span>
        </div>
        <p className="text-xs text-slate-500">Transactional log of all queue operations, doctor status updates, and assignments.</p>

        {logs.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No audit records found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 text-slate-400 font-bold uppercase">
                <tr>
                  <th className="py-2">Timestamp</th>
                  <th className="py-2">Staff Member</th>
                  <th className="py-2">Action</th>
                  <th className="py-2">Target & Value</th>
                  <th className="py-2">Reason / Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.slice(0, 100).map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/50">
                    <td className="whitespace-nowrap py-2 text-slate-400 font-mono text-[11px]">{fulldate(a.created_at)}</td>
                    <td className="py-2 font-semibold text-slate-800">{a.actor_name || 'System'}</td>
                    <td className="py-2 font-bold text-blue-600">{a.action.replace(/_/g, ' ')}</td>
                    <td className="py-2 text-slate-700">
                      {a.target_type} #{a.target_id} {a.old_value ? `(${a.old_value} → ${a.new_value})` : a.new_value || ''}
                    </td>
                    <td className="py-2 text-slate-400">{a.reason || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  const tabs = [
    { k: 'overview', l: 'Overview', icon: '📊' },
    { k: 'doctors', l: `Doctors (${doctors.length})`, icon: '👨‍⚕️' },
    { k: 'live_queue', l: 'Live Queue', icon: '📋' },
    { k: 'tokens', l: `Tokens (${allTokens.length})`, icon: '🎟️' },
    { k: 'patients', l: 'Patients', icon: '🧑‍🤝‍🧑' },
    { k: 'history', l: 'History / Audit', icon: '📜' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="section-shell flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Hospital Staff & Doctor Command Center</h1>
          <p className="text-xs text-slate-500">
            Real-time synchronization between Patients, Tokens, Doctors, and Queue Status
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="utility-pill border-emerald-200 bg-emerald-50 text-emerald-700">
            <span className="status-dot bg-emerald-500 animate-pulse" />
            Live Connected
          </span>
          <span className="utility-pill border-slate-200 bg-slate-100 text-slate-700">
            Logged in as <strong>{user?.name || 'Staff'}</strong> ({role})
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="flex flex-wrap gap-1.5 border-b border-slate-200 pb-2">
        {tabs.map((t) => (
          <button
            key={t.k}
            type="button"
            className={`tab-button ${
              tab === t.k
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
            onClick={() => setTab(t.k)}
          >
            <span>{t.icon}</span>
            <span>{t.l}</span>
          </button>
        ))}
      </nav>

      {/* Main Tab Content */}
      <div>
        {tab === 'overview' && renderOverview()}
        {tab === 'doctors' && renderDoctors()}
        {tab === 'live_queue' && renderLiveQueue()}
        {tab === 'tokens' && renderTokens()}
        {tab === 'patients' && renderPatients()}
        {tab === 'history' && renderAudit()}
      </div>

      {/* MODAL: DOCTOR LIVE QUEUE INSPECTION */}
      {selectedDoctorQueue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="card max-w-2xl w-full max-h-[85vh] overflow-y-auto pop-in shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xl font-extrabold text-slate-900">{selectedDoctorQueue.name}</h3>
                <p className="text-xs text-slate-500">
                  {selectedDoctorQueue.department_name} · {selectedDoctorQueue.specialization} · Room{' '}
                  {selectedDoctorQueue.room}
                </p>
              </div>
              <button
                className="rounded-full bg-slate-100 p-1.5 text-slate-500 hover:bg-slate-200 font-bold"
                onClick={() => setSelectedDoctorQueue(null)}
              >
                ✕
              </button>
            </div>

            {/* Currently Serving */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Currently Serving</h4>
              {selectedDoctorQueue.currentToken ? (
                <div className="mt-2 flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <div>
                    <span className="text-2xl font-black text-emerald-800">
                      #{selectedDoctorQueue.currentToken.token_number}
                    </span>
                    <p className="text-sm font-bold text-slate-800">
                      {selectedDoctorQueue.currentToken.patient_name || 'Walk-in'}
                    </p>
                    <p className="text-xs text-slate-500">
                      Status: {selectedDoctorQueue.currentToken.status}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {renderTokenActionButtons(selectedDoctorQueue.currentToken)}
                  </div>
                </div>
              ) : (
                <div className="mt-2 rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-400">
                  Doctor is not currently seeing a patient.
                </div>
              )}
            </div>

            {/* Waiting List */}
            <div>
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Active Waiting Queue ({selectedDoctorQueue.waiting || 0})
                </h4>
                {selectedDoctorQueue.nextPatients && selectedDoctorQueue.nextPatients.length > 0 && (
                  <button
                    className="btn-primary !px-3 !py-1 text-xs font-bold"
                    disabled={busy}
                    onClick={() => callToken(selectedDoctorQueue.nextPatients[0])}
                  >
                    📢 Call Next
                  </button>
                )}
              </div>

              {allTokens.filter((t) => Number(t.doctor_id) === Number(selectedDoctorQueue.id) && t.status === 'queued').length === 0 ? (
                <p className="mt-3 text-xs text-slate-400 text-center py-4">No patients waiting in queue.</p>
              ) : (
                <ul className="mt-2 divide-y divide-slate-100">
                  {allTokens
                    .filter((t) => Number(t.doctor_id) === Number(selectedDoctorQueue.id) && t.status === 'queued')
                    .map((t, idx) => (
                      <li key={t.id} className="flex items-center justify-between py-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-400">#{idx + 1}</span>
                          <span className="font-black text-slate-900">#{t.token_number}</span>
                          <span className="font-semibold text-slate-800">{t.patient_name || 'Walk-in'}</span>
                        </div>
                        {renderTokenActionButtons(t)}
                      </li>
                    ))}
                </ul>
              )}
            </div>

            <div className="border-t border-slate-100 pt-3 text-right">
              <button className="btn-secondary !px-4 text-xs font-bold" onClick={() => setSelectedDoctorQueue(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REASSIGN DOCTOR */}
      {reassignModalToken && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="card max-w-lg w-full pop-in shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">Reassign Patient to Doctor</h3>
                <p className="text-xs text-slate-500">
                  Transfer Token #{reassignModalToken.token_number} ({reassignModalToken.patient_name || 'Walk-in'}) to another doctor.
                </p>
              </div>
              <button
                className="rounded-full bg-slate-100 p-1.5 text-slate-500 hover:bg-slate-200 font-bold"
                onClick={() => setReassignModalToken(null)}
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="label">Select Destination Doctor</label>
                <select
                  className="input font-semibold"
                  value={reassignDoctorId}
                  onChange={(e) => setReassignDoctorId(e.target.value)}
                >
                  <option value="">Choose a doctor...</option>
                  {doctors
                    .filter((d) => !reassignModalToken.department_id || Number(d.department_id) === Number(reassignModalToken.department_id))
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} · {d.specialization} ({d.status} · {d.waiting} in queue)
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="label">Reassignment Reason / Note (Optional)</label>
                <input
                  className="input"
                  placeholder="e.g. Doctor unavailable / load balancing"
                  value={reassignReason}
                  onChange={(e) => setReassignReason(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button className="btn-secondary !px-3 text-xs" onClick={() => setReassignModalToken(null)}>
                Cancel
              </button>
              <button
                className="btn-primary !px-4 text-xs font-bold"
                disabled={busy || !reassignDoctorId}
                onClick={handleReassign}
              >
                Confirm Reassignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ASSIGN DOCTOR (for UNASSIGNED tokens — initial assignment) */}
      {assignModalToken && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="card max-w-lg w-full pop-in shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">Assign Patient to Doctor</h3>
                <p className="text-xs text-slate-500">
                  Token #{assignModalToken.token_number} · {assignModalToken.patient_name || 'Walk-in'}
                </p>
              </div>
              <button
                className="rounded-full bg-slate-100 p-1.5 text-slate-500 hover:bg-slate-200 font-bold"
                onClick={() => setAssignModalToken(null)}
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="label">Select Doctor</label>
                <select
                  className="input font-semibold"
                  value={assignDoctorId}
                  onChange={(e) => setAssignDoctorId(e.target.value)}
                >
                  <option value="">Choose a doctor...</option>
                  {doctors
                    .filter((d) => !assignModalToken.department_id || Number(d.department_id) === Number(assignModalToken.department_id))
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} · {d.specialization} ({d.status} · {d.waiting} in queue)
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="label">Note (Optional)</label>
                <input
                  className="input"
                  placeholder="Add a note..."
                  value={assignNote}
                  onChange={(e) => setAssignNote(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button className="btn-secondary !px-3 text-xs" onClick={() => setAssignModalToken(null)}>
                Cancel
              </button>
              <button
                className="btn-primary !px-4 text-xs font-bold"
                disabled={busy || !assignDoctorId}
                onClick={handleAssignDoctor}
              >
                Assign Doctor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD DOCTOR (Admin only) */}
      {addDoctorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <form onSubmit={handleAddDoctor} className="card max-w-xl w-full pop-in shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-extrabold text-slate-900">Add New Doctor to Hospital</h3>
              <button
                type="button"
                className="rounded-full bg-slate-100 p-1.5 text-slate-500 hover:bg-slate-200 font-bold"
                onClick={() => setAddDoctorOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 text-xs">
              <div className="sm:col-span-2">
                <label className="label">Doctor Name *</label>
                <input
                  className="input"
                  placeholder="e.g. Dr. Rajesh Sharma"
                  value={docForm.name}
                  onChange={(e) => setDocForm({ ...docForm, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="label">Department *</label>
                <select
                  className="input"
                  value={docForm.departmentId}
                  onChange={(e) => setDocForm({ ...docForm, departmentId: e.target.value })}
                  required
                >
                  <option value="">Select Department...</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Specialization</label>
                <input
                  className="input"
                  placeholder="e.g. Interventional Cardiology"
                  value={docForm.specialization}
                  onChange={(e) => setDocForm({ ...docForm, specialization: e.target.value })}
                />
              </div>

              <div>
                <label className="label">Qualifications</label>
                <input
                  className="input"
                  placeholder="e.g. MBBS, MD, DM"
                  value={docForm.qualification}
                  onChange={(e) => setDocForm({ ...docForm, qualification: e.target.value })}
                />
              </div>

              <div>
                <label className="label">Experience (Years)</label>
                <input
                  type="number"
                  className="input"
                  value={docForm.experience_years}
                  onChange={(e) => setDocForm({ ...docForm, experience_years: e.target.value })}
                />
              </div>

              <div>
                <label className="label">Room / Counter</label>
                <input
                  className="input"
                  placeholder="e.g. Room 204"
                  value={docForm.room}
                  onChange={(e) => setDocForm({ ...docForm, room: e.target.value })}
                />
              </div>

              <div>
                <label className="label">Avg Consultation Time (Min)</label>
                <input
                  type="number"
                  className="input"
                  value={docForm.avg_consultation_minutes}
                  onChange={(e) => setDocForm({ ...docForm, avg_consultation_minutes: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                className="btn-secondary !px-3 text-xs"
                onClick={() => setAddDoctorOpen(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary !px-4 text-xs font-bold" disabled={busy}>
                Add Doctor
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}