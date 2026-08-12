import { useState } from 'react';
import { Mail, Sun, Moon, Monitor, Rocket, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import SellerLayout from '../../components/seller/SellerLayout';
import { useSellerAuth } from '../../context/SellerAuthContext';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export default function SellerSettings() {
  const { seller, refreshSeller } = useSellerAuth();
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);
  const [themePref, setThemePref] = useState(seller?.themePreference || 'system');

  const handleEmailChange = async (e) => {
    e.preventDefault();
    setSavingEmail(true);
    try {
      await api.put('/sellers/settings/email', { email, currentPassword }, { authRole: 'seller' });
      toast.success('Email updated');
      setEmail(''); setCurrentPassword('');
      refreshSeller?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update email');
    } finally { setSavingEmail(false); }
  };

  const handleThemeChange = async (value) => {
    setThemePref(value);
    try {
      await api.put('/sellers/settings/theme-preference', { themePreference: value }, { authRole: 'seller' });
      toast.success('Preference saved');
    } catch (err) {
      toast.error('Failed to save theme preference');
    }
  };

  return (
    <SellerLayout title="Settings">
      <div className="seller-dash fade-up" style={{ display: 'grid', gap: '1.5rem', maxWidth: 560 }}>

        <div className="card" style={{ padding: '1.25rem' }}>
          <h3 style={{ marginBottom: '0.25rem' }}><Mail size={15} style={{ verticalAlign: 'middle' }} /> Change Email</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', marginBottom: '1rem' }}>Current: {seller?.email}</p>
          {!seller?.password ? (
            <p style={{ fontSize: '0.82rem', color: 'var(--ink-muted)' }}>
              Your account uses Google sign-in and has no password, so email changes aren't available yet from here.
            </p>
          ) : (
            <form onSubmit={handleEmailChange}>
              <div className="form-group">
                <label className="form-label">New Email</label>
                <input type="email" className="form-control" required value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <input type="password" className="form-control" required value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
              </div>
              <button className="btn btn-primary btn-sm" type="submit" disabled={savingEmail}>{savingEmail ? 'Saving…' : 'Update Email'}</button>
            </form>
          )}
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <h3 style={{ marginBottom: '0.75rem' }}>Theme</h3>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {[
              { key: 'light', icon: Sun, label: 'Light' },
              { key: 'dark', icon: Moon, label: 'Dark' },
              { key: 'system', icon: Monitor, label: 'System' },
            ].map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => handleThemeChange(key)}
                className={`btn btn-sm ${themePref === key ? 'btn-primary' : 'btn-outline'}`}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>
        </div>

        <Link to="/seller/plan" className="card" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
          <div>
            <h3 style={{ marginBottom: '0.25rem' }}><Rocket size={15} style={{ verticalAlign: 'middle' }} /> Plan &amp; Upgrades</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', margin: 0 }}>
              You're on the <strong>{seller?.plan || 'free'}</strong> plan — {seller?.productLimit || 50} products, {seller?.pinLimit || 5} pins.
            </p>
          </div>
          <ChevronRight size={18} />
        </Link>
      </div>
    </SellerLayout>
  );
}
