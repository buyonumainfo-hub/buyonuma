import { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import './AdminSettings.css';

const AdminSettings = () => {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [show, setShow] = useState({ current: false, new: false, confirm: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (form.newPassword !== form.confirmPassword) {
      return setError('New passwords do not match');
    }
    if (form.newPassword.length < 6) {
      return setError('New password must be at least 6 characters');
    }

    setLoading(true);
    try {
      await api.put('/auth/change-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword
      });
      setSuccess('Password changed successfully!');
      toast.success('Password updated!');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const toggle = (field) => setShow(s => ({ ...s, [field]: !s[field] }));
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <AdminLayout title="Settings">
      <div className="settings-page fade-up">
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-icon">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h2>Change Admin Password</h2>
              <p>Update your admin panel login password</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="settings-form">
            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <div className="form-group">
              <label className="form-label">Current Password</label>
              <div className="input-icon-wrap">
                <Lock size={15} className="input-icon" />
                <input
                  type={show.current ? 'text' : 'password'}
                  className="form-control"
                  value={form.currentPassword}
                  onChange={e => set('currentPassword', e.target.value)}
                  required
                  style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                />
                <button type="button" className="input-icon-right" onClick={() => toggle('current')}>
                  {show.current ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">New Password</label>
              <div className="input-icon-wrap">
                <Lock size={15} className="input-icon" />
                <input
                  type={show.new ? 'text' : 'password'}
                  className="form-control"
                  value={form.newPassword}
                  onChange={e => set('newPassword', e.target.value)}
                  required
                  minLength={6}
                  style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                />
                <button type="button" className="input-icon-right" onClick={() => toggle('new')}>
                  {show.new ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <div className="input-icon-wrap">
                <Lock size={15} className="input-icon" />
                <input
                  type={show.confirm ? 'text' : 'password'}
                  className="form-control"
                  value={form.confirmPassword}
                  onChange={e => set('confirmPassword', e.target.value)}
                  required
                  style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                />
                <button type="button" className="input-icon-right" onClick={() => toggle('confirm')}>
                  {show.confirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ alignSelf: 'flex-start', padding: '0.7rem 2rem' }}>
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>

        <div className="settings-info-card">
          <h3>Admin Panel Info</h3>
          <div className="info-rows">
            <div className="info-row">
              <span>Default Username</span>
              <code>admin</code>
            </div>
            <div className="info-row">
              <span>Default Password</span>
              <code>admin123</code>
            </div>
            <div className="info-row">
              <span>Session Duration</span>
              <code>24 hours</code>
            </div>
            <div className="info-row">
              <span>Access Level</span>
              <code>Single Admin</code>
            </div>
          </div>
          <p className="info-note">⚠️ Change the default password immediately after first login for security.</p>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;
