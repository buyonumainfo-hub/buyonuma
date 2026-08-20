import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Package, Settings, LogOut, Menu, X, ShoppingBag, BarChart3, Megaphone, BadgeCheck, ShieldCheck, Wallet, Tags, UserPlus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import './AdminLayout.css';

// Each nav item maps to the permission that guards its page (see
// backend/models/AdminRole.js ADMIN_PERMISSIONS + requirePermission() on
// the corresponding routes). `null` = always visible to any admin
// (Dashboard is just a summary view, nothing to gate).
const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', permission: null },
  { to: '/admin/sellers', icon: Users, label: 'Sellers', permission: 'sellers.view' },
  { to: '/admin/products', icon: Package, label: 'Products', permission: 'products.view' },
  { to: '/admin/revenue', icon: Wallet, label: 'Revenue', permission: 'payments.view' },
  { to: '/admin/plans', icon: Tags, label: 'Plans', permission: 'plans.manage' },
  { to: '/admin/affiliates', icon: UserPlus, label: 'Affiliates', permission: 'affiliates.manage' },
  { to: '/admin/monitoring', icon: BarChart3, label: 'Monitoring', permission: 'monitoring.view' },
  { to: '/admin/verification', icon: BadgeCheck, label: 'Verification', permission: 'verification.review' },
  { to: '/admin/broadcast', icon: Megaphone, label: 'Broadcast', permission: 'broadcast.send' },
  { to: '/admin/roles', icon: ShieldCheck, label: 'Roles & Team', permission: 'roles.manage' },
  { to: '/admin/settings', icon: Settings, label: 'Settings', permission: 'settings.edit' },
];

const AdminLayout = ({ children, title }) => {
  const { logout, hasPermission } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // A role with no explicit grant for a page simply doesn't see it in
  // the nav — enforced here for the UI, and server-side by
  // requirePermission() on the actual routes (so this is convenience,
  // not the real security boundary).
  const visibleItems = navItems.filter(item => !item.permission || hasPermission(item.permission));

  const handleLogout = () => {
    logout();
    toast.success('Logged out');
    navigate('/admin/login');
  };

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="admin-sidebar-header">
          <div className="admin-logo">
            <ShoppingBag size={18} />
            <div>
              <span className="admin-logo-title" style={{color: "whitesmoke"}}>UMA</span>
              <span className="admin-logo-sub">Admin Panel</span>
            </div>
          </div>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <nav className="admin-nav">
          {visibleItems.map(({ to, icon: Icon, label }) => (
            <Link
              key={to}
              to={to}
              className={`admin-nav-item ${location.pathname === to ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <button className="admin-logout" onClick={handleLogout}>
          <LogOut size={16} />
          <span>Log Out</span>
        </button>
      </aside>

      {/* Overlay */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <div className="admin-main">
        <header className="admin-topbar">
          <button className="topbar-menu" onClick={() => setSidebarOpen(true)}>
            <Menu size={20} />
          </button>
          <h1 className="admin-page-title">{title}</h1>
          <div className="topbar-right">
            <span className="admin-badge">Admin</span>
          </div>
        </header>

        <main className="admin-content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;