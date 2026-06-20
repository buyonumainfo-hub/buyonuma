import { useState, useEffect} from 'react';
import { X, ChevronLeft, ChevronRight, Clock, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CATEGORY_ICONS } from '../../utils/constants';
import './ProductViewModal.css';

const WaIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>);

export default function ProductViewModal({ product, onClose }) {
  const images = (product.images && product.images.length > 0)
    ? product.images
    : (product.product_image ? [product.product_image] : []);


  const [activeIdx, setActiveIdx] = useState(0);
  const icon = CATEGORY_ICONS[product.category] || '📦';
  const waNum = product.seller?.whatsapp?.replace(/\D/g, '');
  const waLink = waNum
    ? `https://wa.me/234${waNum}?text=${encodeURIComponent(`Hi, I'm interested in: ${product.name} (₦${Number(product.price).toLocaleString()})`)}`
    : null;

  const prev = () => setActiveIdx(i => (i === 0 ? images.length - 1 : i - 1));
  const next = () => setActiveIdx(i => (i === images.length - 1 ? 0 : i + 1));

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal product-view-modal">
        <div className="modal-header">
          <h3 style={{ fontFamily:'var(--font-serif)', fontSize:'1.05rem' }}>Product Details</h3>
          <button className="btn btn-outline btn-sm" onClick={onClose}><X size={15}/></button>
        </div>
        <div className="modal-body" style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>

          {/* Image gallery */}
          <div className="pvm-gallery">
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
          </div>

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

          {/* Details */}
          <div className="pvm-details">
            <div className="pvm-details-top">
              <span className="badge badge-gold">{product.category}</span>
              <span className="pvm-price">₦{Number(product.price).toLocaleString()}</span>
            </div>
            <h2 className="pvm-name">{product.name}</h2>
            {product.description && <p className="pvm-desc">{product.description}</p>}
            {product.time_frame && <div className="pvm-timeframe"><Clock size={14}/><span>{product.time_frame}</span></div>}

            {product.seller && (
              <Link to={`/sellers/${product.seller._id}`} className="pvm-seller-link">
                {product.seller.profile_picture ? <img src={product.seller.profile_picture} alt={product.seller.store_name}/> : <span className="seller-initial">{product.seller.store_name?.[0]}</span>}
                <div>
                  <p className="pvm-seller-name">{product.seller.store_name}</p>
                  {product.seller.rating > 0 && <span className="inline-rating"><Star size={11} fill="currentColor"/> {product.seller.rating.toFixed(1)}</span>}
                </div>
              </Link>
            )}

            {waLink && <a href={waLink} target="_blank" rel="noreferrer" className="wa-btn" style={{ marginTop:'0.5rem' }}><WaIcon/> Chat on WhatsApp</a>}
          </div>
        </div>
      </div>
    </div>
  );
}
