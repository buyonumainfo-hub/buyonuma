<<<<<<< HEAD
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Search, SlidersHorizontal, Loader2, MapPin, PackageSearch, ChevronRight, Import } from 'lucide-react';
import Navbar from '../../components/shared/Navbar';
import ProductCard from '../../components/public/ProductCard';
import api from '../../utils/api';
import fCache from '../../utils/frontendCache';
import { CATEGORIES, SORT_OPTIONS, CATEGORY_ICONS, CATEGORY_ICONS_F } from '../../utils/constants';
import { getSubcategories } from '../../utils/categories';
import { NIGERIA_STATES, NIGERIA_CITIES_BY_STATE } from '../../utils/nigeriaLocations';
import { useUserLocation } from '../../hooks/useUserLocation';
import './SellersPage.css';
import './ProductsPage.css';
import React from 'react';


const LIMIT = 12;

export default function ProductsPage(){
  const [products, setProducts] = useState([]);
  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [total, setTotal] = useState(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [subcategory, setSubcategory] = useState('All');
  const [sortIdx, setSortIdx] = useState(0);
  const { location: userLocation, status: geoStatus, error: geoError, detect } = useUserLocation();

  // Manual "browse by state/LGA" filters — independent of the "Nearest to
  // me" sort (which relies on auto-detected location instead). Only
  // active when sort isn't 'nearest', so the two location features never
  // fight over the same query params.
  const [stateFilter, setStateFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const cityOptions = useMemo(() => NIGERIA_CITIES_BY_STATE[stateFilter] || [], [stateFilter]);

  const pageRef = useRef(1);
  const hasMoreRef = useRef(true);
  const isFetchingRef = useRef(false);
  const categoryRef = useRef('All');
  const subcategoryRef = useRef('All');
  const sortIdxRef = useRef(0);
  const searchRef = useRef('');
  const stateFilterRef = useRef('');
  const cityFilterRef = useRef('');
  const sentinelRef = useRef(null);
  const observerRef = useRef(null);
  const searchDebounceRef = useRef(null);
  const isFirstSearchRender = useRef(true);

  const doFetch = useCallback(async (pageNum) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    const cat = categoryRef.current, sub = subcategoryRef.current, si = sortIdxRef.current, q = searchRef.current;
    const opt = SORT_OPTIONS[si];
    const isNearest = opt.value === 'nearest';
    const st = stateFilterRef.current, ct = cityFilterRef.current;
    const key = `products:${cat}:${sub}:${si}:${q}:${isNearest ? `${userLocation?.state}-${userLocation?.city}` : `${st}-${ct}`}:p${pageNum}`;
    const cached = fCache.get(key);
    if (pageNum === 1) setLoadingInit(true); else setLoadingMore(true);
    try {
      let data;
      if (cached) { data = cached; }
      else {
        if (isNearest && !userLocation?.state) {
          // Nothing to sort by yet — bail out quietly, the UI prompts the user to detect location
          isFetchingRef.current = false;
          if (pageNum === 1) setLoadingInit(false); else setLoadingMore(false);
          return;
        }
        const res = await api.get('/products', { params: {
          page: pageNum, limit: LIMIT, sort: opt.value, order: opt.order,
          category: cat !== 'All' ? cat : undefined, search: q || undefined,
          // "Nearest to me" uses the auto-detected location; the manual
          // state/LGA dropdowns (below) are used otherwise. Never both at once.
          state: isNearest ? userLocation.state : (st || undefined),
          city: isNearest ? userLocation.city : (ct || undefined),
        } });
        data = res.data;
        fCache.set(key, data, 30);
      }
      const incoming = data.products || [];
      setProducts(prev => pageNum === 1 ? incoming : [...prev, ...incoming]);
      setTotal(data.pagination.total);
      pageRef.current = pageNum;
      hasMoreRef.current = pageNum < data.pagination.pages;
    } catch (e) { console.error(e); }
    finally {
      isFetchingRef.current = false;
      if (pageNum === 1) setLoadingInit(false); else setLoadingMore(false);
    }
  }, [userLocation]);

  useEffect(() => {
    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMoreRef.current && !isFetchingRef.current)
        doFetch(pageRef.current + 1);
    }, { rootMargin: '400px' });
    if (sentinelRef.current) observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect();
  }, [doFetch]);

  const resetAndFetch = useCallback(() => {
    isFetchingRef.current = false; pageRef.current = 1; hasMoreRef.current = true;
    setProducts([]); setTotal(null); doFetch(1);
  }, [doFetch]);

  useEffect(() => { doFetch(1); }, []); // eslint-disable-line

  // If the "Nearest to me" sort is selected but we don't have a location
  // yet, refetch automatically once detection finishes (e.g. user granted
  // permission after clicking the sort option).
  useEffect(() => {
    if (SORT_OPTIONS[sortIdx].value === 'nearest' && geoStatus === 'done' && userLocation?.state) {
      fCache.delPrefix('products:');
      resetAndFetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geoStatus, userLocation]);

  // Live search: refetch a short moment after the user stops typing,
  // instead of requiring a click on the Search button. Skips the very
  // first render so it doesn't double-fire alongside the initial doFetch(1).
  useEffect(() => {
    if (isFirstSearchRender.current) {
      isFirstSearchRender.current = false;
      return;
    }
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      searchRef.current = search;
      fCache.delPrefix('products:');
      resetAndFetch();
    }, 200);

    return () => clearTimeout(searchDebounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchRef.current = search;
    fCache.delPrefix('products:');
    resetAndFetch();
  };
  const handleCategory = (cat) => {
    setCategory(cat); categoryRef.current = cat;
    setSubcategory('All'); subcategoryRef.current = 'All'; // subcategory list depends on category, so reset it
    setSearch(''); // clear any search text a previous subcategory click set
    fCache.delPrefix('products:'); resetAndFetch();
  };
  const handleSubcategory = (sub) => {
    setSubcategory(sub);
    subcategoryRef.current = sub;
    // Most existing products don't have their `subcategory` field filled
    // in, so filtering on it directly returned nothing. Instead, reuse the
    // search box's own (working) debounced fetch: put the subcategory text
    // into the search input, trimmed so there's no trailing space left
    // over, and let the normal search flow (the effect watching `search`
    // above) take it from there.
    setSearch(sub === 'All' ? '' : sub.trim());
  };
  const handleSort = (idx) => {
    setSortIdx(idx); sortIdxRef.current = idx; fCache.delPrefix('products:');
    if (SORT_OPTIONS[idx].value === 'nearest' && !userLocation?.state) {
      detect(); // prompts the browser location permission; the effect above refetches on success
      return;
    }
    resetAndFetch();
  };

  const handleStateFilter = (value) => {
    setStateFilter(value);
    stateFilterRef.current = value;
    setCityFilter('');
    cityFilterRef.current = '';
    fCache.delPrefix('products:');
    resetAndFetch();
  };

  const handleCityFilter = (value) => {
    setCityFilter(value);
    cityFilterRef.current = value;
    fCache.delPrefix('products:');
    resetAndFetch();
  };

  const isNearestSort = SORT_OPTIONS[sortIdx].value === 'nearest';

  return (
    <>
      <Navbar />

      {/* ── Hero ── */}
      <div className="pp-hero">
        <div className="container">
          <p className="pp-eyebrow">BuyOnUma</p>
          <h1 className="pp-title">All Products</h1>
          <p className="pp-subtitle">
            {total !== null ? `Browse ${total} product${total !== 1 ? 's' : ''} from our sellers` : 'Loading products…'}
          </p>

          <form className="pp-search" onSubmit={handleSearch}>
            <Search size={17} className="pp-search-icon" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pp-search-input"
            />
            <button type="submit" className="pp-search-btn" aria-label="Search">
              <Search size={15} />
            </button>
          </form>
        </div>
      </div>

      <div className="container pp-body">
        {/* ── Filters bar ── */}
        <div className="pp-filters">
          <div className="pp-filter-group">
            <SlidersHorizontal size={14} />
            <select
              value={sortIdx}
              onChange={(e) => handleSort(Number(e.target.value))}
              className="pp-select"
            >
              {SORT_OPTIONS.map((o, i) => <option key={i} value={i}>{o.label}</option>)}
            </select>
          </div>

          {/* Manual State / LGA filters — hidden while "Nearest to me" is active
              since that sort already drives location from auto-detected GPS,
              and mixing both would be confusing/contradictory. */}
          {!isNearestSort && (
            <>
              <div className="pp-filter-group">
                <MapPin size={14} />
                <select
                  value={stateFilter}
                  onChange={(e) => handleStateFilter(e.target.value)}
                  className="pp-select"
                >
                  <option value="">All States</option>
                  {NIGERIA_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="pp-filter-group">
                <select
                  value={cityFilter}
                  onChange={(e) => handleCityFilter(e.target.value)}
                  className="pp-select"
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
        <div className="pp-chip-row-wrap">
          <div className="pp-chip-row">
                 {CATEGORIES.map((cat) => {
            const Icon = CATEGORY_ICONS_F[cat];
            return (
              <button
                key={cat}
                className={`pp-chip ${category === cat ? 'is-active' : ''}`}
                onClick={() => handleCategory(cat)}
                title={cat}
              >
                <span className="pp-chip-icon"><Icon size={16} strokeWidth={2} /></span>
                <span className="pp-chip-label">{cat}</span>
              </button>
            );
          })}
          </div>
          <span className="pp-scroll-hint">
            <ChevronRight size={13} />
          </span>
        </div>

        {category !== 'All' && getSubcategories(category).length > 0 && (
          <div className="pp-chip-row pp-chip-row--sub">
            <button
              className={`pp-chip pp-chip--sm ${subcategory === 'All' ? 'is-active' : ''}`}
              onClick={() => handleSubcategory('All')}
            >
              <span className="pp-chip-label">All {category}</span>
            </button>
            {getSubcategories(category).map((sub) => (
              <button
                key={sub}
                className={`pp-chip pp-chip--sm ${subcategory === sub ? 'is-active' : ''}`}
                onClick={() => handleSubcategory(sub)}
                title={sub}
              >
                <span className="pp-chip-label">{sub}</span>
              </button>
            ))}
          </div>
        )}

        {/* ── Location status ── */}
        {isNearestSort && (
          <div className="pp-location-banner">
            <MapPin size={14} />
            {geoStatus === 'locating' && <span>Detecting your location…</span>}
            {geoStatus === 'done' && userLocation?.state && (
              <span>Showing products nearest to {userLocation.city ? `${userLocation.city}, ` : ''}{userLocation.state}</span>
            )}
            {(geoStatus === 'denied' || geoStatus === 'error') && (
              <span>{geoError} <button onClick={detect} className="pp-link-btn">Try again</button></span>
            )}
          </div>
        )}
        {!isNearestSort && (stateFilter || cityFilter) && (
          <div className="pp-location-banner">
            <MapPin size={14} />
            <span>Showing products in {cityFilter ? `${cityFilter}, ` : ''}{stateFilter}</span>
            <button onClick={() => handleStateFilter('')} className="pp-link-btn">Clear</button>
          </div>
        )}

        {total !== null && !loadingInit && (
          <p className="pp-results-count">{total} product{total !== 1 ? 's' : ''} found</p>
        )}

              {loadingInit && (
          <div className="grid-4 product-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="product-card-skeleton">
                <div className="pcs-shimmer pcs-image" />
                <div className="pcs-body">
                  <div className="pcs-meta">
                    <div className="pcs-shimmer pcs-eyebrow" />
                    <div className="pcs-shimmer pcs-title" />
                    <div className="pcs-shimmer pcs-price" />
                  </div>
                  <div className="pcs-shimmer pcs-cta" />
                </div>
                <div className="pcs-shimmer pcs-desc" />
                <div className="pcs-footer">
                  <div className="pcs-shimmer pcs-seller" />
                  <div className="pcs-shimmer pcs-view" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loadingInit && products.length === 0 && (
          <div className="pp-empty-state">
            <PackageSearch size={34} />
            <p>No products found</p>
            <span>Try a different search term or clear your filters.</span>
          </div>
        )}

        {products.length > 0 && (
          <div className="grid-4 product-grid">
            {products.map((p) => <ProductCard key={p._id} product={p} />)}
          </div>
        )}

        <div ref={sentinelRef} style={{ height: 1, marginTop: 8 }} />

        {loadingMore && (
          <div className="pp-loadmore">
            <Loader2 size={18} className="spinning" />
            <span>Loading more…</span>
          </div>
        )}


        {!hasMoreRef.current && products.length > 0 && !loadingMore && (
          <p className="pp-end">— You've seen all {total} products —</p>
        )}
      </div>


    </>
  );
=======
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Search, SlidersHorizontal, Loader2, MapPin, PackageSearch, ChevronRight, Import } from 'lucide-react';
import Navbar from '../../components/shared/Navbar';
import ProductCard from '../../components/public/ProductCard';
import api from '../../utils/api';
import fCache from '../../utils/frontendCache';
import { CATEGORIES, SORT_OPTIONS, CATEGORY_ICONS, CATEGORY_ICONS_F } from '../../utils/constants';
import { getSubcategories } from '../../utils/categories';
import { NIGERIA_STATES, NIGERIA_CITIES_BY_STATE } from '../../utils/nigeriaLocations';
import { useUserLocation } from '../../hooks/useUserLocation';
import './SellersPage.css';
import './ProductsPage.css';
import React from 'react';


const LIMIT = 12;

export default function ProductsPage(){
  const [products, setProducts] = useState([]);
  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [total, setTotal] = useState(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [subcategory, setSubcategory] = useState('All');
  const [sortIdx, setSortIdx] = useState(0);
  const { location: userLocation, status: geoStatus, error: geoError, detect } = useUserLocation();

  // Manual "browse by state/LGA" filters — independent of the "Nearest to
  // me" sort (which relies on auto-detected location instead). Only
  // active when sort isn't 'nearest', so the two location features never
  // fight over the same query params.
  const [stateFilter, setStateFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const cityOptions = useMemo(() => NIGERIA_CITIES_BY_STATE[stateFilter] || [], [stateFilter]);

  const pageRef = useRef(1);
  const hasMoreRef = useRef(true);
  const isFetchingRef = useRef(false);
  const categoryRef = useRef('All');
  const subcategoryRef = useRef('All');
  const sortIdxRef = useRef(0);
  const searchRef = useRef('');
  const stateFilterRef = useRef('');
  const cityFilterRef = useRef('');
  const sentinelRef = useRef(null);
  const observerRef = useRef(null);
  const searchDebounceRef = useRef(null);
  const isFirstSearchRender = useRef(true);

  const doFetch = useCallback(async (pageNum) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    const cat = categoryRef.current, sub = subcategoryRef.current, si = sortIdxRef.current, q = searchRef.current;
    const opt = SORT_OPTIONS[si];
    const isNearest = opt.value === 'nearest';
    const st = stateFilterRef.current, ct = cityFilterRef.current;
    const key = `products:${cat}:${sub}:${si}:${q}:${isNearest ? `${userLocation?.state}-${userLocation?.city}` : `${st}-${ct}`}:p${pageNum}`;
    const cached = fCache.get(key);
    if (pageNum === 1) setLoadingInit(true); else setLoadingMore(true);
    try {
      let data;
      if (cached) { data = cached; }
      else {
        if (isNearest && !userLocation?.state) {
          // Nothing to sort by yet — bail out quietly, the UI prompts the user to detect location
          isFetchingRef.current = false;
          if (pageNum === 1) setLoadingInit(false); else setLoadingMore(false);
          return;
        }
        const res = await api.get('/products', { params: {
          page: pageNum, limit: LIMIT, sort: opt.value, order: opt.order,
          category: cat !== 'All' ? cat : undefined, search: q || undefined,
          // "Nearest to me" uses the auto-detected location; the manual
          // state/LGA dropdowns (below) are used otherwise. Never both at once.
          state: isNearest ? userLocation.state : (st || undefined),
          city: isNearest ? userLocation.city : (ct || undefined),
        } });
        data = res.data;
        fCache.set(key, data, 30);
      }
      const incoming = data.products || [];
      setProducts(prev => pageNum === 1 ? incoming : [...prev, ...incoming]);
      setTotal(data.pagination.total);
      pageRef.current = pageNum;
      hasMoreRef.current = pageNum < data.pagination.pages;
    } catch (e) { console.error(e); }
    finally {
      isFetchingRef.current = false;
      if (pageNum === 1) setLoadingInit(false); else setLoadingMore(false);
    }
  }, [userLocation]);

  useEffect(() => {
    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMoreRef.current && !isFetchingRef.current)
        doFetch(pageRef.current + 1);
    }, { rootMargin: '400px' });
    if (sentinelRef.current) observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect();
  }, [doFetch]);

  const resetAndFetch = useCallback(() => {
    isFetchingRef.current = false; pageRef.current = 1; hasMoreRef.current = true;
    setProducts([]); setTotal(null); doFetch(1);
  }, [doFetch]);

  useEffect(() => { doFetch(1); }, []); // eslint-disable-line

  // If the "Nearest to me" sort is selected but we don't have a location
  // yet, refetch automatically once detection finishes (e.g. user granted
  // permission after clicking the sort option).
  useEffect(() => {
    if (SORT_OPTIONS[sortIdx].value === 'nearest' && geoStatus === 'done' && userLocation?.state) {
      fCache.delPrefix('products:');
      resetAndFetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geoStatus, userLocation]);

  // Live search: refetch a short moment after the user stops typing,
  // instead of requiring a click on the Search button. Skips the very
  // first render so it doesn't double-fire alongside the initial doFetch(1).
  useEffect(() => {
    if (isFirstSearchRender.current) {
      isFirstSearchRender.current = false;
      return;
    }
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      searchRef.current = search;
      fCache.delPrefix('products:');
      resetAndFetch();
    }, 200);

    return () => clearTimeout(searchDebounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchRef.current = search;
    fCache.delPrefix('products:');
    resetAndFetch();
  };
  const handleCategory = (cat) => {
    setCategory(cat); categoryRef.current = cat;
    setSubcategory('All'); subcategoryRef.current = 'All'; // subcategory list depends on category, so reset it
    setSearch(''); // clear any search text a previous subcategory click set
    fCache.delPrefix('products:'); resetAndFetch();
  };
  const handleSubcategory = (sub) => {
    setSubcategory(sub);
    subcategoryRef.current = sub;
    // Most existing products don't have their `subcategory` field filled
    // in, so filtering on it directly returned nothing. Instead, reuse the
    // search box's own (working) debounced fetch: put the subcategory text
    // into the search input, trimmed so there's no trailing space left
    // over, and let the normal search flow (the effect watching `search`
    // above) take it from there.
    setSearch(sub === 'All' ? '' : sub.trim());
  };
  const handleSort = (idx) => {
    setSortIdx(idx); sortIdxRef.current = idx; fCache.delPrefix('products:');
    if (SORT_OPTIONS[idx].value === 'nearest' && !userLocation?.state) {
      detect(); // prompts the browser location permission; the effect above refetches on success
      return;
    }
    resetAndFetch();
  };

  const handleStateFilter = (value) => {
    setStateFilter(value);
    stateFilterRef.current = value;
    setCityFilter('');
    cityFilterRef.current = '';
    fCache.delPrefix('products:');
    resetAndFetch();
  };

  const handleCityFilter = (value) => {
    setCityFilter(value);
    cityFilterRef.current = value;
    fCache.delPrefix('products:');
    resetAndFetch();
  };

  const isNearestSort = SORT_OPTIONS[sortIdx].value === 'nearest';

  return (
    <>
      <Navbar />

      {/* ── Hero ── */}
      <div className="pp-hero">
        <div className="container">
          <p className="pp-eyebrow">BuyOnUma</p>
          <h1 className="pp-title">All Products</h1>
          <p className="pp-subtitle">
            {total !== null ? `Browse ${total} product${total !== 1 ? 's' : ''} from our sellers` : 'Loading products…'}
          </p>

          <form className="pp-search" onSubmit={handleSearch}>
            <Search size={17} className="pp-search-icon" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pp-search-input"
            />
            <button type="submit" className="pp-search-btn" aria-label="Search">
              <Search size={15} />
            </button>
          </form>
        </div>
      </div>

      <div className="container pp-body">
        {/* ── Filters bar ── */}
        <div className="pp-filters">
          <div className="pp-filter-group">
            <SlidersHorizontal size={14} />
            <select
              value={sortIdx}
              onChange={(e) => handleSort(Number(e.target.value))}
              className="pp-select"
            >
              {SORT_OPTIONS.map((o, i) => <option key={i} value={i}>{o.label}</option>)}
            </select>
          </div>

          {/* Manual State / LGA filters — hidden while "Nearest to me" is active
              since that sort already drives location from auto-detected GPS,
              and mixing both would be confusing/contradictory. */}
          {!isNearestSort && (
            <>
              <div className="pp-filter-group">
                <MapPin size={14} />
                <select
                  value={stateFilter}
                  onChange={(e) => handleStateFilter(e.target.value)}
                  className="pp-select"
                >
                  <option value="">All States</option>
                  {NIGERIA_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="pp-filter-group">
                <select
                  value={cityFilter}
                  onChange={(e) => handleCityFilter(e.target.value)}
                  className="pp-select"
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
        <div className="pp-chip-row-wrap">
          <div className="pp-chip-row">
                 {CATEGORIES.map((cat) => {
            const Icon = CATEGORY_ICONS_F[cat];
            return (
              <button
                key={cat}
                className={`pp-chip ${category === cat ? 'is-active' : ''}`}
                onClick={() => handleCategory(cat)}
                title={cat}
              >
                <span className="pp-chip-icon"><Icon size={16} strokeWidth={2} /></span>
                <span className="pp-chip-label">{cat}</span>
              </button>
            );
          })}
          </div>
          <span className="pp-scroll-hint">
            <ChevronRight size={13} />
          </span>
        </div>

        {category !== 'All' && getSubcategories(category).length > 0 && (
          <div className="pp-chip-row pp-chip-row--sub">
            <button
              className={`pp-chip pp-chip--sm ${subcategory === 'All' ? 'is-active' : ''}`}
              onClick={() => handleSubcategory('All')}
            >
              <span className="pp-chip-label">All {category}</span>
            </button>
            {getSubcategories(category).map((sub) => (
              <button
                key={sub}
                className={`pp-chip pp-chip--sm ${subcategory === sub ? 'is-active' : ''}`}
                onClick={() => handleSubcategory(sub)}
                title={sub}
              >
                <span className="pp-chip-label">{sub}</span>
              </button>
            ))}
          </div>
        )}

        {/* ── Location status ── */}
        {isNearestSort && (
          <div className="pp-location-banner">
            <MapPin size={14} />
            {geoStatus === 'locating' && <span>Detecting your location…</span>}
            {geoStatus === 'done' && userLocation?.state && (
              <span>Showing products nearest to {userLocation.city ? `${userLocation.city}, ` : ''}{userLocation.state}</span>
            )}
            {(geoStatus === 'denied' || geoStatus === 'error') && (
              <span>{geoError} <button onClick={detect} className="pp-link-btn">Try again</button></span>
            )}
          </div>
        )}
        {!isNearestSort && (stateFilter || cityFilter) && (
          <div className="pp-location-banner">
            <MapPin size={14} />
            <span>Showing products in {cityFilter ? `${cityFilter}, ` : ''}{stateFilter}</span>
            <button onClick={() => handleStateFilter('')} className="pp-link-btn">Clear</button>
          </div>
        )}

        {total !== null && !loadingInit && (
          <p className="pp-results-count">{total} product{total !== 1 ? 's' : ''} found</p>
        )}

              {loadingInit && (
          <div className="grid-4 product-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="product-card-skeleton">
                <div className="pcs-shimmer pcs-image" />
                <div className="pcs-body">
                  <div className="pcs-meta">
                    <div className="pcs-shimmer pcs-eyebrow" />
                    <div className="pcs-shimmer pcs-title" />
                    <div className="pcs-shimmer pcs-price" />
                  </div>
                  <div className="pcs-shimmer pcs-cta" />
                </div>
                <div className="pcs-shimmer pcs-desc" />
                <div className="pcs-footer">
                  <div className="pcs-shimmer pcs-seller" />
                  <div className="pcs-shimmer pcs-view" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loadingInit && products.length === 0 && (
          <div className="pp-empty-state">
            <PackageSearch size={34} />
            <p>No products found</p>
            <span>Try a different search term or clear your filters.</span>
          </div>
        )}

        {products.length > 0 && (
          <div className="grid-4 product-grid">
            {products.map((p) => <ProductCard key={p._id} product={p} />)}
          </div>
        )}

        <div ref={sentinelRef} style={{ height: 1, marginTop: 8 }} />

        {loadingMore && (
          <div className="pp-loadmore">
            <Loader2 size={18} className="spinning" />
            <span>Loading more…</span>
          </div>
        )}


        {!hasMoreRef.current && products.length > 0 && !loadingMore && (
          <p className="pp-end">— You've seen all {total} products —</p>
        )}
      </div>


    </>
  );
>>>>>>> b403b42571a91fae11e3332f19cf5691d2aba20a
}