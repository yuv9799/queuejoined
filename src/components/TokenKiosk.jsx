import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { normalizeIndianPhone } from '../utils/phone.js';

function ord(n) {
  if (n % 10 === 1 && n % 100 !== 11) return `${n}st`;
  if (n % 10 === 2 && n % 100 !== 12) return `${n}nd`;
  if (n % 10 === 3 && n % 100 !== 13) return `${n}rd`;
  return `${n}th`;
}

export default function TokenKiosk() {
  const toast = useToast();
  const navigate = useNavigate();

  const [departments, setDepartments] = useState([]);
  const [areas, setAreas] = useState([]);
  const [deptDoctors, setDeptDoctors] = useState([]);
  const [deptId, setDeptId] = useState('');
  const [areaId, setAreaId] = useState('');
  const [preferredDoctorId, setPreferredDoctorId] = useState('');
  const [patientName, setPatientName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsappOptIn, setWhatsappOptIn] = useState(false);

  const [deptLoading, setDeptLoading] = useState(true);
  const [deptError, setDeptError] = useState(null);
  const [areaLoading, setAreaLoading] = useState(false);
  const [areaError, setAreaError] = useState(null);
  const [doctorsLoading, setDoctorsLoading] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [issued, setIssued] = useState(null);

  // Load departments (source of truth = backend).
  useEffect(() => {
    setDeptLoading(true);
    setDeptError(null);
    api
      .departments()
      .then((d) => setDepartments(d.departments || []))
      .catch((e) => setDeptError(e.message))
      .finally(() => setDeptLoading(false));
  }, []);

  // Dependent service-area and doctor loader.
  useEffect(() => {
    setAreaId('');
    setPreferredDoctorId('');
    setAreas([]);
    setDeptDoctors([]);
    setAreaError(null);

    if (!deptId) {
      setAreaLoading(false);
      setDoctorsLoading(false);
      return;
    }

    setAreaLoading(true);
    setDoctorsLoading(true);

    // Fetch areas for department
    api
      .areas(null, deptId)
      .then((d) => {
        const ar = d.areas || [];
        setAreas(ar);
        if (ar.length > 0) setAreaId(String(ar[0].id));
      })
      .catch((e) => setAreaError(e.message))
      .finally(() => setAreaLoading(false));

    // Fetch doctors for department to show available options
    api
      .doctorsPublic({ departmentId: deptId })
      .then((res) => {
        setDeptDoctors(res.doctors || []);
      })
      .catch(() => {})
      .finally(() => setDoctorsLoading(false));
  }, [deptId]);

  async function submit(e) {
    e.preventDefault();
    if (!deptId) return toast.error('Please select a department');
    if (phone.trim() && !normalizeIndianPhone(phone)) {
      return toast.error('Please enter a valid 10-digit mobile number (starts with 6, 7, 8 or 9).');
    }
    setSubmitting(true);
    try {
      const d = await api.issueToken(
        Number(deptId),
        areaId ? Number(areaId) : undefined,
        patientName.trim() || undefined,
        preferredDoctorId ? Number(preferredDoctorId) : undefined,
        (normalizeIndianPhone(phone) || phone.trim()) || undefined,
        whatsappOptIn
      );
      setIssued(d);
      setWhatsappOptIn(false);
      try {
        localStorage.setItem('kims_active_token_id', String(d.token.id));
        localStorage.setItem('kims_active_token_number', String(d.token.token_number));
      } catch {}
      toast.success(`Token ${d.token.token_code || d.token.token_number} issued successfully`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (issued) {
    const t = issued.token;
    const ahead = issued.peopleAhead != null ? issued.peopleAhead : Math.max(0, (issued.position || 1) - 1);
    const estWait = issued.estimatedWaitMinutes || 0;

    return (
      <div className="card token-shell pop-in text-center sm:p-6">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-3xl font-black text-emerald-600 shadow-sm" aria-hidden="true">
          ✓
        </div>
        <h2 className="mt-3 text-2xl font-extrabold text-slate-900">Token Generated Successfully</h2>
        <p className="text-xs text-slate-500">Your consultation queue slot is confirmed</p>

        {/* Prominent Token Display */}
        <div
          className="pulse-ring mx-auto my-4 flex flex-col items-center justify-center rounded-3xl p-6 text-white shadow-xl"
          style={{ backgroundColor: t.department_color || '#2563eb' }}
          aria-label={`Your token number is ${t.token_code || t.token_number}`}
        >
          <span className="text-xs uppercase tracking-widest opacity-80">Token Number</span>
          <span className="text-5xl font-black tracking-tight">{t.token_code || t.token_number}</span>
          <span className="mt-1 text-xs font-semibold opacity-90">{t.department_name}</span>
        </div>

        {/* Assigned Doctor Card */}
        {t.doctor_name && (
          <div className="my-3 rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50 p-3.5 text-left shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Assigned Doctor</p>
                <p className="text-base font-bold text-slate-900">{t.doctor_name}</p>
                <p className="text-xs text-slate-600">{t.doctor_qualification || t.doctor_specialization || t.department_name}</p>
              </div>
              <div className="text-right">
                <span className="inline-block rounded-xl bg-blue-600 px-2.5 py-1 text-xs font-bold text-white shadow-sm">
                  {t.doctor_room || 'Room 101'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Queue Metrics */}
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="metric-card rounded-xl">
            <p className="text-lg font-black text-slate-800">
              {ahead === 0 ? 'Next in line' : `${ahead} ahead`}
            </p>
            <p className="text-[11px] text-slate-500">Queue Position: {ord(issued.position || 1)}</p>
          </div>
          <div className="metric-card metric-card--primary rounded-xl">
            <p className="text-lg font-black text-blue-700">
              {estWait > 0 ? `~${estWait} min` : 'Under 5 min'}
            </p>
            <p className="text-[11px] text-blue-600">Estimated Wait</p>
          </div>
        </div>

        {issued.whatsappOptIn && (
          <p className={`mt-3 text-sm ${issued.whatsappNotification?.accepted ? 'text-emerald-700' : 'text-amber-700'}`}>
            {issued.whatsappNotification?.accepted
              ? 'WhatsApp token notification accepted for delivery.'
              : 'Your token is valid, but the WhatsApp notification could not be sent. Please check your number or ask staff.'}
          </p>
        )}

        <div className="mt-6 flex flex-wrap justify-center gap-2.5">
          <button className="btn-primary" onClick={() => navigate(`/status?id=${t.id}`)}>
            Track My Token Live →
          </button>
          <button className="btn-ghost" onClick={() => navigate('/live')}>
            View Live Board
          </button>
          <button className="btn-secondary" onClick={() => setIssued(null)}>
            Issue another
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card rise-in space-y-4">
      {/* Department */}
      <div>
        <label className="label" htmlFor="kiosk-dept">Medical Department</label>
        {deptLoading ? (
          <div className="space-y-2"><div className="skeleton" /><div className="skeleton w-2/3" /></div>
        ) : deptError ? (
          <div className="flex items-center justify-between rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
            <span>Unable to load departments.</span>
            <button type="button" className="btn-secondary !px-2.5 !py-1 text-xs" onClick={() => window.location.reload()}>
              Retry
            </button>
          </div>
        ) : departments.length === 0 ? (
          <p className="rounded-xl bg-slate-100 p-3 text-sm text-slate-500">No departments available.</p>
        ) : (
          <select
            id="kiosk-dept"
            className="input font-medium"
            value={deptId}
            onChange={(e) => setDeptId(e.target.value)}
            aria-label="Department"
            required
          >
            <option value="">Select department...</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.code})
              </option>
            ))}
          </select>
        )}
        <p className="field-hint">Select the clinical department you are visiting.</p>
      </div>

      {/* Service Area */}
      <div>
        <label className="label" htmlFor="kiosk-area">Service Area / Counter</label>
        {!deptId ? (
          <select className="input" id="kiosk-area" disabled>
            <option>Choose a department first</option>
          </select>
        ) : areaLoading ? (
          <div className="space-y-2"><div className="skeleton" /><div className="skeleton w-3/4" /></div>
        ) : areas.length === 0 ? (
          <p className="rounded-xl bg-slate-100 p-3 text-sm text-slate-500">Default OPD Consultation</p>
        ) : (
          <select
            id="kiosk-area"
            className="input"
            value={areaId}
            onChange={(e) => setAreaId(e.target.value)}
            aria-label="Service area"
          >
            {areas.map((a) => (
              <option key={a.id} value={a.id}>{a.name}{a.floor ? ` · ${a.floor}` : ''}</option>
            ))}
          </select>
        )}
      </div>

      {/* Doctor Assignment Preference */}
      {deptId && (
        <div>
          <label className="label" htmlFor="kiosk-doctor">Doctor Assignment</label>
          <select
            id="kiosk-doctor"
            className="input"
            value={preferredDoctorId}
            onChange={(e) => setPreferredDoctorId(e.target.value)}
            aria-label="Preferred doctor"
          >
            <option value="">Auto-assign best available doctor (Shortest queue)</option>
            {deptDoctors.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.name} · {doc.specialization || 'Consultant'} ({doc.status} · {doc.waiting} waiting)
              </option>
            ))}
          </select>
          <p className="field-hint">The system automatically matches you to the doctor with the shortest wait time.</p>
        </div>
      )}

      {/* Patient name & Phone */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="kiosk-name">Patient Name (Optional)</label>
          <input
            id="kiosk-name"
            className="input"
            placeholder="e.g. Anita Mohanty"
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="kiosk-phone">Mobile Number (Optional)</label>
          <input
            id="kiosk-phone"
            className="input"
            placeholder="e.g. 9876543210"
            type="tel"
            value={phone}
            aria-invalid={phone.trim() && !normalizeIndianPhone(phone) ? 'true' : undefined}
            onChange={(e) => {
              setPhone(e.target.value);
              setWhatsappOptIn(false);
            }}
          />
          {phone.trim() && !normalizeIndianPhone(phone) && (
            <p className="mt-1 text-xs font-semibold text-rose-600">
              Enter a valid 10-digit mobile number starting with 6, 7, 8 or 9.
            </p>
          )}
        </div>
      </div>

      {normalizeIndianPhone(phone) && (
        <label className="flex items-start gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            className="mt-1"
            checked={whatsappOptIn}
            onChange={(event) => setWhatsappOptIn(event.target.checked)}
          />
          <span>
            Send this token notification to this number on WhatsApp. I agree to
            receive this one-time token message.
          </span>
        </label>
      )}

      <button
        type="submit"
        className="btn-primary w-full !py-3.5 !text-base font-bold shadow-md"
        disabled={deptLoading || submitting || !deptId}
      >
        {submitting ? 'Generating Token…' : '🎟️ Generate Token'}
      </button>
    </form>
  );
}