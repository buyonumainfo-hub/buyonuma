import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ShoppingBag, Store, UserPlus } from 'lucide-react';
import { useBuyerAuth } from '../../context/BuyerAuthContext';
import { useSellerAuth } from '../../context/SellerAuthContext';
import './AuthNudgeModal.css';

const DELAY_MS = 20000;
const SESSION_KEY = 'buyonuma_auth_nudge_shown';

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
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (buyerLoading || sellerLoading) return; // wait until we actually know
    if (isBuyer || isSeller) return; // already signed in — never show
    if (sessionStorage.getItem(SESSION_KEY)) return; // already shown this session

    const timer = setTimeout(() => {
      setVisible(true);
      sessionStorage.setItem(SESSION_KEY, '1');
    }, DELAY_MS);

    return () => clearTimeout(timer);
  }, [isBuyer, isSeller, buyerLoading, sellerLoading]);

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => setVisible(false), 250); // let the exit animation finish
  };

  const goTo = (path) => { handleClose(); setTimeout(() => navigate(path), 260); };

  if (!visible) return null;

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
