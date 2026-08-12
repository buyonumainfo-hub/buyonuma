import { useEffect, useState } from 'react';
import { BadgeCheck, X, Clock, Loader2 } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import './AdminVerification.css';

const AdminVerification = () => {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

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

  useEffect(() => { fetchPending(); }, []);

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

  if (loading) {
    return (
      <AdminLayout title="Verification Queue">
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><div className="spinner" /></div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Verification Queue">
      <p className="admin-verification-desc">
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
    </AdminLayout>
  );
};

export default AdminVerification;
