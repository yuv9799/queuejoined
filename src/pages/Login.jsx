import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import api from '../services/api.js';

export default function Login() {
  const { loginOtp } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('phone'); // phone | otp
  const [devOtp, setDevOtp] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function requestOtp(e) {
    if (e) e.preventDefault();
    const p = (phone || '').trim();
    if (!p) return toast.error('Enter your registered phone number');
    setLoading(true);
    setError(null);
    try {
      const d = await api.otpRequest(p);
      setDevOtp(d.devOtp || null);
      setStep('otp');
      toast.success(d.devOtp ? `One-time code: ${d.devOtp}` : 'OTP sent to your phone');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function verify(e) {
    if (e) e.preventDefault();
    if (!otp.trim()) return toast.error('Enter the OTP');
    setLoading(true);
    setError(null);
    try {
      const user = await loginOtp((phone || '').trim(), otp.trim());
      toast.success(`Welcome, ${user.name}`);
      navigate('/staff');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function fill(d) {
    setPhone(d.phone);
    setOtp('');
    setStep('phone');
    setError(null);
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="card">
        <h1 className="mb-1 text-2xl font-extrabold text-slate-900">KIMS Staff Login</h1>
        <p className="mb-6 text-sm text-slate-500">
          Sign in with your registered phone number. We will send a one-time passcode.
        </p>

        {error && <div className="mb-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

        {step === 'phone' ? (
          <form onSubmit={requestOtp} className="space-y-4">
            <div>
              <label className="label" htmlFor="login-phone">Phone number</label>
              <input
                id="login-phone"
                className="input"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 9000000001"
                autoComplete="tel"
              />
            </div>
            <button className="btn-primary w-full" disabled={loading}>
              {loading ? 'Sending OTP…' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={verify} className="space-y-4">
            <p className="text-sm text-slate-500">OTP sent to <span className="font-semibold">{phone}</span></p>
            <div>
              <label className="label" htmlFor="login-otp">One-time passcode</label>
              <input
                id="login-otp"
                className="input"
                inputMode="numeric"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                maxLength={6}
              />
              {devOtp && (
                <p className="field-hint">One-time code: <strong>{devOtp}</strong></p>
              )}
            </div>
            <button className="btn-primary w-full" disabled={loading}>
              {loading ? 'Verifying…' : 'Verify & Sign in'}
            </button>
            <button type="button" className="btn-ghost w-full" onClick={() => { setStep('phone'); setOtp(''); setDevOtp(null); setError(null); }}>
              Change phone
            </button>
          </form>
        )}
      </div>
    </div>
  );
}