import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Eye, EyeOff, Lock, Mail, User } from 'lucide-react';
import { useBuyerAuth } from '../../context/BuyerAuthContext';
import GoogleAuthButton from '../../components/shared/GoogleAuthButton';
import { resumePendingChat } from '../../utils/pendingChat';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import '../seller/SellerAuth.css';

/**
 * Shared shell for /buyer/login and /buyer/register — same double-slider
 * pattern as the seller auth pages, reusing SellerAuth.css directly since
 * both forms here are short enough to never need the scrollable/top-aligned
 * treatment the seller register form needs.
 */
const BuyerAuth = ({ initialMode = 'login' }) => {
  const navigate = useNavigate();
  const { login, register, loginWithGoogle } = useBuyerAuth();
  const [isRightPanelActive, setIsRightPanelActive] = useState(initialMode === 'register');

  return (
    <div className="seller-auth-page">
      <div className="seller-auth-brand-row">
        <Link to="/" className="seller-auth-logo">
          <ShoppingBag size={18} />
          <span>BuyOnUma</span>
        </Link>
      </div>

      <div className={`seller-auth-container${isRightPanelActive ? ' right-panel-active' : ''}`}>
        <div className="seller-auth-mobile-tabs">
          <button type="button" className={!isRightPanelActive ? 'active' : ''} onClick={() => setIsRightPanelActive(false)}>
            Sign In
          </button>
          <button type="button" className={isRightPanelActive ? 'active' : ''} onClick={() => setIsRightPanelActive(true)}>
            Create Account
          </button>
        </div>

        <div className="seller-form-panel sign-up-panel">
          <BuyerSignUpForm register={register} loginWithGoogle={loginWithGoogle} navigate={navigate} />
        </div>

        <div className="seller-form-panel sign-in-panel">
          <BuyerSignInForm login={login} loginWithGoogle={loginWithGoogle} navigate={navigate} />
        </div>

        <div className="seller-overlay-container">
          <div className="seller-overlay">
            <div className="seller-overlay-panel overlay-left">
              <h1>Welcome Back</h1>
              <p>Sign in to message sellers, track orders and leave reviews.</p>
              <button type="button" className="btn-ghost" onClick={() => setIsRightPanelActive(false)}>
                Sign In
              </button>
            </div>
            <div className="seller-overlay-panel overlay-right">
              <h1>Hello, Friend!</h1>
              <p>Create an account to get personalized picks and shop faster.</p>
              <button type="button" className="btn-ghost" onClick={() => setIsRightPanelActive(true)}>
                Create Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ========================================================================
   Sign in
   ======================================================================== */

const BuyerSignInForm = ({ login, loginWithGoogle, navigate }) => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(form.email, form.password);
      const resumed = await resumePendingChat(api);
      toast.success(resumed ? 'Welcome back! Opening your chat…' : 'Welcome back!');
      navigate('/buyer/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async (credential) => {
    setLoading(true);
    setError('');
    try {
      await loginWithGoogle(credential);
      const resumed = await resumePendingChat(api);
      toast.success(resumed ? 'Welcome! Opening your chat…' : 'Welcome!');
      navigate('/buyer/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="seller-auth-form">
      <div className="seller-auth-header">
        <h1>Welcome Back</h1>
        <p>Sign in to message sellers, leave reviews and more</p>
      </div>
        <GoogleAuthButton onCredential={handleGoogle} />

      {error && <div className="alert alert-error">{error}</div>}

      <div className="form-group">
        <label className="form-label">Email</label>
        <div className="input-wrap">
          <Mail size={15} className="input-icon-left" />
          <input
            type="email"
            className="form-control"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            style={{ paddingLeft: '2.5rem' }}
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Password</label>
        <div className="input-wrap">
          <Lock size={15} className="input-icon-left" />
          <input
            type={showPw ? 'text' : 'password'}
            className="form-control"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
          />
          <button type="button" className="pw-toggle" onClick={() => setShowPw(!showPw)}>
            {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>

      <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.8rem', marginTop: '0.4rem' }} disabled={loading}>
        {loading ? 'Signing in…' : 'Sign In'}
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1rem 0', width: '100%' }}>
        <hr style={{ flex: 1 }} />
        <span style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>or</span>
        <hr style={{ flex: 1 }} />
      </div>
    

      <p className="seller-auth-switch" style={{ marginTop: '1rem' }}>
        <Link to="/">← Back to marketplace</Link>
      </p>
    </form>
  );
};

/* ========================================================================
   Sign up
   ======================================================================== */

const BuyerSignUpForm = ({ register, loginWithGoogle, navigate }) => {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) return setError('Password must be at least 6 characters');
    setLoading(true);
    setError('');
    try {
      await register(form);
      const resumed = await resumePendingChat(api);
      toast.success(resumed ? 'Account created! Opening your chat…' : 'Account created!');
      navigate('/buyer/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async (credential) => {
    setLoading(true);
    setError('');
    try {
      await loginWithGoogle(credential);
      const resumed = await resumePendingChat(api);
      toast.success(resumed ? 'Welcome! Opening your chat…' : 'Welcome!');
      navigate('/buyer/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="seller-auth-form">
      <div className="seller-auth-header">
        <h1>Create Your Account</h1>
        <p>Message sellers, leave reviews, get personalized picks</p>
      </div>
         <GoogleAuthButton onCredential={handleGoogle} text="signup_with" />

      {error && <div className="alert alert-error">{error}</div>}

      <div className="form-group">
        <label className="form-label">Full Name *</label>
        <div className="input-wrap">
          <User size={15} className="input-icon-left" />
          <input
            className="form-control"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            style={{ paddingLeft: '2.5rem' }}
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Email *</label>
        <div className="input-wrap">
          <Mail size={15} className="input-icon-left" />
          <input
            type="email"
            className="form-control"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            style={{ paddingLeft: '2.5rem' }}
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Password *</label>
        <div style={{ position: 'relative' }}>
          <input
            type={showPw ? 'text' : 'password'}
            className="form-control"
            required
            placeholder="Min 6 characters"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            style={{ paddingRight: '2.5rem' }}
          />
          <button type="button" className="pw-toggle" onClick={() => setShowPw(!showPw)}>
            {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>

      <button type="submit" className="btn btn-gold" style={{ width: '100%', justifyContent: 'center', padding: '0.8rem' }} disabled={loading}>
        {loading ? 'Creating Account…' : 'Create Account'}
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1rem 0', width: '100%' }}>
        <hr style={{ flex: 1 }} />
        <span style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>or</span>
        <hr style={{ flex: 1 }} />
      </div>
   
    </form>
  );
};

export default BuyerAuth;