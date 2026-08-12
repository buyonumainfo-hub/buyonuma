import { useState, useEffect, useCallback } from 'react';
import { Star, CornerDownRight } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

// Lets a seller see every review left on their store and reply publicly
// to each one (one reply per review — see backend routes/reviews.js
// POST /:id/reply). This is the seller-side counterpart to the buyer's
// "Rate Seller" button on SellerDetailPage.
export default function SellerReviewsPanel({ sellerId }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyDrafts, setReplyDrafts] = useState({});
  const [savingId, setSavingId] = useState(null);

  const load = useCallback(() => {
    if (!sellerId) return;
    api.get(`/reviews/seller/${sellerId}`, { params: { limit: 50 } })
      .then(res => setReviews(res.data.reviews || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [sellerId]);

  useEffect(() => { load(); }, [load]);

  const handleReply = async (reviewId) => {
    const reply = (replyDrafts[reviewId] || '').trim();
    if (!reply) return;
    setSavingId(reviewId);
    try {
      await api.post(`/reviews/${reviewId}/reply`, { reply }, { authRole: 'seller' });
      toast.success('Reply posted');
      setReplyDrafts(d => ({ ...d, [reviewId]: '' }));
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to post reply');
    } finally { setSavingId(null); }
  };

  if (loading) return null;
  if (reviews.length === 0) {
    return <p style={{ color: 'var(--ink-muted)', fontSize: '0.85rem' }}>No reviews yet.</p>;
  }

  return (
    <div style={{ display: 'grid', gap: '0.75rem' }}>
      {reviews.map(r => (
        <div key={r._id} className="card" style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
            <strong>{r.buyer?.name || 'Buyer'}</strong>
            <span style={{ color: '#b8923a' }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
          </div>
          {r.comment && <p style={{ fontSize: '0.85rem', color: 'var(--ink-muted)', marginTop: '0.4rem' }}>{r.comment}</p>}

          {r.sellerReply ? (
            <p style={{ fontSize: '0.8rem', background: '#faf8f3', borderRadius: 8, padding: '0.5rem', marginTop: '0.5rem' }}>
              <CornerDownRight size={12} style={{ verticalAlign: 'middle' }} /> <strong>Your reply:</strong> {r.sellerReply}
            </p>
          ) : (
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem' }}>
              <input
                className="form-control"
                placeholder="Write a public reply…"
                value={replyDrafts[r._id] || ''}
                onChange={e => setReplyDrafts(d => ({ ...d, [r._id]: e.target.value }))}
              />
              <button className="btn btn-outline btn-sm" onClick={() => handleReply(r._id)} disabled={savingId === r._id}>
                {savingId === r._id ? '…' : 'Reply'}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
