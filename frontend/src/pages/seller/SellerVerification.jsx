import { useEffect, useState } from 'react';
import { BadgeCheck, ShieldAlert, Clock, ShieldOff, Loader2, Fingerprint } from 'lucide-react';
import SellerLayout from '../../components/seller/SellerLayout';
import LoadFailedModal from '../../components/seller/LoadFailedModal';
import SelfieCapture from '../../components/shared/SelfieCapture';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import './SellerVerification.css';

const STATUS_META = {
  none:     { icon: ShieldOff,  label: 'Not verified', color: '#8a8a8a', desc: 'Submit your NIN and a selfie below to apply for the verified badge.' },
  pending:  { icon: Clock,      label: 'Pending review', color: '#b8923a', desc: "We're checking your NIN and selfie. This usually takes a short while — you'll get a notification once it's reviewed." },
  verified: { icon: BadgeCheck, label: 'Verified', color: '#1ebe5d', desc: 'Your store shows the verified badge to all buyers.' },
  rejected: { icon: ShieldAlert,label: 'Not approved', color: '#e0453c', desc: 'Your last submission was not approved. You can review the reason below and try again.' },
};

const SellerVerification = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nin, setNin] = useState('');
  const [selfieUrl, setSelfieUrl] = useState(null);
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
    const trimmed = nin.trim();
    if (!/^\d{11}$/.test(trimmed)) {
      toast.error('NIN must be exactly 11 digits');
      return;
    }
    if (!selfieUrl) {
      toast.error('Please take or upload a selfie for face verification');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/verification/nin', { nin: trimmed, selfieUrl });
      toast.success(res.data.message || 'NIN and selfie submitted for review');
      setNin('');
      setSelfieUrl(null);
      fetchStatus();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not submit for verification');
      fetchStatus(); // an auto-rejection (bad face match / failed liveness) still counts as a status change
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
  const hasFaceMatchData = typeof status?.ninFaceMatchScore === 'number' || typeof status?.ninLivenessPassed === 'boolean';

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

        {hasFaceMatchData && (
          <div className="seller-verification-facematch">
            <Fingerprint size={15} />
            <span>
              {typeof status.ninFaceMatchScore === 'number' && `Face match: ${status.ninFaceMatchScore}%`}
              {typeof status.ninFaceMatchScore === 'number' && typeof status.ninLivenessPassed === 'boolean' && ' · '}
              {typeof status.ninLivenessPassed === 'boolean' && (status.ninLivenessPassed ? 'Liveness check passed' : 'Liveness check failed')}
            </span>
          </div>
        )}

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

            <div className="form-group">
              <label className="form-label">Selfie for Face Verification</label>
              <SelfieCapture onCapture={setSelfieUrl} disabled={submitting} />
              <p className="seller-verification-hint">
                Take a clear, well-lit selfie facing the camera directly. This is matched against the
                photo on record for your NIN to confirm you're a real person and the rightful owner
                of the ID.
              </p>
            </div>

            <button type="submit" className="btn btn-primary" disabled={submitting || nin.length !== 11 || !selfieUrl}>
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
