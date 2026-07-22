import { useState, useEffect } from 'react';
import { Key, CheckCircle, Clock, ArrowRight, AlertTriangle, RefreshCw, Zap } from 'lucide-react';
import SellerLayout from '../../components/seller/SellerLayout';
import LoadFailedModal from '../../components/seller/LoadFailedModal';
import { useSellerAuth } from '../../context/SellerAuthContext';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import './SellerToken.css';

const ADMIN_WA = '2349034611394'; // update this to match your .env ADMIN_WHATSAPP

const CountdownBadge = ({ expiresAt }) => {
  const [label, setLabel] = useState('');
  const [cls, setCls]     = useState('');

  useEffect(() => {
    const tick = () => {
      const diff = new Date(expiresAt) - new Date();
      if (diff <= 0) { setLabel('Expired'); setCls('expiry-critical'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (h < 1)       { setLabel(`${m}m ${s}s left`);              setCls('expiry-critical'); }
      else if (h < 6)  { setLabel(`${h}h ${m}m left`);              setCls('expiry-warning'); }
      else if (h < 24) { setLabel(`${h}h ${m}m left`);              setCls('expiry-soon'); }
      else              { setLabel(`${Math.floor(h/24)}d ${h%24}h left`); setCls('expiry-ok'); }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return (
    <span className={`countdown-badge ${cls}`}>
      <Clock size={13} /> {label}
    </span>
  );
};

const SellerToken = () => {
  const { seller, refreshSeller } = useSellerAuth();
  const [tokenInput, setTokenInput] = useState('');
  const [loading, setLoading]       = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [result, setResult]         = useState(null);
  const [error, setError]           = useState('');
  const [tokenStatus, setTokenStatus] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const fetchStatus = async () => {
    setStatusLoading(true);
    setLoadError(false);
    try {
      const res = await api.get('/seller/token-status');
      setTokenStatus(res.data);
    } catch (err) {
      console.error(err);
      setLoadError(true);
    }
    finally { setStatusLoading(false); setRetrying(false); }
  };

  useEffect(() => { fetchStatus(); }, []);

  const handleRetry = () => { setRetrying(true); fetchStatus(); };

  const handleRedeem = async (e) => {
    e.preventDefault();
    const code = tokenInput.trim().toUpperCase();
    if (!code) return setError('Please enter a token code');
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await api.post('/seller/redeem-token', { token: code });
      setResult(res.data);
      setTokenInput('');
      toast.success('Token redeemed! Products are now live.');
      fetchStatus();
      refreshSeller();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to redeem token';
      setError(msg);
      toast.error(msg);
    } finally { setLoading(false); }
  };

  const waMsg = encodeURIComponent(
    `Hi! I need a new listing token for my seller account.\nStore: ${seller?.store_name} (@${seller?.username})`
  );

  if (loadError && !statusLoading) {
    return (
      <SellerLayout title="Redeem Token">
        <LoadFailedModal onRetry={handleRetry} retrying={retrying} message="We couldn't load your token status. Please check your connection and try again." />
      </SellerLayout>
    );
  }

    // Token system disabled — products show freely
    if (tokenStatus && !tokenStatus.token_required){
       return (
      <SellerLayout title="Listing Status">
        <div className="token-page fade-up">
          <div className="token-status-card">
            <div className="token-status-header">
              <Zap size={20} style={{color:'#27ae60'}}/><h3>Token System Disabled</h3>
            </div>
            <div className="token-active-info">
              <CheckCircle size={20} style={{color:'#27ae60',flexShrink:0}}/>
              <div>
                <p><strong>Your products are publicly visible!</strong></p>
                <p style={{fontSize:'0.82rem',color:'var(--ink-muted)',marginTop:'0.2rem'}}>The admin has disabled the token system. All your products are automatically live — no token needed.</p>
              </div>
            </div>
          </div>
        </div>
      </SellerLayout>
    );
  }

  if (seller && !seller.isApproved) {
    return (
      <SellerLayout title="Redeem Token">
        <div className="token-locked">
          <div className="token-locked-icon">🔒</div>
          <h2>Account Not Approved</h2>
          <p>You need admin approval before redeeming tokens. Message the admin to speed things up.</p>
          <a
            href={`https://wa.me/${ADMIN_WA}?text=${encodeURIComponent(`Hi! I just registered on Lens University Market. Please approve my seller account.\nStore: ${seller?.store_name} (@${seller?.username})`)}`}
            className="btn btn-wa btn-lg"
            target="_blank" rel="noreferrer">
            <WaIcon /> Message Admin on WhatsApp
          </a>
        </div>
      </SellerLayout>
    );
  }

  return (
    <SellerLayout title="Redeem Token">
      <div className="token-page fade-up">

        {/* Current status card */}
        <div className="token-status-card">
          <div className="token-status-header">
            <Key size={20} />
            <h3>Current Token Status</h3>
            <button className="btn btn-outline btn-sm" onClick={fetchStatus} disabled={statusLoading} style={{ marginLeft:'auto' }}>
              <RefreshCw size={13} className={statusLoading ? 'spinning' : ''} /> Refresh
            </button>
          </div>

          {statusLoading ? (
            <div className="spinner" style={{ margin:'1rem auto', width:28, height:28 }} />
          ) : tokenStatus?.has_active_token ? (
            <div className="token-active-info">
              <CheckCircle size={20} style={{ color:'#27ae60', flexShrink:0 }} />
              <div>
                <p><strong>Your products are live!</strong></p>
                <p>Time remaining: <CountdownBadge expiresAt={tokenStatus.expires_at} /></p>
                <p style={{ fontSize:'0.78rem', color:'var(--ink-muted)', marginTop:'0.25rem' }}>
                  Expires: {new Date(tokenStatus.expires_at).toLocaleString('en-NG', { dateStyle:'medium', timeStyle:'short' })}
                </p>
              </div>
            </div>
          ) : (
            <div className="token-inactive-info">
              <AlertTriangle size={20} style={{ color:'#e67e22', flexShrink:0 }} />
              <div>
                <p><strong>No active token</strong></p>
                <p>Your products are hidden from the marketplace. Redeem a token to make them visible.</p>
              </div>
            </div>
          )}
        </div>

        {/* How it works */}
        <div className="token-explainer">
          <div className="token-explainer-icon"><Key size={28} /></div>
          <div>
            <h2>How Tokens Work</h2>
            <p>
              The admin generates a token that controls <strong>how long your products stay visible</strong> —
              just like a WhatsApp status. When it expires, your products are hidden until you redeem a new token.
            </p>
            <div className="token-steps">
              <div className="token-step"><span>1</span><p>Contact the admin on WhatsApp to request a token</p></div>
              <div className="token-step"><span>2</span><p>Enter the token code below and click Redeem</p></div>
              <div className="token-step"><span>3</span><p>All your products go live for the token's duration</p></div>
            </div>
          </div>
        </div>

        {/* Redeem form */}
        <div className="token-form-card">
          <h3>Enter Token Code</h3>
          <p>Token codes are 24 characters, uppercase. E.g. <code>A1B2C3D4E5F6A1B2C3D4E5F6</code></p>

          {error && <div className="alert alert-error" style={{ marginTop:'1rem' }}>{error}</div>}

          {result && (
            <div className="token-success">
              <CheckCircle size={28} />
              <div>
                <strong>{result.message}</strong>
                <p>Products visible until: <strong>{new Date(result.expires_at).toLocaleString('en-NG', { dateStyle:'medium', timeStyle:'short' })}</strong></p>
                <p>Duration: <strong>{result.duration_hours} hour{result.duration_hours !== 1 ? 's' : ''}</strong></p>
              </div>
            </div>
          )}

          <form onSubmit={handleRedeem} className="token-input-form">
            <div className="form-group">
              <label className="form-label">Token Code *</label>
              <input
                className="form-control token-input"
                placeholder="ENTER TOKEN CODE HERE"
                value={tokenInput}
                onChange={e => setTokenInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                maxLength={24}
                required
                autoComplete="off"
                spellCheck={false}
              />
              <span style={{ fontSize:'0.72rem', color:'var(--ink-muted)' }}>
                {tokenInput.length}/24 characters — letters and numbers only
              </span>
            </div>
            <button type="submit" className="btn btn-gold btn-lg" disabled={loading || tokenInput.length < 8}>
              {loading ? 'Redeeming…' : <><Key size={16} /> Redeem Token <ArrowRight size={16} /></>}
            </button>
          </form>
        </div>

        {/* Get new token */}
        <div className="token-get-card">
          <h3>Need a Token?</h3>
          <p>Contact the BuyOnUma admin on WhatsApp to request a new listing token.</p>
          <a
            href={`https://wa.me/${ADMIN_WA}?text=${waMsg}`}
            className="btn btn-wa"
            target="_blank" rel="noreferrer">
            <WaIcon /> Request Token on WhatsApp
          </a>
        </div>

      </div>
    </SellerLayout>
  );
};

const WaIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

export default SellerToken;
