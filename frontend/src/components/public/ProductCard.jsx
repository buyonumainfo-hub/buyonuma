import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Clock, Star, X, ExternalLink, Phone, ShoppingCart, Check, BadgeCheck } from 'lucide-react';
import { CATEGORY_ICONS } from '../../utils/constants';
import ProductModal from './ProductModal';
import ProductViewModal from './ProductViewModal';
import { useCart } from '../../context/CartContext';
import { trackView } from '../../utils/trackView';
import OptimizedImage from '../shared/OptimizedImage';
import toast from 'react-hot-toast';
import './ProductCard.css';

const WhatsAppIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const ProductCard = ({ product }) => {
  const [showModal, setShowModal] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const icon = CATEGORY_ICONS[product.category] || '📦';
  const waNumber = product.seller?.whatsapp?.replace(/\D/g, '');
  const waLink = waNumber
    ? `https://wa.me/234${waNumber}?text=${encodeURIComponent(`Hi, I'm interested in your product: ${product.name} (₦${Number(product.price).toLocaleString()})`)}`
    : null;
 const imageCount = (product.images?.length) || (product.product_image ? 1 : 0);
  const { addItem, isInCart } = useCart();
  const inCart = isInCart(product._id);

  const handleAddToCart = (e) => {
    e.stopPropagation();
    addItem(product, 1);
    toast.success(`${product.name} added to cart`);
  };

  const handleWhatsAppClick = () => {
    const sellerId = product.seller?._id || product.seller;
    trackView(sellerId, 'whatsapp_click');
  };

  return (
    <>
      <div className="product-card card">
        <div className="product-card-image">
          {product.product_image ? (
            <OptimizedImage src={product.product_image} alt={product.name} width={400} height={360} />
          ) : (
            <div className="product-card-image-placeholder">
              <span>{icon}</span>
            </div>
          )}
          <span className="badg badge-gold product-category-badge">{product.category}</span>
           
        </div>
           
        <div className="product-card-body">
          <h3 className="product-card-name">{product.name}</h3>
          {product.description && (
            <p className="product-card-desc">{product.description}</p>
          )}
          
          {product.time_frame && (
            <div className="product-card-timeframe">
              <Clock size={12} />
              <span>{product.time_frame}</span>
            </div>
          )}

          <div className="product-card-footer">
            <span className="product-price">₦{Number(product.price).toLocaleString()}</span>
            {product.seller && (
              <Link to={`/${product.seller.username}`} className="product-seller-link">
                {product.seller.profile_picture ? (
                  <OptimizedImage src={product.seller.profile_picture} alt={product.seller.store_name} width={64} height={64} />
                ) : (
                  <span className="seller-initial">{product.seller.store_name?.[0]}</span>
                )}
                <span>{product.seller.store_name}</span>
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
          </div>
           
          <button className="view-product-btn" onClick={() => setShowModal(true)}>
            {imageCount > 1 && <span className=" product-card-timeframe view-productbtn">{imageCount} photos</span>}
          
            <ExternalLink size={13} />
            View Product
          </button>

          <div className="product-card-actions">
            <button className={`btn ${inCart ? 'btn-outline' : 'btn-primary'} product-card-cart-btn`} onClick={handleAddToCart}>
              {inCart ? <><Check size={13} /> In Cart</> : <><ShoppingCart size={13} /> Add to Cart</>}
            </button>
            {(product.seller?.contact || product.seller?.whatsapp) && (
              <button className="btn btn-outline product-card-cart-btn" onClick={(e) => { e.stopPropagation(); setShowContact(v => !v); }}>
                <Phone size={13} /> Contact
              </button>
            )}
          </div>

          {showContact && (product.seller?.contact || product.seller?.whatsapp) && (
            <div className="product-contact-reveal">
              {product.seller.contact && (
                <a href={`tel:${product.seller.contact}`} className="contact-item"><Phone size={13} /> <span>{product.seller.contact}</span></a>
              )}
              {product.seller.whatsapp && (
                <a href={`tel:${product.seller.whatsapp}`} className="contact-item"><Phone size={13} /> <span>{product.seller.whatsapp}</span></a>
              )}
            </div>
          )}

          {waLink && (
            <a href={waLink} target="_blank" rel="noreferrer" className="wa-btn" onClick={handleWhatsAppClick}>
              <WhatsAppIcon />
              Chat on WhatsApp
            </a>
          )}
        </div>
      </div>

      {showModal && (
        <ProductModal product={product} onClose={() => setShowModal(false)} />
      )}
    </>
  );
};

export default ProductCard;
