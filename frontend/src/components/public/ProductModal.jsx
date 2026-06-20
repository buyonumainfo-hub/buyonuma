import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Clock, Star, X, ExternalLink , ChevronLeft, ChevronRight} from 'lucide-react';
import { CATEGORY_ICONS } from '../../utils/constants';
import './ProductCard.css';


const WhatsAppIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

export default function ProductModal({ product, onClose }){
  const images = (product.images && product.images.length > 0)
    ? product.images
    : (product.product_image ? [product.product_image] : []);
    const [activeIdx, setActiveIdx] = useState(0);
  const icon = CATEGORY_ICONS[product.category] || '📦';
  const waNumber = product.seller?.whatsapp?.replace(/\D/g, '');
  const waLink = waNumber
    ? `https://wa.me/234${waNumber}?text=${encodeURIComponent(`Hi, I'm interested in your product: ${product.name} (₦${Number(product.price).toLocaleString()})`)}`
    : null;
  const prev = () => setActiveIdx(i => (i === 0 ? images.length - 1 : i - 1));
  const next = () => setActiveIdx(i => (i === images.length - 1 ? 0 : i + 1));

  // Lock body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return createPortal(
    <div className="product-modal-backdrop" onClick={handleBackdropClick}>
      <div className="product-modal" role="dialog" aria-modal="true" aria-label={product.name}>
        <button className="product-modal-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
        {/* Scrollable details section */}
        <div className="product-modal-body">
        {/* Full image — fixed height, never shrinks */}
        <div className="product-modal-image">
           {/* Image gallery */}
          
            {images.length > 0 ? (
              <>
                <img src={images[activeIdx]} alt={product.name} className="pvm-main-image" />
                {images.length > 1 && (
                  <>
                    <button className="pvm-nav pvm-nav-left" onClick={prev}><ChevronLeft size={20}/></button>
                    <button className="pvm-nav pvm-nav-right" onClick={next}><ChevronRight size={20}/></button>
                    <span className="pvm-counter">{activeIdx+1} / {images.length}</span>
                  </>
                )}
              </>
            ) : (
              <div className="pvm-main-image pvm-placeholder"><span>{icon}</span></div>
            )}
          

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="pvm-thumbs">
              {images.map((img, i) => (
                <button key={i} className={`pvm-thumb ${i===activeIdx?'active':''}`} onClick={() => setActiveIdx(i)}>
                  <img src={img} alt={`${product.name} ${i+1}`} />
                </button>
              ))}
            </div>
          )}

          <span className="badge badge-gold product-category-badge">{product.category}</span>
          
        </div>


          <h2 className="product-modal-name">{product.name}</h2>
          <p className="product-modal-price">₦{Number(product.price).toLocaleString()}</p>

          {product.description && (
            <>
              <hr className="product-modal-divider" />
              <p className="product-modal-desc">{product.description}</p>
            </>
          )}

          {product.time_frame && (
            <div className="product-card-timeframe">
              <Clock size={12} />
              <span>{product.time_frame}</span>
            </div>
          )}

          {product.seller && (
            <>
              <hr className="product-modal-divider" />
              <Link
                to={`/${product.seller.username}`}
                className="product-seller-link product-modal-seller"
                onClick={onClose}
              >
                {product.seller.profile_picture ? (
                  <img src={product.seller.profile_picture} alt={product.seller.store_name} />
                ) : (
                  <span className="seller-initial">{product.seller.store_name?.[0]}</span>
                )}
                <span>{product.seller.store_name}</span>
                {product.seller.rating > 0 && (
                  <span className="inline-rating">
                    <Star size={10} fill="currentColor" /> {product.seller.rating.toFixed(1)}
                  </span>
                )}
              </Link>
            </>
          )}

          {waLink && (
            <a href={waLink} target="_blank" rel="noreferrer" className="wa-btn">
              <WhatsAppIcon />
              Chat on WhatsApp
            </a>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

