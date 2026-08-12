import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle, Clock } from 'lucide-react';
import AffiliateLayout from '../../components/affiliate/AffiliateLayout';
import api from '../../utils/api';

export default function AffiliateReferrals() {
  const [referrals, setReferrals] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/affiliates/referrals', { params: { page, limit: 15 }, authRole: 'affiliate' })
      .then(res => { setReferrals(res.data.referrals || []); setPagination(res.data.pagination); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => { load(); }, [load]);

  return (
    <AffiliateLayout title="Sellers You Referred">
      <div className="fade-up">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Seller</th>
                <th>Email</th>
                <th>Status</th>
                <th>Plan</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>Loading…</td></tr>
              ) : referrals.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--ink-muted)' }}>
                  No referrals yet — share your link from the Dashboard tab to get started.
                </td></tr>
              ) : referrals.map(r => (
                <tr key={r._id}>
                  <td>
                    <div className="table-seller-info">
                      <div className="table-avatar">
                        {r.seller?.profile_picture ? <img src={r.seller.profile_picture} alt="" /> : <span>{r.seller?.store_name?.[0] || '?'}</span>}
                      </div>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{r.seller?.store_name || 'Deleted seller'}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>@{r.seller?.username}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--ink-muted)' }}>{r.seller?.email || '—'}</td>
                  <td>
                    {r.status === 'upgraded' ? (
                      <span className="btn btn-sm" style={{ background: '#d4f5e2', color: '#166534', border: 'none' }}>
                        <CheckCircle size={12} /> Upgraded
                      </span>
                    ) : (
                      <span className="btn btn-sm" style={{ background: '#fef3c7', color: '#92400e', border: 'none' }}>
                        <Clock size={12} /> Registered
                      </span>
                    )}
                  </td>
                  <td style={{ textTransform: 'capitalize' }}>{r.plan || '—'}</td>
                  <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pagination.totalPages > 1 && (
          <div className="revenue-pagination" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
            <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft size={14} /> Prev
            </button>
            <span>Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)</span>
            <button className="btn btn-outline btn-sm" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>
              Next <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </AffiliateLayout>
  );
}
