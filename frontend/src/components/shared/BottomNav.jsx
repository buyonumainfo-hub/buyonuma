import { Link, useLocation } from 'react-router-dom';
import { Home, Store, ShoppingBag, Info, Phone, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import './BottomNav.css';

const tabs = [
  { to: '/home',         icon: Home,        label: 'Home'     },
  { to: '/sellers',  icon: Store,       label: 'Sellers'  },
  { to: '/', icon: ShoppingBag, label: 'Products' },
  { to: '/about',    icon: Info,        label: 'About'    },
  { to: '/contact',  icon: Phone,       label: 'Contact'  },
];

export default function BottomNav() {
  const { pathname } = useLocation();
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="bottom-nav">
      {tabs.map(({ to, icon: Icon, label }) => {
        const active = pathname === to;
        return (
          <Link key={to} to={to} className={`bottom-nav-item ${active ? 'active' : ''}`}>
            <span className="bottom-nav-icon"><Icon size={22} /></span>
            <span className="bottom-nav-label">{label}</span>
            {active && <span className="bottom-nav-dot" />}
          </Link>
        );
      })}
     
    </nav>
  );
}
