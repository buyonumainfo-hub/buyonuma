import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Star, Phone, Globe, Instagram, ArrowLeft, Package, X, ZoomIn } from 'lucide-react';
import Navbar from '../../components/shared/Navbar';
import Footer from '../../components/shared/Footer';
import ProductCard from '../../components/public/ProductCard';
import api from '../../utils/api';
import { CATEGORY_ICONS } from '../../utils/constants';
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
    <span style={{ marginLeft: '0.35rem', fontWeight: 600 }}>{rating?.toFixed(1)}</span>
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
        <img src={src} alt={alt} className="lightbox-img" />
      </div>
    </div>
  );
};

const SellerDetailPage = () => {
  const { id } = useParams();
  const [seller, setSeller] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('All');
  const [lightbox, setLightbox] = useState(null);

  const openLightbox = useCallback((src, alt) => setLightbox({ src, alt }), []);
  const closeLightbox = useCallback(() => setLightbox(null), []);

  useEffect(() => {
    api.get(`/sellers/user/${id}`)
      .then(res => {
        setSeller(res.data.seller);
        setProducts(res.data.products);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <>
      <Navbar />
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    </>
  );

  if (!seller) return (
    <>
      <Navbar />
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
        <h2>Seller not found</h2>
        <Link to="/sellers" className="btn btn-primary">Back to Sellers</Link>
      </div>
    </>
  );

  const categories = ['All', ...new Set(products.map(p => p.category))];
  const filtered = category === 'All' ? products : products.filter(p => p.category === category);

  return (
    <>
      <Navbar />
      <div className="seller-detail">

        {/* Banner — overlay uses pointer-events:none so clicks reach the button */}
        <div className="seller-detail-banner">
          {seller.banner ? (
            <>
              <img src={seller.banner} alt={seller.store_name} />
              {/* Overlay is purely visual, non-blocking */}
              <div className="seller-detail-banner-overlay" style={{ pointerEvents: 'none' }} />
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
            <div className="seller-detail-banner-placeholder">
              <span>{CATEGORY_ICONS[seller.category] || '🏪'}</span>
            </div>
          )}
        </div>

        {/* Profile section */}
        <div className="container">
          <div className="seller-detail-profile">

            {/* Avatar */}
            <div className="seller-detail-avatar">
              {seller.profile_picture ? (
                <button
                  className="avatar-lightbox-trigger"
                  onClick={() => openLightbox(seller.profile_picture, seller.username)}
                  aria-label="View profile picture"
                >
                  <img src={seller.profile_picture} alt={seller.username} />
                  <span className="avatar-zoom-hint">
                    <ZoomIn size={16} />
                  </span>
                </button>
              ) : (
                <span>{seller.store_name?.[0]?.toUpperCase()}</span>
              )}
            </div>

            <div className="seller-detail-info">
              <div className="seller-detail-meta">
                <span className="badge badge-gold">{seller.category}</span>
                <Stars rating={seller.rating || 0} />
              </div>
              <h1 className="seller-detail-name">{seller.store_name}</h1>
              <p className="seller-detail-username">@{seller.username}</p>
              {seller.description && <p className="seller-detail-desc">{seller.description}</p>}
            </div>

            <div className="seller-detail-contacts">
              {seller.contact && (
                <a href={`tel:${seller.contact}`} className="contact-item">
                  <Phone size={16} />
                  <span>{seller.contact}</span>
                </a>
              )}
              {seller.whatsapp && (
                <a href={`https://wa.me/234${seller.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="contact-item wa-contact">
                  <WhatsAppIcon />
                  <span>WhatsApp</span>
                </a>
              )}
              {seller.website && (
                <a href={`https://${seller.website}`} target="_blank" className="contact-item">
                  <Globe size={16} />
                  <span>Website</span>
                </a>
              )}
              {seller.social_media_handle && (
                <a href={`https://tiktok.com/@${seller.social_media_handle}`} target="_blank" rel="noreferrer" className="contact-item">
                  <TikTokIcon />
                  <span>{seller.social_media_handle}</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Products */}
        <div className="container" style={{ paddingBottom: '4rem' }}>
          <div className="seller-products-header">
            <div>
              <h2>Products <span className="products-count">{products.length}</span></h2>
            </div>
            <Link to="/sellers" className="btn btn-outline btn-sm">
              <ArrowLeft size={14} /> Back to Sellers
            </Link>
          </div>

          {categories.length > 1 && (
            <div className="category-pills" style={{ marginBottom: '1.5rem' }}>
              {categories.map(cat => (
                <button
                  key={cat}
                  className={`category-pill ${category === cat ? 'active' : ''}`}
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
            <div className="grid-2 fade-up">
              {filtered.map(p => <ProductCard key={p._id} product={p} />)}
            </div>
          )}
        </div>
      </div>

      {lightbox && (
        <ImageLightbox
          src={lightbox.src}
          alt={lightbox.alt}
          onClose={closeLightbox}
        />
      )}

      <Footer />
    </>
  );
};

export default SellerDetailPage;
