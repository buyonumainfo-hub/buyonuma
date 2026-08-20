import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, ShoppingBag, Store, UserPlus } from 'lucide-react';
import { useBuyerAuth } from '../../context/BuyerAuthContext';
import { useSellerAuth } from '../../context/SellerAuthContext';
import './AuthNudgeModal.css';

const DELAY_MS = 20000;
const SESSION_KEY = 'buyonuma_auth_nudge_shown';

// Routes where the nudge should never appear — auth pages already ask the
// visitor to sign in/up, so popping this over them is redundant and just
// gets in the way.
const EXCLUDED_PATHS = [
  '/buyer/login', '/buyer/register',
  '/seller/login', '/seller/register',
];

/**
 * Soft sign-in nudge for anonymous visitors — appears once, 20 seconds
 * into a session, only if the visitor isn't logged in as either a buyer
 * or a seller. Shown at most once per browser tab session (sessionStorage
 * flag) so it doesn't hound someone who already dismissed it while
 * browsing multiple pages.
 */
export default function AuthNudgeModal() {
  const { isAuthenticated: isBuyer, loading: buyerLoading } = useBuyerAuth();
  const { isAuthenticated: isSeller, loading: sellerLoading } = useSellerAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  const isExcludedPath = EXCLUDED_PATHS.includes(location.pathname);

  useEffect(() => {
    if (buyerLoading || sellerLoading) return; // wait until we actually know
    if (isBuyer || isSeller) return; // already signed in — never show
    if (isExcludedPath) return; // never show on auth pages
    if (sessionStorage.getItem(SESSION_KEY)) return; // already shown this session

    const timer = setTimeout(() => {
      setVisible(true);
      sessionStorage.setItem(SESSION_KEY, '1');
    }, DELAY_MS);

    return () => clearTimeout(timer);
  }, [isBuyer, isSeller, buyerLoading, sellerLoading, isExcludedPath]);

  // If the visitor navigates into an auth page while the nudge happens to
  // already be open, close it immediately rather than leaving it floating
  // over the sign-in/register form.
  useEffect(() => {
    if (isExcludedPath) {
      setVisible(false);
      setClosing(false);
    }
  }, [isExcludedPath]);

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => setVisible(false), 250); // let the exit animation finish
  };

  const goTo = (path) => { handleClose(); setTimeout(() => navigate(path), 260); };

  if (!visible || isExcludedPath) return null;

  return (
    <div className={`auth-nudge-overlay ${closing ? 'closing' : ''}`} onClick={handleClose}>
      <div className={`auth-nudge-sheet ${closing ? 'closing' : ''}`} onClick={e => e.stopPropagation()}>
        <button className="auth-nudge-close" onClick={handleClose} aria-label="Dismiss"><X size={18} /></button>

        <div className="auth-nudge-icon"><ShoppingBag size={26} /></div>
        <h3>Get the most out of BuyOnUma</h3>
        <p>Sign in to message sellers, save your favorites, and get picks tailored to you.</p>

        <div className="auth-nudge-actions">
          <button className="auth-nudge-btn auth-nudge-btn-buyer" onClick={() => goTo('/buyer/login')}>
            <ShoppingBag size={16} /> Continue as Buyer
          </button>
          <button className="auth-nudge-btn auth-nudge-btn-seller" onClick={() => goTo('/seller/login')}>
            <Store size={16} /> Continue as Seller
          </button>
        </div>
        <button className="auth-nudge-create" onClick={() => goTo('/buyer/register')}>
          <UserPlus size={14} /> New here? Create an account
        </button>
        <button className="auth-nudge-skip" onClick={handleClose}>Maybe later</button>
      </div>
    </div>
  );
}
