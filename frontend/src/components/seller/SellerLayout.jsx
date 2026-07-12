import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, Key, User, LogOut, Menu, X, ShoppingBag, Bell, BadgeCheck, BarChart3 } from 'lucide-react';
import { useSellerAuth } from '../../context/SellerAuthContext';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import './SellerLayout.css';

const navItems = [
  { to: '/seller/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/seller/products',  icon: Package,         label: 'My Products' },
  { to: '/seller/monitoring',    icon: BarChart3,   label: 'Monitoring' },
  { to: '/seller/token',     icon: Key,             label: 'Redeem Token' },
  { to: '/seller/notifications', icon: Bell,        label: 'Notifications', badgeKey: 'unread' },
  { to: '/seller/verification',  icon: BadgeCheck,  label: 'Verified Badge' },
  { to: '/seller/profile',   icon: User,            label: 'Profile' },
];

const SellerLayout = ({ children, title }) => {
  const { seller, logout } = useSellerAuth();
  const location = useLocation();
  const navigate  = useNavigate();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    // Poll unread notification count periodically so the sidebar badge
    // stays reasonably fresh without needing a websocket connection.
    const fetchUnread = () => {
      api.get('/notifications/seller', { params: { limit: 1 } })
        .then(res => setUnread(res.data.unreadCount || 0))
        .catch(() => {});
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    toast.success('Signed out');
    navigate('/seller/login');
  };

  return (
    <div className="seller-layout">
      <aside className={`seller-sidebar ${open ? 'open' : ''}`}>
        <div className="seller-sidebar-header">
          <div className="seller-sidebar-brand">
            <ShoppingBag size={18} />
            <div>
              <span className="sidebar-brand-title" style={{color: "whitesmoke"}}>UMA</span>
              <span className="sidebar-brand-sub" >Seller Panel</span>
            </div>
          </div>
          <button className="sidebar-close-btn" onClick={() => setOpen(false)}><X size={18} /></button>
        </div>

        {seller && (
          <div className="seller-sidebar-profile">
            {seller.profile_picture
              ? <img src={seller.profile_picture} alt={seller.store_name} />
              : <div className="seller-sidebar-avatar">{seller.store_name?.[0]?.toUpperCase()}</div>
            }
            <div>
              <p style={{color: "whitesmoke"}} className="sidebar-store-name">{seller.store_name}</p>
              <span className={`sidebar-status ${seller.isApproved ? 'approved' : 'pending'}`}>
                {seller.isApproved ? '✓ Approved' : '⏳ Pending Approval'}
              </span>
            </div>
          </div>
        )}

        <nav className="seller-nav">
          {navItems.map(({ to, icon: Icon, label, badgeKey }) => (
            <Link key={to} to={to}
              className={`seller-nav-item ${location.pathname === to ? 'active' : ''}`}
              onClick={() => setOpen(false)}>
              <Icon size={18} /><span>{label}</span>
              {badgeKey === 'unread' && unread > 0 && (
                <span className="seller-nav-badge">{unread > 99 ? '99+' : unread}</span>
              )}
            </Link>
          ))}
        </nav>

        <button className="seller-logout" onClick={handleLogout}>
          <LogOut size={16} /><span>Sign Out</span>
        </button>
      </aside>

      {open && <div className="seller-overlay" onClick={() => setOpen(false)} />}

      <div className="seller-main">
        <header className="seller-topbar">
          <button className="topbar-menu-btn" onClick={() => setOpen(true)}><Menu size={20} /></button>
          <h1 className="seller-page-title">{title}</h1>
          <span className="seller-topbar-badge">Seller</span>
        </header>
        <main className="seller-content">{children}</main>
      </div>
    </div>
  );
};

export default SellerLayout;
