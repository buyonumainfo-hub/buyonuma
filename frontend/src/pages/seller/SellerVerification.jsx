import { useEffect, useState } from 'react';
import { BadgeCheck, ShieldAlert, Clock, ShieldOff, Loader2 } from 'lucide-react';
import SellerLayout from '../../components/seller/SellerLayout';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import './SellerVerification.css';

const STATUS_META = {
  none:     { icon: ShieldOff,  label: 'Not verified', color: '#8a8a8a', desc: 'Submit your NIN below to apply for the verified badge.' },
  pending:  { icon: Clock,      label: 'Pending review', color: '#b8923a', desc: "We're checking your NIN. This usually takes a short while — you'll get a notification once it's reviewed." },
  verified: { icon: BadgeCheck, label: 'Verified', color: '#1ebe5d', desc: 'Your store shows the verified badge to all buyers.' },
  rejected: { icon: ShieldAlert,label: 'Not approved', color: '#e0453c', desc: 'Your last submission was not approved. You can review the reason below and try again.' },
};

const SellerVerification = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nin, setNin] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await api.get('/verification/nin/status');
      setStatus(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStatus(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = nin.trim();
    if (!/^\d{11}$/.test(trimmed)) {
      toast.error('NIN must be exactly 11 digits');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/verification/nin', { nin: trimmed });
      toast.success(res.data.message || 'NIN submitted for review');
      setNin('');
      fetchStatus();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not submit NIN');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SellerLayout title="Verified Badge">
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="spinner" /></div>
      </SellerLayout>
    );
  }

  const meta = STATUS_META[status?.ninStatus || 'none'];
  const Icon = meta.icon;
  const canSubmit = status?.ninStatus !== 'verified' && status?.ninStatus !== 'pending';

  return (
    <SellerLayout title="Verified Badge">
      <div className="seller-verification-card card">
        <div className="seller-verification-status" style={{ color: meta.color }}>
          <Icon size={28} />
          <div>
            <p className="seller-verification-status-label">{meta.label}</p>
            <p className="seller-verification-status-desc">{meta.desc}</p>
          </div>
        </div>

        {status?.ninStatus === 'rejected' && status?.ninRejectionReason && (
          <div className="seller-verification-reason">
            <strong>Reason:</strong> {status.ninRejectionReason}
          </div>
        )}

        {canSubmit && (
          <form onSubmit={handleSubmit} className="seller-verification-form">
            <div className="form-group">
              <label className="form-label">National Identification Number (NIN)</label>
              <input
                className="form-control"
                inputMode="numeric"
                maxLength={11}
                placeholder="Enter your 11-digit NIN"
                value={nin}
                onChange={(e) => setNin(e.target.value.replace(/\D/g, ''))}
              />
              <p className="seller-verification-hint">
                Your NIN is stored securely and never shown publicly. It's used only to confirm your
                identity for the verified badge. See our <a href="/privacy">Privacy Policy</a> for details.
              </p>
            </div>
            <button type="submit" className="btn btn-primary" disabled={submitting || nin.length !== 11}>
              {submitting ? <><Loader2 size={15} className="spin" /> Submitting…</> : 'Submit for Verification'}
            </button>
          </form>
        )}

        {status?.ninStatus === 'pending' && (
          <p className="seller-verification-hint" style={{ marginTop: '0.5rem' }}>
            You'll be notified as soon as an admin reviews your submission.
          </p>
        )}
      </div>
    </SellerLayout>
  );
};

export default SellerVerification;
