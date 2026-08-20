import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, MessageCircle, CheckCircle2, CircleDollarSign } from 'lucide-react';
import AffiliateLayout from '../../components/affiliate/AffiliateLayout';
import api from '../../utils/api';

const FILTERS = [
  { key: '', label: 'All' },
  { key: 'false', label: 'Unpaid' },
  { key: 'true', label: 'Paid' },
];

export default function AffiliateEarnings() {
  const [overview, setOverview] = useState(null);
  const [earnings, setEarnings] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [paidFilter, setPaidFilter] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/affiliates/me', { authRole: 'affiliate' }).then(res => setOverview(res.data)).catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/affiliates/earnings', { params: { page, limit: 15, paid: paidFilter || undefined }, authRole: 'affiliate' })
      .then(res => { setEarnings(res.data.earnings || []); setPagination(res.data.pagination); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, paidFilter]);

  useEffect(() => { load(); }, [load]);

  const whatsappNumber = overview?.whatsappNumber;
  const unpaidTotal = overview?.stats?.totalUnpaid || 0;
  const affiliateName = overview?.affiliate?.name || '';

  const whatsappHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
        `Hi, I'm ${affiliateName} — my affiliate earnings dashboard currently shows ₦${unpaidTotal.toLocaleString()} unpaid. I've attached a screenshot of my dashboard for payout.`
      )}`
    : null;

  return (
    <AffiliateLayout title="Earnings">
      <div className="fade-up">
        {/* ── Payout instructions — no in-app withdrawal ── */}
        <div className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <CircleDollarSign size={18} /> Getting Paid
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--ink-muted)', marginBottom: '1rem' }}>
            There's no automatic withdrawal. When you're ready to get paid, take a screenshot of this page
            showing your unpaid total and send it to the BuyOnUma team on WhatsApp — they'll pay you directly
            and mark your earnings as paid.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Unpaid balance</span>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', fontWeight: 700 }}>₦{unpaidTotal.toLocaleString()}</div>
            </div>
            {whatsappHref ? (
              <a href={whatsappHref} target="_blank" rel="noreferrer" className="btn btn-gold">
                <MessageCircle size={16} /> Send Screenshot on WhatsApp
              </a>
            ) : (
              <span style={{ fontSize: '0.8rem', color: 'var(--ink-muted)' }}>
                The team hasn't set up a payout WhatsApp number yet — check back soon.
              </span>
            )}
          </div>
        </div>

        {/* ── Earnings table ── */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
            <h3>Commission History</h3>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              {FILTERS.map(f => (
                <button
                  key={f.key}
                  className={`btn btn-sm ${paidFilter === f.key ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => { setPaidFilter(f.key); setPage(1); }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Seller</th>
                  <th>Plan</th>
                  <th>Payment</th>
                  <th>Commission</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>Loading…</td></tr>
                ) : earnings.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--ink-muted)' }}>No earnings yet.</td></tr>
                ) : earnings.map(e => (
                  <tr key={e._id}>
                    <td>
                      <strong>{e.seller?.store_name || 'Deleted seller'}</strong>
                      <div style={{ fontSize: '0.72rem', color: 'var(--ink-muted)' }}>@{e.seller?.username}</div>
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>{e.plan}</td>
                    <td>₦{e.amount.toLocaleString()}</td>
                    <td>
                      <strong>₦{e.commissionAmount.toLocaleString()}</strong>
                      <div style={{ fontSize: '0.72rem', color: 'var(--ink-muted)' }}>{e.commissionPercent}%</div>
                    </td>
                    <td>
                      {e.paid ? (
                        <span style={{ color: '#1ebe5d', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', fontWeight: 600 }}>
                          <CheckCircle2 size={13} /> Paid
                        </span>
                      ) : (
                        <span style={{ color: '#b8923a', fontSize: '0.8rem', fontWeight: 600 }}>Pending</span>
                      )}
                    </td>
                    <td>{new Date(e.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
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
      </div>
    </AffiliateLayout>
  );
}
