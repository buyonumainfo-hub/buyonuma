import { Link } from 'react-router-dom';
import { Star, ExternalLink, MapPin, BadgeCheck } from 'lucide-react';
import { CATEGORY_ICONS } from '../../utils/constants';
import OptimizedImage from '../shared/OptimizedImage';
import './SellerCard.css';

const Stars = ({ rating }) => (
  <div className="stars" aria-label={`${rating} stars`}>
    {[1, 2, 3, 4, 5].map(i => (
      <Star
        key={i}
        size={13}
        fill={i <= Math.round(rating) ? 'currentColor' : 'none'}
        strokeWidth={1.5}
      />
    ))}
    <span className="rating-num">{rating?.toFixed(1) || '0.0'}</span>
  </div>
);

const SellerCard = ({ seller }) => {
  const icon = CATEGORY_ICONS[seller.category] || '📦';

  return (
    <Link to={`/${seller.username}`} className="seller-card card">
      <div className="seller-card-banner">
        {seller.banner ? (
          <OptimizedImage src={seller.banner} alt={seller.store_name} width={560} height={240} />
        ) : (
          <div className="seller-card-banner-placeholder">
            <span>{icon}</span>
          </div>
        )}
        {seller.ninStatus === 'verified' && (
          <span className="seller-card-verified-pill" title="This seller has completed NIN + face verification">
            <BadgeCheck size={12} /> Verified
          </span>
        )}
        <div className="seller-card-avatar">
          {seller.profile_picture ? (
            <OptimizedImage src={seller.profile_picture} alt={seller.username} width={96} height={96} />
          ) : (
            <span>{seller.store_name?.[0]?.toUpperCase()}</span>
          )}
        </div>
      </div>
      <div className="seller-card-body">
        <div className="seller-card-meta">
          <span className="badge badge-gold">{seller.category}</span>
          <Stars rating={seller.rating} />
        </div>
        <h3 className="seller-card-name">
          {seller.store_name}
          {seller.ninStatus === 'verified' && (
            <BadgeCheck size={15} className="verified-badge-icon" title="Verified seller" />
          )}
        </h3>
        <p className="seller-card-username">@{seller.username}</p>
        {(seller.city || seller.state) && (
          <p className="seller-card-username" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <MapPin size={12} />
            {seller.city ? `${seller.city}, ${seller.state}` : seller.state}
          </p>
        )}
        {seller.description && (
          <p className="seller-card-desc">{seller.description}</p>
        )}
        <div className="seller-card-footer">
          <span className="seller-card-cta">
            View Store <ExternalLink size={13} />
          </span>
        </div>
      </div>
    </Link>
  );
};

export default SellerCard;
