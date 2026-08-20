import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { X, Star, MapPin, BadgeCheck, ShoppingCart, Check, MessageCircle, ChevronLeft, ChevronRight, Phone } from 'lucide-react';
import OptimizedImage from '../shared/OptimizedImage';
import SafetyBanner from '../shared/SafetyBanner';
import { CATEGORY_ICONS } from '../../utils/constants';
import { useCart } from '../../context/CartContext';
import { useBuyerAuth } from '../../context/BuyerAuthContext';
import { trackView } from '../../utils/trackView';
import { setPendingChatIntent } from '../../utils/pendingChat';
import useProductDetail from '../../hooks/useProductDetail';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import './ProductDetailModal.css';

const WhatsAppIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

export default function ProductDetailModal({ productId, onClose }) {
  const navigate = useNavigate();
  const [activeIdx, setActiveIdx] = useState(0);
  const { addItem, isInCart } = useCart();
  const { isAuthenticated } = useBuyerAuth();

  const {
    data, loading, reviews,
    relatedProducts, relatedPagination, loadingMoreRelated,
    loadMoreRelated,
  } = useProductDetail(productId);
  const waNumber = data?.product?.seller?.whatsapp?.replace(/\D/g, '');
  const waLink = waNumber
    ? `https://wa.me/234${waNumber}?text=${encodeURIComponent(`Hi, I'm interested in your product: ${data?.product?.name} (₦${Number(data?.product?.price).toLocaleString()})`)}`
    : null;

  // Lock background scroll + close on Escape
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  useEffect(() => { setActiveIdx(0); }, [productId]);

  const handleWhatsAppClick = () => {
      const sellerId = data?.product?.seller?._id;
      trackView(sellerId, 'whatsapp_click');
    };

  const handleStartChat = async () => {
    if (!isAuthenticated) {
      // Remember who they were trying to message so BuyerAuth.jsx can
      // resume this exact conversation right after they sign in — see
      // utils/pendingChat.js.
      setPendingChatIntent({ sellerId: data.product.seller._id, productId: data.product._id });
      onClose();
      navigate('/buyer/login');
      return;
    }
    try {
      await api.post('/messages/conversations', {
        sellerId: data.product.seller._id,
        productId: data.product._id,
      }, { authRole: 'buyer' });
      onClose();
      navigate('/buyer/dashboard');
      toast.success('Conversation started — find it under Messages');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not start chat');
    }
  };

  const handleLoadMore = async () => {
    try { await loadMoreRelated(); }
    catch { toast.error('Could not load more products'); }
  };

  const modal = (
    <div className="pdm-overlay" onClick={onClose}>
      <div className="pdm-panel" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="pdm-close" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>

       

                {loading && (
          <div className="pdp-wrap pdm-wrap">
            <div className="pdp-grid">
              <div className="pdp-gallery">
                <div className="pdm-skel pdm-skel-image" />
              </div>
              <div className="pdp-info">
                <div className="pdm-skel pdm-skel-badge" />
                <div className="pdm-skel pdm-skel-title" />
                <div className="pdm-skel pdm-skel-price" />
                <div className="pdm-skel pdm-skel-line" />
                <div className="pdm-skel pdm-skel-line" style={{ width: '80%' }} />
                <div className="pdm-skel pdm-skel-seller-card" />
                <div className="pdm-skel pdm-skel-actions" />
              </div>
            </div>
          </div>
        )}

        {!loading && !data?.product && (
          <div className="pdm-status">Product not found.</div>
        )}

        {!loading && data?.product && (() => {
          const { product, sellerInfo } = data;
          const images = product.images?.length ? product.images : (product.product_image ? [product.product_image] : []);
          const icon = CATEGORY_ICONS[product.category] || '📦';
          const inCart = isInCart(product._id);

          return (
            <div className="pdp-wrap pdm-wrap">
              <div className="pdp-grid">
                <div className="pdp-gallery">
                  {images.length > 0 ? (
                    <>
                      <OptimizedImage src={images[activeIdx]} alt={product.name} className="pdp-main-image" width={800} priority />
                    
                      {images.length > 1 && (
                        <div className="pvm-thumbs">
                          {images.map((img, i) => (
                            <button key={i} className={`pvm-thumb ${i === activeIdx ? 'active' : ''}`} onClick={() => setActiveIdx(i)}>
                              <OptimizedImage src={img} alt="" width={100} height={100} />
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="pdp-main-image pdp-placeholder"><span>{icon}</span></div>
                  )}
                </div>

                <div className="pdp-info">
                  <span className="badge badge-gold">{product.category}{product.subcategory ? ` · ${product.subcategory}` : ''}</span>
                  <h1>{product.name}</h1>
                  <p className="pdp-price">₦{Number(product.price).toLocaleString()}</p>
                  {product.description && <p className="pdp-desc">{product.description}</p>}

                  <div className="pdp-seller-card">
                    <Link to={`/${product.seller.username}`} className="pdp-seller-top" onClick={onClose}>
                      {product.seller.profile_picture
                        ? <OptimizedImage src={product.seller.profile_picture} alt="" width={56} height={56} />
                        : <span className="seller-initial">{product.seller.store_name?.[0]}</span>}
                      <div>
                        <strong style={{ fontSize: '1.1rem', color: 'whitesmoke' }}>{product.seller.store_name}</strong>
                        {sellerInfo?.isVerified && <BadgeCheck size={14} className="verified-badge-icon" title="Verified seller" />}
                        {sellerInfo?.location && (
                          <span className="pdp-seller-loc"><MapPin size={12} /> {sellerInfo.location}</span>
                        )}
                      </div>
                    </Link>
                    <div className="pdp-seller-stats">
                      {product.seller.rating > 0 && (
                        <span><Star size={13} fill="currentColor" /> {product.seller.rating.toFixed(1)}</span>
                      )}
                      <span>{sellerInfo?.reviewCount || 0} review{sellerInfo?.reviewCount === 1 ? '' : 's'}</span>
                    </div>
                    <button className="btn btn-outline btn-sm" onClick={handleStartChat} style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem',fontSize: '1.1rem', color: 'whitesmoke'  }}>
                      <MessageCircle size={14} /> Chat with seller
                    </button>

                   < br/>
                  {waLink && (
                    <a href={waLink} target="_blank" rel="noreferrer" className="wa-btn" onClick={handleWhatsAppClick}>
                      <WhatsAppIcon />
                      Chat on WhatsApp
                    </a>
                  )}
                  </div>

                  <SafetyBanner />

                  <div className="pdp-actions">
                    <button className={`btn ${inCart ? 'btn-outline' : 'btn-primary'}`} onClick={() => { addItem(product, 1); toast.success('Added to cart'); }}>
                      {inCart ? <><Check size={15} /> In Cart</> : <><ShoppingCart size={15} /> Add to Cart</>}
                    </button>
                    {product.seller.contact && (
                      <a href={`tel:${product.seller.contact}`} className="btn btn-outline"><Phone size={14} /> Call</a>
                    )}
                  </div>
                </div>
              </div>

              {reviews.length > 0 && (
                <section className="pdp-reviews">
                  <h2>What buyers say</h2>
                  {reviews.slice(0, 6).map(r => (
                    <div key={r._id} className="pdp-review" style={{borderBottom: '2px solid white', borderRadius: '20px'}}>
                      <div className="pdp-review-head">
                        <strong>{r.buyer?.name || 'Buyer'}</strong>
                        <span>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                      </div>
                      {r.comment && <p>{r.comment}</p>}
                      {r.sellerReply && <p className="pdp-seller-reply" style={{color: 'whitesmoke'}}><strong>Seller reply:</strong> {r.sellerReply}</p>}
                    </div>
                  ))}
                </section>
              )}

              {relatedProducts?.length > 0 && (
                <section className="pdp-related">
                  <h2>You might also like</h2>
                  <div className="pdp-related-grid">
                    {relatedProducts.map(p => (
                      <Link key={p._id} to={`/product/${p._id}`} className="pdp-related-card" onClick={onClose}>
                        <OptimizedImage src={p.product_image} alt={p.name} width={200} height={200} />
                        <strong >{p.name}</strong>
                        <span>₦{Number(p.price).toLocaleString()}</span>
                      </Link>
                    ))}
                  </div>
                  {(relatedPagination ? relatedPagination.page < relatedPagination.totalPages : relatedProducts.length >= 8) && (
                    <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
                      <button className="btn btn-outline" onClick={handleLoadMore} disabled={loadingMoreRelated}>
                        {loadingMoreRelated ? 'Loading…' : 'Load More'}
                      </button>
                    </div>
                  )}
                </section>
              )}
            </div>
          );
        })()}

      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
