import { useState, useEffect, useCallback } from 'react';
import { Wallet, TrendingUp, Clock, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import api from '../../utils/api';
import './AdminRevenue.css';

const STATUS_FILTERS = [
  { key: '', label: 'All' },
  { key: 'success', label: 'Success' },
  { key: 'pending', label: 'Pending' },
  { key: 'failed', label: 'Failed' },
];

const STATUS_BADGE = {
  success: { color: '#1ebe5d', label: 'Success' },
  pending: { color: '#b8923a', label: 'Pending' },
  failed:  { color: '#e0453c', label: 'Failed' },
};

export default function AdminRevenue() {
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/payments/admin/summary').then(res => setSummary(res.data)).catch(() => {});
  }, []);

  const loadTransactions = useCallback(() => {
    setLoading(true);
    api.get('/payments/admin/transactions', { params: { page, limit: 15, status: status || undefined } })
      .then(res => {
        setTransactions(res.data.transactions || []);
        setPagination(res.data.pagination);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, status]);

  useEffect(() => { loadTransactions(); }, [loadTransactions]);

  return (
    <AdminLayout title="Revenue">
      <div className="fade-up">
        <div className="revenue-stats-grid">
          <div className="revenue-stat-card revenue-stat-primary">
            <Wallet size={20} />
            <span className="revenue-stat-label">Total Revenue</span>
            <strong>₦{(summary?.totalRevenue || 0).toLocaleString()}</strong>
          </div>
          <div className="revenue-stat-card">
            <TrendingUp size={20} />
            <span className="revenue-stat-label">Successful Transactions</span>
            <strong>{summary?.totalTransactions || 0}</strong>
          </div>
          <div className="revenue-stat-card">
            <Clock size={20} />
            <span className="revenue-stat-label">Pending</span>
            <strong>{summary?.pendingCount || 0}</strong>
          </div>
          <div className="revenue-stat-card">
            <XCircle size={20} />
            <span className="revenue-stat-label">Failed</span>
            <strong>{summary?.failedCount || 0}</strong>
          </div>
        </div>

        {summary?.byPlan?.length > 0 && (
          <div className="revenue-by-plan">
            {summary.byPlan.map(p => (
              <div key={p._id} className="revenue-by-plan-item">
                <span>{p._id} plan</span>
                <strong>₦{p.revenue.toLocaleString()}</strong>
                <span className="revenue-by-plan-count">{p.count} upgrade{p.count === 1 ? '' : 's'}</span>
              </div>
            ))}
          </div>
        )}

        <div className="card" style={{ padding: '1.25rem', marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h3>All Transactions</h3>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              {STATUS_FILTERS.map(f => (
                <button
                  key={f.key}
                  className={`btn btn-sm ${status === f.key ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => { setStatus(f.key); setPage(1); }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="revenue-table-wrap">
            <table className="revenue-table">
              <thead>
                <tr>
                  <th>Seller</th>
                  <th>Plan</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Reference</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>Loading…</td></tr>
                ) : transactions.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--ink-muted)' }}>No transactions found.</td></tr>
                ) : transactions.map(t => (
                  <tr key={t._id}>
                    <td>
                      <strong>{t.seller?.store_name || 'Unknown'}</strong>
                      <div style={{ fontSize: '0.72rem', color: 'var(--ink-muted)' }}>{t.seller?.email}</div>
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>{t.plan}</td>
                    <td>₦{t.amount.toLocaleString()}</td>
                    <td>
                      <span className="revenue-status-badge" style={{ color: STATUS_BADGE[t.status]?.color }}>
                        {STATUS_BADGE[t.status]?.label || t.status}
                      </span>
                    </td>
                    <td className="revenue-ref">{t.reference}</td>
                    <td>{new Date(t.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="revenue-pagination">
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
    </AdminLayout>
  );
}
