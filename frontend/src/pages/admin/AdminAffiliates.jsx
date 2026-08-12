import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, Ban, CheckCircle, Trash2, X, Settings, ChevronLeft, ChevronRight,
  Percent, MessageCircle, ExternalLink,
} from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export default function AdminAffiliates() {
  const [affiliates, setAffiliates] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const [detailId, setDetailId] = useState(null);
  const [banTarget, setBanTarget] = useState(null); // { affiliate, nextStatus }
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  // Guards against an older, slower `load()` request resolving AFTER a
  // newer one and overwriting the table with stale data — e.g. ban then
  // quickly reinstate: if those two list-reload requests ever raced and
  // completed out of order, the table could get stuck showing the
  // pre-reinstate ("banned") state even though the database was already
  // correct, making a successful reinstate look like it silently failed.
  // Only the response matching the most recently *issued* request is
  // ever applied.
  const requestIdRef = useRef(0);

  const load = useCallback(() => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    api.get('/admin-affiliates', { params: { page, limit: 15, search: search || undefined, status: status || undefined } })
      .then(res => {
        if (requestId !== requestIdRef.current) return; // a newer request already landed — ignore this stale one
        setAffiliates(res.data.affiliates || []);
        setPagination(res.data.pagination);
      })
      .catch(err => {
        if (requestId !== requestIdRef.current) return;
        toast.error(err.response?.data?.message || 'Failed to load affiliates');
      })
      .finally(() => {
        if (requestId === requestIdRef.current) setLoading(false);
      });
  }, [page, search, status]);

  useEffect(() => { load(); }, [load]);

  const handleBanToggle = async () => {
    if (!banTarget) return;
    try {
      const res = await api.patch(`/admin-affiliates/${banTarget.affiliate._id}/ban`, { status: banTarget.nextStatus });
      // Apply the confirmed server response to this row immediately,
      // rather than only relying on the follow-up `load()` — that way
      // the status change is visibly reflected in the table right away
      // even if a background reload is slow, in flight, or (if a status
      // filter is active) about to remove this row from view entirely.
      const updated = res.data.affiliate;
      setAffiliates(prev => prev.map(a => (a._id === updated._id ? { ...a, ...updated } : a)));
      toast.success(banTarget.nextStatus === 'banned' ? 'Affiliate banned' : 'Affiliate reinstated');
      setBanTarget(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/admin-affiliates/${deleteTarget._id}`);
      toast.success('Affiliate deleted');
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <AdminLayout title="Affiliates">
      <div className="admin-page-actions">
        <div className="admin-search">
          <Search size={15} />
          <input
            className="search-input"
            placeholder="Search by name, email, or code…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select className="form-control" style={{ width: 'auto' }} value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="banned">Banned</option>
          </select>
          <button className="btn btn-gold" onClick={() => setShowSettings(true)}>
            <Settings size={15} /> Commission Settings
          </button>
        </div>
      </div>

      {loading ? <div className="spinner" /> : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Affiliate</th>
                  <th>Code</th>
                  <th>Status</th>
                  <th>Referrals</th>
                  <th>Upgraded</th>
                  <th>Total Earned</th>
                  <th>Unpaid</th>
                  <th>Joined</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {affiliates.length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--ink-muted)' }}>No affiliates found.</td></tr>
                ) : affiliates.map(a => (
                  <tr key={a._id} style={{ cursor: 'pointer' }} onClick={() => setDetailId(a._id)}>
                    <td>
                      <strong>{a.name}</strong>
                      <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>{a.email}</div>
                    </td>
                    <td><span className="badge badge-ink">{a.referralCode}</span></td>
                    <td>
                      {a.status === 'active' ? (
                        <span style={{ color: '#166534', fontWeight: 600, fontSize: '0.8rem' }}>Active</span>
                      ) : (
                        <span style={{ color: '#c0392b', fontWeight: 600, fontSize: '0.8rem' }}>Banned</span>
                      )}
                    </td>
                    <td>{a.totalReferrals}</td>
                    <td>{a.totalUpgraded}</td>
                    <td>₦{a.totalEarned.toLocaleString()}</td>
                    <td>₦{a.totalUnpaid.toLocaleString()}</td>
                    <td>{new Date(a.createdAt).toLocaleDateString()}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button
                          className="btn btn-outline btn-sm"
                          title={a.status === 'active' ? 'Ban' : 'Reinstate'}
                          onClick={() => setBanTarget({ affiliate: a, nextStatus: a.status === 'active' ? 'banned' : 'active' })}
                        >
                          {a.status === 'active' ? <Ban size={13} /> : <CheckCircle size={13} />}
                        </button>
                        <button className="btn btn-danger btn-sm" title="Delete" onClick={() => setDeleteTarget(a)}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
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
        </>
      )}

      {detailId && <AffiliateDetailModal id={detailId} onClose={() => setDetailId(null)} onChanged={load} />}

      {banTarget && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setBanTarget(null)}>
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-header"><h3>{banTarget.nextStatus === 'banned' ? 'Ban Affiliate' : 'Reinstate Affiliate'}</h3></div>
            <div className="modal-body">
              <p style={{ fontSize: '0.9rem' }}>
                {banTarget.nextStatus === 'banned'
                  ? `${banTarget.affiliate.name} won't be able to log in or earn new commissions. Their history stays on record.`
                  : `${banTarget.affiliate.name} will be able to log in and earn commissions again.`}
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setBanTarget(null)}>Cancel</button>
              <button className={banTarget.nextStatus === 'banned' ? 'btn btn-danger' : 'btn btn-primary'} onClick={handleBanToggle}>
                {banTarget.nextStatus === 'banned' ? 'Ban' : 'Reinstate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDeleteTarget(null)}>
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-header"><h3>Delete Affiliate</h3></div>
            <div className="modal-body">
              <p style={{ fontSize: '0.9rem' }}>
                Delete {deleteTarget.name}'s affiliate account and all their referral/earnings records? This cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </AdminLayout>
  );
}

/* ========================================================================
   Commission settings modal
   ======================================================================== */

const SettingsModal = ({ onClose }) => {
  const [form, setForm] = useState({ commissionPercent: 10, whatsappNumber: '', creditAdminPlanChanges: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/admin-affiliates/settings')
      .then(res => setForm(res.data.settings))
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/admin-affiliates/settings', {
        commissionPercent: Number(form.commissionPercent),
        whatsappNumber: form.whatsappNumber,
        creditAdminPlanChanges: form.creditAdminPlanChanges,
      });
      toast.success('Settings updated');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <h3><Percent size={16} style={{ verticalAlign: 'middle', marginRight: '0.4rem' }} />Affiliate Program Settings</h3>
          <button onClick={onClose} style={{ border: "none", background: "#f5f5f5", borderRadius: "50%", width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><X size={18} /></button>
        </div>
        {loading ? <div className="modal-body"><div className="spinner" /></div> : (
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Commission Percentage</label>
                <input
                  type="number" min={0} max={100} step="0.5"
                  className="form-control"
                  value={form.commissionPercent}
                  onChange={e => setForm({ ...form, commissionPercent: e.target.value })}
                  required
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--ink-muted)' }}>
                  % of a seller's upgrade payment their referring affiliate earns. Applies to future commissions —
                  past earnings keep the rate they were calculated under.
                </span>
              </div>
              <div className="form-group">
                <label className="form-label">Payout WhatsApp Number</label>
                <input
                  className="form-control"
                  placeholder="2348012345678"
                  value={form.whatsappNumber}
                  onChange={e => setForm({ ...form, whatsappNumber: e.target.value })}
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--ink-muted)' }}>
                  Shown to affiliates on their Earnings tab — they screenshot their dashboard and send it here
                  to request payout. International format, no leading +.
                </span>
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 }}>
                  <input
                    type="checkbox"
                    checked={!!form.creditAdminPlanChanges}
                    onChange={e => setForm({ ...form, creditAdminPlanChanges: e.target.checked })}
                    style={{ width: 16, height: 16 }}
                  />
                  Credit affiliate when admin manually changes a seller's plan
                </label>
                <span style={{ fontSize: '0.72rem', color: 'var(--ink-muted)' }}>
                  When on (default), if you change a referred seller's plan from their edit page to a
                  higher plan, their affiliate earns a commission — exactly as if the seller had paid for
                  it themselves. Turn this off to only credit commissions from real payments.
                </span>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Settings'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

/* ========================================================================
   Affiliate detail modal — referrals, earnings, mark-paid
   ======================================================================== */

const AffiliateDetailModal = ({ id, onClose, onChanged }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('earnings');

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/admin-affiliates/${id}`)
      .then(res => setData(res.data))
      .catch(() => toast.error('Failed to load affiliate details'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const togglePaid = async (earning) => {
    try {
      await api.patch(`/admin-affiliates/earnings/${earning._id}/paid`, { paid: !earning.paid });
      load();
      onChanged();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    }
  };

  const markAllPaid = async () => {
    try {
      const res = await api.patch(`/admin-affiliates/${id}/mark-all-paid`);
      toast.success(`Marked ${res.data.updated} earning(s) as paid`);
      load();
      onChanged();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 720, maxHeight: '85vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h3>{data?.affiliate?.name || 'Affiliate'}</h3>
          <button onClick={onClose} style={{ border: "none", background: "#f5f5f5", borderRadius: "50%", width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><X size={18} /></button>
        </div>

        {loading || !data ? <div className="modal-body"><div className="spinner" /></div> : (
          <div className="modal-body">
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--ink-muted)' }}>
              <span>{data.affiliate.email}</span>
              {data.affiliate.phone && <span><MessageCircle size={13} style={{ verticalAlign: 'middle' }} /> {data.affiliate.phone}</span>}
              <span>Code: <strong>{data.affiliate.referralCode}</strong></span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.6rem', marginBottom: '1.25rem' }}>
              <MiniStat label="Total Earned" value={`₦${data.totals.totalEarned.toLocaleString()}`} />
              <MiniStat label="Paid" value={`₦${data.totals.totalPaid.toLocaleString()}`} />
              <MiniStat label="Unpaid" value={`₦${data.totals.totalUnpaid.toLocaleString()}`} highlight />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <button className={`btn btn-sm ${tab === 'earnings' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('earnings')}>Earnings</button>
              <button className={`btn btn-sm ${tab === 'referrals' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('referrals')}>Referred Sellers</button>
              {tab === 'earnings' && data.totals.totalUnpaid > 0 && (
                <button className="btn btn-gold btn-sm" style={{ marginLeft: 'auto' }} onClick={markAllPaid}>
                  Mark All Paid
                </button>
              )}
            </div>

            {tab === 'earnings' ? (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr><th>Seller</th><th>Plan</th><th>Commission</th><th>Status</th><th>Date</th><th></th></tr>
                  </thead>
                  <tbody>
                    {data.earnings.length === 0 ? (
                      <tr><td colSpan={6} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--ink-muted)' }}>No earnings yet.</td></tr>
                    ) : data.earnings.map(e => (
                      <tr key={e._id}>
                        <td>{e.seller?.store_name || 'Deleted seller'}</td>
                        <td style={{ textTransform: 'capitalize' }}>{e.plan}</td>
                        <td>₦{e.commissionAmount.toLocaleString()} <span style={{ color: 'var(--ink-muted)', fontSize: '0.72rem' }}>({e.commissionPercent}%)</span></td>
                        <td>{e.paid ? <span style={{ color: '#166534', fontSize: '0.8rem' }}>Paid</span> : <span style={{ color: '#92400e', fontSize: '0.8rem' }}>Pending</span>}</td>
                        <td>{new Date(e.createdAt).toLocaleDateString()}</td>
                        <td>
                          <button className={`btn btn-sm ${e.paid ? 'btn-outline' : 'btn-primary'}`} onClick={() => togglePaid(e)}>
                            {e.paid ? 'Mark Unpaid' : 'Mark Paid'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr><th>Seller</th><th>Email</th><th>Status</th><th>Plan</th><th>Referred On</th></tr>
                  </thead>
                  <tbody>
                    {data.referrals.length === 0 ? (
                      <tr><td colSpan={5} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--ink-muted)' }}>No referrals yet.</td></tr>
                    ) : data.referrals.map(r => (
                      <tr key={r._id}>
                        <td>{r.seller?.store_name || 'Deleted seller'}</td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--ink-muted)' }}>{r.seller?.email || '—'}</td>
                        <td style={{ textTransform: 'capitalize' }}>{r.status}</td>
                        <td style={{ textTransform: 'capitalize' }}>{r.plan || '—'}</td>
                        <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const MiniStat = ({ label, value, highlight }) => (
  <div style={{ background: highlight ? '#fef3c7' : '#f7f5f0', borderRadius: 10, padding: '0.7rem 0.85rem' }}>
    <div style={{ fontSize: '0.68rem', color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{label}</div>
    <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{value}</div>
  </div>
);
