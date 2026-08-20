import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../utils/api';

// See the architecture note at the top of backend/routes/messages.js for
// why this polls instead of using a WebSocket (short version: the
// backend runs on Vercel serverless, which can't hold a persistent
// connection open).
const POLL_INTERVAL_MS = 20000;

export const useConversations = (authRole, status) => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    try {
      const params = status && status !== 'all' ? { status } : {};
      const res = await api.get('/messages/conversations', { authRole, params });
      setConversations(res.data.conversations || []);
    } catch (err) {
      console.error('Failed to load conversations', err);
    } finally {
      setLoading(false);
    }
  }, [authRole, status]);

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  // Deletes a whole conversation (both sides, all messages) — see the
  // long-press "Delete chat" gesture in MessagesPanel.jsx. Updates local
  // state immediately rather than waiting for the next poll so the item
  // disappears from the list right away.
  const deleteConversation = useCallback(async (id) => {
    await api.delete(`/messages/conversations/${id}`, { authRole });
    setConversations(prev => prev.filter(c => c._id !== id));
  }, [authRole]);

  return { conversations, loading, refetch: fetchConversations, deleteConversation };
};

export const useThreadMessages = (conversationId, authRole) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const lastFetchRef = useRef(null);

  const poll = useCallback(async () => {
    if (!conversationId) return;
    try {
      const params = lastFetchRef.current ? { after: lastFetchRef.current } : {};
      const res = await api.get(`/messages/conversations/${conversationId}`, { authRole, params });
      const incoming = res.data.messages || [];
      if (incoming.length > 0) {
        setMessages(prev => {
          // Defensive de-dupe: a message we already have locally (e.g.
          // one we just sent and appended optimistically) can come back
          // on the very next poll if it landed inside the same
          // request/response window as our `after` cutoff update.
          const seen = new Set(prev.map(m => m._id));
          const fresh = incoming.filter(m => !seen.has(m._id));
          return fresh.length ? [...prev, ...fresh] : prev;
        });
        lastFetchRef.current = new Date().toISOString();
      } else if (!lastFetchRef.current) {
        lastFetchRef.current = new Date().toISOString();
      }
    } catch (err) {
      console.error('Failed to poll messages', err);
    } finally {
      setLoading(false);
    }
  }, [conversationId, authRole]);

  useEffect(() => {
    setMessages([]);
    lastFetchRef.current = null;
    setLoading(true);
    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [poll]);

  const sendMessage = useCallback(async (text) => {
    const res = await api.post(`/messages/conversations/${conversationId}`, { text }, { authRole });
    // Move the polling cutoff forward to this message's own timestamp so
    // the next poll doesn't re-fetch (and duplicate) the message we just
    // added to state ourselves — this was the root cause of messages
    // appearing twice.
    lastFetchRef.current = res.data.message.createdAt;
    setMessages(prev => (prev.some(m => m._id === res.data.message._id) ? prev : [...prev, res.data.message]));
    return res.data.message;
  }, [conversationId, authRole]);

  return { messages, loading, sendMessage };
};
