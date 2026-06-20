import { Link } from 'react-router-dom';
import { Star, ExternalLink } from 'lucide-react';
import { CATEGORY_ICONS } from '../../utils/constants';
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
          <img src={seller.banner} alt={seller.store_name} />
        ) : (
          <div className="seller-card-banner-placeholder">
            <span>{icon}</span>
          </div>
        )}
        <div className="seller-card-avatar">
          {seller.profile_picture ? (
            <img src={seller.profile_picture} alt={seller.username} />
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
        <h3 className="seller-card-name">{seller.store_name}</h3>
        <p className="seller-card-username">@{seller.username}</p>
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
