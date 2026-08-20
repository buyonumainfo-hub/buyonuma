import { useState, useEffect } from 'react';
import { useNavigate,Link } from 'react-router-dom';

import {
  LayoutDashboard, Package, Key, User, Moon, Sun, LogOut, ShoppingBag, Bell,
  BadgeCheck, BarChart3, Store, MessageCircle, Settings, Rocket, Users, ShoppingCart,
} from 'lucide-react';
import { useSellerAuth } from '../../context/SellerAuthContext';
import { useTheme } from '../../context/ThemeContext';
import AppTabBar from '../shared/AppTabBar';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import './SellerLayout.css';

// Primary tabs — kept to 4 so they fit comfortably in a thumb-reachable
// bottom bar, plus the marketplace's own public "Products" and "Sellers"
// pages so a seller can jump straight into browsing the marketplace
// without leaving the app shell (mirrors the buyer tab bar — see
// BuyerDashboard.jsx).
const primaryTabs = (unread) => [
  { to: '/seller/dashboard', icon: LayoutDashboard, label: 'Home' },
  { to: '/seller/products',  icon: Package,         label: 'Products' },
  { to: '/', icon: ShoppingCart, label: 'Marketplace' },
  { to: '/sellers', icon: Users, label: 'Sellers' },
  { to: '/seller/messages',  icon: MessageCircle,   label: 'Messages', badge: unread },
];

const moreTabs = [
  { to: '/seller/store',        icon: Store,       label: 'My Store' },
  { to: '/seller/plan',         icon: Rocket,       label: 'Plan' },
  { to: '/seller/monitoring',   icon: BarChart3,    label: 'Monitoring' },
  { to: '/seller/token',        icon: Key,          label: 'Redeem Token' },
  { to: '/seller/notifications',icon: Bell,         label: 'Notifications' },
  { to: '/seller/verification', icon: BadgeCheck,   label: 'Verified Badge' },
  { to: '/seller/profile',      icon: User,         label: 'Profile' },
  { to: '/seller/settings',     icon: Settings,      label: 'Settings' },
];

const SellerLayout = ({ children, title }) => {
  const { seller, logout } = useSellerAuth();
  const navigate  = useNavigate();
  const [unread, setUnread] = useState(0);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const fetchUnread = () => {
      api.get('/notifications/seller', { params: { limit: 1 } })
        .then(res => setUnread(res.data.unreadCount - 1 || 0))
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
    <div className="seller-layout seller-layout-tabbed">
      <header className="seller-topbar">
        <div className="seller-topbar-brand">
          <ShoppingBag size={18} />
          <h1 className="seller-page-title">{title}</h1>
        </div>
        <div className="seller-topbar-right">
          {seller && (
            <span className={`sidebar-status ${seller.isApproved ? 'approved' : 'pending'}`}>
              {seller.isApproved ? '✓ Approved' : '⏳ Pending'}
            </span>
          )}
          
          <Link
            to="/seller/notifications"
            className="seller-notifications-btn theme-toggle"
            aria-label="View notifications"
          >
             { unread > 0 && (
                <span className="seller-nav-badge">{unread > 99 ? '99+' : unread}</span>
              )}
           <Bell size={17}/>
          </Link>
          
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </div>
      </header>

      <main className="seller-content seller-content-tabbed">{children}</main>

      <AppTabBar items={primaryTabs(unread)} moreItems={moreTabs} onLogout={handleLogout} />
    </div>
  );
};

export default SellerLayout;
