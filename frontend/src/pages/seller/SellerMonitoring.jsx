import { useEffect, useState, useCallback } from 'react';
import { Eye, Phone, Package, Loader2, ShoppingCart } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import SellerLayout from '../../components/seller/SellerLayout';
import LoadFailedModal from '../../components/seller/LoadFailedModal';
import api from '../../utils/api';
import './SellerMonitoring.css';

const formatChartDate = (d) => {
  const date = new Date(d);
  return `${date.getDate()}/${date.getMonth() + 1}`;
};

const StatCard = ({ icon: Icon, label, value, tone = 'gold' }) => (
  <div className={`seller-mon-stat tone-${tone}`}>
    <div className="seller-mon-stat-icon"><Icon size={20} /></div>
    <div>
      <p className="seller-mon-stat-value">{value}</p>
      <p className="seller-mon-stat-label">{label}</p>
    </div>
  </div>
);

const SellerMonitoring = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const fetchAnalytics = useCallback((silent = false) => {
    if (silent) setRefreshing(true);
    else setLoadError(false);
    api.get('/monitoring/seller')
      .then(res => { setAnalytics(res.data); if (!silent) setLoadError(false); })
      .catch((err) => {
        console.error(err);
        // Only surface the retry modal for the initial foreground load —
        // a background poll failing once every 30s shouldn't interrupt
        // the seller with a modal while they're looking at data that
        // already loaded fine the first time.
        if (!silent) setLoadError(true);
      })
      .finally(() => { setLoading(false); setRefreshing(false); setRetrying(false); });
  }, []);

  useEffect(() => {
    fetchAnalytics();
    // Poll periodically so this feels "real-time-ish" without websockets.
    const interval = setInterval(() => fetchAnalytics(true), 30000);
    return () => clearInterval(interval);
  }, [fetchAnalytics]);

  const handleRetry = () => { setRetrying(true); fetchAnalytics(); };

  if (loadError) {
    return (
      <SellerLayout title="Monitoring">
        <LoadFailedModal onRetry={handleRetry} retrying={retrying} />
      </SellerLayout>
    );
  }

  if (loading) {
    return (
      <SellerLayout title="Monitoring">
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><div className="spinner" /></div>
      </SellerLayout>
    );
  }

  if (!analytics) {
    return (
      <SellerLayout title="Monitoring">
        <div className="empty-state">
          <Eye size={36} />
          <p>Analytics aren't available yet. Check back once your store has some activity.</p>
        </div>
      </SellerLayout>
    );
  }

  return (
    <SellerLayout title="Monitoring">
      <div className="seller-mon-refresh">
        {refreshing && <span><Loader2 size={13} className="spin" /> Updating…</span>}
      </div>

      <div className="seller-mon-stats-grid">
        <StatCard icon={Eye} label="Store Views" value={analytics.totals.storeViews} tone="gold" />
        <StatCard icon={Phone} label="WhatsApp Clicks" value={analytics.totals.whatsappClicks} tone="green" />
        <StatCard icon={Package} label="Product Views" value={analytics.totals.productPageViews} tone="blue" />
        <StatCard icon={ShoppingCart} label="Add to Cart Clicks" value={analytics.totals.addToCartClicks || 0} tone="orange" />
        <StatCard icon={Package} label="Active Products" value={analytics.totals.activeProducts} tone="gold" />
      </div>

      <div className="seller-mon-chart card">
        <h3>How Visitors Visit Your Store (14 days)</h3>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={analytics.charts.visitsDaily.map(d => ({ date: formatChartDate(d.date), visits: d.count }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="date" fontSize={11} />
            <YAxis fontSize={11} allowDecimals={false} />
            <Tooltip />
            <Line type="monotone" dataKey="visits" stroke="#b8923a" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {analytics.charts.eventBreakdown?.length > 0 && (
        <div className="seller-mon-chart card">
          <h3>Activity Breakdown (14 days)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={analytics.charts.eventBreakdown.map(e => ({
              type: ({ store_view: 'Store Views', whatsapp_click: 'WhatsApp Clicks', product_page_view: 'Product Views', add_to_cart: 'Add to Cart' }[e.type]) || e.type,
              count: e.count,
            }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="type" fontSize={11} />
              <YAxis fontSize={11} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#4c8bf5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {analytics.topProducts.length > 0 && (
        <div className="seller-mon-chart card">
          <h3>Your Most-Viewed Products</h3>
          <ResponsiveContainer width="100%" height={Math.max(160, analytics.topProducts.length * 40)}>
            <BarChart
              data={analytics.topProducts.map(p => ({ name: p.name.length > 18 ? p.name.slice(0, 18) + '…' : p.name, views: p.viewCount }))}
              layout="vertical"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" fontSize={11} allowDecimals={false} />
              <YAxis type="category" dataKey="name" fontSize={11} width={120} />
              <Tooltip />
              <Bar dataKey="views" fill="#1ebe5d" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </SellerLayout>
  );
};

export default SellerMonitoring;
