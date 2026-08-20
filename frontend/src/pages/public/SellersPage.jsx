import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, Loader2, MapPin, Store, ChevronRight } from 'lucide-react';
import Navbar from '../../components/shared/Navbar';
import Footer from '../../components/shared/Footer';
import SellerCard from '../../components/public/SellerCard';
import api from '../../utils/api';
import fCache from '../../utils/frontendCache';
import { CATEGORIES, SELLER_SORT_OPTIONS, CATEGORY_ICONS, CATEGORY_ICONS_F } from '../../utils/constants';
import { NIGERIA_STATES, NIGERIA_CITIES_BY_STATE } from '../../utils/nigeriaLocations';
import { useUserLocation } from '../../hooks/useUserLocation';
import './SellersPage.css';
import './SellersPage.css';

const LIMIT = 12;

const SellersPage = () => {
  const [sellers, setSellers]         = useState([]);
  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [total, setTotal]             = useState(null);
  const [search, setSearch]           = useState('');
  const [category, setCategory]       = useState('All');
  const [sortIdx, setSortIdx]         = useState(2);
  const { location: userLocation, status: geoStatus, error: geoError, detect, setManualLocation } = useUserLocation();
  const [searchParams] = useSearchParams();

  // Manual "browse by state/LGA" filters — independent of the "Nearest to
  // me" sort (which relies on auto-detected location instead). Only
  // active when sort isn't 'nearest', so the two location features never
  // fight over the same query params.
  const [stateFilter, setStateFilter] = useState('');
  const [cityFilter, setCityFilter]   = useState('');
  const cityOptions = useMemo(() => NIGERIA_CITIES_BY_STATE[stateFilter] || [], [stateFilter]);

  // Refs that the observer reads — no stale closures
  const pageRef       = useRef(1);
  const hasMoreRef    = useRef(true);
  const isFetchingRef = useRef(false);  // single gate — prevents all duplicate calls
  const categoryRef   = useRef('All');
  const sortIdxRef    = useRef(2);
  const searchRef     = useRef('');
  const stateFilterRef = useRef('');
  const cityFilterRef  = useRef('');
  const sentinelRef   = useRef(null);
  const observerRef   = useRef(null);

  // ── core fetch ──────────────────────────────────────────────────────────────
  const doFetch = useCallback(async (pageNum) => {
    if (isFetchingRef.current) return;   // already in-flight — bail immediately
    isFetchingRef.current = true;

    const cat    = categoryRef.current;
    const si     = sortIdxRef.current;
    const q      = searchRef.current;
    const opt    = SELLER_SORT_OPTIONS[si];
    const isNearest = opt.value === 'nearest';
    const st     = stateFilterRef.current;
    const ct     = cityFilterRef.current;
    const key    = `sellers:${cat}:${si}:${q}:${isNearest ? `${userLocation?.state}-${userLocation?.city}` : `${st}-${ct}`}:p${pageNum}`;
    const cached = fCache.get(key);

    if (pageNum === 1) setLoadingInit(true);
    else               setLoadingMore(true);

    try {
      let data;
      if (cached) {
        setLoadingInit(false)
        data = cached;
      } else {
        if (isNearest && !userLocation?.state) {
          isFetchingRef.current = false;
          setLoadingInit(false); setLoadingMore(false);
          return;
        }
        const res = await api.get('/sellers', {
          params: {
            page:     pageNum,
            limit:    LIMIT,
            sort:     opt.value,
            order:    opt.order,
            category: cat !== 'All' ? cat : undefined,
            search:   q || undefined,
            // "Nearest to me" uses the auto-detected location; the manual
            // state/LGA dropdowns (below) are used otherwise. Never both at once.
            state:    isNearest ? userLocation.state : (st || undefined),
            city:     isNearest ? userLocation.city : (ct || undefined),
          },
        });
        data = res.data;
        fCache.set(key, data, 45);
      }

      const incoming  = data.sellers || [];
      const totalPages = data.pagination.pages;

      setSellers(prev => pageNum === 1 ? incoming : [...prev, ...incoming]);
      setTotal(data.pagination.total);

      pageRef.current    = pageNum;
      hasMoreRef.current = pageNum < totalPages;
    } catch (err) {
      console.error('Sellers fetch error:', err);
    } finally {
      setLoadingInit(false)
      isFetchingRef.current = false;
      if (pageNum === 1) setLoadingInit(false);
      else               setLoadingMore(false);
    }
  }, [userLocation]);

  // ── set up IntersectionObserver once — never re-registers ─────────────────
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMoreRef.current &&
          !isFetchingRef.current
        ) {
          doFetch(pageRef.current + 1);
        }
      },
      { rootMargin: '400px' }
    );

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [doFetch]); // doFetch is stable (no deps) — this runs once

  // ── reset + refetch when filters change ───────────────────────────────────
  const resetAndFetch = useCallback(() => {
    // cancel any in-flight
    isFetchingRef.current = false;
    pageRef.current       = 1;
    hasMoreRef.current    = true;
    setSellers([]);
    setTotal(null);
    doFetch(1);
  }, [doFetch]);

  // initial load
  useEffect(() => {
    doFetch(1);
  }, []); // eslint-disable-line

  // If the page was reached via a "?state=Kwara" link (e.g. Home's
  // "Sellers Near You" -> "View All"), honor it: switch to nearest sort
  // using that state so results are filtered without requiring the
  // buyer to re-detect their location.
  useEffect(() => {
    const stateParam = searchParams.get('state');
    if (stateParam && !userLocation?.state) {
      setManualLocation(stateParam, searchParams.get('city') || '');
      const nearestIdx = SELLER_SORT_OPTIONS.findIndex(o => o.value === 'nearest');
      if (nearestIdx >= 0) { setSortIdx(nearestIdx); sortIdxRef.current = nearestIdx; }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refetch automatically once location detection completes for "nearest" sort
  useEffect(() => {
    if (SELLER_SORT_OPTIONS[sortIdx].value === 'nearest' && geoStatus === 'done' && userLocation?.state) {
      fCache.delPrefix('sellers:');
      resetAndFetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geoStatus, userLocation]);

  // ── filter handlers ────────────────────────────────────────────────────────
  const handleSearch = (e) => {
    e.preventDefault();
    searchRef.current = search;
    fCache.delPrefix('sellers:');
    resetAndFetch();
  };

  const handleCategoryChange = (cat) => {
    setCategory(cat);
    categoryRef.current = cat;
    fCache.delPrefix('sellers:');
    resetAndFetch();
  };

  const handleSortChange = (idx) => {
    setSortIdx(idx);
    sortIdxRef.current = idx;
    fCache.delPrefix('sellers:');
    if (SELLER_SORT_OPTIONS[idx].value === 'nearest' && !userLocation?.state) {
      detect();
      return;
    }
    resetAndFetch();
  };

  const handleStateFilter = (value) => {
    setStateFilter(value);
    stateFilterRef.current = value;
    setCityFilter('');
    cityFilterRef.current = '';
    fCache.delPrefix('sellers:');
    resetAndFetch();
  };

  const handleCityFilter = (value) => {
    setCityFilter(value);
    cityFilterRef.current = value;
    fCache.delPrefix('sellers:');
    resetAndFetch();
  };

  const isNearestSort = SELLER_SORT_OPTIONS[sortIdx].value === 'nearest';

  return (
    <>
      <Navbar />

      {/* ── Hero ── */}
      <div className="sp-hero">
        <div className="container">
          <p className="sp-eyebrow">Buyonuma</p>
          <h1 className="sp-title">Our Sellers</h1>
          <p className="sp-subtitle">
            {total !== null ? `Discover ${total} curated seller${total !== 1 ? 's' : ''}` : 'Loading sellers…'}
          </p>

          <form className="sp-search" onSubmit={handleSearch}>
            <Search size={17} className="sp-search-icon" />
            <input
              type="text"
              placeholder="Search sellers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="sp-search-input"
            />
            <button type="submit" className="sp-search-btn" aria-label="Search">
              <Search size={15} />
            </button>
          </form>
        </div>
      </div>

      <div className="container sp-body">
        {/* ── Filters bar ── */}
        <div className="sp-filters">
          <div className="sp-filter-group">
            <SlidersHorizontal size={14} />
            <select
              value={sortIdx}
              onChange={(e) => handleSortChange(Number(e.target.value))}
              className="sp-select"
            >
              {SELLER_SORT_OPTIONS.map((o, i) => (
                <option key={i} value={i}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Manual State / LGA filters — hidden while "Nearest to me" is
              active since that sort already drives location from
              auto-detected GPS, and mixing both would be contradictory. */}
          {!isNearestSort && (
            <>
              <div className="sp-filter-group">
                <MapPin size={14} />
                <select
                  value={stateFilter}
                  onChange={(e) => handleStateFilter(e.target.value)}
                  className="sp-select"
                >
                  <option value="">All States</option>
                  {NIGERIA_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="sp-filter-group">
                <select
                  value={cityFilter}
                  onChange={(e) => handleCityFilter(e.target.value)}
                  className="sp-select"
                  disabled={!stateFilter}
                >
                  <option value="">{stateFilter ? 'All LGAs / Cities' : 'Select a state first'}</option>
                  {cityOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </>
          )}
        </div>

        {/* ── Category chips ── */}
        <div className="sp-chip-row-wrap">
          <div className="sp-chip-row">
            {CATEGORIES.map((cat) => {
          const Icon = CATEGORY_ICONS_F[cat];
          return (
            <button
              key={cat}
              className={`pp-chip ${category === cat ? 'is-active' : ''}`}
              onClick={() => handleCategoryChange(cat)}
              title={cat}
            >
              <span className="pp-chip-icon"><Icon size={16} strokeWidth={2} /></span>
              <span className="pp-chip-label">{cat}</span>
            </button>
          );
        })}
          </div>
          <span className="sp-scroll-hint">
            <ChevronRight size={13} />
          </span>
        </div>

        {/* ── Location status ── */}
        {isNearestSort && (
          <div className="sp-location-banner">
            <MapPin size={14} />
            {geoStatus === 'locating' && <span>Detecting your location…</span>}
            {geoStatus === 'done' && userLocation?.state && (
              <span>Showing sellers nearest to {userLocation.city ? `${userLocation.city}, ` : ''}{userLocation.state}</span>
            )}
            {(geoStatus === 'denied' || geoStatus === 'error') && (
              <span>{geoError} <button onClick={detect} className="sp-link-btn">Try again</button></span>
            )}
          </div>
        )}

        {!isNearestSort && (stateFilter || cityFilter) && (
          <div className="sp-location-banner">
            <MapPin size={14} />
            <span>Showing sellers in {cityFilter ? `${cityFilter}, ` : ''}{stateFilter}</span>
            <button onClick={() => handleStateFilter('')} className="sp-link-btn">Clear</button>
          </div>
        )}

        {/* Results count */}
        {total !== null && !loadingInit && (
          <p className="sp-results-count">{total} seller{total !== 1 ? 's' : ''} found</p>
        )}

        {/* Skeleton */}
        {loadingInit && (
          <div className="grid-4 seller-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="pp-skeleton-card" />
            ))}
          </div>
        )}

        {/* Empty */}
        {!loadingInit && sellers.length === 0 && (
          <div className="sp-empty-state">
            <Store size={34} />
            <p>No sellers found</p>
            <span>Try a different search term or category.</span>
          </div>
        )}

        {/* Cards */}
        {sellers.length > 0 && (
          <div className="grid-4 seller-grid">
            {sellers.map((s) => <SellerCard key={s._id} seller={s} />)}
          </div>
        )}

        {/* Sentinel — observer watches this */}
        <div ref={sentinelRef} style={{ height: 1, marginTop: 8 }} />

        {/* Loading more */}
        {loadingMore && (
          <div className="sp-loadmore">
            <Loader2 size={18} className="spinning" />
            <span>Loading more sellers…</span>
          </div>
        )}

        {/* End */}
        {!hasMoreRef.current && sellers.length > 0 && !loadingMore && (
          <p className="sp-end">— You've seen all {total} sellers —</p>
        )}
      </div>
    </>
  );
};

export default SellersPage;