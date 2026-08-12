import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Eye, EyeOff, Lock, Mail, User } from 'lucide-react';
import { useAffiliateAuth } from '../../context/AffiliateAuthContext';
import toast from 'react-hot-toast';
import '../seller/SellerAuth.css';

/**
 * Shared shell for /affiliate/login and /affiliate/register — same
 * double-slider pattern used by seller & buyer auth, reusing
 * SellerAuth.css directly since both forms here are short.
 */
const AffiliateAuth = ({ initialMode = 'login' }) => {
  const navigate = useNavigate();
  const { login, register } = useAffiliateAuth();
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
            Become an Affiliate
          </button>
        </div>

        <div className="seller-form-panel sign-up-panel">
          <AffiliateSignUpForm register={register} navigate={navigate} />
        </div>

        <div className="seller-form-panel sign-in-panel">
          <AffiliateSignInForm login={login} navigate={navigate} />
        </div>

        <div className="seller-overlay-container">
          <div className="seller-overlay">
            <div className="seller-overlay-panel overlay-left">
              <h1>Welcome Back</h1>
              <p>Sign in to track your referrals and your earnings.</p>
              <button type="button" className="btn-ghost" onClick={() => setIsRightPanelActive(false)}>
                Sign In
              </button>
            </div>
            <div className="seller-overlay-panel overlay-right">
              <h1>Earn With BuyOnUma</h1>
              <p>Share your link, bring in sellers, and earn a commission every time one of them upgrades their plan.</p>
              <button type="button" className="btn-ghost" onClick={() => setIsRightPanelActive(true)}>
                Become an Affiliate
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

const AffiliateSignInForm = ({ login, navigate }) => {
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
      toast.success('Welcome back!');
      navigate('/affiliate/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="seller-auth-form">
      <div className="seller-auth-header">
        <h1>Affiliate Sign In</h1>
        <p>Access your referrals & earnings dashboard</p>
      </div>

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

      <p className="seller-auth-switch" style={{ marginTop: '1rem' }}>
        <Link to="/">← Back to marketplace</Link>
      </p>
    </form>
  );
};

/* ========================================================================
   Sign up
   ======================================================================== */

const AffiliateSignUpForm = ({ register, navigate }) => {
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
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
      toast.success('Affiliate account created!');
      navigate('/affiliate/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="seller-auth-form">
      <div className="seller-auth-header">
        <h1>Become an Affiliate</h1>
        <p>Get your referral link and start earning</p>
      </div>

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
        <label className="form-label">Phone / WhatsApp</label>
        <input
          className="form-control"
          placeholder="Optional — for payout contact"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
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
        {loading ? 'Creating Account…' : 'Create Affiliate Account'}
      </button>

      <p className="seller-auth-switch" style={{ marginTop: '1rem' }}>
        <Link to="/">← Back to marketplace</Link>
      </p>
    </form>
  );
};

export default AffiliateAuth;
