const KEY = 'buyonuma_pending_chat';

/**
 * Remembers which seller (and optionally which product) a signed-out
 * buyer was trying to message, so the conversation can be started
 * automatically right after they log in — see resumePendingChat() below,
 * and the handleStartChat() functions in SellerDetailPage.jsx /
 * ProductDetailPage.jsx that call this before redirecting to /buyer/login.
 */
export const setPendingChatIntent = ({ sellerId, productId }) => {
  try {
    localStorage.setItem(KEY, JSON.stringify({ sellerId, productId: productId || null }));
  } catch {
    /* localStorage unavailable (private browsing, etc.) — chat just won't auto-resume, not fatal */
  }
};

export const clearPendingChatIntent = () => {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
};

const getPendingChatIntent = () => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/**
 * Call right after a buyer successfully logs in, registers, or signs in
 * with Google. If they'd clicked "Start Chat" while signed out, this
 * starts (or resumes) that conversation now, so they land straight in
 * their Messages tab already talking to that seller instead of having to
 * find the seller again and click Start Chat a second time.
 *
 * Returns true if a conversation was resumed, false otherwise (nothing
 * pending, or the start-chat request itself failed — e.g. the seller no
 * longer exists — in which case we fail silently and the buyer just
 * lands on their normal dashboard).
 */
export const resumePendingChat = async (api) => {
  const intent = getPendingChatIntent();
  if (!intent?.sellerId) return false;
  clearPendingChatIntent();
  try {
    await api.post('/messages/conversations', {
      sellerId: intent.sellerId,
      productId: intent.productId || undefined,
    }, { authRole: 'buyer' });
    return true;
  } catch {
    return false;
  }
};
