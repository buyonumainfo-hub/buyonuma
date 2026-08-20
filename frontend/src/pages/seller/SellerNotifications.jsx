import { useEffect, useState, useCallback } from 'react';
import { Bell, CheckCheck, Loader2, Info, CheckCircle, AlertTriangle, BadgeCheck, Megaphone, Key } from 'lucide-react';
import SellerLayout from '../../components/seller/SellerLayout';
import LoadFailedModal from '../../components/seller/LoadFailedModal';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import './SellerNotifications.css';

const ICONS = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  approval: CheckCircle,
  token: Key,
  broadcast: Megaphone,
  nin: BadgeCheck,
};

const timeAgo = (dateStr) => {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const SellerNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const fetchNotifications = useCallback(async (pageNum = 1) => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await api.get('/notifications/seller', { params: { page: pageNum, limit: 20 } });
      setNotifications(res.data.notifications || []);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error(err);
      setLoadError(true);
    } finally {
      setLoading(false);
      setRetrying(false);
    }
  }, []);

  useEffect(() => { fetchNotifications(page); }, [page, fetchNotifications]);

  const handleRetry = () => { setRetrying(true); fetchNotifications(page); };

  useEffect(() => {
    setPushSupported('serviceWorker' in navigator && 'PushManager' in window);
  }, []);

  const markRead = async (id) => {
    try {
      await api.patch(`/notifications/seller/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    } catch (err) { console.error(err); }
  };

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/seller/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      toast.success('All notifications marked as read');
    } catch (err) { toast.error('Failed to mark all as read'); }
  };

  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
  };

  const enablePush = async () => {
    setPushLoading(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        toast.error('Notification permission was not granted');
        return;
      }
      const { data } = await api.get('/notifications/vapid-public-key');
      if (!data.key) {
        toast.error('Push notifications are not configured on the server yet');
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.key),
      });
      await api.post('/notifications/seller/push-subscribe', sub.toJSON());
      setPushEnabled(true);
      toast.success('Push notifications enabled!');
    } catch (err) {
      console.error(err);
      toast.error('Could not enable push notifications');
    } finally {
      setPushLoading(false);
    }
  };

  return (
    <SellerLayout title="Notifications">
      <div className="seller-notifications-header">
        <p className="seller-notifications-sub">Updates about your account, verification, and announcements from BuyOnUma.</p>
        <div className="seller-notifications-actions">
          {pushSupported && !pushEnabled && (
            <button className="btn btn-outline btn-sm" onClick={enablePush} disabled={pushLoading}>
              {pushLoading ? <Loader2 size={14} className="spin" /> : <Bell size={14} />} Enable Push Alerts
            </button>
          )}
          <button className="btn btn-outline btn-sm" onClick={markAllRead}>
            <CheckCheck size={14} /> Mark all read
          </button>
        </div>
      </div>

      {loadError ? (
        <LoadFailedModal onRetry={handleRetry} retrying={retrying} message="We couldn't load your notifications. Please check your connection and try again." />
      ) : loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="spinner" /></div>
      ) : notifications.length === 0 ? (
        <div className="empty-state">
          <Bell size={36} />
          <p>No notifications yet.</p>
        </div>
      ) : (
        <div className="seller-notifications-list">
          {notifications.map((n) => {
            const Icon = ICONS[n.type] || Info;
            return (
              <button
                key={n._id}
                className={`seller-notification-item ${n.read ? '' : 'unread'}`}
                onClick={() => !n.read && markRead(n._id)}
              >
                <span className={`seller-notification-icon type-${n.type}`}><Icon size={16} /></span>
                <span className="seller-notification-body">
                  <span className="seller-notification-title">{n.title}</span>
                  <span className="seller-notification-message">{n.message}</span>
                  <span className="seller-notification-time">{timeAgo(n.createdAt)}</span>
                </span>
                {!n.read && <span className="seller-notification-dot" />}
              </button>
            );
          })}
        </div>
      )}

      {pagination && pagination.pages > 1 && (
        <div className="seller-notifications-pagination">
          <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
          <span>Page {page} of {pagination.pages}</span>
          <button className="btn btn-outline btn-sm" disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      )}
    </SellerLayout>
  );
};

export default SellerNotifications;
