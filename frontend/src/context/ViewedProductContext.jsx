import { createContext, useContext, useState } from 'react';

/**
 * Tracks which product (if any) is currently open in a modal, so the
 * site-wide AI chat widget can answer product-specific questions without
 * every product component needing to know about the chat widget directly.
 */
const ViewedProductContext = createContext(null);

export const ViewedProductProvider = ({ children }) => {
  const [viewedProduct, setViewedProduct] = useState(null);
  return (
    <ViewedProductContext.Provider value={{ viewedProduct, setViewedProduct }}>
      {children}
    </ViewedProductContext.Provider>
  );
};

export const useViewedProduct = () => useContext(ViewedProductContext);
