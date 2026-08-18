import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate} from 'react-router-dom';
import { Clock, Star, ExternalLink, Phone, ShoppingCart, Check, BadgeCheck, MapPin, MessageCircle } from 'lucide-react';
import { CATEGORY_ICONS } from '../../utils/constants';
import ProductDetailModal from './ProductDetailModal';
import { useCart } from '../../context/CartContext';
import { trackView } from '../../utils/trackView';
import { useBuyerAuth } from '../../context/BuyerAuthContext';
import { setPendingChatIntent } from '../../utils/pendingChat';
import OptimizedImage from '../shared/OptimizedImage';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import './ProductCard.css';

const WhatsAppIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const ProductCard = ({ product }) => {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const trackRef = useRef(null);
const { isAuthenticated } = useBuyerAuth();

  const icon = CATEGORY_ICONS[product.category] || '📦';
  const waNumber = product.seller?.whatsapp?.replace(/\D/g, '');
  const waLink = waNumber
    ? `https://wa.me/234${waNumber}?text=${encodeURIComponent(`Hi, I'm interested in your product: ${product.name} (₦${Number(product.price).toLocaleString()})`)}`
    : null;

  const images = product.images?.length ? product.images : (product.product_image ? [product.product_image] : []);
  const { addItem, isInCart } = useCart();
  const inCart = isInCart(product._id);

  const handleAddToCart = (e) => {
    e.stopPropagation();
    addItem(product, 1);
    toast.success(`${product.name} added to cart`);
  };
    const handleStartChat = async () => {
    if (!isAuthenticated) {
      // Remember who they were trying to message so BuyerAuth.jsx can
      // resume this exact conversation right after they sign in — see
      // utils/pendingChat.js.
      setPendingChatIntent({ sellerId: product.seller._id, productId: product._id });
      navigate('/buyer/login');
      return;
    }
    try {
      console.log('Starting chat with seller:', product.seller._id, 'for product:', product._id);
      await api.post('/messages/conversations', {
        sellerId: product.seller._id,
        productId: product._id,
      }, { authRole: 'buyer' });
      //onClose();
      navigate('/buyer/dashboard');
      toast.success('Conversation started — find it under Messages');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not start chat');
    }
  };

  const handleWhatsAppClick = () => {
    const sellerId = product.seller?._id || product.seller;
    trackView(sellerId, 'whatsapp_click');
  };

  const scrollToSlide = (i) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollTo({ left: track.clientWidth * i, behavior: 'smooth' });
  };

  const handleTrackScroll = () => {
    const track = trackRef.current;
    if (!track) return;
    const i = Math.round(track.scrollLeft / track.clientWidth);
    if (i !== activeSlide) setActiveSlide(i);
  };

  // Auto-advance the carousel when there's more than one photo.
  useEffect(() => {
    if (images.length <= 1 || isPaused) return;

    const id = setInterval(() => {
      setActiveSlide((prev) => {
        const next = (prev + 1) % images.length;
        const track = trackRef.current;
        if (track) {
          track.scrollTo({ left: track.clientWidth * next, behavior: 'smooth' });
        }
        return next;
      });
    }, 3200);

    return () => clearInterval(id);
  }, [images.length, isPaused]);

  return (
    <>
      <article className="product-card">
        {/* ── Image / carousel ── */}
        <div
          className="product-card-carousel"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
        >
          {images.length > 0 ? (
            <ul ref={trackRef} className="product-card-track" onScroll={handleTrackScroll}>
              {images.map((src, i) => (
                <li key={i}>
                  <OptimizedImage src={src} alt={product.name} width={400} height={360} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="product-card-image-placeholder">
              <span>{icon}</span>
            </div>
          )}

          <span className="product-category-badge">{product.category}</span>
          {images.length > 1 && (
            <span className="product-image-count-badge">{images.length} photos</span>
          )}

          {images.length > 1 && (
            <div className="product-carousel-markers" role="tablist" aria-label="Product photos">
              {images.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={activeSlide === i}
                  aria-label={`Photo ${i + 1} of ${images.length}`}
                  className={activeSlide === i ? 'is-active' : ''}
                  onClick={(e) => { e.stopPropagation(); scrollToSlide(i); }}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Body ── */}
        <div className="product-card-body">
          <div className="product-card-meta">
            <h3 className="product-card-name">
              {product.seller?.store_name && (
                <span className="product-card-eyebrow">{product.seller.store_name}</span>
              )}
              <span className="product-card-title">{product.name}</span>
            </h3>
            <p className="product-card-price">₦{Number(product.price).toLocaleString()}</p>
          </div>

          <button
            type="button"
            className={`product-card-cta ${inCart ? 'is-active' : ''}`}
            onClick={handleAddToCart}
            aria-label={inCart ? 'Added to cart' : 'Add to cart'}
          >
            <span className="product-card-cta-icons">
              <ShoppingCart size={15} />
              <Check size={15} />
            </span>
          </button>
        </div>

        {product.description && <p className="product-card-desc">{product.description}</p>}

        {product.time_frame && (
          <div className="product-card-timeframe">
            <Clock size={12} />
            <span>{product.time_frame}</span>
          </div>
        )}
        {!product?.seller?.state && <div className="product-card-timeframe"> <span>🌍 worldWide</span> </div>}

         {product?.seller?.state && (
          <div className="product-card-timeframe">
            <MapPin size={12} />
            <span>{product?.seller?.city} {product?.seller?.state}</span>
          </div>
        )}

        <div className="product-card-footer">
          {product.seller && (
            <Link
              to={`/${product.seller.username}`}
              className="product-seller-link"
              onClick={(e) => e.stopPropagation()}
            >
               {product.seller.profile_picture ? (
                <OptimizedImage src={product.seller.profile_picture} alt={product.seller.store_name} width={64} height={64} />
              ) : (
                <span className="seller-initial">{product.seller.store_name?.[0]}</span>
              )}
              <p style={{color: 'var(--ink-muted)'}} className="seller-name">
                {product.seller.store_name}
              </p>
              {product.seller.ninStatus === 'verified' && (
                <BadgeCheck size={12} className="verified-badge-icon" title="Verified seller" />
              )}
              {product.seller.rating > 0 && (
                <span className="inline-rating">
                  <Star size={10} fill="currentColor" /> {product.seller.rating.toFixed(1)}
                </span>
              )} 
            </Link>
          )}

          <div className="product-card-actions">
            <button
              type="button"
              className="view-product-link"
              onClick={(e) => { e.stopPropagation(); setShowModal(true); }}
              style={{ color: 'var(--ink-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <ExternalLink size={13} />
              View
            </button>
              <button className="view-product-link" onClick={()=> handleStartChat()}>
                      <MessageCircle size={14} /> Start chat
              </button>
            {(product.seller?.contact || product.seller?.whatsapp) && (
              <button
                type="button"
                className="product-card-icon-btn"
                onClick={(e) => { e.stopPropagation(); setShowContact((v) => !v); }}
                aria-label="Show contact"
              >
                <Phone size={13} />
              </button>
            )}
          </div>
        </div>

        {showContact && (product.seller?.contact || product.seller?.whatsapp) && (
          <div className="product-contact-reveal">
            {product.seller.contact && (
              <a href={`tel:${product.seller.contact}`} className="contact-item">
                <Phone size={13} /> <span>{product.seller.contact}</span>
              </a>
            )}
            {product.seller.whatsapp && (
              <a href={`tel:${product.seller.whatsapp}`} className="contact-item">
                <Phone size={13} /> <span>{product.seller.whatsapp}</span>
              </a>
            )}
          </div>
        )}

        {waLink && (
          <a href={waLink} target="_blank" rel="noreferrer" className="wa-btn" onClick={handleWhatsAppClick}>
            <WhatsAppIcon />
            Chat on WhatsApp
          </a>
        )}
      </article>

      {showModal && (
        <ProductDetailModal
          productId={product._id}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
};

export default ProductCard;
