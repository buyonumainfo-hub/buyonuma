import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop = () => {
  const { pathname } = useLocation();
  
  useEffect(() => {
  // Force scroll after a tiny delay to ensure content is rendered
  const timer = setTimeout(() => {
    window.scrollTo(0, 0);
  }, 0);

  return () => clearTimeout(timer);
}, [pathname]);

  // useEffect(() => {
  //   window.scrollTo(0, 0);
  // }, [pathname]);

  return null;
};

export default ScrollToTop;