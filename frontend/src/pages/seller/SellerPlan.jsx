import { useState, useEffect } from 'react';
import { Rocket, Check, Package, Pin, Sparkles, MessageCircle, Phone } from 'lucide-react';
import SellerLayout from '../../components/seller/SellerLayout';
import { useSellerAuth } from '../../context/SellerAuthContext';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import './SellerPlan.css';

// Fallback contact used while Opay isn't configured on the server, so
// sellers can still pay manually and get upgraded by hand. Swap the
// number for the real admin WhatsApp line (E.164, no leading +/00 —
// wa.me wants digits only, e.g. Nigerian numbers as 234XXXXXXXXXX).
const ADMIN_WHATSAPP_NUMBER = '2349034611394';
const ADMIN_WHATSAPP_DISPLAY = '+234 903 461 1394';
const buildWhatsappLink = (planLabel) => {
  const msg = planLabel
    ? `Hi, I'd like to upgrade my BuyOnUma seller account to the ${planLabel} plan. Please help me complete payment.`
    : `Hi, I'd like to upgrade my BuyOnUma seller account. Please help me complete payment.`;
  return `https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
};

export default function SellerPlan() {
  const { seller, refreshSeller } = useSellerAuth();
  const [plans, setPlans] = useState(null); // { plans: [...], configured }
  const [upgrading, setUpgrading] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/payments/plans').then(res => setPlans(res.data)).catch(() => {}).finally(() => setLoading(false));
    // Refresh seller in case they're returning from a completed Opay checkout.
    refreshSeller?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpgrade = async (key) => {
    setUpgrading(key);
    try {
      const res = await api.post('/payments/opay/checkout', { plan: key }, { authRole: 'seller' });
      window.location.href = res.data.checkoutUrl;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not start checkout');
      setUpgrading(null);
    }
  };

  // The priciest active plan gets the "Most Popular" treatment — plans
  // are admin-managed now (see /admin/plans), so this can't be hardcoded
  // to a specific key like 'pro' anymore; the admin might rename or
  // remove it entirely.
  const priciestKey = plans?.plans?.length
    ? [...plans.plans].sort((a, b) => b.priceNGN - a.priceNGN)[0].key
    : null;

  return (
    <SellerLayout title="Plan & Upgrades">
      <div className="fade-up" style={{ maxWidth: 720 }}>
        <div className="plan-current-card">
          <div>
            <span className="plan-current-label">Current Plan</span>
            <h2>{(seller?.plan || 'free').toUpperCase()}</h2>
          </div>
          <div className="plan-current-stats">
            <span><Package size={14} /> {seller?.productLimit || 20} products</span>
            <span><Pin size={14} /> {seller?.pinLimit || 5} pins</span>
          </div>
        </div>

        {loading ? <p>Loading plans…</p> : (
          <>
            {plans && !plans.configured && (
              <div className="manual-upgrade-card">
                <div className="manual-upgrade-text">
                  <h4>Upgrades are handled manually for now</h4>
                  <p>
                    Automatic card payment isn't set up on this server yet. To upgrade,
                    message the admin on WhatsApp, make payment, and your plan will be
                    activated by hand.
                  </p>
                  <div className="manual-upgrade-contact">
                    <Phone size={14} /> {ADMIN_WHATSAPP_DISPLAY}
                  </div>
                </div>
                 <a
                  href={buildWhatsappLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-gold whatsapp-btn"
                >
                  <MessageCircle size={16} /> Chat on WhatsApp
                </a>
              </div>
            )}
            <div className="plan-grid">
              {plans?.plans?.map((def) => (
                <div key={def.key} className={`plan-card ${seller?.plan === def.key ? 'plan-card-current' : ''} ${def.key === priciestKey ? 'plan-card-featured' : ''}`}>
                  {def.key === priciestKey && <span className="plan-badge"><Sparkles size={11} /> Most Popular</span>}
                  <h3 style={{color:'whitesmoke'}}>{def.label}</h3>
                  <p className="plan-price">{def.priceNGN === 0 ? 'Free' : `₦${def.priceNGN.toLocaleString()}`}</p>
                  <ul className="plan-benefits">
                    {(def.benefits?.length ? def.benefits : [`Up to ${def.productLimit} product listings`, `Pin up to ${def.pinLimit} products`]).map(b => (
                      <li key={b}><Check size={14} /> {b}</li>
                    ))}
                  </ul>
                  {seller?.plan === def.key ? (
                    <button className="btn btn-outline" style={{ width: '100%', justifyContent: 'center', color: 'whitesmoke' }} disabled>
                      Current Plan
                    </button>
                  ) : def.key === 'free' ? (
                    <button className="btn btn-outline" style={{ width: '100%', justifyContent: 'center', color: 'whitesmoke' }} disabled>
                      Downgrade not available
                    </button>
                  ) : plans.configured ? (
                    <button
                      className="btn btn-gold"
                      style={{ width: '100%', justifyContent: 'center', color: 'whitesmoke' }}
                      disabled={upgrading === def.key}
                      onClick={() => handleUpgrade(def.key)}
                    >
                      {upgrading === def.key ? 'Redirecting…' : <><Rocket size={14} /> Upgrade</>}
                    </button>
                  ) : (
                    
                     <a href={buildWhatsappLink(def.label)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-gold"
                      style={{ width: '100%', justifyContent: 'center', color: 'whitesmoke' }}
                    >
                      <MessageCircle size={14} /> Upgrade via WhatsApp
                    </a>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </SellerLayout>
  );
}