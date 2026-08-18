import { useState, useMemo, useRef } from 'react';
import { ArrowLeft, Send, Trash2 } from 'lucide-react';
import { useConversations, useThreadMessages } from '../../hooks/useMessagePolling';
import SafetyBanner from '../shared/SafetyBanner';
import toast from 'react-hot-toast';
import './MessagesPanel.css';

const LONG_PRESS_MS = 550;

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'read', label: 'Read' },
  { key: 'pending-reply', label: 'Yet to Reply' },
];

const SkeletonConvItem = () => (
  <div className="msg-conv-item skeleton">
    <div className="skeleton-avatar" />
    <div className="msg-conv-meta">
      <div className="skeleton-line skeleton-line-title" />
      <div className="skeleton-line skeleton-line-subtitle" />
    </div>
  </div>
);
const SkeletonMessageBubble = ({ align }) => (
  <div className={`msg-bubble skeleton ${align}`}>
    <div className="skeleton-line skeleton-bubble-line" />
  </div>
);

/**
 * Shared inbox UI for both the buyer dashboard and the seller dashboard —
 * same component, different `authRole`/`otherParty` so the two stay
 * visually and behaviorally consistent. Mobile-responsive: below 720px
 * the list and the open thread are two separate full-width screens (with
 * a back button) instead of a cramped side-by-side grid.
 */
export default function MessagesPanel({ authRole, myUnreadKey }) {
  const [filter, setFilter] = useState('all');
  const { conversations, loading, deleteConversation } = useConversations(authRole, filter);
  const [activeId, setActiveId] = useState(null);
const { messages, sendMessage, loading: messagesLoading } = useThreadMessages(activeId, authRole);
  const [text, setText] = useState('');
  const [mloading, setmLoading] = useState(false);

  // ── Long-press to delete a chat (mouse hold on desktop, touch hold on
  // mobile) — see backend/routes/messages.js DELETE /conversations/:id.
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const longPressTimer = useRef(null);
  const longPressFired = useRef(false);

  const startLongPress = (id) => {
    longPressFired.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      setConfirmDeleteId(id);
      if (navigator.vibrate) navigator.vibrate(15); // subtle haptic cue where supported
    }, LONG_PRESS_MS);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };
  const handleConvClick = (id) => {
    // Swallow the click that follows a completed long-press so it
    // doesn't also open the thread underneath the confirm modal.
    if (longPressFired.current) { longPressFired.current = false; return; }
    setActiveId(id);
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteId) return;
    setDeleting(true);
    try {
      await deleteConversation(confirmDeleteId);
      if (activeId === confirmDeleteId) setActiveId(null);
      toast.success('Conversation deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete conversation');
    } finally {
      setDeleting(false);
      setConfirmDeleteId(null);
    }
  };

  const otherParty = (c) => (authRole === 'buyer' ? c.seller : c.buyer);
  const activeConvo = useMemo(() => conversations.find(c => c._id === activeId), [conversations, activeId]);

  const handleSend = async (e) => {
    e.preventDefault();
    setmLoading(true);
    if (!text.trim()) return;
    const toSend = text;
    setText('');
    try { await sendMessage(toSend); setmLoading(false); } catch { toast.error('Message failed to send');setText(toSend); setmLoading(false); }
  };

  return (
    <>
    <div className={`msg-panel ${activeId ? 'thread-open' : ''}`}>
      <div className="msg-panel-list">
        <div className="msg-filter-row">
          {FILTERS.map(f => (
            <button key={f.key} className={`msg-filter-chip ${filter === f.key ? 'active' : ''}`} onClick={() => setFilter(f.key)}>
              {f.label}
            </button>
          ))}
        </div>
        {loading ? (
          <div className="msg-conv-list">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonConvItem key={i} />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <p style={{ padding: '1rem', color: 'var(--ink-muted)' }}>
            {filter === 'all' ? 'No conversations yet.' : `No ${FILTERS.find(f => f.key === filter)?.label.toLowerCase()} conversations.`}
          </p>
        ) : (
          <div className="msg-conv-list">
            {conversations.map(c => {
              const other = otherParty(c);
              const unread = c[myUnreadKey] > 0;
              return (
                <div
                  key={c._id}
                  className={`msg-conv-item ${activeId === c._id ? 'active' : ''} ${unread ? 'unread' : ''}`}
                  onClick={() => handleConvClick(c._id)}
                  onMouseDown={() => startLongPress(c._id)}
                  onMouseUp={cancelLongPress}
                  onMouseLeave={cancelLongPress}
                  onTouchStart={() => startLongPress(c._id)}
                  onTouchEnd={cancelLongPress}
                >
                  {other?.profile_picture || other?.photo
                    ? <img src={other?.profile_picture || other?.photo} alt="" />
                    : <span className="msg-avatar-fallback">{(other?.store_name || other?.name || '?')[0]}</span>}
                  <div className="msg-conv-meta" style={{color: 'whitesmoke'}}>
                    <strong>{other?.store_name || other?.name || 'User'}</strong>
                    <span>{c.lastMessage || 'Say hello 👋'}</span>
                  </div>
                  {unread && <span className="msg-unread-dot">{c[myUnreadKey]}</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>

    {activeId && (
  <div className="msg-panel-thread">
    <div className="msg-thread-header" style={{color:'whitesmoke'}}>
      <button className="msg-back-btn" onClick={() => setActiveId(null)}><ArrowLeft size={18} /></button>
      <button className="imgp">
                   {otherParty(activeConvo)?.profile_picture ||otherParty(activeConvo)?.photo
              ? <img src={otherParty(activeConvo)?.profile_picture ||otherParty(activeConvo)?.photo} alt="" />
              : <span className="msg-avatar-fallback">{(otherParty(activeConvo)?.store_name || otherParty(activeConvo)?.name || '?')[0]}</span>}
        </button>
      <strong>{otherParty(activeConvo)?.store_name || otherParty(activeConvo)?.name || 'Conversation'}</strong>
    </div>
    <SafetyBanner compact />
    <div className="msg-thread-body">
      <div className="msg-messages">
        {messagesLoading ? (
          <>
            <SkeletonMessageBubble align="theirs" />
            <SkeletonMessageBubble align="mine" />
            <SkeletonMessageBubble align="theirs" />
            <SkeletonMessageBubble align="theirs" />
            <SkeletonMessageBubble align="mine" />
          </>
        ) : (
          messages.map(m => (
            <div key={m._id} className={`msg-bubble ${m.senderType === authRole ? 'mine' : 'theirs'}`}>{m.text}</div>
          ))
        )}
      </div>

      <form className="msg-input-row" onSubmit={handleSend}>
        <input style={{borderRadius: '0.25rem', fontSize: '0.875rem', outline: 'none'}}  placeholder="Type a message…" value={text} onChange={e => setText(e.target.value)} />
        <button style={{color: 'black'}} className="btn btn-primarymsg-send-btn" type="submit" aria-label="Send"><Send size={16} />{mloading ? 'Sending...' : 'Send'}</button>
      </form>
    </div>
  </div>
)}
    </div>

      {confirmDeleteId && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && !deleting && setConfirmDeleteId(null)}>
          <div className="modal" style={{ maxWidth: 380 }}>
            <div className="modal-header"><h3>Delete Chat</h3></div>
            <div className="modal-body">
              <p style={{ fontSize: '0.9rem' }}>
                Delete this conversation and all its messages? This can't be undone, and removes it for both sides.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" disabled={deleting} onClick={() => setConfirmDeleteId(null)}>Cancel</button>
              <button className="btn btn-danger" disabled={deleting} onClick={handleConfirmDelete}>
                <Trash2 size={14} /> {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}