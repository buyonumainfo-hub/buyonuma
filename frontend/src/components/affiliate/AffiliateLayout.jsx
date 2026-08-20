import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Wallet, User, ShoppingBag, Moon, Sun } from 'lucide-react';
import { useAffiliateAuth } from '../../context/AffiliateAuthContext';
import { useTheme } from '../../context/ThemeContext';
import AppTabBar from '../shared/AppTabBar';
import toast from 'react-hot-toast';
// Reuses the seller dashboard's tabbed-shell CSS (topbar, content padding,
// status pill, etc.) so the affiliate dashboard feels like part of the
// same app family as the seller & buyer dashboards, rather than a
// bolted-on admin panel — see SellerLayout.jsx for the pattern this mirrors.
import '../seller/SellerLayout.css';

const primaryTabs = [
  { to: '/affiliate/dashboard', icon: LayoutDashboard, label: 'Home' },
  { to: '/affiliate/referrals', icon: Users,            label: 'Sellers' },
  { to: '/affiliate/earnings',  icon: Wallet,            label: 'Earnings' },
  { to: '/affiliate/profile',   icon: User,              label: 'Profile' },
];

const AffiliateLayout = ({ children, title }) => {
  const { affiliate, logout } = useAffiliateAuth();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = () => {
    logout();
    toast.success('Signed out');
    navigate('/affiliate/login');
  };

  return (
    <div className="seller-layout seller-layout-tabbed">
      <header className="seller-topbar">
        <div className="seller-topbar-brand">
          <ShoppingBag size={18} />
          <h1 className="seller-page-title">{title}</h1>
        </div>
        <div className="seller-topbar-right">
          {affiliate && (
            <span className={`sidebar-status ${affiliate.status === 'active' ? 'approved' : 'pending'}`}>
              {affiliate.status === 'active' ? '✓ Active' : '⏳ Suspended'}
            </span>
          )}
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

      <AppTabBar items={primaryTabs} onLogout={handleLogout} />
    </div>
  );
};

export default AffiliateLayout;
