import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, Store, Sun, Moon, User, ChevronDown, LayoutDashboard, LogIn } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useCart } from '../../context/CartContext';
import { useBuyerAuth } from '../../context/BuyerAuthContext';
import { useSellerAuth } from '../../context/SellerAuthContext';
import './Navbar.css';

const Navbar = () => {
  const loc = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { totalItems } = useCart();
  const { isAuthenticated: isBuyerAuthenticated } = useBuyerAuth();
  const { isAuthenticated: isSellerAuthenticated } = useSellerAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const desktopLinks = [
    { to: '/home', label: 'Home' },
    { to: '/sellers', label: 'Sellers' },
    { to: '/', label: 'Products' },
    { to: '/about', label: 'About' },
    { to: '/contact', label: 'Contact' },
    { to: '/developer', label: 'Developer' },
  ];

  // Close the account dropdown on outside click or route change.
  useEffect(() => {
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);
  useEffect(() => { setMenuOpen(false); }, [loc.pathname]);

  return (
    <nav className="navbar">
      <div className="container navbar-inner">
        {/* Brand */}
        <Link to="/" className="navbar-brand">
          <img src="/icons/icon-96x96.png" alt="logo" className="logo" />
          <span className="brand-text">
            <span className="brand-buy">Buy</span><span className="brand-uma">OnUma </span>
          </span>
        </Link>

        {/* Desktop nav links (hidden on mobile) */}
        <div className="navbar-links desktop-only">
          {desktopLinks.map(l => (
            <Link key={l.to} to={l.to}
              className={`nav-link ${loc.pathname === l.to ? 'active' : ''}`}>
              {l.label}
            </Link>
          ))}
        </div>

        {/* Right side actions */}
        <div className="navbar-actions">
          {/* Desktop: full pill buttons, always visible */}
          <div className="account-links desktop-only">
            {!isSellerAuthenticated && (
              <Link to="/become-a-seller" className="action-btn">
                <Store size={16} /><span>Sell</span>
              </Link>
            )}
            <Link to={isSellerAuthenticated ? '/seller/dashboard' : '/seller/login'} className="action-btn">
              <User size={16} /><span>{isSellerAuthenticated ? 'Dashboard' : 'Seller Login'}</span>
            </Link>
            <Link to={isBuyerAuthenticated ? '/buyer/dashboard' : '/buyer/login'} className="action-btn">
              <User size={16} /><span>{isBuyerAuthenticated ? 'My Account' : 'Buy'}</span>
            </Link>
          </div>

          {/* Mobile: single Account dropdown replaces the three buttons above */}
          <div className="account-menu mobile-only" ref={menuRef}>
            <button
              className="icon-btn account-trigger"
              onClick={() => setMenuOpen(o => !o)}
              aria-label="Account menu"
              aria-expanded={menuOpen}
            >
              <User size={16} />
              <ChevronDown size={12} className={`chevron ${menuOpen ? 'open' : ''}`} />
            </button>

            {menuOpen && (
              <div className="account-dropdown">
                {!isSellerAuthenticated && (
                  <Link to="/become-a-seller" className="dropdown-item">
                    <Store size={16} /><span>Become a Seller</span>
                  </Link>
                )}
                <Link to={isSellerAuthenticated ? '/seller/dashboard' : '/seller/login'} className="dropdown-item">
                  {isSellerAuthenticated ? <LayoutDashboard size={16} /> : <LogIn size={16} />}
                  <span>{isSellerAuthenticated ? 'Seller Dashboard' : 'Seller Login'}</span>
                </Link>
                <Link to={isBuyerAuthenticated ? '/buyer/dashboard' : '/buyer/login'} className="dropdown-item">
                  {isBuyerAuthenticated ? <User size={16} /> : <LogIn size={16} />}
                  <span>{isBuyerAuthenticated ? 'Buyer Dashboard' : 'Buyer Login'}</span>
                </Link>
              </div>
            )}
          </div>

          <Link to="/cart" className="icon-btn cart-nav-btn" aria-label="View cart">
            <ShoppingCart size={18} />
            {totalItems > 0 && <span className="cart-nav-badge">{totalItems > 99 ? '99+' : totalItems}</span>}
          </Link>

          <button
            className="icon-btn"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;