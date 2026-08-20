import { useEffect, useState } from 'react';
<<<<<<< HEAD
import { BadgeCheck, X, Clock, Loader2, ShieldAlert, ShieldOff, Eye } from 'lucide-react';
=======
import { BadgeCheck, X, Clock, Loader2 } from 'lucide-react';
>>>>>>> b403b42571a91fae11e3332f19cf5691d2aba20a
import AdminLayout from '../../components/admin/AdminLayout';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import './AdminVerification.css';

<<<<<<< HEAD
const STATUS_BADGE = {
  pending:  { label: 'Pending',  color: '#b8923a', icon: Clock },
  verified: { label: 'Verified', color: '#1ebe5d', icon: BadgeCheck },
  rejected: { label: 'Rejected', color: '#e0453c', icon: ShieldAlert },
};

// Full details for one seller's verification submission (name, NIN, BVN,
// photo) — fetched on demand when the admin clicks into a row, rather
// than shipped in the list response. Only ever reachable by an
// authenticated admin with the verification.review permission.
function DetailModal({ sellerId, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get(`/verification/nin/${sellerId}/details`, { authRole: 'admin' })
      .then((res) => { if (!cancelled) setDetail(res.data.seller); })
      .catch((err) => toast.error(err.response?.data?.message || 'Failed to load details'))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [sellerId]);

  return (
    <div className="admin-verification-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="admin-verification-modal card">
        <div className="admin-verification-modal-header">
          <h3>Verification Details</h3>
          <button className="sp-modal-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><div className="spinner" /></div>
        ) : !detail ? (
          <p className="admin-verification-meta">Could not load this submission.</p>
        ) : (
          <div className="admin-verification-modal-body">
            {detail.ninPhoto && (
              <img src={detail.ninPhoto} alt={`${detail.store_name} verification submission`} className="admin-verification-photo-lg" />
            )}
            <div className="admin-verification-detail-rows">
              <div className="admin-verification-detail-row"><span>Store</span><strong>{detail.store_name}</strong></div>
              <div className="admin-verification-detail-row"><span>Username</span><strong>@{detail.username}</strong></div>
              <div className="admin-verification-detail-row"><span>Email</span><strong>{detail.email}</strong></div>
              <div className="admin-verification-detail-row"><span>Full name on ID</span><strong>{detail.ninFullName || '—'}</strong></div>
              <div className="admin-verification-detail-row"><span>NIN</span><strong>{detail.nin || '—'}</strong></div>
              <div className="admin-verification-detail-row"><span>BVN</span><strong>{detail.bvn || 'Not provided'}</strong></div>
              <div className="admin-verification-detail-row"><span>Status</span><strong>{detail.ninStatus}</strong></div>
              {detail.ninVerifiedAt && (
                <div className="admin-verification-detail-row"><span>Verified on</span><strong>{new Date(detail.ninVerifiedAt).toLocaleDateString()}</strong></div>
              )}
              {detail.ninRejectionReason && (
                <div className="admin-verification-detail-row"><span>Rejection reason</span><strong>{detail.ninRejectionReason}</strong></div>
              )}
              <div className="admin-verification-detail-row"><span>Submitted</span><strong>{new Date(detail.createdAt).toLocaleDateString()}</strong></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const AdminVerification = () => {
  const [tab, setTab] = useState('pending'); // 'pending' | 'log'
  const [pending, setPending] = useState([]);
  const [log, setLog] = useState([]);
=======
const AdminVerification = () => {
  const [pending, setPending] = useState([]);
>>>>>>> b403b42571a91fae11e3332f19cf5691d2aba20a
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
<<<<<<< HEAD
  const [viewingId, setViewingId] = useState(null);
=======
>>>>>>> b403b42571a91fae11e3332f19cf5691d2aba20a

  const fetchPending = async () => {
    setLoading(true);
    try {
      const res = await api.get('/verification/nin/pending', { authRole: 'admin' });
      setPending(res.data.sellers || []);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to load pending verifications');
    } finally {
      setLoading(false);
    }
  };

<<<<<<< HEAD
  const fetchLog = async () => {
    setLoading(true);
    try {
      const res = await api.get('/verification/nin/log', { authRole: 'admin' });
      setLog(res.data.sellers || []);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to load verification log');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'pending') fetchPending();
    else fetchLog();
  }, [tab]);
=======
  useEffect(() => { fetchPending(); }, []);
>>>>>>> b403b42571a91fae11e3332f19cf5691d2aba20a

  const handleApprove = async (id) => {
    setActingId(id);
    try {
      await api.patch(`/verification/nin/${id}/review`, { status: 'verified' }, { authRole: 'admin' });
      toast.success('Seller verified');
      setPending((prev) => prev.filter((s) => s._id !== id));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve');
    } finally {
      setActingId(null);
    }
  };

  const handleReject = async (id) => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    setActingId(id);
    try {
      await api.patch(`/verification/nin/${id}/review`, { status: 'rejected', rejectionReason: rejectReason.trim() }, { authRole: 'admin' });
      toast.success('Verification rejected');
      setPending((prev) => prev.filter((s) => s._id !== id));
      setRejectingId(null);
      setRejectReason('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject');
    } finally {
      setActingId(null);
    }
  };

<<<<<<< HEAD
  const list = tab === 'pending' ? pending : log;
=======
  if (loading) {
    return (
      <AdminLayout title="Verification Queue">
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><div className="spinner" /></div>
      </AdminLayout>
    );
  }
>>>>>>> b403b42571a91fae11e3332f19cf5691d2aba20a

  return (
    <AdminLayout title="Verification Queue">
      <p className="admin-verification-desc">
<<<<<<< HEAD
        Sellers who have submitted for the verified badge. No automated identity-checking
        service is used anywhere in this flow — every submission is logged here for manual
        review. Click a row to see the full submission (name, NIN, BVN, photo).
      </p>

      <div className="admin-verification-tabs">
        <button className={`admin-verification-tab ${tab === 'pending' ? 'is-active' : ''}`} onClick={() => setTab('pending')}>
          <Clock size={13} /> Pending Queue {pending.length > 0 && tab === 'pending' ? `(${pending.length})` : ''}
        </button>
        <button className={`admin-verification-tab ${tab === 'log' ? 'is-active' : ''}`} onClick={() => setTab('log')}>
          <ShieldOff size={13} /> Verification Log
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><div className="spinner" /></div>
      ) : list.length === 0 ? (
        <div className="empty-state">
          <BadgeCheck size={36} />
          <p>{tab === 'pending' ? 'No pending verification requests.' : 'No verification submissions yet.'}</p>
        </div>
      ) : (
        <div className="admin-verification-list">
          {list.map((s) => {
            const badge = STATUS_BADGE[s.ninStatus] || STATUS_BADGE.pending;
            const BadgeIcon = badge.icon;
            return (
              <div key={s._id} className="admin-verification-row card admin-verification-row--clickable" onClick={() => setViewingId(s._id)}>
                <div className="admin-verification-info">
                  <p className="admin-verification-name">{s.store_name}</p>
                  <p className="admin-verification-meta">@{s.username} · {s.email}</p>
                  <p className="admin-verification-meta" style={{ color: badge.color }}>
                    <BadgeIcon size={12} /> {badge.label}
                  </p>
                  <p className="admin-verification-meta"><Clock size={12} /> Submitted {new Date(s.createdAt).toLocaleDateString()}</p>
                </div>

                <div className="admin-verification-actions" onClick={(e) => e.stopPropagation()}>
                  <button className="btn btn-outline btn-sm" onClick={() => setViewingId(s._id)}>
                    <Eye size={13} /> View Details
                  </button>

                  {tab === 'pending' && (
                    rejectingId === s._id ? (
                      <div className="admin-verification-reject-form">
                        <input
                          className="form-control"
                          placeholder="Reason for rejection…"
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          maxLength={500}
                        />
                        <button className="btn btn-outline btn-sm" onClick={() => { setRejectingId(null); setRejectReason(''); }}>Cancel</button>
                        <button className="btn btn-primary btn-sm" disabled={actingId === s._id} onClick={() => handleReject(s._id)}>
                          {actingId === s._id ? <Loader2 size={13} className="spin" /> : 'Confirm Reject'}
                        </button>
                      </div>
                    ) : (
                      <>
                        <button className="btn btn-outline btn-sm" onClick={() => setRejectingId(s._id)}>
                          <X size={14} /> Reject
                        </button>
                        <button className="btn btn-primary btn-sm" disabled={actingId === s._id} onClick={() => handleApprove(s._id)}>
                          {actingId === s._id ? <Loader2 size={13} className="spin" /> : <><BadgeCheck size={14} /> Approve</>}
                        </button>
                      </>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewingId && <DetailModal sellerId={viewingId} onClose={() => setViewingId(null)} />}
=======
        Sellers awaiting manual review for the verified badge. No automated identity-checking
        service is used anywhere in this flow — compare the photo below against the submitted
        name and NIN yourself before approving.
      </p>

      {pending.length === 0 ? (
        <div className="empty-state">
          <BadgeCheck size={36} />
          <p>No pending verification requests.</p>
        </div>
      ) : (
        <div className="admin-verification-list">
          {pending.map((s) => (
            <div key={s._id} className="admin-verification-row card">
              {s.ninPhoto && (
                <img
                  src={s.ninPhoto}
                  alt={`${s.store_name} verification submission`}
                  className="admin-verification-photo"
                />
              )}
              <div className="admin-verification-info">
                <p className="admin-verification-name">{s.store_name}</p>
                <p className="admin-verification-meta">@{s.username} · {s.email}</p>
                <p className="admin-verification-meta"><strong>Full name on ID:</strong> {s.ninFullName || '—'}</p>
                <p className="admin-verification-meta"><strong>NIN:</strong> {s.nin || '—'}</p>
                <p className="admin-verification-meta"><Clock size={12} /> Submitted {new Date(s.createdAt).toLocaleDateString()}</p>
              </div>

              {rejectingId === s._id ? (
                <div className="admin-verification-reject-form">
                  <input
                    className="form-control"
                    placeholder="Reason for rejection…"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    maxLength={500}
                  />
                  <div className="admin-verification-actions">
                    <button className="btn btn-outline btn-sm" onClick={() => { setRejectingId(null); setRejectReason(''); }}>Cancel</button>
                    <button className="btn btn-primary btn-sm" disabled={actingId === s._id} onClick={() => handleReject(s._id)}>
                      {actingId === s._id ? <Loader2 size={13} className="spin" /> : 'Confirm Reject'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="admin-verification-actions">
                  <button className="btn btn-outline btn-sm" onClick={() => setRejectingId(s._id)}>
                    <X size={14} /> Reject
                  </button>
                  <button className="btn btn-primary btn-sm" disabled={actingId === s._id} onClick={() => handleApprove(s._id)}>
                    {actingId === s._id ? <Loader2 size={13} className="spin" /> : <><BadgeCheck size={14} /> Approve</>}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
>>>>>>> b403b42571a91fae11e3332f19cf5691d2aba20a
    </AdminLayout>
  );
};

export default AdminVerification;
