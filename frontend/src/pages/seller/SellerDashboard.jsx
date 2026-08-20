import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Package, Key, ArrowRight, AlertCircle, CheckCircle, BarChart3, Copy, Check, Eye, Store, Rocket, MessageCircle, BadgeCheck, User, Settings } from 'lucide-react';
import SellerLayout from '../../components/seller/SellerLayout';
import LoadFailedModal from '../../components/seller/LoadFailedModal';
import { useSellerAuth } from '../../context/SellerAuthContext';
import api from '../../utils/api';
import './SellerDashboard.css';

const ADMIN_WA = '+2349034611394';

// Quick-action tiles for the app-style grid. `tint` maps to a color
// chip defined in SellerDashboard.css (keeps the icon palette
// intentional/categorized rather than random per-tile colors).
const QUICK_ACTIONS = [
  { to: '/seller/products',     icon: Package,       label: 'Products',      tint: 'gold' },
  { to: '/seller/store',        icon: Store,         label: 'My Store',      tint: 'teal' },
  { to: '/seller/plan',         icon: Rocket,        label: 'Plan',          tint: 'coral' },
  { to: '/seller/messages',     icon: MessageCircle, label: 'Messages',      tint: 'whatsapp' },
  { to: '/seller/monitoring',   icon: BarChart3,     label: 'Monitoring',    tint: 'teal' },
  { to: '/seller/token',        icon: Key,           label: 'Token',         tint: 'gold' },
  { to: '/seller/verification', icon: BadgeCheck,    label: 'Verified Badge',tint: 'teal' },
  { to: '/seller/profile',      icon: User,          label: 'Profile',       tint: 'muted' },
  { to: '/seller/settings',     icon: Settings,       label: 'Settings',     tint: 'muted' },
];

// Purely decorative growth motif for the analytics teaser — not real
// data (the real chart lives on /seller/monitoring), just a visual cue
// that there's something worth looking at there.
const TEASER_BARS = [38, 52, 44, 68, 58, 82, 71];

const SellerDashboard = () => {
  const { seller } = useSellerAuth();
  const [stats, setStats]   = useState({ total: 0, active: 0 });
  const [tokenStatus, setTokenStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [copied, setCopied] = useState(false);

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

console.log('SellerDashboard render', { seller, stats, tokenStatus, loading, loadError });

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

  const storeUrl = seller?.username
    ? `www.buyonuma.shop/${seller.username}`
    : null;

  const handleCopyProfile = async () => {
    if (!storeUrl) return;
    try {
      await navigator.clipboard.writeText(storeUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed', err);
    }
  };
  const handleCopyContact = async () => {
    if (!storeUrl) return;
    try {
      await navigator.clipboard.writeText(ADMIN_WA);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed', err);
    }
  };

  const hasToken = !!tokenStatus?.has_active_token;
  const planName = (seller?.plan || 'free').toUpperCase();
  const isPro = seller?.plan === 'pro';
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening';

  const statCards = [
    { icon: Package,     tint: 'gold', value: loading ? '—' : stats.total, label: 'Total products' },
    { icon: CheckCircle, tint: 'teal', value: loading ? '—' : stats.active, label: 'Active & visible' },
    {
      icon: Key,
      tint: hasToken ? 'teal' : 'coral',
      value: loading ? '—' : hasToken ? formatExpiry(tokenStatus.expires_at) : 'No token',
      label: 'Token status',
      small: true,
    },
  ];

  return (
    <SellerLayout title="Dashboard">
      {loadError && <LoadFailedModal onRetry={handleRetry} retrying={retrying} />}
      <div className="seller-dash fade-up">

         {/* Header */}
        <div className="dash-header">
          <div>
            <p className="dash-eyebrow">{greeting}</p>
            <h1 className="dash-title">{seller?.store_name || 'Your store'}</h1>
          </div>
          <span className={`dash-status-pill ${seller?.isApproved ? 'is-ok' : 'is-pending'}`}>
            {seller?.isApproved ? <CheckCircle size={13} /> : <AlertCircle size={13} />}
            {seller?.isApproved ? 'Approved' : 'Pending review'}
          </span>
        </div>

            {/* Approval CTA — the one thing that blocks selling, so it stays
            prominent until resolved. Once approved this whole block is
            gone; status lives quietly in the pill above instead. */}
        {seller && !seller.isApproved && (
          <div className="dash-alert" style={{ display: 'grid', alignItems: 'flex-start', gap: '0.85rem' }}>
            <AlertCircle size={18} />
            <div>
              <strong>Awaiting admin approval</strong>
              <p>You can set up your store, but products won't be visible until an admin approves your account.</p>
              <p>Message the admin on whatsapp for Approval</p>
              <div className="dash-ticket-actions">
                {`${ADMIN_WA}`}
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={handleCopyContact}
                disabled={!storeUrl}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy contact'}
              </button>
              </div>
            </div>
            <a
              href={`https://wa.me/${ADMIN_WA}?text=${encodeURIComponent(`Hi! I just registered on BuyOnUma. Please approve my seller account.\nStore: ${seller?.store_name} (@${seller?.username})`)}`}
              className="btn btn-wa"
              target="_blank" rel="noreferrer">
              <WaIcon /> Message admin
            </a>
          </div>
        )}
        
           {/* Hero: store pass + plan */}
        <div className="dash-hero">
           <Link to="/seller/plan" className="dash-plan">
            <span className={`dash-plan-badge ${isPro ? 'is-pro' : ''}`}>{planName} PLAN</span>
            <p className="dash-plan-limits">{seller?.productLimit || 20} products &middot; {seller?.pinLimit || 5} pins</p>
            <span className="dash-plan-cta">
              {isPro ? 'Manage plan' : 'Upgrade plan'} <ArrowRight size={14} />
            </span>
          </Link>
          
          <div className="dash-ticket">
            <div className="dash-ticket-top">
              <span className="dash-ticket-icon"><Store size={20} /></span>
              <span className="dash-ticket-eyebrow">Store pass</span>
            </div>
            <p className="dash-ticket-name">{seller?.store_name || 'Unnamed store'}</p>
            <div className="dash-ticket-divider" />
            <p className="dash-ticket-url">{storeUrl || 'Set a username to get your store link'}</p>
            <div className="dash-ticket-actions">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={handleCopyProfile}
                disabled={!storeUrl}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy link'}
              </button>
              <a
                href={storeUrl ? `https://${storeUrl}` : '#'}
                target="_blank"
                rel="noreferrer"
                className={`btn btn-gold btn-sm${!storeUrl ? ' btn-disabled' : ''}`}
                onClick={(e) => { if (!storeUrl) e.preventDefault(); }}
              >
                <Eye size={14} /> View store
              </a>
            </div>
          </div>
        </div>

       

        {/* Quick actions */}
        <p className="dash-section-label">Quick actions</p>
        <div className="dash-grid">
          {QUICK_ACTIONS.map(({ to, icon: Icon, label, tint }) => (
            <Link key={to} to={to} className="dash-tile">
              <span className={`dash-chip tint-${tint}`}><Icon size={20} /></span>
              <span className="dash-tile-label">{label}</span>
            </Link>
          ))}
        </div>

        {/* Analytics teaser */}
        <Link to="/seller/monitoring" className="dash-teaser">
          <div className="dash-teaser-bars" aria-hidden="true">
            {TEASER_BARS.map((h, i) => <span key={i} style={{ '--h': `${h}%` }} />)}
          </div>
          <div className="dash-teaser-copy">
            <h3>Store analytics</h3>
            <p>Views, WhatsApp clicks and your top products, charted</p>
          </div>
          <ArrowRight size={16} />
        </Link>
       

     
        {/* Stat strip */}
        <div className="dash-stats">
          {statCards.map(({ icon: Icon, tint, value, label, small }) => (
            <div className="dash-stat" key={label}>
              <span className={`dash-chip tint-${tint}`}><Icon size={18} /></span>
              <div>
                <p className={`dash-stat-value ${small ? 'is-small' : ''} ${loading ? 'is-loading' : ''}`}>{value}</p>
                <p className="dash-stat-label">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Token CTA — only when it's actually actionable */}
        {!loading && !hasToken && seller?.isApproved && (
          <Link to="/seller/token" className="dash-token-banner">
            <span className="dash-chip tint-coral"><Key size={18} /></span>
            <div>
              <strong>No active token</strong>
              <p>Redeem a token from the admin to make your products visible on the marketplace.</p>
            </div>
            <ArrowRight size={16} />
          </Link>
        )}

   

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