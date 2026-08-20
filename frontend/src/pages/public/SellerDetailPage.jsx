<<<<<<< HEAD
import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Star, Phone, Globe, ArrowLeft, Package, X, ZoomIn, MapPin, BadgeCheck, MessageCircle, Pin, Home, CalendarDays } from 'lucide-react';
import RateSellerModal from '../../components/shared/RateSellerModal';
import Navbar from '../../components/shared/Navbar';
import ProductCard from '../../components/public/ProductCard';
import SafetyBanner from '../../components/shared/SafetyBanner';
import { useBuyerAuth } from '../../context/BuyerAuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { CATEGORY_ICONS } from '../../utils/constants';
import { trackView } from '../../utils/trackView';
import { setPendingChatIntent } from '../../utils/pendingChat';
import OptimizedImage from '../../components/shared/OptimizedImage';
import './SellerDetailPage.css';


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
    <span className="sd-rating-value">{rating?.toFixed(1)}</span>
  </div>
);

// How long ago the seller joined, in the coarsest sensible unit —
// "3 days ago", "5 months ago", "2 years ago" — falling back to
// "today" for a brand-new store.
const formatJoinDuration = (dateStr) => {
  const joined = new Date(dateStr);
  const now = new Date();
  const days = Math.floor((now - joined) / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months > 1 ? 's' : ''} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years > 1 ? 's' : ''} ago`;
};

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

const SellerDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useBuyerAuth();
  const [seller, setSeller] = useState(null);
  const [sellerInfo, setSellerInfo] = useState(null);
  const [products, setProducts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('All');
  const [lightbox, setLightbox] = useState(null);
  const [showReviews, setShowReviews] = useState(false);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsPagination, setReviewsPagination] = useState(null);
  const [loadingMoreReviews, setLoadingMoreReviews] = useState(false);
  const [showRateModal, setShowRateModal] = useState(false);

  const openLightbox = useCallback((src, alt) => setLightbox({ src, alt }), []);
  const closeLightbox = useCallback(() => setLightbox(null), []);

  const handleStartChat = async () => {
    if (!isAuthenticated) {
      setPendingChatIntent({ sellerId: seller._id });
      navigate('/buyer/login');
      return;
    }
    try {
      await api.post('/messages/conversations', { sellerId: seller._id }, { authRole: 'buyer' });
      navigate('/buyer/dashboard');
    } catch (err) {
      console.error(err);
    }
  };

  const loadReviews = useCallback((sellerId) => {
    if (!sellerId) return;
    api.get(`/reviews/seller/${sellerId}`, { params: { page: 1, limit: 6 } })
      .then(r => {
        setReviews(r.data.reviews || []);
        setReviewsPagination(r.data.pagination || null);
        setReviewsPage(1);
      })
      .catch(() => {});
  }, []);

  const loadMoreReviews = async () => {
    if (!seller?._id) return;
    setLoadingMoreReviews(true);
    try {
      const nextPage = reviewsPage + 1;
      const res = await api.get(`/reviews/seller/${seller._id}`, { params: { page: nextPage, limit: 6 } });
      setReviews(prev => [...prev, ...(res.data.reviews || [])]);
      setReviewsPagination(res.data.pagination);
      setReviewsPage(nextPage);
    } catch (err) {
      console.error(err);
    } finally { setLoadingMoreReviews(false); }
  };

  useEffect(() => {
    api.get(`/sellers/user/${id}`)
      .then(res => {
        setSeller(res.data.seller);
        setProducts(res.data.products);
        setSellerInfo(res.data.sellerInfo || null);
        // Count this as a store view. Backend already skips counting a
        // seller viewing their own store (checked via their auth token),
        // so this is safe to fire unconditionally here.
        trackView(res.data.seller?._id, 'store_view');
        loadReviews(res.data.seller?._id);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id, loadReviews]);

  if (loading) return (
    <>
      <Navbar />
      <div className="sd-state-screen">
        <div className="spinner" />
      </div>
    </>
  );

  if (!seller) return (
    <>
      <Navbar />
      <div className="sd-state-screen sd-state-screen--column">
        <h2>Seller not found</h2>
        <Link to="/sellers" className="btn btn-primary">Back to Sellers</Link>
      </div>
    </>
  );

  const categories = ['All', ...new Set(products.map(p => p.category))];
  const filtered = category === 'All' ? products : products.filter(p => p.category === category);
  // "Edit Store" theme, set by the seller from the dashboard's store
  // editor (StoreEditorPanel.jsx → PUT /sellers/store/theme). This is
  // what actually makes those settings show up here instead of just
  // being saved and never displayed.
  const theme = seller.storeTheme || {};

  return (
    <>
      <Navbar />
      <div
        className={`seller-detail ${theme.darkMode ? 'sd-dark-store' : ''}`}
        style={theme.primaryColor ? { '--gold': theme.primaryColor } : undefined}
      >

        {/* Banner — overlay uses pointer-events:none so clicks reach the button */}
        <div className="sd-banner">
          {seller.banner ? (
            <>
              <img src={seller.banner} alt={seller.store_name} />
              {/* Overlay is purely visual, non-blocking */}
              <div className="sd-banner-overlay" style={{ pointerEvents: 'none' }} />
              {/* Click trigger sits on top of everything */}
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
          <Link to="/sellers" className="sd-back-btn">
            <ArrowLeft size={15} /> Sellers
          </Link>
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
                <h1 className="sd-name">
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
                
                  {seller.showAddress && seller.address && (
                    <span className="sd-location-line" title="Store address">
                      <Home size={13} />
                      {seller.address}
                    </span>
                  )}
                  {seller.createdAt && (
                    <span className="sd-location-line" title={new Date(seller.createdAt).toLocaleDateString()}>
                      <CalendarDays size={13} />
                      {`Joined ${formatJoinDuration(seller.createdAt)}`}
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
                  <span className="sd-stat-value">{products.length}</span>
                  <span className="sd-stat-label">Products</span>
                </div>
                <div className="sd-stat-divider" />
                <span className="badge badge-gold sd-category-badge">{seller.category}</span>
              </div>
            </div>

            {seller.description && <p className="sd-desc">{seller.description}</p>}

            <div className="sd-contact-row">
              <button onClick={handleStartChat} className="sd-pill sd-pill--primary">
                <MessageCircle size={15} />
                <span>Start Chat</span>
              </button>
              {seller.whatsapp && (
                <a
                  href={`https://wa.me/234${seller.whatsapp.replace(/\D/g,'')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="sd-pill sd-pill--wa"
                  onClick={() => trackView(seller._id, 'whatsapp_click')}
                >
                  <WhatsAppIcon />
                  <span>WhatsApp</span>
                </a>
              )}
              {seller.contact && (
                <a href={`tel:${seller.contact}`} className="sd-pill">
                  <Phone size={15} />
                  <span>{seller.contact}</span>
                </a>
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
              <button onClick={() => (isAuthenticated ? setShowRateModal(true) : navigate('/buyer/login'))} className="sd-pill">
                <Star size={15} />
                <span>Rate Seller</span>
              </button>
            </div>

            <SafetyBanner compact />
          </div>
        </div>

        {/* Products */}
        <div className="container sd-products-section">
          <div className="seller-products-header">
            <div>
              <h2>Products <span className="products-count">{products.length}</span></h2>
            </div>
          </div>

          {categories.length > 1 && (
            <div className="sd-chip-row">
              {categories.map(cat => (
                <button
                  key={cat}
                  className={`sd-chip ${category === cat ? 'is-active' : ''}`}
                  onClick={() => setCategory(cat)}
                >
                  {cat !== 'All' && <span>{CATEGORY_ICONS[cat]}</span>}
                  {cat}
                </button>
              ))}
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="empty-state">
              <Package size={36} />
              <p>No products in this category.</p>
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

          <div className="sd-reviews-section">
            <button
              className="btn btn-outline btn-sm"
              onClick={() => setShowReviews(v => !v)}
            >
              <Star size={14} /> {showReviews ? 'Hide Reviews' : `See Reviews${sellerInfo?.reviewCount ? ` (${sellerInfo.reviewCount})` : ''}`}
            </button>

            {showReviews && (
              reviews.length === 0 ? (
                <p className="sd-no-reviews">No reviews yet — be the first to rate this seller.</p>
              ) : (
                <>
                  <div className="grid-2 sd-reviews-grid">
                    {reviews.map(r => (
                      <div key={r._id} className="card sd-review-card">
                        <div className="sd-review-head">
                          <strong>{r.buyer?.name || 'Buyer'}</strong>
                          <span className="sd-review-stars">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                        </div>
                        {r.comment && <p className="sd-review-comment">{r.comment}</p>}
                        {r.sellerReply && (
                          <p className="sd-review-reply">
                            <strong>Seller reply:</strong> {r.sellerReply}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                  {reviewsPagination && reviewsPage < reviewsPagination.totalPages && (
                    <div className="sd-load-more-wrap">
                      <button className="btn btn-outline btn-sm" onClick={loadMoreReviews} disabled={loadingMoreReviews}>
                        {loadingMoreReviews ? 'Loading…' : `Load More (${reviewsPagination.total - reviews.length} more)`}
                      </button>
                    </div>
                  )}
                </>
              )
            )}
          </div>
        </div>
      </div>

      {showRateModal && (
        <RateSellerModal
          sellerId={seller._id}
          onClose={() => setShowRateModal(false)}
          onSubmitted={() => loadReviews(seller._id)}
        />
      )}

      {lightbox && (
        <ImageLightbox
          src={lightbox.src}
          alt={lightbox.alt}
          onClose={closeLightbox}
        />
      )}
    </>
  );
};

export default SellerDetailPage;
=======
import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Star, Phone, Globe, ArrowLeft, Package, X, ZoomIn, MapPin, BadgeCheck, MessageCircle, Pin } from 'lucide-react';
import RateSellerModal from '../../components/shared/RateSellerModal';
import Navbar from '../../components/shared/Navbar';
import ProductCard from '../../components/public/ProductCard';
import SafetyBanner from '../../components/shared/SafetyBanner';
import { useBuyerAuth } from '../../context/BuyerAuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { CATEGORY_ICONS } from '../../utils/constants';
import { trackView } from '../../utils/trackView';
import { setPendingChatIntent } from '../../utils/pendingChat';
import OptimizedImage from '../../components/shared/OptimizedImage';
import './SellerDetailPage.css';


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
    <span className="sd-rating-value">{rating?.toFixed(1)}</span>
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

const SellerDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useBuyerAuth();
  const [seller, setSeller] = useState(null);
  const [sellerInfo, setSellerInfo] = useState(null);
  const [products, setProducts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('All');
  const [lightbox, setLightbox] = useState(null);
  const [showReviews, setShowReviews] = useState(false);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsPagination, setReviewsPagination] = useState(null);
  const [loadingMoreReviews, setLoadingMoreReviews] = useState(false);
  const [showRateModal, setShowRateModal] = useState(false);

  const openLightbox = useCallback((src, alt) => setLightbox({ src, alt }), []);
  const closeLightbox = useCallback(() => setLightbox(null), []);

  const handleStartChat = async () => {
    if (!isAuthenticated) {
      setPendingChatIntent({ sellerId: seller._id });
      navigate('/buyer/login');
      return;
    }
    try {
      await api.post('/messages/conversations', { sellerId: seller._id }, { authRole: 'buyer' });
      navigate('/buyer/dashboard');
    } catch (err) {
      console.error(err);
    }
  };

  const loadReviews = useCallback((sellerId) => {
    if (!sellerId) return;
    api.get(`/reviews/seller/${sellerId}`, { params: { page: 1, limit: 6 } })
      .then(r => {
        setReviews(r.data.reviews || []);
        setReviewsPagination(r.data.pagination || null);
        setReviewsPage(1);
      })
      .catch(() => {});
  }, []);

  const loadMoreReviews = async () => {
    if (!seller?._id) return;
    setLoadingMoreReviews(true);
    try {
      const nextPage = reviewsPage + 1;
      const res = await api.get(`/reviews/seller/${seller._id}`, { params: { page: nextPage, limit: 6 } });
      setReviews(prev => [...prev, ...(res.data.reviews || [])]);
      setReviewsPagination(res.data.pagination);
      setReviewsPage(nextPage);
    } catch (err) {
      console.error(err);
    } finally { setLoadingMoreReviews(false); }
  };

  useEffect(() => {
    api.get(`/sellers/user/${id}`)
      .then(res => {
        setSeller(res.data.seller);
        setProducts(res.data.products);
        setSellerInfo(res.data.sellerInfo || null);
        // Count this as a store view. Backend already skips counting a
        // seller viewing their own store (checked via their auth token),
        // so this is safe to fire unconditionally here.
        trackView(res.data.seller?._id, 'store_view');
        loadReviews(res.data.seller?._id);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id, loadReviews]);

  if (loading) return (
    <>
      <Navbar />
      <div className="sd-state-screen">
        <div className="spinner" />
      </div>
    </>
  );

  if (!seller) return (
    <>
      <Navbar />
      <div className="sd-state-screen sd-state-screen--column">
        <h2>Seller not found</h2>
        <Link to="/sellers" className="btn btn-primary">Back to Sellers</Link>
      </div>
    </>
  );

  const categories = ['All', ...new Set(products.map(p => p.category))];
  const filtered = category === 'All' ? products : products.filter(p => p.category === category);
  // "Edit Store" theme, set by the seller from the dashboard's store
  // editor (StoreEditorPanel.jsx → PUT /sellers/store/theme). This is
  // what actually makes those settings show up here instead of just
  // being saved and never displayed.
  const theme = seller.storeTheme || {};

  return (
    <>
      <Navbar />
      <div
        className={`seller-detail ${theme.darkMode ? 'sd-dark-store' : ''}`}
        style={theme.primaryColor ? { '--gold': theme.primaryColor } : undefined}
      >

        {/* Banner — overlay uses pointer-events:none so clicks reach the button */}
        <div className="sd-banner">
          {seller.banner ? (
            <>
              <img src={seller.banner} alt={seller.store_name} />
              {/* Overlay is purely visual, non-blocking */}
              <div className="sd-banner-overlay" style={{ pointerEvents: 'none' }} />
              {/* Click trigger sits on top of everything */}
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
          <Link to="/sellers" className="sd-back-btn">
            <ArrowLeft size={15} /> Sellers
          </Link>
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
                <h1 className="sd-name">
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
                  <span className="sd-stat-value">{products.length}</span>
                  <span className="sd-stat-label">Products</span>
                </div>
                <div className="sd-stat-divider" />
                <span className="badge badge-gold sd-category-badge">{seller.category}</span>
              </div>
            </div>

            {seller.description && <p className="sd-desc">{seller.description}</p>}

            <div className="sd-contact-row">
              <button onClick={handleStartChat} className="sd-pill sd-pill--primary">
                <MessageCircle size={15} />
                <span>Start Chat</span>
              </button>
              {seller.whatsapp && (
                <a
                  href={`https://wa.me/234${seller.whatsapp.replace(/\D/g,'')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="sd-pill sd-pill--wa"
                  onClick={() => trackView(seller._id, 'whatsapp_click')}
                >
                  <WhatsAppIcon />
                  <span>WhatsApp</span>
                </a>
              )}
              {seller.contact && (
                <a href={`tel:${seller.contact}`} className="sd-pill">
                  <Phone size={15} />
                  <span>{seller.contact}</span>
                </a>
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
              <button onClick={() => (isAuthenticated ? setShowRateModal(true) : navigate('/buyer/login'))} className="sd-pill">
                <Star size={15} />
                <span>Rate Seller</span>
              </button>
            </div>

            <SafetyBanner compact />
          </div>
        </div>

        {/* Products */}
        <div className="container sd-products-section">
          <div className="seller-products-header">
            <div>
              <h2>Products <span className="products-count">{products.length}</span></h2>
            </div>
          </div>

          {categories.length > 1 && (
            <div className="sd-chip-row">
              {categories.map(cat => (
                <button
                  key={cat}
                  className={`sd-chip ${category === cat ? 'is-active' : ''}`}
                  onClick={() => setCategory(cat)}
                >
                  {cat !== 'All' && <span>{CATEGORY_ICONS[cat]}</span>}
                  {cat}
                </button>
              ))}
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="empty-state">
              <Package size={36} />
              <p>No products in this category.</p>
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

          <div className="sd-reviews-section">
            <button
              className="btn btn-outline btn-sm"
              onClick={() => setShowReviews(v => !v)}
            >
              <Star size={14} /> {showReviews ? 'Hide Reviews' : `See Reviews${sellerInfo?.reviewCount ? ` (${sellerInfo.reviewCount})` : ''}`}
            </button>

            {showReviews && (
              reviews.length === 0 ? (
                <p className="sd-no-reviews">No reviews yet — be the first to rate this seller.</p>
              ) : (
                <>
                  <div className="grid-2 sd-reviews-grid">
                    {reviews.map(r => (
                      <div key={r._id} className="card sd-review-card">
                        <div className="sd-review-head">
                          <strong>{r.buyer?.name || 'Buyer'}</strong>
                          <span className="sd-review-stars">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                        </div>
                        {r.comment && <p className="sd-review-comment">{r.comment}</p>}
                        {r.sellerReply && (
                          <p className="sd-review-reply">
                            <strong>Seller reply:</strong> {r.sellerReply}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                  {reviewsPagination && reviewsPage < reviewsPagination.totalPages && (
                    <div className="sd-load-more-wrap">
                      <button className="btn btn-outline btn-sm" onClick={loadMoreReviews} disabled={loadingMoreReviews}>
                        {loadingMoreReviews ? 'Loading…' : `Load More (${reviewsPagination.total - reviews.length} more)`}
                      </button>
                    </div>
                  )}
                </>
              )
            )}
          </div>
        </div>
      </div>

      {showRateModal && (
        <RateSellerModal
          sellerId={seller._id}
          onClose={() => setShowRateModal(false)}
          onSubmitted={() => loadReviews(seller._id)}
        />
      )}

      {lightbox && (
        <ImageLightbox
          src={lightbox.src}
          alt={lightbox.alt}
          onClose={closeLightbox}
        />
      )}
    </>
  );
};

export default SellerDetailPage;
>>>>>>> b403b42571a91fae11e3332f19cf5691d2aba20a
