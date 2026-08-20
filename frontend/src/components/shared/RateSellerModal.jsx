import { useState } from 'react';
import { X, Star } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import './RateSellerModal.css';

export default function RateSellerModal({ sellerId, onClose, onSubmitted }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) return toast.error('Pick a star rating first');
    setSaving(true);
    try {
      await api.post(`/reviews/seller/${sellerId}`, { rating, comment }, { authRole: 'buyer' });
      toast.success('Thanks for the review!');
      onSubmitted?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review');
    } finally { setSaving(false); }
  };

  return (
    <div className="rate-modal-overlay" onClick={onClose}>
      <div className="rate-modal" onClick={e => e.stopPropagation()}>
        <button className="rate-modal-close" onClick={onClose}><X size={18} /></button>
        <h3>Rate this seller</h3>
        <form onSubmit={handleSubmit}>
          <div className="rate-modal-stars">
            {[1, 2, 3, 4, 5].map(n => (
              <button type="button" key={n} onClick={() => setRating(n)} onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}>
                <Star size={30} fill={(hover || rating) >= n ? '#b8923a' : 'none'} color="#b8923a" />
              </button>
            ))}
          </div>
          <textarea
          style={{color: 'var(--ink-normal)', fontSize: '0.875rem'}}
            className="form-control"
            rows={3}
            placeholder="Optional — share your experience with this seller"
            value={comment}
            onChange={e => setComment(e.target.value)}
            maxLength={1000}
          />
          <button type="submit" className="btn btn-gold" style={{ width: '100%', justifyContent: 'center', marginTop: '0.75rem' }} disabled={saving}>
            {saving ? 'Submitting…' : 'Submit Review'}
          </button>
        </form>
      </div>
    </div>
  );
}
