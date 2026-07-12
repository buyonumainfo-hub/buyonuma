import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Sparkles, Loader2 } from 'lucide-react';
import api from '../../utils/api';
import { useViewedProduct } from '../../context/ViewedProductContext';
import './AIChatWidget.css';

const WELCOME = {
  role: 'assistant',
  content: "Hi! I'm your BuyOnUma shopping assistant. Ask me to help you find products or sellers, or ask a question about the product you're viewing.",
};

const AIChatWidget = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  const { viewedProduct } = useViewedProduct() || {};

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  const send = async (e) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const newMessages = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      // Send recent history (excluding the welcome message) so the
      // assistant has conversational context, and the currently-viewed
      // product ID if the buyer has a product modal open.
      const history = newMessages
        .filter((m) => m !== WELCOME)
        .slice(-8)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await api.post('/ai-chat', {
        message: text,
        history,
        productId: viewedProduct?._id,
      });

      setMessages((prev) => [...prev, { role: 'assistant', content: res.data.reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: "Sorry, I'm having trouble responding right now. Please try again in a moment." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        className={`ai-chat-fab ${open ? 'ai-chat-fab-open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close chat assistant' : 'Open chat assistant'}
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      {open && (
        <div className="ai-chat-panel">
          <div className="ai-chat-header">
            <div className="ai-chat-header-title">
              <Sparkles size={16} />
              <span>Shopping Assistant</span>
            </div>
            {viewedProduct && (
              <span className="ai-chat-context-pill" title="This assistant can answer questions about this product">
                Viewing: {viewedProduct.name}
              </span>
            )}
          </div>

          <div className="ai-chat-messages" ref={scrollRef}>
            {messages.map((m, i) => (
              <div key={i} className={`ai-chat-bubble ai-chat-bubble-${m.role}`}>
                {m.content}
              </div>
            ))}
            {loading && (
              <div className="ai-chat-bubble ai-chat-bubble-assistant ai-chat-typing">
                <Loader2 size={14} className="spin" /> Thinking…
              </div>
            )}
          </div>

          <form className="ai-chat-input-row" onSubmit={send}>
            <input
              type="text"
              placeholder="Ask about a product or seller…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={500}
            />
            <button type="submit" disabled={loading || !input.trim()} aria-label="Send">
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default AIChatWidget;
