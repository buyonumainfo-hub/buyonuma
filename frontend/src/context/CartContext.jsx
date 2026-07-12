import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { trackView } from '../utils/trackView';

const CartContext = createContext(null);
const STORAGE_KEY = 'buyonuma_cart';

/**
 * Cart is intentionally client-only (localStorage), matching how the rest
 * of the marketplace works: there's no checkout/payment flow — buyers
 * contact sellers directly via WhatsApp/phone to complete a purchase. The
 * cart's job is just to let a buyer collect items across products/sellers
 * before reaching out, and to pre-fill a WhatsApp message summarizing
 * what they want.
 */
const readCart = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState(readCart);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* localStorage might be full/unavailable (private browsing) — cart just won't persist */
    }
  }, [items]);

  // Keep cart in sync across tabs
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) setItems(readCart());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const addItem = useCallback((product, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === product._id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product._id ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [
        ...prev,
        {
          productId: product._id,
          name: product.name,
          price: product.price,
          image: product.product_image || product.images?.[0] || '',
          sellerId: product.seller?._id || product.seller,
          sellerName: product.seller?.store_name || '',
          sellerWhatsapp: product.seller?.whatsapp || '',
          quantity,
          addedAt: Date.now(),
        },
      ];
    });

    // Tracked here (rather than in every "Add to Cart" button across the
    // app) so it's impossible to add a new entry point later and forget
    // to wire up tracking — this is the single place an item actually
    // enters the cart.
    const sellerId = product.seller?._id || product.seller;
    trackView(sellerId, 'add_to_cart', product._id);
  }, []);

  const removeItem = useCallback((productId) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const updateQuantity = useCallback((productId, quantity) => {
    if (quantity < 1) return;
    setItems((prev) => prev.map((i) => (i.productId === productId ? { ...i, quantity } : i)));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const isInCart = useCallback((productId) => items.some((i) => i.productId === productId), [items]);

  const totalItems = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);
  const totalPrice = useMemo(() => items.reduce((sum, i) => sum + i.price * i.quantity, 0), [items]);

  // Group by seller — most buyers will want to message one seller at a
  // time about their items, since each seller fulfills their own orders.
  const itemsBySeller = useMemo(() => {
    const groups = {};
    for (const item of items) {
      const key = item.sellerId || 'unknown';
      if (!groups[key]) groups[key] = { sellerId: item.sellerId, sellerName: item.sellerName, sellerWhatsapp: item.sellerWhatsapp, items: [] };
      groups[key].items.push(item);
    }
    return Object.values(groups);
  }, [items]);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearCart, isInCart, totalItems, totalPrice, itemsBySeller }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
