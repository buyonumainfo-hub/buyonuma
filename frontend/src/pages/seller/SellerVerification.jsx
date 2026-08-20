import { useEffect, useState } from 'react';
import { BadgeCheck, ShieldAlert, Clock, ShieldOff, Loader2 } from 'lucide-react';
import SellerLayout from '../../components/seller/SellerLayout';
import LoadFailedModal from '../../components/seller/LoadFailedModal';
import SelfieCapture from '../../components/shared/SelfieCapture';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import './SellerVerification.css';

// Manual, human-review-only verification — no third-party identity API
// anywhere in this flow (see backend/routes/verification.js). A seller
// submits their full legal name, NIN, and a photo; an admin looks at it
// and approves or rejects. A rejected seller can simply submit again —
// `canSubmit` below allows re-submission for any status except
// 'verified' or 'pending' (i.e. 'none' and 'rejected' both allow it).
const STATUS_META = {
  none:     { icon: ShieldOff,  label: 'Not verified', color: '#8a8a8a', desc: 'Submit your full name, NIN and a photo below to apply for the verified badge.' },
  pending:  { icon: Clock,      label: 'Pending review', color: '#b8923a', desc: "An admin is manually reviewing your details. You'll get a notification once it's reviewed — this usually takes 1-2 business days." },
  verified: { icon: BadgeCheck, label: 'Verified', color: '#1ebe5d', desc: 'Your store shows the verified badge to all buyers.' },
  rejected: { icon: ShieldAlert,label: 'Not approved', color: '#e0453c', desc: 'Your last submission was not approved. Review the reason below and feel free to submit again.' },
};

const SellerVerification = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nin, setNin] = useState('');
  const [fullName, setFullName] = useState('');
  const [bvn, setBvn] = useState('');
  const [photo, setPhoto] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const fetchStatus = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await api.get('/verification/nin/status');
      setStatus(res.data);
    } catch (err) {
      console.error(err);
      setLoadError(true);
    } finally {
      setLoading(false);
      setRetrying(false);
    }
  };

  useEffect(() => { fetchStatus(); }, []);

  const handleRetry = () => { setRetrying(true); fetchStatus(); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedNin = nin.trim();
    if (!/^\d{11}$/.test(trimmedNin)) {
      toast.error('NIN must be exactly 11 digits');
      return;
    }
    if (fullName.trim().length < 3) {
      toast.error('Enter your full legal name as it appears on your ID');
      return;
    }
    if (!photo) {
      toast.error('Please take or upload a photo for identity review');
      return;
    }
    if (bvn.trim() && !/^\d{11}$/.test(bvn.trim())) {
      toast.error('BVN must be exactly 11 digits');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/verification/nin', { nin: trimmedNin, fullName: fullName.trim(), photo, bvn: bvn.trim() || undefined });
      toast.success(res.data.message || 'Submitted for review');
      setNin(''); setFullName(''); setPhoto(null); setBvn('');
      fetchStatus();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not submit for verification');
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

  if (loadError) {
    return (
      <SellerLayout title="Verified Badge">
        <LoadFailedModal onRetry={handleRetry} retrying={retrying} message="We couldn't load your verification status. Please check your connection and try again." />
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
              <label className="form-label">Full Legal Name (as on your ID)</label>
              <input
                className="form-control"
                placeholder="e.g. Adaeze Chinonso Okafor"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                maxLength={150}
              />
            </div>

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
                Your NIN is stored securely and never shown publicly — it's only visible to an
                admin manually reviewing your submission. See our <a href="/privacy">Privacy Policy</a> for details.
              </p>
            </div>

            <div className="form-group">
              <label className="form-label">Bank Verification Number (BVN) <span style={{ fontWeight: 400, color: 'var(--ink-muted)' }}>— optional</span></label>
              <input
                className="form-control"
                inputMode="numeric"
                maxLength={11}
                placeholder="Optional — 11-digit BVN"
                value={bvn}
                onChange={(e) => setBvn(e.target.value.replace(/\D/g, ''))}
              />
              <p className="seller-verification-hint">
                Not required. Adding it can speed up manual review — it's stored the same way as your NIN and never shown publicly.
              </p>
            </div>

            <div className="form-group">
              <label className="form-label">Photo (holding your ID, or the ID itself)</label>
              <SelfieCapture onCapture={setPhoto} disabled={submitting} />
              <p className="seller-verification-hint">
                Take a clear photo or upload one — an admin manually compares this against the
                name and NIN you entered. No automated face-matching service is used.
              </p>
            </div>

            <button type="submit" className="btn btn-primary" disabled={submitting || nin.length !== 11 || fullName.trim().length < 3 || !photo}>
              {submitting ? <><Loader2 size={15} className="spin" /> Submitting…</> : 'Submit for Review'}
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
