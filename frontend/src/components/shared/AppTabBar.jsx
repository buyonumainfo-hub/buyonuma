import { useRef, useLayoutEffect, useState, useId } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MoreHorizontal, X, LogOut } from 'lucide-react';
import './AppTabBar.css';

// Same accent palette as BottomNav (lifted from the Animated Tab Bar
// reference), cycled across however many primary tabs are passed in.
const PALETTE = ['#e0b1158b', '#e0b1158b', '#e0b1158b', '#e0b1158b', '#e0b1158b', '#e0b1158b'];
const MORE_COLOR = '#7c7c9b';

/**
 * App-style bottom tab bar used by both the seller and buyer dashboards
 * (see SellerLayout and BuyerDashboard) so both feel like the same app
 * rather than two different admin panels bolted together. `items` holds
 * the primary tabs (max ~4-5 fit comfortably); anything else goes in
 * `moreItems`, revealed via a bottom sheet behind the "More" tab.
 *
 * Visually/animation-wise this mirrors BottomNav.jsx: a sliding
 * clip-path notch behind the active tab, a colored circle that pops the
 * icon up into it, and a stroke draw-in on the icon itself.
 */
export default function AppTabBar({ items, moreItems = [], onLogout, activeOverride }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [sheetOpen, setSheetOpen] = useState(false);

  const isActive = (to) => (activeOverride ? activeOverride === to : location.pathname === to);
  const hasMore = moreItems.length > 0 || !!onLogout;
  const moreActive = sheetOpen || moreItems.some((m) => isActive(m.to));

  const clipId = `atab-clip-${useId().replace(/[:]/g, '')}`;
  const navRef = useRef(null);
  const itemRefs = useRef({});
  const borderRef = useRef(null);

  const activePrimary = items.find(({ to }) => isActive(to)) || null;
  const activeKey = hasMore && moreActive
    ? '__more__'
    : activePrimary
      ? (activePrimary.to || activePrimary.label)
      : null;

  useLayoutEffect(() => {
    const moveBorder = () => {
      const nav = navRef.current;
      const border = borderRef.current;
      const activeEl = activeKey ? itemRefs.current[activeKey] : null;

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
  }, [activeKey, items.length]);

  return (
    <>
      <nav className="app-tabbar" role="navigation" aria-label="Primary" ref={navRef}>
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
          className="app-tab-border"
          style={{ clipPath: `url(#${clipId})`, opacity: 0 }}
        />

        {items.map(({ to, icon: Icon, label, badge, onClick }, i) => {
          const key = to || label;
          const active = activeKey === key;
          const color = PALETTE[i % PALETTE.length];
          return (
            <button
              key={key}
              ref={(el) => { itemRefs.current[key] = el; }}
              className={`app-tab ${active ? 'active' : 'unactive'}`}
              style={{ '--tab-color': color }}
              onClick={() => (onClick ? onClick() : navigate(to))}
            >
              <span className="app-tab-icon">
                <Icon size={20} strokeWidth={1} />
                {badge > 0 && <span className="app-tab-badge">{badge > 9 ? '9+' : badge}</span>}
              </span>
              <span className="app-tab-label">{label}</span>
            </button>
          );
        })}

        {hasMore && (
          <button
            ref={(el) => { itemRefs.current['__more__'] = el; }}
            className={`app-tab ${moreActive ? 'active' : ''}`}
            style={{ '--tab-color': MORE_COLOR }}
            onClick={() => setSheetOpen(true)}
          >
            <span className="app-tab-icon"><MoreHorizontal size={20} strokeWidth={2} /></span>
            <span className="app-tab-label">More</span>
          </button>
        )}
      </nav>

      {sheetOpen && (
        <div className="app-tab-sheet-overlay" onClick={() => setSheetOpen(false)}>
          <div className="app-tab-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="app-tab-sheet-handle" />
            <div className="app-tab-sheet-grid">
              {moreItems.map(({ to, icon: Icon, label, badge }) => (
                <Link key={to} to={to} className="app-tab-sheet-item" onClick={() => setSheetOpen(false)}>
                  <span className="app-tab-sheet-icon">
                    <Icon size={20} />
                    {badge > 0 && <span className="app-tab-badge">{badge > 9 ? '9+' : badge}</span>}
                  </span>
                  <span>{label}</span>
                </Link>
              ))}
            </div>
            {onLogout && (
              <button className="app-tab-sheet-logout" onClick={() => { setSheetOpen(false); onLogout(); }}>
                <LogOut size={16} /> Sign Out
              </button>
            )}
            <button className="app-tab-sheet-close" onClick={() => setSheetOpen(false)}><X size={18} /></button>
          </div>
        </div>
      )}
    </>
  );
}