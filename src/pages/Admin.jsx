import { useEffect, useState, useCallback } from 'react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import StatCard from '../components/StatCard.jsx';
import { HourlyChart, DepartmentChart, QueueDepthChart, StatusPie } from '../components/Charts.jsx';
import ReviewsPanel from '../components/ReviewsPanel.jsx';
import ReviewAnalytics from '../components/ReviewAnalytics.jsx';
import SOSPanel from '../components/SOSPanel.jsx';

export default function Admin() {
  const { token, user } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState('overview');
  const [overview, setOverview] = useState(null);
  const [hourly, setHourly] = useState([]);
  const [byDept, setByDept] = useState([]);
  const [queueDepth, setQueueDepth] = useState([]);
  const [status, setStatus] = useState([]);

  const loadStats = useCallback(async () => {
    try {
      const [o, h, d, q, s] = await Promise.all([
        api.overview(token),
        api.hourly(token),
        api.byDepartment(token),
        api.queueDepth(token),
        api.statusToday(token),
      ]);
      setOverview(o.overview);
      setHourly(h.hourly);
      setByDept(d.departments);
      setQueueDepth(q.areas);
      setStatus(s.status);
    } catch (e) {
      toast.error(e.message);
    }
  }, [token]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const fmtWait = (sec) => {
    if (!sec) return '—';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m ? `${m}m ${s}s` : `${s}s`;
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-slate-900">Admin Dashboard</h1>
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
          <button
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${tab === 'overview' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
            onClick={() => setTab('overview')}
          >
            Overview
          </button>
          <button
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${tab === 'manage' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
            onClick={() => setTab('manage')}
          >
            Manage
          </button>
          <button
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${tab === 'reviews' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
            onClick={() => setTab('reviews')}
          >
            Reviews
          </button>
          <button
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${tab === 'sos' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
            onClick={() => setTab('sos')}
          >
            SOS Alerts
          </button>
        </div>
      </div>

      {tab === 'overview' ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Issued Today" value={overview?.issuedToday ?? '—'} icon="🎫" color="blue" />
            <StatCard label="Completed" value={overview?.completedToday ?? '—'} icon="✅" color="green" />
            <StatCard label="Avg Wait Time" value={fmtWait(overview?.avgWaitSeconds)} icon="⏱️" color="amber" />
            <StatCard label="In Queue Now" value={overview?.queuedNow ?? '—'} icon="👥" color="violet" />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="card">
              <h2 className="mb-4 text-lg font-bold text-slate-800">Tokens Issued per Hour</h2>
              <HourlyChart data={hourly} />
            </div>
            <div className="card">
              <h2 className="mb-4 text-lg font-bold text-slate-800">Tokens by Department</h2>
              <DepartmentChart data={byDept} />
            </div>
            <div className="card">
              <h2 className="mb-4 text-lg font-bold text-slate-800">Live Queue Depth by Area</h2>
              <QueueDepthChart data={queueDepth} />
            </div>
            <div className="card">
              <h2 className="mb-4 text-lg font-bold text-slate-800">Today's Status Breakdown</h2>
              <StatusPie data={status} />
            </div>
          </div>
        </div>
      ) : tab === 'reviews' ? (
        <>
          <ReviewAnalytics token={token} />
          <div className="mt-5">
            <h2 className="mb-3 text-lg font-bold" style={{ color: '#102A43' }}>All Reviews</h2>
            <ReviewsPanel mode="moderate" />
          </div>
        </>
      ) : tab === 'sos' ? (
        <div>
          <h2 className="mb-3 text-lg font-bold" style={{ color: '#102A43' }}>SOS Alerts</h2>
          <SOSPanel token={token} />
        </div>
      ) : (
        <ManagePanel token={token} currentUserId={user?.id} />
      )}
    </div>
  );
}
function ManagePanel({ token, currentUserId }) {
  const toast = useToast();
  const [departments, setDepartments] = useState([]);
  const [areas, setAreas] = useState([]);
  const [counters, setCounters] = useState([]);
  const [users, setUsers] = useState([]);
  const [selDept, setSelDept] = useState('');
  const [selArea, setSelArea] = useState('');

  async function refresh() {
    const d = await api.departments(token).catch((e) => toast.error(e.message));
    if (d) setDepartments(d.departments);
    const a = await api.areas(token).catch(() => null);
    if (a) setAreas(a.areas);
    const c = await api.counters(token).catch(() => null);
    if (c) setCounters(c.counters);
    const u = await api.users(token).catch(() => null);
    if (u) setUsers(u.users);
  }

  useEffect(() => {
    refresh();
  }, []);

  const addDept = async () => {
    const name = prompt('Department name');
    if (!name) return;
    const code = prompt('Code (unique, e.g. OPD)');
    if (!code) return;
    try {
      await api.createDepartment({ name, code }, token);
      toast.success('Department added');
      refresh();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const addArea = async () => {
    const name = prompt('Area name');
    if (!name || !selDept) return;
    const code = prompt('Code (unique)');
    if (!code) return;
    const floor = prompt('Floor (optional)') || null;
    try {
      await api.createArea({ departmentId: Number(selDept), name, code, floor }, token);
      toast.success('Area added');
      refresh();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const addCounter = async () => {
    const name = prompt('Counter / station name');
    if (!name || !selArea) return;
    try {
      await api.createCounter({ areaId: Number(selArea), name }, token);
      toast.success('Counter added');
      refresh();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const addUser = async () => {
    const name = prompt('User name');
    if (!name) return;
    const email = prompt('Email');
    if (!email) return;
    const pwd = prompt('Password');
    if (!pwd) return;
    const role = prompt('Role (admin/officer/reception/doctor)') || 'officer';
    try {
      await api.register({ name, email, password: pwd, role }, token);
      toast.success('User created');
      refresh();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const deleteUser = async (id) => {
    if (!window.confirm('Delete this user account?')) return;
    try {
      await api.deleteUser(id, token);
      toast.success('User deleted');
      refresh();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const del = async (kind, id) => {
    try {
      const fns = {
        department: api.deleteDepartment,
        area: api.deleteArea,
        counter: api.deleteCounter,
      };
      await fns[kind](id, token);
      toast.success(`${kind[0].toUpperCase() + kind.slice(1)} deleted`);
      refresh();
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Departments</h2>
          <button className="btn-primary !py-1.5" onClick={addDept}>+ Add</button>
        </div>
        <ul className="divide-y divide-slate-100">
          {departments.map((d) => (
            <li key={d.id} className="flex items-center gap-3 py-2">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: d.color }} />
              <span className="flex-1 text-sm font-semibold text-slate-700">{d.name}</span>
              <span className="badge bg-slate-100 text-slate-500">{d.code}</span>
              <button className="btn-danger !px-2 !py-1 text-xs" onClick={() => del('department', d.id)}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Users</h2>
          <button className="btn-primary !py-1.5" onClick={addUser}>+ Add</button>
        </div>
        <p className="mb-3 text-xs text-slate-400">Manage staff accounts (admin/officer/reception).</p>
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-slate-400">
            <tr><th className="py-1">Name</th><th>Email</th><th>Role</th><th>Action</th></tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr><td colSpan="4" className="py-2 text-xs text-slate-400">No users yet</td></tr>
            )}
            {users.map((u) => (
              <tr key={u.id} className="border-t border-slate-100">
                <td className="py-2">{u.name}</td>
                <td className="text-slate-500">{u.email}</td>
                <td><span className="badge">{u.role}</span></td>
                <td className="text-right">
                  {u.id !== currentUserId && (
                    <button className="btn-danger !px-2 !py-1 text-xs" onClick={() => deleteUser(u.id)}>
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2 className="mb-4 text-lg font-bold text-slate-800">Add Area</h2>
        <div className="mb-3">
          <label className="label">Parent Department</label>
          <select className="input" value={selDept} onChange={(e) => setSelDept(e.target.value)}>
            <option value="">Select…</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
        <button className="btn-primary w-full" onClick={addArea} disabled={!selDept}>+ Add Area</button>
      </div>

      <div className="card">
        <h2 className="mb-4 text-lg font-bold text-slate-800">Add Counter / Station</h2>
        <div className="mb-3">
          <label className="label">Parent Area</label>
          <select className="input" value={selArea} onChange={(e) => setSelArea(e.target.value)}>
            <option value="">Select…</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
        <button className="btn-primary w-full" onClick={addCounter} disabled={!selArea}>+ Add Counter</button>
      </div>
    </div>
  );
}