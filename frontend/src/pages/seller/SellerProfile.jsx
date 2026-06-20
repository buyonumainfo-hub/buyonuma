import { useState, useEffect } from 'react';
import { User, Save, Upload } from 'lucide-react';
import SellerLayout from '../../components/seller/SellerLayout';
import { useSellerAuth } from '../../context/SellerAuthContext';
import { uploadToCloudinary } from '../../utils/cloudinary';
import axios from 'axios';
import toast from 'react-hot-toast';
import './SellerProfile.css';

const api_url = `${import.meta.env.VITE_API_URL}`

const SellerProfile = () => {
  const { seller, refreshSeller } = useSellerAuth();
  const [form, setForm] = useState({
    store_name: '', description: '', contact: '', whatsapp: '',
    website: '', social_media_handle: '', profile_picture: '', banner: ''
  });
  const [uploading, setUploading] = useState({ profile: false, banner: false });
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const token = localStorage.getItem('lens_seller_token');

  useEffect(() => {
    if (seller) {
      setForm({
        store_name:          seller.store_name || '',
        description:         seller.description || '',
        contact:             seller.contact || '',
        whatsapp:            seller.whatsapp || '',
        website:             seller.website || '',
        social_media_handle: seller.social_media_handle || '',
        profile_picture:     seller.profile_picture || '',
        banner:              seller.banner || '',
      });
    }
  }, [seller]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleImage = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;
    const key = field === 'profile_picture' ? 'profile' : 'banner';
    setUploading(u => ({ ...u, [key]: true }));
    try {
      const url = await uploadToCloudinary(file);
      set(field, url);
      toast.success('Image uploaded!');
    } catch (err) { toast.error('Upload failed: ' + err.message); }
    finally { setUploading(u => ({ ...u, [key]: false })); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await axios.put(`${api_url}/seller-auth/profile`, form, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await refreshSeller();
      toast.success('Profile updated!');
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed');
    } finally { setLoading(false); }
  };

  return (
    <SellerLayout title="Edit Profile">
      <div className="seller-profile-page fade-up">
        <div className="seller-profile-card">
          <div className="seller-profile-header">
            <div className="seller-profile-icon"><User size={22} /></div>
            <div>
              <h2>Store Profile</h2>
              <p>Update your store details visible to buyers</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="seller-profile-form">
            {error && <div className="alert alert-error">{error}</div>}

            <div className="form-group">
              <label className="form-label">Store Name *</label>
              <input className="form-control" required value={form.store_name} onChange={e => set('store_name', e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-control" rows={4} placeholder="Tell buyers about your store…"
                value={form.description} onChange={e => set('description', e.target.value)} />
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-control" placeholder="+2348012345678" value={form.contact} onChange={e => set('contact', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">WhatsApp</label>
                <input className="form-control" placeholder="2348012345678 (no +)" value={form.whatsapp}
                  onChange={e => set('whatsapp', e.target.value.replace(/\D/g, ''))} />
                <span style={{ fontSize:'0.72rem', color:'var(--ink-muted)' }}>International format without + symbol</span>
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Website</label>
                <input className="form-control" placeholder="https://yoursite.com" value={form.website} onChange={e => set('website', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Titok username</label>
                <input className="form-control" placeholder="yourhandle eg. user1234" value={form.social_media_handle} onChange={e => set('social_media_handle', e.target.value)} />
              </div>
            </div>

            {/* Images */}
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Profile Picture</label>
                <label className="profile-upload-box">
                  {uploading.profile ? <span>Uploading…</span>
                    : form.profile_picture
                      ? <img src={form.profile_picture} alt="" className="profile-upload-circle" />
                      : <><Upload size={18} /><span>Upload Photo</span></>}
                  <input type="file" accept="image/*" hidden onChange={e => handleImage(e, 'profile_picture')} disabled={uploading.profile} />
                </label>
                {form.profile_picture && (
                  <button type="button" className="btn btn-outline btn-sm" style={{ marginTop:'0.4rem' }} onClick={() => set('profile_picture', '')}>Remove</button>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Store Banner</label>
                <label className="profile-upload-box profile-upload-wide">
                  {uploading.banner ? <span>Uploading…</span>
                    : form.banner
                      ? <img src={form.banner} alt="" className="profile-upload-banner" />
                      : <><Upload size={18} /><span>Upload Banner</span></>}
                  <input type="file" accept="image/*" hidden onChange={e => handleImage(e, 'banner')} disabled={uploading.banner} />
                </label>
                {form.banner && (
                  <button type="button" className="btn btn-outline btn-sm" style={{ marginTop:'0.4rem' }} onClick={() => set('banner', '')}>Remove</button>
                )}
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading || uploading.profile || uploading.banner}
              style={{ alignSelf:'flex-start', padding:'0.7rem 2rem' }}>
              <Save size={16} /> {loading ? 'Saving…' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* Read-only info */}
        <div className="seller-readonly-card">
          <h3>Account Info</h3>
          <div className="readonly-rows">
            <div className="readonly-row"><span>Username</span><code>@{seller?.username}</code></div>
            <div className="readonly-row"><span>Category</span><code>{seller?.category}</code></div>
            <div className="readonly-row"><span>Account Status</span>
              <code style={{ color: seller?.isApproved ? '#166534' : '#92400e' }}>
                {seller?.isApproved ? '✓ Approved' : '⏳ Pending Approval'}
              </code>
            </div>
          </div>
          <p style={{ fontSize:'0.78rem', color:'var(--ink-muted)', marginTop:'0.75rem' }}>
            Username and category can only be changed by the admin.
          </p>
        </div>
      </div>
    </SellerLayout>
  );
};

export default SellerProfile;
