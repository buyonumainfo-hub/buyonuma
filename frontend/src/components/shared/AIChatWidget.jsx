import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Sparkles, Loader2 } from 'lucide-react';
import api from '../../utils/api';
import { useViewedProduct } from '../../context/ViewedProductContext';
import './AIChatWidget.css';

const WELCOME = {
  role: 'assistant',
  content: "Hi! I'm your BuyOnUma shopping assistant. Ask me to help you find products or sellers, or ask a question about the product you're viewing.",
};

const FAB_SIZE = 54;
const DRAG_MARGIN = 8;
const CLICK_THRESHOLD = 5; // px of movement before a press counts as a drag, not a click

const AIChatWidget = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 }); // translate offset from the FAB's default CSS position
  const [dragging, setDragging] = useState(false);
  const scrollRef = useRef(null);
  const fabRef = useRef(null);
  const dragState = useRef(null); // { startX, startY, baseLeft, baseTop, moved }
  const { viewedProduct } = useViewedProduct() || {};

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  // Keep the widget on-screen if the viewport is resized/rotated after a drag.
  useEffect(() => {
    const clampToViewport = () => {
      if (!fabRef.current) return;
      setPos((p) => {
        const rect = fabRef.current.getBoundingClientRect();
        const baseLeft = rect.left - p.x;
        const baseTop = rect.top - p.y;
        const maxX = window.innerWidth - FAB_SIZE - DRAG_MARGIN - baseLeft;
        const maxY = window.innerHeight - FAB_SIZE - DRAG_MARGIN - baseTop;
        const minX = DRAG_MARGIN - baseLeft;
        const minY = DRAG_MARGIN - baseTop;
        return {
          x: Math.min(Math.max(p.x, minX), maxX),
          y: Math.min(Math.max(p.y, minY), maxY),
        };
      });
    };
    window.addEventListener('resize', clampToViewport);
    return () => window.removeEventListener('resize', clampToViewport);
  }, []);

  const handlePointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return; // left click / primary touch only
    const rect = fabRef.current.getBoundingClientRect();
    dragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      baseLeft: rect.left - pos.x,
      baseTop: rect.top - pos.y,
      moved: false,
    };
    fabRef.current.setPointerCapture(e.pointerId);
    setDragging(true);
  };

  const handlePointerMove = (e) => {
    const ds = dragState.current;
    if (!ds) return;
    const dx = e.clientX - ds.startX;
    const dy = e.clientY - ds.startY;
    if (!ds.moved && (Math.abs(dx) > CLICK_THRESHOLD || Math.abs(dy) > CLICK_THRESHOLD)) {
      ds.moved = true;
    }
    if (!ds.moved) return;

    const minLeft = DRAG_MARGIN;
    const maxLeft = window.innerWidth - FAB_SIZE - DRAG_MARGIN;
    const minTop = DRAG_MARGIN;
    const maxTop = window.innerHeight - FAB_SIZE - DRAG_MARGIN;

    const newLeft = Math.min(Math.max(ds.baseLeft + dx, minLeft), maxLeft);
    const newTop = Math.min(Math.max(ds.baseTop + dy, minTop), maxTop);

    setPos({ x: newLeft - ds.baseLeft, y: newTop - ds.baseTop });
  };

  const handlePointerUp = () => {
    const ds = dragState.current;
    dragState.current = null;
    setDragging(false);
    if (ds && !ds.moved) {
      // No real movement — treat as a normal click.
      setOpen((v) => !v);
    }
  };

  const send = async (e) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const newMessages = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
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

  const dragTransform = { transform: `translate(${pos.x}px, ${pos.y}px)` };

  return (
    <>
      <button
        ref={fabRef}
        className={`ai-chat-fab ${open ? 'ai-chat-fab-open' : ''} ${dragging ? 'ai-chat-fab-dragging' : ''}`}
        style={dragTransform}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        aria-label={open ? 'Close chat assistant' : 'Open chat assistant'}
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      {open && (
        <div className="ai-chat-panel" style={dragTransform}>
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