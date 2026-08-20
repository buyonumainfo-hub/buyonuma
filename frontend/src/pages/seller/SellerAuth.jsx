<<<<<<< HEAD
import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Eye, EyeOff, Upload, Lock, User } from 'lucide-react';
import { useSellerAuth } from '../../context/SellerAuthContext';
import { uploadToCloudinary } from '../../utils/cloudinary';
import { CATEGORIES_NO_ALL } from '../../utils/constants';
import LocationSelect from '../../components/shared/LocationSelect';
import { useUserLocation } from '../../hooks/useUserLocation';
import GoogleAuthButton from '../../components/shared/GoogleAuthButton';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import './SellerAuth.css';

/**
 * Shared shell for /seller/login and /seller/register.
 *
 * Mirrors the "double-slider" sign-in/up pattern: both forms live in the
 * same card at all times, and a gradient overlay panel slides across to
 * reveal whichever one is active. `initialMode` just decides which panel
 * starts on top — switching between the two afterwards is a pure CSS/JS
 * toggle, no route change, so the slide animation is never interrupted.
 *
 * Below 900px the slide is swapped for a static stack with a small tab
 * switcher, since two half-width panels don't have room to breathe on a
 * phone.
 */
const SellerAuth = ({ initialMode = 'login' }) => {
  const navigate = useNavigate();
  const { login, register } = useSellerAuth();
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
          <button type="button" id='signIn' className={!isRightPanelActive ? 'active' : ''} onClick={() => setIsRightPanelActive(false)}>
            Sign In
          </button>
          <button type="button" className={isRightPanelActive ? 'active' : ''} onClick={() => setIsRightPanelActive(true)}>
            Create Account
          </button>
        </div>

        <div className="seller-form-panel sign-up-panel">
          <SignUpForm register={register} navigate={navigate} />
        </div>

        <div className="seller-form-panel sign-in-panel">
          <SignInForm login={login} navigate={navigate} />
        </div>

        <div className="seller-overlay-container">
          <div className="seller-overlay">
            <div className="seller-overlay-panel overlay-left">
              <h1>Welcome Back</h1>
              <p>Sign in to manage your storefront, track orders and keep your listings fresh.</p>
              <button type="button" className="btn-ghost" onClick={() => setIsRightPanelActive(false)}>
                Sign In
              </button>
            </div>
            <div className="seller-overlay-panel overlay-right">
              <h1>Hello, Seller!</h1>
              <p>Set up your store in minutes and start reaching buyers near you.</p>
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

const SignInForm = ({ login, navigate }) => {
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleCredential = async (credential) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/seller-auth/google', { credential });
      localStorage.setItem('lens_seller_token', res.data.token);
      toast.success(res.data.isNewAccount ? 'Account created — finish setting up your store' : 'Welcome back!');
      navigate(res.data.isNewAccount ? '/seller/profile' : '/seller/dashboard');
      window.location.reload(); // simplest way to make SellerAuthContext pick up the new token
    } catch (err) {
      setError(err.response?.data?.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(form.username, form.password);
      toast.success('Welcome back!');
      navigate('/seller/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="seller-auth-form">
      <div className="seller-auth-header">
        <h1>Seller Sign In</h1>
        <p>Access your seller dashboard</p>
      </div>
       <GoogleAuthButton onCredential={handleGoogleCredential} />
     
      {error && <div className="alert alert-error">{error}</div>}

      <div className="form-group">
        <label className="form-label">Username</label>
        <div className="input-wrap">
          <User size={15} className="input-icon-left" />
          <input
            className="form-control"
            required
            placeholder="yourusername"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
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
            placeholder="••••••••"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
          />
          <button type="button" className="pw-toggle" onClick={() => setShowPw(!showPw)}>
            {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        className="btn btn-primary"
        style={{ width: '100%', justifyContent: 'center', padding: '0.8rem', marginTop: '0.4rem' }}
        disabled={loading}
      >
        {loading ? 'Signing in…' : 'Sign In'}
      </button>

      <p className="seller-auth-switch" style={{ textAlign: 'right', width: '100%', marginTop: '0.6rem' }}>
        <Link to="/seller/forgot-password">Forgot your password?</Link>
      </p>

     

      <p className="seller-auth-switch" style={{ marginTop: '1rem' }}>
        <Link to="/">← Back to marketplace</Link>
      </p>
    </form>
  );
};

/* ========================================================================
   Sign up
   ======================================================================== */

const SignUpForm = ({ register, navigate }) => {
  const { location: detectedLocation, status: geoStatus, detect } = useUserLocation();
  const [form, setForm] = useState({
    username: '', email: '', password: '', store_name: '', category: 'Food & Beverages & Cakes',
    description: '', contact: '', whatsapp: '', website: '', social_media_handle: '',
    profile_picture: '', banner: '', state: '', city: '', referralCode: ''
  });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState({ profile: false, banner: false });
  const [error, setError] = useState('');
  // Live username-availability check — while a duplicate is possible to
  // slip through and still get caught server-side on submit, checking as
  // the seller types (debounced) lets us suggest alternatives immediately
  // instead of only after a failed submit.
  const [usernameStatus, setUsernameStatus] = useState(null); // null | 'checking' | 'available' | 'taken'
  const [usernameSuggestions, setUsernameSuggestions] = useState([]);
  const usernameCheckTimer = useRef(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const checkUsername = (username) => {
    if (usernameCheckTimer.current) clearTimeout(usernameCheckTimer.current);
    if (!username || username.length < 3) {
      setUsernameStatus(null);
      setUsernameSuggestions([]);
      return;
    }
    setUsernameStatus('checking');
    usernameCheckTimer.current = setTimeout(async () => {
      try {
        const res = await api.get('/seller-auth/check-username', { params: { username, store_name: form.store_name } });
        if (res.data.available) {
          setUsernameStatus('available');
          setUsernameSuggestions([]);
        } else {
          setUsernameStatus('taken');
          setUsernameSuggestions(res.data.suggestions || []);
        }
      } catch {
        setUsernameStatus(null);
      }
    }, 400);
  };

  const handleGoogleCredential = async (credential) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/seller-auth/google', { credential });
      localStorage.setItem('lens_seller_token', res.data.token);
      toast.success(res.data.isNewAccount ? 'Account created — finish setting up your store' : 'Welcome back!');
      navigate(res.data.isNewAccount ? '/seller/profile' : '/seller/dashboard');
      window.location.reload();
    } catch (err) {
      setError(err.response?.data?.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleUseMyLocation = () => detect();

  // Once detection finishes, fill the form (only if the seller hasn't
  // already typed something — don't clobber a manual entry mid-detect).
  useEffect(() => {
    if (geoStatus === 'done' && detectedLocation && !form.state) {
      set('state', detectedLocation.state);
      if (detectedLocation.city) set('city', detectedLocation.city);
      toast.success(`Location detected: ${detectedLocation.city ? detectedLocation.city + ', ' : ''}${detectedLocation.state}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geoStatus, detectedLocation]);

  // Pick up ?ref=<code> from an affiliate's referral link
  // (/seller/register?ref=<code> — see components/affiliate). Captured
  // once on mount; doesn't get clobbered by anything the seller types
  // since it's its own field.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) set('referralCode', ref.trim().toUpperCase());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleImage = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;
    const key = field === 'profile_picture' ? 'profile' : 'banner';
    setUploading((u) => ({ ...u, [key]: true }));
    try {
      const url = await uploadToCloudinary(file);
      set(field, url);
      toast.success('Image uploaded!');
    } catch (err) {
      toast.error('Upload failed: ' + err.message);
    } finally {
      setUploading((u) => ({ ...u, [key]: false }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) return setError('Password must be at least 6 characters');
    setLoading(true);
    setError('');
    try {
      await register(form);
      toast.success('Account created! Login and massage admin for approval admin approval.');
      document.getElementById('signIn').click(); // switch to the login panel
       navigate('/seller/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
      setError(err.response?.data?.message || 'Registration failed');
      if (err.response?.data?.suggestions?.length) {
        setUsernameStatus('taken');
        setUsernameSuggestions(err.response.data.suggestions);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="seller-auth-form seller-auth-form--tall">
      <div className="seller-auth-header">
        <h1>Create Seller Account</h1>
        <p>Fill in your store details to get started</p>
      </div>
      
      <GoogleAuthButton onCredential={handleGoogleCredential} text="signup_with" />
      

      {error && <div className="alert alert-error">{error}</div>}

      {form.referralCode && (
        <div className="alert alert-success">
          Referred by affiliate code <strong>{form.referralCode}</strong>
        </div>
      )}

      <div className="form-section-label">Account</div>
      <div className="grid-2">
        <div className="form-group">
          <label className="form-label">Username *</label>
          <input
            style={{background: 'white'}}
            autoComplete="off"
            className="form-control"
            required
            placeholder="add a username with no space"
            value={form.username}
            onChange={(e) => {
              const v = e.target.value.toLowerCase().replace(/\s/g, '');
              set('username', v);
              checkUsername(v);
            }}
          />
          {usernameStatus === 'checking' && (
            <span style={{ fontSize: '0.72rem', color: 'var(--ink-muted)' }}>Checking availability…</span>
          )}
          {usernameStatus === 'available' && (
            <span style={{ fontSize: '0.72rem', color: '#2e8b57' }}>✓ Username available</span>
          )}
          {usernameStatus === 'taken' && (
            <div style={{ fontSize: '0.72rem', color: '#c0392b' }}>
              That username is taken. Try:{' '}
              {usernameSuggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    set('username', s);
                    setUsernameStatus('available');
                    setUsernameSuggestions([]);
                  }}
                  style={{ background: 'none', border: '1px solid var(--gold)', borderRadius: '999px', padding: '2px 8px', margin: '2px', cursor: 'pointer', color: 'var(--gold-deep)' }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="form-group">
          <label className="form-label">Email Address *</label>
          <input
          style={{background: 'white'}}
            type="email"
            className="form-control"
            required
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
          />
          <span style={{ fontSize: '0.72rem', color: 'var(--ink-muted)' }}>A welcome email will be sent here</span>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Password *</label>
        <div style={{ position: 'relative' }}>
          <input
            type={showPw ? 'text' : 'password'}
            className="form-control"
            autoComplete="off"
            required
            placeholder="Min 6 characters"
            value={form.password}
            onChange={(e) => set('password', e.target.value)}
            style={{ paddingRight: '2.5rem' }}
          />
          <button type="button" className="pw-toggle" onClick={() => setShowPw(!showPw)}>
            {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>

      <div className="form-section-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
        <span>Location</span>
        <button
          type="button"
          onClick={handleUseMyLocation}
          disabled={geoStatus === 'loading'}
          style={{ background: 'none', border: 'none', color: 'var(--gold-deep)', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.04em', cursor: 'pointer', textTransform: 'none' }}
        >
          {geoStatus === 'loading' ? 'Detecting…' : 'Use my location'}
        </button>
      </div>
      <LocationSelect state={form.state} city={form.city} onChange={set} />

      <div className="form-section-label">Store Info</div>
      <div className="grid-2">
        <div className="form-group">
          <label className="form-label">Store Name *</label>
          <input style={{background: 'white'}} className="form-control" required placeholder="Your Store Name" value={form.store_name} onChange={(e) => set('store_name', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Category *</label>
          <select className="form-control" style={{background: 'white'}} required value={form.category} onChange={(e) => set('category', e.target.value)}>
            {CATEGORIES_NO_ALL.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Description (optional)</label>
        <textarea style={{background: 'white'}} className="form-control" rows={3} placeholder="What do you sell?" value={form.description} onChange={(e) => set('description', e.target.value)} />
      </div>

      <div className="form-section-label">Contact *</div>
      <div className="grid-2">
        <div className="form-group">
          <label className="form-label">Phone *</label>
          <input style={{background: 'white'}} className="form-control" placeholder="+2348012345678" value={form.contact} onChange={(e) => set('contact', e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">WhatsApp Number *</label>
          <input style={{background: 'white'}} className="form-control" placeholder="08012345678 (no +)" value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value.replace(/\D/g, ''))} required />
        </div>
      </div>
      <div className="grid-2">
        <div className="form-group">
          <label className="form-label">Website (optional)</label>
          <input style={{background: 'white'}} className="form-control" placeholder="https://..." value={form.website} onChange={(e) => set('website', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">TikTok (optional)</label>
          <input style={{background: 'white'}} className="form-control" placeholder="your TikTok username eg. user1234" value={form.social_media_handle} onChange={(e) => set('social_media_handle', e.target.value)} />
        </div>
      </div>

      <div className="form-section-label">Images (optional)</div>
      <div className="grid-2">
        <div className="form-group">
          <label className="form-label">Profile Picture</label>
          <label className="upload-btn">
            {uploading.profile ? (
              <span>Uploading…</span>
            ) : form.profile_picture ? (
              <img src={form.profile_picture} alt="" className="upload-thumb-circle" />
            ) : (
              <>
                <Upload size={15} />
                <span>Upload</span>
              </>
            )}
            <input type="file" accept="image/*" hidden onChange={(e) => handleImage(e, 'profile_picture')} disabled={uploading.profile} />
          </label>
        </div>
        <div className="form-group">
          <label className="form-label">Store Banner</label>
          <label className="upload-btn">
            {uploading.banner ? (
              <span>Uploading…</span>
            ) : form.banner ? (
              <img src={form.banner} alt="" className="upload-thumb-wide" />
            ) : (
              <>
                <Upload size={15} />
                <span>Upload Banner</span>
              </>
            )}
            <input type="file" accept="image/*" hidden onChange={(e) => handleImage(e, 'banner')} disabled={uploading.banner} />
          </label>
        </div>
      </div>

      <div className="seller-auth-note">
        ⏳ After registration you'll get a welcome email. Your account needs admin approval before you can post products.
      </div>

      <button type="submit" className="btn btn-gold" style={{ width: '100%', justifyContent: 'center', padding: '0.8rem' }} disabled={loading || uploading.profile || uploading.banner}>
        {loading ? 'Creating Account…' : 'Create Seller Account'}
      </button>

     
    </form>
  );
};

=======
import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Eye, EyeOff, Upload, Lock, User } from 'lucide-react';
import { useSellerAuth } from '../../context/SellerAuthContext';
import { uploadToCloudinary } from '../../utils/cloudinary';
import { CATEGORIES_NO_ALL } from '../../utils/constants';
import LocationSelect from '../../components/shared/LocationSelect';
import { useUserLocation } from '../../hooks/useUserLocation';
import GoogleAuthButton from '../../components/shared/GoogleAuthButton';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import './SellerAuth.css';

/**
 * Shared shell for /seller/login and /seller/register.
 *
 * Mirrors the "double-slider" sign-in/up pattern: both forms live in the
 * same card at all times, and a gradient overlay panel slides across to
 * reveal whichever one is active. `initialMode` just decides which panel
 * starts on top — switching between the two afterwards is a pure CSS/JS
 * toggle, no route change, so the slide animation is never interrupted.
 *
 * Below 900px the slide is swapped for a static stack with a small tab
 * switcher, since two half-width panels don't have room to breathe on a
 * phone.
 */
const SellerAuth = ({ initialMode = 'login' }) => {
  const navigate = useNavigate();
  const { login, register } = useSellerAuth();
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
          <button type="button" id='signIn' className={!isRightPanelActive ? 'active' : ''} onClick={() => setIsRightPanelActive(false)}>
            Sign In
          </button>
          <button type="button" className={isRightPanelActive ? 'active' : ''} onClick={() => setIsRightPanelActive(true)}>
            Create Account
          </button>
        </div>

        <div className="seller-form-panel sign-up-panel">
          <SignUpForm register={register} navigate={navigate} />
        </div>

        <div className="seller-form-panel sign-in-panel">
          <SignInForm login={login} navigate={navigate} />
        </div>

        <div className="seller-overlay-container">
          <div className="seller-overlay">
            <div className="seller-overlay-panel overlay-left">
              <h1>Welcome Back</h1>
              <p>Sign in to manage your storefront, track orders and keep your listings fresh.</p>
              <button type="button" className="btn-ghost" onClick={() => setIsRightPanelActive(false)}>
                Sign In
              </button>
            </div>
            <div className="seller-overlay-panel overlay-right">
              <h1>Hello, Seller!</h1>
              <p>Set up your store in minutes and start reaching buyers near you.</p>
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

const SignInForm = ({ login, navigate }) => {
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleCredential = async (credential) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/seller-auth/google', { credential });
      localStorage.setItem('lens_seller_token', res.data.token);
      toast.success(res.data.isNewAccount ? 'Account created — finish setting up your store' : 'Welcome back!');
      navigate(res.data.isNewAccount ? '/seller/profile' : '/seller/dashboard');
      window.location.reload(); // simplest way to make SellerAuthContext pick up the new token
    } catch (err) {
      setError(err.response?.data?.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(form.username, form.password);
      toast.success('Welcome back!');
      navigate('/seller/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="seller-auth-form">
      <div className="seller-auth-header">
        <h1>Seller Sign In</h1>
        <p>Access your seller dashboard</p>
      </div>
       <GoogleAuthButton onCredential={handleGoogleCredential} />
     
      {error && <div className="alert alert-error">{error}</div>}

      <div className="form-group">
        <label className="form-label">Username</label>
        <div className="input-wrap">
          <User size={15} className="input-icon-left" />
          <input
            className="form-control"
            required
            placeholder="yourusername"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
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
            placeholder="••••••••"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
          />
          <button type="button" className="pw-toggle" onClick={() => setShowPw(!showPw)}>
            {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        className="btn btn-primar"
        style={{ width: '100%', justifyContent: 'center', padding: '0.8rem', marginTop: '0.4rem' }}
        disabled={loading}
      >
        {loading ? 'Signing in…' : 'Sign In'}
      </button>

      <p className="seller-auth-switch" style={{ textAlign: 'right', width: '100%', marginTop: '0.6rem' }}>
        <Link to="/seller/forgot-password">Forgot your password?</Link>
      </p>

     

      <p className="seller-auth-switch" style={{ marginTop: '1rem' }}>
        <Link to="/">← Back to marketplace</Link>
      </p>
    </form>
  );
};

/* ========================================================================
   Sign up
   ======================================================================== */

const SignUpForm = ({ register, navigate }) => {
  const { location: detectedLocation, status: geoStatus, detect } = useUserLocation();
  const [form, setForm] = useState({
    username: '', email: '', password: '', store_name: '', category: 'Food & Beverages & Cakes',
    description: '', contact: '', whatsapp: '', website: '', social_media_handle: '',
    profile_picture: '', banner: '', state: '', city: '', referralCode: ''
  });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState({ profile: false, banner: false });
  const [error, setError] = useState('');
  // Live username-availability check — while a duplicate is possible to
  // slip through and still get caught server-side on submit, checking as
  // the seller types (debounced) lets us suggest alternatives immediately
  // instead of only after a failed submit.
  const [usernameStatus, setUsernameStatus] = useState(null); // null | 'checking' | 'available' | 'taken'
  const [usernameSuggestions, setUsernameSuggestions] = useState([]);
  const usernameCheckTimer = useRef(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const checkUsername = (username) => {
    if (usernameCheckTimer.current) clearTimeout(usernameCheckTimer.current);
    if (!username || username.length < 3) {
      setUsernameStatus(null);
      setUsernameSuggestions([]);
      return;
    }
    setUsernameStatus('checking');
    usernameCheckTimer.current = setTimeout(async () => {
      try {
        const res = await api.get('/seller-auth/check-username', { params: { username, store_name: form.store_name } });
        if (res.data.available) {
          setUsernameStatus('available');
          setUsernameSuggestions([]);
        } else {
          setUsernameStatus('taken');
          setUsernameSuggestions(res.data.suggestions || []);
        }
      } catch {
        setUsernameStatus(null);
      }
    }, 400);
  };

  const handleGoogleCredential = async (credential) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/seller-auth/google', { credential });
      localStorage.setItem('lens_seller_token', res.data.token);
      toast.success(res.data.isNewAccount ? 'Account created — finish setting up your store' : 'Welcome back!');
      navigate(res.data.isNewAccount ? '/seller/profile' : '/seller/dashboard');
      window.location.reload();
    } catch (err) {
      setError(err.response?.data?.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleUseMyLocation = () => detect();

  // Once detection finishes, fill the form (only if the seller hasn't
  // already typed something — don't clobber a manual entry mid-detect).
  useEffect(() => {
    if (geoStatus === 'done' && detectedLocation && !form.state) {
      set('state', detectedLocation.state);
      if (detectedLocation.city) set('city', detectedLocation.city);
      toast.success(`Location detected: ${detectedLocation.city ? detectedLocation.city + ', ' : ''}${detectedLocation.state}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geoStatus, detectedLocation]);

  // Pick up ?ref=<code> from an affiliate's referral link
  // (/seller/register?ref=<code> — see components/affiliate). Captured
  // once on mount; doesn't get clobbered by anything the seller types
  // since it's its own field.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) set('referralCode', ref.trim().toUpperCase());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleImage = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;
    const key = field === 'profile_picture' ? 'profile' : 'banner';
    setUploading((u) => ({ ...u, [key]: true }));
    try {
      const url = await uploadToCloudinary(file);
      set(field, url);
      toast.success('Image uploaded!');
    } catch (err) {
      toast.error('Upload failed: ' + err.message);
    } finally {
      setUploading((u) => ({ ...u, [key]: false }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) return setError('Password must be at least 6 characters');
    setLoading(true);
    setError('');
    try {
      await register(form);
      toast.success('Account created! Login and massage admin for approval admin approval.');
      document.getElementById('signIn').click(); // switch to the login panel
       navigate('/seller/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
      setError(err.response?.data?.message || 'Registration failed');
      if (err.response?.data?.suggestions?.length) {
        setUsernameStatus('taken');
        setUsernameSuggestions(err.response.data.suggestions);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="seller-auth-form seller-auth-form--tall">
      <div className="seller-auth-header">
        <h1>Create Seller Account</h1>
        <p>Fill in your store details to get started</p>
      </div>
      
      <GoogleAuthButton onCredential={handleGoogleCredential} text="signup_with" />
      

      {error && <div className="alert alert-error">{error}</div>}

      {form.referralCode && (
        <div className="alert alert-success">
          Referred by affiliate code <strong>{form.referralCode}</strong>
        </div>
      )}

      <div className="form-section-label">Account</div>
      <div className="grid-2">
        <div className="form-group">
          <label className="form-label">Username *</label>
          <input
            style={{background: 'white'}}
            autoComplete="off"
            className="form-control"
            required
            placeholder="add a username with no space"
            value={form.username}
            onChange={(e) => {
              const v = e.target.value.toLowerCase().replace(/\s/g, '');
              set('username', v);
              checkUsername(v);
            }}
          />
          {usernameStatus === 'checking' && (
            <span style={{ fontSize: '0.72rem', color: 'var(--ink-muted)' }}>Checking availability…</span>
          )}
          {usernameStatus === 'available' && (
            <span style={{ fontSize: '0.72rem', color: '#2e8b57' }}>✓ Username available</span>
          )}
          {usernameStatus === 'taken' && (
            <div style={{ fontSize: '0.72rem', color: '#c0392b' }}>
              That username is taken. Try:{' '}
              {usernameSuggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    set('username', s);
                    setUsernameStatus('available');
                    setUsernameSuggestions([]);
                  }}
                  style={{ background: 'none', border: '1px solid var(--gold)', borderRadius: '999px', padding: '2px 8px', margin: '2px', cursor: 'pointer', color: 'var(--gold-deep)' }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="form-group">
          <label className="form-label">Email Address *</label>
          <input
          style={{background: 'white'}}
            type="email"
            className="form-control"
            required
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
          />
          <span style={{ fontSize: '0.72rem', color: 'var(--ink-muted)' }}>A welcome email will be sent here</span>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Password *</label>
        <div style={{ position: 'relative' }}>
          <input
            type={showPw ? 'text' : 'password'}
            className="form-control"
            autoComplete="off"
            required
            placeholder="Min 6 characters"
            value={form.password}
            onChange={(e) => set('password', e.target.value)}
            style={{ paddingRight: '2.5rem' }}
          />
          <button type="button" className="pw-toggle" onClick={() => setShowPw(!showPw)}>
            {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>

      <div className="form-section-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
        <span>Location</span>
        <button
          type="button"
          onClick={handleUseMyLocation}
          disabled={geoStatus === 'loading'}
          style={{ background: 'none', border: 'none', color: 'var(--gold-deep)', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.04em', cursor: 'pointer', textTransform: 'none' }}
        >
          {geoStatus === 'loading' ? 'Detecting…' : 'Use my location'}
        </button>
      </div>
      <LocationSelect state={form.state} city={form.city} onChange={set} />

      <div className="form-section-label">Store Info</div>
      <div className="grid-2">
        <div className="form-group">
          <label className="form-label">Store Name *</label>
          <input style={{background: 'white'}} className="form-control" required placeholder="Your Store Name" value={form.store_name} onChange={(e) => set('store_name', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Category *</label>
          <select className="form-control" style={{background: 'white'}} required value={form.category} onChange={(e) => set('category', e.target.value)}>
            {CATEGORIES_NO_ALL.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Description (optional)</label>
        <textarea style={{background: 'white'}} className="form-control" rows={3} placeholder="What do you sell?" value={form.description} onChange={(e) => set('description', e.target.value)} />
      </div>

      <div className="form-section-label">Contact *</div>
      <div className="grid-2">
        <div className="form-group">
          <label className="form-label">Phone *</label>
          <input style={{background: 'white'}} className="form-control" placeholder="+2348012345678" value={form.contact} onChange={(e) => set('contact', e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">WhatsApp Number *</label>
          <input style={{background: 'white'}} className="form-control" placeholder="08012345678 (no +)" value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value.replace(/\D/g, ''))} required />
        </div>
      </div>
      <div className="grid-2">
        <div className="form-group">
          <label className="form-label">Website (optional)</label>
          <input style={{background: 'white'}} className="form-control" placeholder="https://..." value={form.website} onChange={(e) => set('website', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">TikTok (optional)</label>
          <input style={{background: 'white'}} className="form-control" placeholder="your TikTok username eg. user1234" value={form.social_media_handle} onChange={(e) => set('social_media_handle', e.target.value)} />
        </div>
      </div>

      <div className="form-section-label">Images (optional)</div>
      <div className="grid-2">
        <div className="form-group">
          <label className="form-label">Profile Picture</label>
          <label className="upload-btn">
            {uploading.profile ? (
              <span>Uploading…</span>
            ) : form.profile_picture ? (
              <img src={form.profile_picture} alt="" className="upload-thumb-circle" />
            ) : (
              <>
                <Upload size={15} />
                <span>Upload</span>
              </>
            )}
            <input type="file" accept="image/*" hidden onChange={(e) => handleImage(e, 'profile_picture')} disabled={uploading.profile} />
          </label>
        </div>
        <div className="form-group">
          <label className="form-label">Store Banner</label>
          <label className="upload-btn">
            {uploading.banner ? (
              <span>Uploading…</span>
            ) : form.banner ? (
              <img src={form.banner} alt="" className="upload-thumb-wide" />
            ) : (
              <>
                <Upload size={15} />
                <span>Upload Banner</span>
              </>
            )}
            <input type="file" accept="image/*" hidden onChange={(e) => handleImage(e, 'banner')} disabled={uploading.banner} />
          </label>
        </div>
      </div>

      <div className="seller-auth-note">
        ⏳ After registration you'll get a welcome email. Your account needs admin approval before you can post products.
      </div>

      <button type="submit" className="btn btn-gold" style={{ width: '100%', justifyContent: 'center', padding: '0.8rem' }} disabled={loading || uploading.profile || uploading.banner}>
        {loading ? 'Creating Account…' : 'Create Seller Account'}
      </button>

     
    </form>
  );
};

>>>>>>> b403b42571a91fae11e3332f19cf5691d2aba20a
export default SellerAuth;