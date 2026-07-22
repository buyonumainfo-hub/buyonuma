import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Package, Key, Clock, ArrowRight, AlertCircle, CheckCircle, BarChart3 } from 'lucide-react';
import SellerLayout from '../../components/seller/SellerLayout';
import LoadFailedModal from '../../components/seller/LoadFailedModal';
import { useSellerAuth } from '../../context/SellerAuthContext';
import api from '../../utils/api';
import './SellerDashboard.css';

const ADMIN_WA = '2349034611394';

const SellerDashboard = () => {
  const { seller } = useSellerAuth();
  const [stats, setStats]   = useState({ total: 0, active: 0 });
  const [tokenStatus, setTokenStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const fetchDashboard = useCallback(() => {
    setLoadError(false);
    Promise.all([
      api.get('/seller/products'),
      api.get('/seller/token-status')
    ]).then(([pRes, tRes]) => {
      const products = pRes.data.products || [];
      const now = new Date();
      setStats({
        total:  pRes.data?.total,
        active: products.filter(p => !p.expires_at || new Date(p.expires_at) > now).length
      });
      setTokenStatus(tRes.data);
    }).catch((err) => {
      console.error(err);
      setLoadError(true);
    }).finally(() => { setLoading(false); setRetrying(false); });
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const handleRetry = () => { setRetrying(true); fetchDashboard(); };

  const formatExpiry = (date) => {
    if (!date) return null;
    const diff = new Date(date) - new Date();
    if (diff <= 0) return 'Expired';
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    if (h >= 24) return `${Math.floor(h/24)}d ${h%24}h left`;
    return `${h}h ${m}m left`;
  };

  return (
    <SellerLayout title="Dashboard">
      {loadError && <LoadFailedModal onRetry={handleRetry} retrying={retrying} />}
      <div className="seller-dash fade-up">

        {/* Approval warning */}
        {seller && !seller.isApproved && (
          <div className="dash-alert dash-alert-warn">
            <AlertCircle size={18} />
            <div>
              <strong>Awaiting Admin Approval</strong>
               <p>Message Admin on whatsapp " 09034611394 " to approve your account or click the buuton below. </p>
              <p>Your account is under review. You can set up your store but cannot post products until approved.</p>
               <a
            href={`https://wa.me/${ADMIN_WA}?text=${encodeURIComponent(`Hi! I just registered on BuyOnUma. Please approve my seller account.\nStore: ${seller?.store_name} (@${seller?.username})`)}`}
            className="btn btn-wa btn-lg"
            target="_blank" rel="noreferrer">
            <WaIcon /> Message Admin on WhatsApp
          </a>
            </div>

          </div>
        )}

        {seller?.isApproved && (
          <div className="dash-alert dash-alert-ok">
            <CheckCircle size={18} />
            <p>Your account is <strong>approved</strong>. You can post products and redeem tokens.</p>
          </div>
        )}

        {/* Stats */}
        <div className="seller-stats-grid">
          <div className="seller-stat-card">
            <div className="seller-stat-icon"><Package size={22} /></div>
            <div>
              <p className="seller-stat-num">{loading ? '—' : stats.total}</p>
              <p className="seller-stat-label">Total Products</p>
            </div>
          </div>
          <div className="seller-stat-card">
            <div className="seller-stat-icon active"><Package size={22} /></div>
            <div>
              <p className="seller-stat-num">{loading ? '—' : stats.active}</p>
              <p className="seller-stat-label">Active / Visible</p>
            </div>
          </div>
          <div className="seller-stat-card">
            <div className="seller-stat-icon token"><Key size={22} /></div>
            <div>
              <p className="seller-stat-num" style={{ fontSize: '1rem' }}>
                {loading ? '—' : tokenStatus?.has_active_token
                  ? formatExpiry(tokenStatus.expires_at)
                  : 'No Token'}
              </p>
              <p className="seller-stat-label">Token Status</p>
            </div>
          </div>
        </div>

        {/* Token banner */}
        {!loading && !tokenStatus?.has_active_token && seller?.isApproved && (
          <div className="dash-token-banner" >
            <Key size={20} />
            <div>
              <strong style={{"color": "black"}} >No active token</strong>
              <p style={{"color": "black"}}>Your products won't show on the marketplace until you redeem a token from the admin. Get a token and redeem it to set your listing duration.</p>
            </div>
            <Link to="/seller/token" className="btn btn-gold btn-sm">
              Redeem Token <ArrowRight size={14} />
            </Link>
          </div>
        )}

        {/* Analytics teaser — full charts live on the Monitoring page */}
        <Link to="/seller/monitoring" className="dash-monitoring-teaser">
          <BarChart3 size={22} />
          <div>
            <h3>Store Analytics</h3>
            <p>See your views, WhatsApp clicks, and top products with charts</p>
          </div>
          <ArrowRight size={16} className="quick-link-arrow" />
        </Link>

        {/* Quick links */}
        <div className="dash-quick-links">
          <Link to="/seller/products" className="quick-link-card">
            <Package size={24} />
            <div>
              <h3>My Products</h3>
              <p>Add, edit and manage your listings</p>
            </div>
            <ArrowRight size={16} className="quick-link-arrow" />
          </Link>
          <Link to="/seller/token" className="quick-link-card">
            <Key size={24} />
            <div>
              <h3>Redeem Token</h3>
              <p>Enter your admin token to activate listings</p>
            </div>
            <ArrowRight size={16} className="quick-link-arrow" />
          </Link>
          <Link to="/seller/profile" className="quick-link-card">
            <Clock size={24} />
            <div>
              <h3>Edit Profile</h3>
              <p>Update store info, WhatsApp, images</p>
            </div>
            <ArrowRight size={16} className="quick-link-arrow" />
          </Link>
        </div>
      </div>
    </SellerLayout>
  );
};

const WaIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

export default SellerDashboard;
