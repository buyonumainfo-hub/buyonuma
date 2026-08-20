import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { MessageCircle, User, LogOut, Info, Phone, Code, ShoppingCart, Users,  Sun, Moon } from 'lucide-react';
import { useBuyerAuth } from '../../context/BuyerAuthContext';
import MessagesPanel from '../../components/messaging/MessagesPanel';
import AppTabBar from '../../components/shared/AppTabBar';
import api from '../../utils/api';
import { useTheme } from '../../context/ThemeContext';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import './BuyerDashboard.css';
import Nav from './nav'

function MessagesTab() {
  return <MessagesPanel authRole="buyer" myUnreadKey="buyerUnread" />;
}

function ProfileTab() {
  const { buyer, refreshBuyer } = useBuyerAuth();
  const [form, setForm] = useState({ name: buyer?.name || '', phone: buyer?.phone || '', state: buyer?.state || '', city: buyer?.city || '' });
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/buyer-auth/profile', form, { authRole: 'buyer' });
      await refreshBuyer();
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSave} style={{ maxWidth: 420 }}>
      <div className="form-group">
        <label className="form-label">Name</label>
        <input className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
      </div>
      <div className="form-group">
        <label className="form-label">Phone</label>
        <input className="form-control" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
      </div>
      <div className="form-group">
        <label className="form-label">Email</label>
        <input className="form-control" value={buyer?.email} disabled />
        <span style={{ fontSize: '0.72rem', color: 'var(--ink-muted)' }}>
          {buyer?.hasPassword ? 'Change your email from Settings.' : 'Signed in with Google.'}
        </span>
      </div>
      <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>

      <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.85rem' }}>
        <Link to="/about"><Info size={14} style={{ verticalAlign: 'middle' }} /> About</Link>
        <Link to="/contact"><Phone size={14} style={{ verticalAlign: 'middle' }} /> Contact</Link>
        <Link to="/developer"><Code size={14} style={{ verticalAlign: 'middle' }} /> Developer</Link>
      </div>
    </form>
  );
}

export default function BuyerDashboard() {
   const { theme, toggleTheme } = useTheme();
  const { buyer, isAuthenticated, loading, logout } = useBuyerAuth();
  const [tab, setTab] = useState('Messages');
  const navigate = useNavigate();

  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/buyer/login" replace />;

  const handleLogout = () => { logout(); navigate('/'); };

  const primaryTabs = [
    { to: '/', icon: ShoppingCart, label: 'Marketplace', onClick: () =>{ 
      navigate('/') 
       setTab('home')} },
    { to: '/sellers', icon: Users, label: 'Sellers', onClick: () => navigate('/sellers') },
    { to: 'Messages', icon: MessageCircle, label: 'Messages', onClick: () => setTab('Messages') },
    { to: 'Profile', icon: User, label: 'Profile', onClick: () => setTab('Profile') },
  ];
  const moreTabs = [
    { to: '/about', icon: Info, label: 'About' },
    { to: '/contact', icon: Phone, label: 'Contact' },
    { to: '/developer', icon: Code, label: 'Developer' },
  ];

  return (
    <div className="buyer-dash">
      <div className="buyer-dash-header">
        <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun size={12} /> : <Moon size={12} />}
          </button>  <br /> <span>Hi, {buyer?.name?.split(' ')[0]} 👋
          </span>
           
      </div>
      <div className="buyer-dash-body">
        {tab === 'Messages' ? <MessagesTab /> : <ProfileTab />}
      </div>
      {/* <AppTabBar items={primaryTabs} moreItems={moreTabs} onLogout={handleLogout} activeOverride={tab} /> */}
      <Nav tab={tab} setTab={setTab}/>
    </div>
  );
}
