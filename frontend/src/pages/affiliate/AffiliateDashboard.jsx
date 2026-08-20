import { useState, useEffect } from 'react';
import { Link2, Copy, Users, TrendingUp, Wallet, Clock, Percent } from 'lucide-react';
import AffiliateLayout from '../../components/affiliate/AffiliateLayout';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export default function AffiliateDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/affiliates/me', { authRole: 'affiliate' })
      .then(res => setData(res.data))
      .catch(() => toast.error('Could not load your dashboard'))
      .finally(() => setLoading(false));
  }, []);

  const copy = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  if (loading) {
    return (
      <AffiliateLayout title="Dashboard">
        <div className="spinner" />
      </AffiliateLayout>
    );
  }

  if (!data) {
    return (
      <AffiliateLayout title="Dashboard">
        <p style={{ color: 'var(--ink-muted)' }}>Something went wrong loading your dashboard.</p>
      </AffiliateLayout>
    );
  }

  const { affiliate, referralLink, commissionPercent, stats } = data;

  return (
    <AffiliateLayout title="Dashboard">
      <div className="fade-up">
        <p style={{ color: 'var(--ink-muted)', marginBottom: '1.25rem' }}>
          Welcome back, <strong>{affiliate.name}</strong>. Share your link below — you earn a commission every
          time a seller you referred upgrades their plan.
        </p>

        {/* ── Referral code + link ── */}
        <div className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
          <h3 style={{ marginBottom: '0.25rem' }}>Your Referral Link</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', marginBottom: '1rem' }}>
            Share this link. Anyone who registers as a seller through it is tracked as your referral.
          </p>

          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="input-wrap" style={{ flex: 1, minWidth: 220 }}>
              <Link2 size={15} className="input-icon-left" />
              <input className="form-control" readOnly value={referralLink} style={{ paddingLeft: '2.5rem' }} />
            </div>
            <button className="btn btn-gold btn-sm" onClick={() => copy(referralLink, 'Referral link')}>
              <Copy size={14} /> Copy Link
            </button>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', marginTop: '0.85rem' }}>
            <span className="badge badge-ink">Code: {affiliate.referralCode}</span>
            <button className="btn btn-outline btn-sm" onClick={() => copy(affiliate.referralCode, 'Referral code')}>
              <Copy size={13} /> Copy Code
            </button>
          </div>
        </div>

        {/* ── Stats grid ── */}
        <div className="revenue-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.85rem', marginBottom: '1.25rem' }}>
          <StatCard icon={<Users size={20} />} label="Sellers Referred" value={stats.totalReferrals} />
          <StatCard icon={<TrendingUp size={20} />} label="Upgraded to Paid" value={stats.totalUpgraded} />
          <StatCard icon={<Percent size={20} />} label="Your Commission" value={`${commissionPercent}%`} />
          <StatCard icon={<Wallet size={20} />} label="Total Earned" value={`₦${stats.totalEarned.toLocaleString()}`} primary />
          <StatCard icon={<Clock size={20} />} label="Awaiting Payout" value={`₦${stats.totalUnpaid.toLocaleString()}`} />
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <h3 style={{ marginBottom: '0.5rem' }}>How commissions work</h3>
          <ul style={{ fontSize: '0.85rem', color: 'var(--ink-muted)', paddingLeft: '1.1rem', lineHeight: 1.8, margin: 0 }}>
            <li>Share your link — a seller who registers through it is tracked as your referral.</li>
            <li>When that seller upgrades to a paid plan, you earn {commissionPercent}% of what they paid.</li>
            <li>The rate is set by the BuyOnUma team and can change over time — your dashboard always shows the current rate.</li>
            <li>There's no in-app withdrawal — see the Earnings tab for how payouts work.</li>
          </ul>
        </div>
      </div>
    </AffiliateLayout>
  );
}

const StatCard = ({ icon, label, value, primary }) => (
  <div
    className="revenue-stat-card"
    style={{
      background: primary ? '#0d0d0d' : '#fff',
      color: primary ? '#fff' : 'black',
      border: primary ? 'none' : '1px solid #eee',
      borderRadius: 14,
      padding: '1rem 1.1rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.35rem',
    }}
  >
    <span style={{ color: primary ? 'var(--gold, #b8923a)' : 'var(--gold, #b8923a)' }}>{icon}</span>
    <span style={{ fontSize: '0.72rem', color: primary ? '#ccc' : 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
      {label}
    </span>
    <strong style={{ fontSize: '1.25rem', fontFamily: 'var(--font-serif)' }}>{value}</strong>
  </div>
);
