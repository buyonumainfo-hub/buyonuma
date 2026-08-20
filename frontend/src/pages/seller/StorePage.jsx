import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Star, Phone, Globe, Package, X, ZoomIn, MapPin, BadgeCheck, Copy, Check, ExternalLink, Edit3, Pin } from 'lucide-react';
import SellerLayout from '../../components/seller/SellerLayout';
import LoadFailedModal from '../../components/seller/LoadFailedModal';
import StoreEditorPanel from '../../components/seller/StoreEditorPanel';
import SellerReviewsPanel from '../../components/seller/SellerReviewsPanel';
import ProductCard from '../../components/public/ProductCard';
import OptimizedImage from '../../components/shared/OptimizedImage';
import { useSellerAuth } from '../../context/SellerAuthContext';
import api from '../../utils/api';
import { CATEGORY_ICONS } from '../../utils/constants';
import '../public/SellerDetailPage.css';
//import './SellerDashboard.css';

const TikTokIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="black">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 15.58a6.34 6.34 0 0 0 10.86 4.23 6.33 6.33 0 0 0 1.81-4.46V9.91a7.55 7.55 0 0 0 4.2 1.37V8.11a4.24 4.24 0 0 1-2.28-1.42z"/>
  </svg>
);

const WhatsAppIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const Stars = ({ rating }) => (
  <div className="stars">
    {[1,2,3,4,5].map(i => (
      <Star key={i} size={16} fill={i <= Math.round(rating) ? 'currentColor' : 'none'} strokeWidth={1.5} />
    ))}
    <span className="sd-rating-value">{(rating || 0).toFixed(1)}</span>
  </div>
);

/* ── Lightbox ── */
const ImageLightbox = ({ src, alt, onClose }) => {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="lightbox-backdrop" onClick={onClose}>
      <button className="lightbox-close" onClick={onClose} aria-label="Close preview">
        <X size={22} />
      </button>
      <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
        <OptimizedImage src={src} alt={alt} className="lightbox-img" width={1600} priority />
      </div>
    </div>
  );
};

/* ── Seller's own store, previewed inside the dashboard.
   Mirrors the public SellerDetailPage exactly — including the "Edit
   Store" theme (accent color, banner headline/subtext, grid/list
   layout) and pinned-product badges — so what a seller sees here is
   really what a buyer sees on their live page, not an approximation. */
const SellerStorePreviewPage = () => {
  const { seller, refreshSeller } = useSellerAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [category, setCategory] = useState('All');
  const [lightbox, setLightbox] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showReviews, setShowReviews] = useState(false);

  const openLightbox = useCallback((src, alt) => setLightbox({ src, alt }), []);
  const closeLightbox = useCallback(() => setLightbox(null), []);

  const fetchProducts = useCallback(() => {
    setLoadError(false);
    api.get(`/sellers/user/${seller?.username}`)
      .then(res => setProducts(res.data.products || []))
      .catch((err) => {
        console.error(err);
        setLoadError(true);
      })
      .finally(() => { setLoading(false); setRetrying(false); });
  }, [seller?.username]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const handleRetry = () => { setRetrying(true); fetchProducts(); };

  // Saving the theme or pins in StoreEditorPanel only updates the
  // seller's document on the backend — without this, the preview below
  // (and the plan/pin-limit numbers inside the editor itself) would keep
  // showing what was true before the save until the next full page load.
  const handleStoreUpdated = () => {
    fetchProducts();
    refreshSeller?.();
  };

  const storeUrl = seller?.username
    ? `${window.location.origin}/${seller.username}`
    : null;

  const handleCopyLink = async () => {
    if (!storeUrl) return;
    try {
      await navigator.clipboard.writeText(storeUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed', err);
    }
  };

  if (!seller) return null;

  const categories = ['All', ...new Set(products.map(p => p.category))];
  const filtered = category === 'All' ? products : products.filter(p => p.category === category);
  // Same "Edit Store" theme object the public page reads — see
  // StoreEditorPanel.jsx (PUT /sellers/store/theme) for where it's set.
  const theme = seller.storeTheme || {};

  return (
    <SellerLayout title="My Store">
      {loadError && <LoadFailedModal onRetry={handleRetry} retrying={retrying} />}

      <div className="seller-dash fade-up">
        <StoreEditorPanel
          seller={seller}
          products={products}
          onUpdated={handleStoreUpdated}
        />

        <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
          <button
            onClick={() => setShowReviews(v => !v)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
          >
            <span style={{color:'var(--ink-light)'}}>⭐ Reviews &amp; Replies</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--gold)' }}>{showReviews ? 'Hide' : 'Show'}</span>
          </button>
          {showReviews && (
            <div style={{ marginTop: '1rem' }}>
              <SellerReviewsPanel sellerId={seller?._id} />
            </div>
          )}
        </div>

        {/* Preview banner — makes clear this is a dashboard-side preview, not the live page */}
        <div className="dash-alert dash-alert-ok store-preview-banner">
          <div>
            <strong>This is how your store looks to customers</strong>
            <p>Product views and clicks aren't counted while you preview here.</p>
          </div>
          <div className="dash-profile-actions">
            <button
              type="button"
              style={{color:"black"}}
              className="btn btn-outline btn-sm"
              onClick={handleCopyLink}
              disabled={!storeUrl}
              title="Copy store link"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Copy Link'}
            </button>
            
              <a href={storeUrl || '#'}
              target="_blank"
              rel="noreferrer"
              className={`btn btn-gold btn-sm${!storeUrl ? ' btn-disabled' : ''}`}
              onClick={(e) => { if (!storeUrl) e.preventDefault(); }}
            >
              <ExternalLink size={14} /> Open Public Page
            </a>
            <Link style={{color:"black"}} to="/seller/profile" className="btn btn-outline btn-sm">
              <Edit3 size={14} /> Edit Profile
            </Link>
          </div>
        </div>

        {/* ── sd-* layout, matching the public SellerDetailPage ── */}
        <div className={`seller-detail ${theme.darkMode ? 'sd-dark-store' : ''}`} style={theme.primaryColor ? { '--gold': theme.primaryColor } : undefined}>
          <div className="sd-banner">
            {seller.banner ? (
              <>
                <img src={seller.banner} alt={seller.store_name} />
                <div className="sd-banner-overlay" style={{ pointerEvents: 'none' }} />
                <button
                  className="banner-lightbox-trigger"
                  onClick={() => openLightbox(seller.banner, seller.store_name)}
                  aria-label="View banner image"
                >
                  <span className="image-zoom-hint">
                    <ZoomIn size={18} />
                    View
                  </span>
                </button>
              </>
            ) : (
              <div className="sd-banner-placeholder">
                <span>{CATEGORY_ICONS[seller.category] || '🏪'}</span>
              </div>
            )}
            {(theme.bannerHeadline || theme.bannerSubtext) && (
              <div className="sd-banner-text" style={{ pointerEvents: 'none' }}>
                {theme.bannerHeadline && <h2>{theme.bannerHeadline}</h2>}
                {theme.bannerSubtext && <p>{theme.bannerSubtext}</p>}
              </div>
            )}
          </div>

          {/* Floating profile card — overlaps the bottom of the banner */}
          <div className="container">
            <div className="sd-profile-card">
              <div className="sd-profile-top">
                <div className="sd-avatar">
                  {seller.profile_picture ? (
                    <button
                      className="avatar-lightbox-trigger"
                      onClick={() => openLightbox(seller.profile_picture, seller.username)}
                      aria-label="View profile picture"
                    >
                      <OptimizedImage src={seller.profile_picture} alt={seller.username} width={160} height={160} priority />
                      <span className="avatar-zoom-hint">
                        <ZoomIn size={16} />
                      </span>
                    </button>
                  ) : (
                    <span>{seller.store_name?.[0]?.toUpperCase()}</span>
                  )}
                </div>

                <div className="sd-heading">
                  <h1 className="sd-name" style={{color: 'var(--ink-light)'}}>
                    {seller.store_name} 
                    {seller.ninStatus === 'verified' && (
                      <span className="sd-verified-pill" title="This seller has completed NIN + face verification">
                        <BadgeCheck size={12} /> Verified
                      </span>
                    )}
                  </h1>
                  <div className="sd-subline">
                    <span>@{seller.username}</span>
                    {(seller.city || seller.state) && (
                      <span className="sd-location-line">
                        <MapPin size={13} />
                        {seller.city ? `${seller.city}, ${seller.state}` : seller.state}
                      </span>
                    )}
                  </div>
                </div>

                <div className="sd-stat-strip">
                  <div className="sd-stat">
                    <Stars rating={seller.rating || 0} />
                    <span className="sd-stat-label">Rating</span>
                  </div>
                  <div className="sd-stat-divider" />
                  <div className="sd-stat">
                    <span className="sd-stat-value" style={{color: 'var(--ink-light)'}}>{loading ? '—' : products.length}</span>
                    <span className="sd-stat-label" >Products</span>
                  </div>
                  <div className="sd-stat-divider" />
                  <span className="badge badge-gold sd-category-badge">{seller.category}</span>
                </div>
              </div>

              {seller.description && <p className="sd-desc">{seller.description}</p>}

              <div className="sd-contact-row">
                {seller.contact && (
                  <a href={`tel:${seller.contact}`} className="sd-pill" style={{color: 'var(--ink-light)'}}>
                    <Phone size={15} />
                    <span>{seller.contact}</span>
                  </a>
                )}
                {seller.whatsapp && (
                  <span className="sd-pill sd-pill--wa">
                    <WhatsAppIcon />
                    <span>WhatsApp</span>
                  </span>
                )}
                {seller.website && (
                  <a href={`https://${seller.website}`} target="_blank" rel="noreferrer" className="sd-pill">
                    <Globe size={15} />
                    <span>Website</span>
                  </a>
                )}
                {seller.social_media_handle && (
                  <a href={`https://tiktok.com/@${seller.social_media_handle}`} target="_blank" rel="noreferrer" className="sd-pill">
                    <TikTokIcon />
                    <span>{seller.social_media_handle}</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Products */}
          <div className="container sd-products-section">
            <div className="seller-products-header">
              <div>
                <h2 style={{color: 'var(--ink-light)'}}>Products <span className="products-count">{loading ? '—' : products.length}</span></h2>
              </div>
            </div>

            {categories.length > 1 && (
              <div className="sd-chip-row" style={{color: 'var(--ink-light)'}}>
                {categories.map(cat => (
                  <button
                    key={cat}
                    className={`sd-chip ${category === cat ? 'is-active' : ''}`}
                    onClick={() => setCategory(cat)}
                    style={{color: 'var(--ink-muted)'}}
                  >
                    {cat !== 'All' && <span>{CATEGORY_ICONS[cat]}</span>}
                    {cat}
                  </button>
                ))}
              </div>
            )}

            {loading ? (
              <div className="empty-state">
                <Package size={36} />
                <p>Loading your products…</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="empty-state">
                <Package size={36} />
                <p>No products in this category yet.</p>
                <Link to="/seller/products" className="btn btn-gold btn-sm">Add a product</Link>
              </div>
            ) : (
              <div className={theme.layout === 'list' ? 'sd-store-list fade-up' : 'grid-2 fade-up'}>
                {filtered.map(p => (
                  <div key={p._id} className="sd-product-slot">
                    {seller.pinnedProducts?.some(pid => (pid._id || pid).toString() === p._id) && (
                      <span className="badge badge-gold sd-pinned-badge">
                        <Pin size={11} /> Pinned
                      </span>
                    )}
                    <ProductCard product={p} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {lightbox && (
        <ImageLightbox
          src={lightbox.src}
          alt={lightbox.alt}
          onClose={closeLightbox}
        />
      )}
    </SellerLayout>
  );
};

export default SellerStorePreviewPage;
