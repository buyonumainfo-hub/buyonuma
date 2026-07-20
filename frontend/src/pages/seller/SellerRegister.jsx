import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Eye, EyeOff, Upload, MapPin } from 'lucide-react';
import { useSellerAuth } from '../../context/SellerAuthContext';
import { uploadToCloudinary } from '../../utils/cloudinary';
import { CATEGORIES_NO_ALL } from '../../utils/constants';
import LocationSelect from '../../components/shared/LocationSelect';
import { useUserLocation } from '../../hooks/useUserLocation';
import toast from 'react-hot-toast';
import './SellerAuth.css';

const SellerRegister = () => {
  const { register } = useSellerAuth();
  const navigate = useNavigate();
  const { location: detectedLocation, status: geoStatus, error: geoError, detect } = useUserLocation();
  const [form, setForm] = useState({
    username: '', email: '', password: '', store_name: '', category: 'Food & Beverages & Cakes',
    description: '', contact: '', whatsapp: '', website: '', social_media_handle: '',
    profile_picture: '', banner: '', state: '', city: ''
  });
  const [showPw, setShowPw]       = useState(false);
  const [loading, setLoading]     = useState(false);
  const [uploading, setUploading] = useState({ profile: false, banner: false });
  const [error, setError]         = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleUseMyLocation = () => {
    detect();
  };

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

  const handleImage = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;
    const key = field === 'profile_picture' ? 'profile' : 'banner';
    setUploading(u => ({ ...u, [key]: true }));
    try {
      const url = await uploadToCloudinary(file);
      set(field, url);
      toast.success('Image uploaded!');
    } catch (err) {
      toast.error('Upload failed: ' + err.message);
    } finally {
      setUploading(u => ({ ...u, [key]: false }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) return setError('Password must be at least 6 characters');
    setLoading(true); setError('');
    try {
      await register(form);
      toast.success('Account created! Check your email and await admin approval.');
      navigate('/seller/login');
    } catch (err) {
       toast.error(err.response?.data?.message || 'Registration failed')
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="seller-auth-page">
      <div className="seller-auth-card seller-auth-card-wide">
        <div className="seller-auth-header">
          <Link to="/" className="seller-auth-logo">
            <ShoppingBag size={22} /><span>BUYONUMA</span>
          </Link>
          <h1>Create Seller Account</h1>
          <p>Fill in your store details to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="seller-auth-form">
          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-section-label">Account</div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Username *</label>
              <input className="form-control" required placeholder="add a username with no space"
                value={form.username}
                onChange={e => set('username', e.target.value.toLowerCase().replace(/\s/g, ''))} />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address *</label>
              <input type="email" className="form-control" required placeholder="you@example.com"
                value={form.email}
                onChange={e => set('email', e.target.value)} />
              <span style={{ fontSize:'0.72rem', color:'var(--ink-muted)' }}>A welcome email will be sent here</span>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Password *</label>
            <div style={{ position: 'relative' }}>
              <input type={showPw ? 'text' : 'password'} className="form-control" required
                placeholder="Min 6 characters" value={form.password}
                onChange={e => set('password', e.target.value)}
                style={{ paddingRight: '2.5rem' }} />
              <button type="button" className="pw-toggle" onClick={() => setShowPw(!showPw)}>
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div className="form-section-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
            <span>Location</span>
           
          </div>
         
          <LocationSelect state={form.state} city={form.city} onChange={set} />

          <div className="form-section-label">Store Info</div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Store Name *</label>
              <input className="form-control" required placeholder="Your Store Name"
                value={form.store_name} onChange={e => set('store_name', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Category *</label>
              <select className="form-control" required value={form.category} onChange={e => set('category', e.target.value)}>
                {CATEGORIES_NO_ALL.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Description (optional)</label>
            <textarea className="form-control" rows={3} placeholder="What do you sell?"
              value={form.description} onChange={e => set('description', e.target.value)} />
          </div>

          <div className="form-section-label">Contact *</div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Phone *</label>
              <input className="form-control" placeholder="+2348012345678"
                value={form.contact} onChange={e => set('contact', e.target.value)} required/>
            </div>
            <div className="form-group">
              <label className="form-label">WhatsApp Number *</label>
              <input className="form-control" placeholder="08012345678 (no +)"
                value={form.whatsapp} onChange={e => set('whatsapp', e.target.value.replace(/\D/g, ''))} required/>
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Website (optional)</label>
              <input className="form-control" placeholder="https://..."
                value={form.website} onChange={e => set('website', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">TikTok (optional)</label>
              <input className="form-control" placeholder="your TikTok username eg. user1234"
                value={form.social_media_handle} onChange={e => set('social_media_handle', e.target.value)} />
            </div>
          </div>

          <div className="form-section-label">Images (optional)</div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Profile Picture</label>
              <label className="upload-btn">
                {uploading.profile ? <span>Uploading…</span>
                  : form.profile_picture
                    ? <img src={form.profile_picture} alt="" className="upload-thumb-circle" />
                    : <><Upload size={15} /><span>Upload</span></>}
                <input type="file" accept="image/*" hidden
                  onChange={e => handleImage(e, 'profile_picture')} disabled={uploading.profile} />
              </label>
            </div>
            <div className="form-group">
              <label className="form-label">Store Banner </label>
              <label className="upload-btn">
                {uploading.banner ? <span>Uploading…</span>
                  : form.banner
                    ? <img src={form.banner} alt="" className="upload-thumb-wide" />
                    : <><Upload size={15} /><span>Upload Banner</span></>}
                <input type="file" accept="image/*" hidden
                  onChange={e => handleImage(e, 'banner')} disabled={uploading.banner} />
              </label>
            </div>
          </div>

          <div className="seller-auth-note">
            ⏳ After registration you'll get a welcome email. Your account needs admin approval before you can post products.
          </div>

          <button type="submit" className="btn btn-gold"
            style={{ width: '100%', justifyContent: 'center', padding: '0.8rem' }}
            disabled={loading || uploading.profile || uploading.banner}>
            {loading ? 'Creating Account…' : 'Create Seller Account'}
          </button>

          <p className="seller-auth-switch">
            Already have an account? <Link to="/seller/login">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default SellerRegister;
