import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, ShoppingCart, Store, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useCart } from '../../context/CartContext';
import './Navbar.css';

const Navbar = () => {
  const loc = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { totalItems } = useCart();

  const desktopLinks = [
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
        {/* Brand */}
        <Link to="/" className="navbar-brand">
        <img src="/icons/icon-96x96.png" alt="logo" className='logo' />
        {window.innerWidth >=638 && 
          <span className="brand-text">
            <span className="brand-buy">Buy</span><span className="brand-uma">OnUma </span>
          </span>
}
        </Link>

        {/* Desktop nav links (hidden on mobile — bottom nav takes over) */}
        <div className="navbar-links desktop-only">
          {desktopLinks.map(l => (
            <Link key={l.to} to={l.to}
              className={`nav-link ${loc.pathname === l.to ? 'active' : ''}`}>
              {l.label}
            </Link>
          ))}
         
        </div>

        {/* Right side actions — always visible */}
        <div className="navbar-actions">
          {/* Sell Here shortcut — mobile only */}
          <Link to="/become-a-seller" className="btn btn-outline btn-sm mobile-sell-btn">
            <Store size={14}/> Sell
          </Link>
           <Link to="/seller/login" className="btn btn-outline btn-sm mobile-sell-btn">Seller Login</Link>
          <Link to="/cart" className="theme-toggle cart-nav-btn" aria-label="View cart">
            <ShoppingCart size={17} />
            {totalItems > 0 && <span className="cart-nav-badge">{totalItems > 99 ? '99+' : totalItems}</span>}
          </Link>
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
