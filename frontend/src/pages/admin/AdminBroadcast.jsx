import { useEffect, useState } from 'react';
import { Mail, Bell, Send, Loader2, Users } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import './AdminBroadcast.css';

const AdminBroadcast = () => {
  const [tab, setTab] = useState('email');

  // Email broadcast state
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [emailAudience, setEmailAudience] = useState('all');
  const [emailSending, setEmailSending] = useState(false);

  // Push/notification state
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifTarget, setNotifTarget] = useState('all'); // 'all' | sellerId
  const [notifSending, setNotifSending] = useState(false);
  const [sellers, setSellers] = useState([]);

  useEffect(() => {
    if (tab === 'push') {
      api.get('/sellers/admin/all', { params: { limit: 200 } })
        .then(res => setSellers(res.data.sellers || []))
        .catch(() => {});
    }
  }, [tab]);

  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!emailSubject.trim() || !emailMessage.trim()) {
      toast.error('Subject and message are required');
      return;
    }
    setEmailSending(true);
    try {
      const res = await api.post('/broadcast/email', { subject: emailSubject, message: emailMessage, audience: emailAudience });
      toast.success(res.data.message);
      setEmailSubject('');
      setEmailMessage('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send broadcast');
    } finally {
      setEmailSending(false);
    }
  };

  const handleSendNotification = async (e) => {
    e.preventDefault();
    if (!notifTitle.trim() || !notifMessage.trim()) {
      toast.error('Title and message are required');
      return;
    }
    setNotifSending(true);
    try {
      const payload = { title: notifTitle, message: notifMessage };
      if (notifTarget !== 'all') payload.sellerId = notifTarget;
      const res = await api.post('/notifications/admin/send', payload);
      toast.success(res.data.message);
      setNotifTitle('');
      setNotifMessage('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send notification');
    } finally {
      setNotifSending(false);
    }
  };

  return (
    <AdminLayout title="Broadcast">
      <div className="admin-broadcast-tabs">
        <button className={tab === 'email' ? 'active' : ''} onClick={() => setTab('email')}>
          <Mail size={15} /> Email Broadcast
        </button>
        <button className={tab === 'push' ? 'active' : ''} onClick={() => setTab('push')}>
          <Bell size={15} /> Notification / Push
        </button>
      </div>

      {tab === 'email' && (
        <form className="admin-broadcast-form card" onSubmit={handleSendEmail}>
          <p className="admin-broadcast-desc">
            Sends an email to every seller matching the audience below. This runs in the background —
            check the Monitoring page's activity feed to confirm it completed.
          </p>

          <div className="form-group">
            <label className="form-label">Audience</label>
            <select className="form-control" value={emailAudience} onChange={(e) => setEmailAudience(e.target.value)}>
              <option value="all">All active sellers</option>
              <option value="approved">Approved sellers only</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Subject</label>
            <input className="form-control" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} maxLength={200} placeholder="e.g. Platform update: new features live!" />
          </div>

          <div className="form-group">
            <label className="form-label">Message</label>
            <textarea className="form-control" rows={8} value={emailMessage} onChange={(e) => setEmailMessage(e.target.value)} maxLength={10000} placeholder="Write your announcement…" />
          </div>

          <button type="submit" className="btn btn-primary" disabled={emailSending}>
            {emailSending ? <><Loader2 size={15} className="spin" /> Sending…</> : <><Send size={15} /> Send Broadcast Email</>}
          </button>
        </form>
      )}

      {tab === 'push' && (
        <form className="admin-broadcast-form card" onSubmit={handleSendNotification}>
          <p className="admin-broadcast-desc">
            Sends an in-app notification (and a browser push alert, for sellers who've enabled it) to
            all sellers or one specific seller.
          </p>

          <div className="form-group">
            <label className="form-label">Send to</label>
            <select className="form-control" value={notifTarget} onChange={(e) => setNotifTarget(e.target.value)}>
              <option value="all">All sellers</option>
              {sellers.map((s) => (
                <option key={s._id} value={s._id}>{s.store_name} (@{s.username})</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Title</label>
            <input className="form-control" value={notifTitle} onChange={(e) => setNotifTitle(e.target.value)} maxLength={150} placeholder="e.g. New feature: verified badges!" />
          </div>

          <div className="form-group">
            <label className="form-label">Message</label>
            <textarea className="form-control" rows={5} value={notifMessage} onChange={(e) => setNotifMessage(e.target.value)} maxLength={1000} placeholder="Write your notification…" />
          </div>

          <button type="submit" className="btn btn-primary" disabled={notifSending}>
            {notifSending ? <><Loader2 size={15} className="spin" /> Sending…</> : <><Users size={15} /> Send Notification</>}
          </button>
        </form>
      )}
    </AdminLayout>
  );
};

export default AdminBroadcast;
