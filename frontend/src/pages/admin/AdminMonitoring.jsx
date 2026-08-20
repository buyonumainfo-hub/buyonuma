import { useEffect, useState, useCallback } from 'react';
import { Users, Package, CheckCircle, BadgeCheck, Eye, Loader2 } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import AdminLayout from '../../components/admin/AdminLayout';
import api from '../../utils/api';
import './AdminMonitoring.css';

const StatCard = ({ icon: Icon, label, value, tone = 'gold' }) => (
  <div className={`admin-stat-card tone-${tone}`}>
    <div className="admin-stat-icon"><Icon size={18} /></div>
    <div>
      <p className="admin-stat-value">{value}</p>
      <p className="admin-stat-label">{label}</p>
    </div>
  </div>
);

const formatDate = (d) => {
  const date = new Date(d);
  return `${date.getDate()}/${date.getMonth() + 1}`;
};

const ACTIVITY_LABELS = {
  seller_registered: 'New seller registered',
  seller_approved: 'Seller approved',
  seller_suspended: 'Seller suspended',
  product_added: 'Product added',
  product_updated: 'Product updated',
  product_deleted: 'Product deleted',
  store_view: 'Store viewed',
  whatsapp_click: 'WhatsApp click',
  product_page_view: 'Product viewed',
  add_to_cart: 'Added to cart',
  token_redeemed: 'Token redeemed',
  admin_login: 'Admin logged in',
  admin_login_failed: 'Failed admin login',
  seller_login: 'Seller logged in',
  seller_login_failed: 'Failed seller login',
  nin_submitted: 'NIN submitted',
  nin_verified: 'NIN verified',
  nin_rejected: 'NIN rejected',
  broadcast_email_sent: 'Broadcast email sent',
  notification_sent: 'Notification sent',
  ai_chat_message: 'AI chat message',
};

const timeAgo = (dateStr) => {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const AdminMonitoring = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    try {
      const res = await api.get('/monitoring/admin');
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Poll every 30s for a "real-time-ish" dashboard without needing websockets
    const interval = setInterval(() => fetchData(true), 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <AdminLayout title="Monitoring">
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><div className="spinner" /></div>
      </AdminLayout>
    );
  }

  const chartData = (data.charts.sellersRegisteredDaily || []).map((d, i) => ({
    date: formatDate(d.date),
    sellers: d.count,
    products: data.charts.productsAddedDaily[i]?.count || 0,
    views: data.charts.viewsDaily[i]?.count || 0,
  }));

  return (
    <AdminLayout title="Real-Time Monitoring">
      <div className="admin-monitoring-refresh">
        {refreshing && <span><Loader2 size={13} className="spin" /> Updating…</span>}
      </div>

      <div className="admin-stats-grid">
        <StatCard icon={Users} label="Total Sellers" value={data.totals.totalSellers} tone="gold" />
        <StatCard icon={CheckCircle} label="Approved Sellers" value={data.totals.approvedSellers} tone="green" />
        <StatCard icon={Users} label="Pending Approval" value={data.totals.pendingSellers} tone="orange" />
        <StatCard icon={BadgeCheck} label="Verified Sellers" value={data.totals.verifiedSellers} tone="blue" />
        <StatCard icon={Package} label="Total Products" value={data.totals.totalProducts} tone="gold" />
        <StatCard icon={Eye} label="Active Products" value={data.totals.activeProducts} tone="green" />
      </div>

      <div className="admin-charts-grid">
        <div className="admin-chart-card card">
          <h3>Sellers Registered (14 days)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" fontSize={11} />
              <YAxis fontSize={11} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="sellers" stroke="#b8923a" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="admin-chart-card card">
          <h3>Products Added (14 days)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" fontSize={11} />
              <YAxis fontSize={11} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="products" fill="#1ebe5d" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="admin-chart-card card">
          <h3>Views &amp; Traffic (14 days)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" fontSize={11} />
              <YAxis fontSize={11} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="views" stroke="#4c8bf5" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="admin-chart-card card">
          <h3>Top Sellers by Store Views</h3>
          <div className="admin-top-sellers-list">
            {data.topSellersByViews.map((s) => (
              <div key={s._id} className="admin-top-seller-row">
                <span>{s.store_name}</span>
                <span className="admin-top-seller-count">{s.viewCounts?.storeViews || 0} views</span>
              </div>
            ))}
            {data.topSellersByViews.length === 0 && <p className="empty-note">No view data yet.</p>}
          </div>
        </div>
      </div>

      <div className="admin-activity-feed card">
        <h3>Recent Activity <span className="admin-activity-window">(last 24 hours)</span></h3>
        <div className="admin-activity-list">
          {data.recentActivity.map((a) => (
            <div key={a._id} className="admin-activity-row">
              <span className="admin-activity-label">{ACTIVITY_LABELS[a.type] || a.type}</span>
              {a.seller?.store_name && <span className="admin-activity-target">— {a.seller.store_name}</span>}
              {a.product?.name && <span className="admin-activity-target">— {a.product.name}</span>}
              <span className="admin-activity-time">{timeAgo(a.createdAt)}</span>
            </div>
          ))}
          {data.recentActivity.length === 0 && <p className="empty-note">No activity in the last 24 hours.</p>}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminMonitoring;
