import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Mail, KeyRound, Lock, Eye, EyeOff, CheckCircle, ArrowRight } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import './SellerAuth.css';
import './SellerForgotPassword.css';

const STEPS = { EMAIL: 'email', CODE: 'code', PASSWORD: 'password', DONE: 'done' };

const SellerForgotPassword = () => {
  const [step, setStep]       = useState(STEPS.EMAIL);
  const [email, setEmail]     = useState('');
  const [code, setCode]       = useState(['', '', '', '', '']);
  const [newPw, setNewPw]     = useState('');
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const codeStr = code.join('');

  /* ── Step 1: send OTP ── */
  const handleSendCode = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await api.post('/seller-auth/forgot-password', { email });
      toast.success('Reset code sent!');
      setStep(STEPS.CODE);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send code');
    } finally { setLoading(false); }
  };

  /* ── Step 2: verify OTP ── */
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    if (codeStr.length < 5) return setError('Enter the full 5-digit code');
    setLoading(true); setError('');
    try {
      await api.post('/seller-auth/verify-reset-code', { email, code: codeStr });
      setStep(STEPS.PASSWORD);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid code');
    } finally { setLoading(false); }
  };

  /* ── Step 3: set new password ── */
  const handleResetPw = async (e) => {
    e.preventDefault();
    if (newPw.length < 6) return setError('Password must be at least 6 characters');
    setLoading(true); setError('');
    try {
      await api.post('/seller-auth/reset-password', { email, code: codeStr, newPassword: newPw });
      toast.success('Password reset successfully!');
      setStep(STEPS.DONE);
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed');
    } finally { setLoading(false); }
  };

  /* ── OTP digit input handler ── */
  const handleCodeInput = (val, idx) => {
    const v = val.replace(/\D/g, '').slice(-1);
    const next = [...code];
    next[idx] = v;
    setCode(next);
    if (v && idx < 4) {
      document.getElementById(`otp-${idx + 1}`)?.focus();
    }
  };

  const handleCodeKey = (e, idx) => {
    if (e.key === 'Backspace' && !code[idx] && idx > 0) {
      document.getElementById(`otp-${idx - 1}`)?.focus();
    }
  };

  const handleCodePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 5);
    if (pasted.length === 5) {
      setCode(pasted.split(''));
      document.getElementById('otp-4')?.focus();
    }
  };

  /* ── Step indicator ── */
  const steps = [
    { label: 'Email', key: STEPS.EMAIL },
    { label: 'Verify Code', key: STEPS.CODE },
    { label: 'New Password', key: STEPS.PASSWORD },
  ];
  const currentStepIdx = steps.findIndex(s => s.key === step);

  return (
    <div className="seller-auth-page">
      <div className="seller-auth-card fp-card">
        <div className="seller-auth-header">
          <Link to="/" className="seller-auth-logo">
            <ShoppingBag size={22} /><span>BuyOnUma</span>
          </Link>
          <h1>Reset Password</h1>
          <p>We'll send a 5-digit code to your registered email</p>
        </div>

        {/* Step indicator */}
        {step !== STEPS.DONE && (
          <div className="fp-steps">
            {steps.map((s, i) => (
              <div key={s.key} className="fp-step-wrap">
                <div className={`fp-step-dot ${i < currentStepIdx ? 'done' : i === currentStepIdx ? 'active' : ''}`}>
                  {i < currentStepIdx ? <CheckCircle size={14} /> : <span>{i + 1}</span>}
                </div>
                <span className={`fp-step-label ${i === currentStepIdx ? 'active' : ''}`}>{s.label}</span>
                {i < steps.length - 1 && <div className={`fp-step-line ${i < currentStepIdx ? 'done' : ''}`} />}
              </div>
            ))}
          </div>
        )}

        {error && <div className="alert alert-error" style={{ marginBottom:'1rem' }}>{error}</div>}

        {/* ── Step 1: Email ── */}
        {step === STEPS.EMAIL && (
          <form onSubmit={handleSendCode} className="seller-auth-form">
            <div className="form-group">
              <label className="form-label">Your Registered Email</label>
              <div className="input-wrap">
                <Mail size={15} className="input-icon-left" />
                <input type="email" className="form-control" required
                  placeholder="you@example.com" value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={{ paddingLeft:'2.5rem' }} />
              </div>
            </div>
            <button type="submit" className="btn btn-gold"
              style={{ width:'100%', justifyContent:'center', padding:'0.8rem' }} disabled={loading}>
              {loading ? 'Sending…' : <><Mail size={16} /> Send Reset Code <ArrowRight size={16} /></>}
            </button>
            <p className="seller-auth-switch"><Link to="/seller/login">← Back to login</Link></p>
          </form>
        )}

        {/* ── Step 2: OTP code ── */}
        {step === STEPS.CODE && (
          <form onSubmit={handleVerifyCode} className="seller-auth-form">
            <p className="fp-hint">
              Enter the 5-digit code sent to <strong>{email}</strong>. Check your spam folder if you don't see it.
            </p>
            <div className="otp-row" onPaste={handleCodePaste}>
              {code.map((digit, i) => (
                <input
                  key={i} id={`otp-${i}`}
                  type="text" inputMode="numeric" maxLength={1}
                  className="otp-input"
                  value={digit}
                  onChange={e => handleCodeInput(e.target.value, i)}
                  onKeyDown={e => handleCodeKey(e, i)}
                  autoFocus={i === 0}
                />
              ))}
            </div>
            <button type="submit" className="btn btn-gold"
              style={{ width:'100%', justifyContent:'center', padding:'0.8rem' }}
              disabled={loading || codeStr.length < 5}>
              {loading ? 'Verifying…' : <><KeyRound size={16} /> Verify Code</>}
            </button>
            <button type="button" className="btn btn-outline"
              style={{ width:'100%', justifyContent:'center', marginTop:'0.5rem' }}
              onClick={() => { setError(''); setStep(STEPS.EMAIL); setCode(['','','','','']); }}>
              ← Try a different email
            </button>
          </form>
        )}

        {/* ── Step 3: New password ── */}
        {step === STEPS.PASSWORD && (
          <form onSubmit={handleResetPw} className="seller-auth-form">
            <p className="fp-hint">Code verified! Enter your new password.</p>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <div className="input-wrap">
                <Lock size={15} className="input-icon-left" />
                <input type={showPw ? 'text' : 'password'} className="form-control" required
                  placeholder="Min 6 characters" value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                  style={{ paddingLeft:'2.5rem', paddingRight:'2.5rem' }} autoFocus />
                <button type="button" className="pw-toggle" onClick={() => setShowPw(!showPw)}>
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <button type="submit" className="btn btn-gold"
              style={{ width:'100%', justifyContent:'center', padding:'0.8rem' }} disabled={loading}>
              {loading ? 'Resetting…' : <><Lock size={16} /> Set New Password</>}
            </button>
          </form>
        )}

        {/* ── Done ── */}
        {step === STEPS.DONE && (
          <div className="fp-done">
            <div className="fp-done-icon"><CheckCircle size={48} /></div>
            <h2>Password Reset!</h2>
            <p>Your password has been changed successfully. You can now sign in with your new password.</p>
            <Link to="/seller/login" className="btn btn-gold btn-lg">
              Go to Sign In <ArrowRight size={16} />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default SellerForgotPassword;
