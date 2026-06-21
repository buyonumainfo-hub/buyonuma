import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ShoppingBag, Store, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import './Navbar.css';

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const close = () => setOpen(false);
  const { theme, toggleTheme } = useTheme();
  const links = [
    { to:'/home', label:'Home' },
    { to:'/sellers', label:'Sellers' },
    { to:'/', label:'Products' },
    { to:'/about', label:'About' },
    { to:'/contact', label:'Contact' },
    { to:'/developer', label:'Developer' },
  ];
  return (
    <nav className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="navbar-brand" onClick={close}>
          <img src="/icons/icon-96x96.png" alt="logo" />
          <span className="brand-text"><span className="brand-buy">Buy</span><span className="brand-uma">OnUma</span></span>
          <span className="brand-sub">Market</span>
        </Link>
        <div className={`navbar-links ${open ? 'open' : ''}`}>
          {links.map(l => (
            <Link key={l.to} to={l.to} className={`nav-link ${loc.pathname === l.to ? 'active' : ''}`} onClick={close}>{l.label}</Link>
          ))}
          <Link to="/become-a-seller" className="btn btn-outline btn-sm" onClick={close}><Store size={14}/> Sell Here</Link>
          <Link to="/seller/login" className="btn btn-outline btn-sm" onClick={close}>Seller Login</Link>
        
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </div>
        <div className="navbar-mobile-actions">
          <button
            className="theme-toggle-p theme-toggle-mobile"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <button className="navbar-toggle" onClick={() => setOpen(!open)}>{open ? <X size={22}/> : <Menu size={22}/>}</button>
        </div>
      </div>
    </nav>
  );
};
export default Navbar;
