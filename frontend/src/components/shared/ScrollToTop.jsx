import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

// Scrolls to top on a genuine forward navigation (clicking a link, calling
// navigate()), but leaves scroll position alone on back/forward browser
// navigation (POP) — that's what was forcing product/seller/cart pages
// back to the top every time someone hit the back button. The browser's
// own scroll restoration handles POP correctly on its own; we just need
// to get out of its way.
const ScrollToTop = () => {
  const { pathname } = useLocation();
  const navType = useNavigationType(); // 'POP' | 'PUSH' | 'REPLACE'
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    if (navType === 'POP') return; // back/forward — preserve scroll position
    window.scrollTo(0, 0);
  }, [pathname, navType]);

  return null;
};

export default ScrollToTop;
