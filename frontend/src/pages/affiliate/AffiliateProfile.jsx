import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AffiliateLayout from '../../components/affiliate/AffiliateLayout';
import { useAffiliateAuth } from '../../context/AffiliateAuthContext';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export default function AffiliateProfile() {
  const { affiliate, refreshAffiliate, logout } = useAffiliateAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: affiliate?.name || '', phone: affiliate?.phone || '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '' });
  const [saving, setSaving] = useState(false);
  const [changingPw, setChangingPw] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/affiliate-auth/profile', form, { authRole: 'affiliate' });
      await refreshAffiliate();
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally { setSaving(false); }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setChangingPw(true);
    try {
      await api.put('/affiliate-auth/settings/password', pwForm, { authRole: 'affiliate' });
      toast.success('Password updated');
      setPwForm({ currentPassword: '', newPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update password');
    } finally { setChangingPw(false); }
  };

  const handleLogout = () => {
    logout();
    toast.success('Signed out');
    navigate('/affiliate/login');
  };

  return (
    <AffiliateLayout title="Profile">
      <div className="fade-up" style={{ maxWidth: 420, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <form onSubmit={handleSave}>
          <h3 style={{ marginBottom: '1rem' }}>Your Details</h3>
          <div className="form-group">
            <label className="form-label">Name</label>
            <input className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Phone / WhatsApp</label>
            <input className="form-control" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-control" value={affiliate?.email || ''} disabled />
          </div>
          <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
        </form>

        <form onSubmit={handleChangePassword}>
          <h3 style={{ marginBottom: '1rem' }}>Change Password</h3>
          <div className="form-group">
            <label className="form-label">Current Password</label>
            <input type="password" className="form-control" required value={pwForm.currentPassword} onChange={e => setPwForm({ ...pwForm, currentPassword: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">New Password</label>
            <input type="password" className="form-control" required minLength={6} value={pwForm.newPassword} onChange={e => setPwForm({ ...pwForm, newPassword: e.target.value })} />
          </div>
          <button className="btn btn-outline" type="submit" disabled={changingPw}>{changingPw ? 'Updating…' : 'Update Password'}</button>
        </form>

        <button className="btn btn-danger" style={{ alignSelf: 'flex-start' }} onClick={handleLogout}>Log Out</button>
      </div>
    </AffiliateLayout>
  );
}
