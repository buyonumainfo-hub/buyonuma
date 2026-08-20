import { useRef, useLayoutEffect, useId } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Store, ShoppingBag, Info, Phone } from 'lucide-react';
import { useBuyerAuth } from '../../context/BuyerAuthContext';
import { useSellerAuth } from '../../context/SellerAuthContext';
import './BottomNav.css';

// Colors + notch mechanic ported from the "Animated Tab Bar" reference
// (dribbble.com/shots/5619509 / codepen.io/abxlfazl/pen/VwKzaEm):
// a dark bar, a colored circle that pops the active icon up into a
// clip-path "notch" cut out of the bar, and an icon stroke draw-in.
const tabs = [
  { to: '/home',     icon: Home,        label: 'Home',     color: '#e0b11594' },
  { to: '/sellers',  icon: Store,       label: 'Sellers',  color: '#e0b11594' },
  { to: '/',         icon: ShoppingBag, label: 'Products', color: '#e0b11594' },
  { to: '/about',    icon: Info,        label: 'About',    color: '#e0b11594' },
  { to: '/contact',  icon: Phone,       label: 'Contact',  color: '#e0b11594' },
];

// Route prefixes that have their own dedicated navigation (seller
// dashboard sidebar, buyer dashboard nav, admin panel) — the public
// bottom nav would just be visual clutter / conflict with those, so we
// hide it there instead of showing both.
const PRIVATE_PREFIXES = ['/admin', '/seller', '/buyer'];

export default function BottomNav() {
  const { pathname } = useLocation();
  const { isAuthenticated: isBuyerAuthenticated } = useBuyerAuth();
  const { isAuthenticated: isSellerAuthenticated } = useSellerAuth();

  // Unique per-mount id so multiple instances never collide on the
  // clipPath id (React 18's useId is already collision-safe, we just
  // strip the colons since they're awkward inside a url(#...) ref).
  const clipId = `bnav-clip-${useId().replace(/[:]/g, '')}`;

  const navRef = useRef(null);
  const itemRefs = useRef({});
  const borderRef = useRef(null);

  const activeTab = tabs.find((t) => t.to === pathname) || null;
  const activeTo = activeTab ? activeTab.to : null;

  // Slides the notch under the active icon, same approach as the
  // reference's offsetMenuBorder(): measure the active item's rect and
  // translate the border to match, re-running on resize too.
  useLayoutEffect(() => {
    const moveBorder = () => {
      const nav = navRef.current;
      const border = borderRef.current;
      const activeEl = activeTo ? itemRefs.current[activeTo] : null;

      if (!nav || !border || !activeEl) {
        if (border) border.style.opacity = '0';
        return;
      }

      const navRect = nav.getBoundingClientRect();
      const itemRect = activeEl.getBoundingClientRect();
      const left = itemRect.left - navRect.left - (border.offsetWidth - itemRect.width) / 2;

      border.style.opacity = '1';
      border.style.transform = `translate3d(${left}px, 0, 0)`;
    };

    moveBorder();
    window.addEventListener('resize', moveBorder);
    return () => window.removeEventListener('resize', moveBorder);
  }, [activeTo]);

  const isPrivateSection = PRIVATE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isBuyerAuthenticated || isSellerAuthenticated) return null;
  if (isPrivateSection) return null;

  return (
    <nav className="bottom-nav" ref={navRef}>
      {/* Same clip-path "moon" cutout shape as the reference, reused
          verbatim (it's resolution independent via objectBoundingBox). */}
      <svg width="0" height="0" aria-hidden="true" style={{ position: 'absolute' }}>
        <clipPath
          id={clipId}
          clipPathUnits="objectBoundingBox"
          transform="scale(0.0049285362247413 0.021978021978022)"
        >
          <path d="M6.7,45.5c5.7,0.1,14.1-0.4,23.3-4c5.7-2.3,9.9-5,18.1-10.5c10.7-7.1,11.8-9.2,20.6-14.3c5-2.9,9.2-5.2,15.2-7
            c7.1-2.1,13.3-2.3,17.6-2.1c4.2-0.2,10.5,0.1,17.6,2.1c6.1,1.8,10.2,4.1,15.2,7c8.8,5,9.9,7.1,20.6,14.3c8.3,5.5,12.4,8.2,18.1,10.5
            c9.2,3.6,17.6,4.2,23.3,4H6.7z" />
        </clipPath>
      </svg>

      <div
        ref={borderRef}
        className="bottom-nav-border"
        style={{ clipPath: `url(#${clipId})`, opacity: 0 }}
      />

      {tabs.map(({ to, icon: Icon, label, color }) => {
        const active = pathname === to;
        return (
          <Link
            key={to}
            to={to}
            ref={(el) => { itemRefs.current[to] = el; }}
            className={`bottom-nav-item ${active ? 'active' : ''}`}
            style={{ '--tab-color': color }}
          >
            <span className="bottom-nav-icon">
              <Icon size={20} strokeWidth={2} />
            </span>
            <span className="bottom-nav-label">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}