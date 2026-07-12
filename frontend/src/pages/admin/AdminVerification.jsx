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
      const res = await api.get('/verification/nin/pending');
      setPending(res.data.sellers || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPending(); }, []);

  const handleApprove = async (id) => {
    setActingId(id);
    try {
      await api.patch(`/verification/nin/${id}/review`, { status: 'verified' });
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
      await api.patch(`/verification/nin/${id}/review`, { status: 'rejected', rejectionReason: rejectReason.trim() });
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
        Sellers awaiting final review for the verified badge. Their NIN has already passed the
        automated check (where configured) — this is your manual sign-off before the badge goes public.
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
              <div className="admin-verification-info">
                <p className="admin-verification-name">{s.store_name}</p>
                <p className="admin-verification-meta">@{s.username} · {s.email}</p>
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
