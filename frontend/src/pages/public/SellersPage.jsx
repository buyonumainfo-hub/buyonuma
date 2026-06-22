import { useEffect, useState, useRef, useCallback } from 'react';
import { Search, SlidersHorizontal, Loader2 } from 'lucide-react';
import Navbar from '../../components/shared/Navbar';
import Footer from '../../components/shared/Footer';
import SellerCard from '../../components/public/SellerCard';
import api from '../../utils/api';
import fCache from '../../utils/frontendCache';
import { CATEGORIES, SELLER_SORT_OPTIONS, CATEGORY_ICONS } from '../../utils/constants';
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

  // Refs that the observer reads — no stale closures
  const pageRef       = useRef(1);
  const hasMoreRef    = useRef(true);
  const isFetchingRef = useRef(false);  // single gate — prevents all duplicate calls
  const categoryRef   = useRef('All');
  const sortIdxRef    = useRef(2);
  const searchRef     = useRef('');
  const sentinelRef   = useRef(null);
  const observerRef   = useRef(null);

  // ── core fetch ──────────────────────────────────────────────────────────────
  const doFetch = useCallback(async (pageNum) => {
    if (isFetchingRef.current) return;   // already in-flight — bail immediately
    isFetchingRef.current = true;

    const cat    = categoryRef.current;
    const si     = sortIdxRef.current;
    const q      = searchRef.current;
    const key    = `sellers:${cat}:${si}:${q}:p${pageNum}`;
    const cached = fCache.get(key);

    if (pageNum === 1) setLoadingInit(true);
    else               setLoadingMore(true);

    try {
      let data;
      if (cached) {
        setLoadingInit(false)
        data = cached;
      } else {
        const opt = SELLER_SORT_OPTIONS[si];
        const res = await api.get('/sellers', {
          params: {
            page:     pageNum,
            limit:    LIMIT,
            sort:     opt.value,
            order:    opt.order,
            category: cat !== 'All' ? cat : undefined,
            search:   q || undefined,
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
  }, []);

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
    resetAndFetch();
  };

  return (
    <>
      <Navbar />
      <div className="page-header">
        <div className="container">
          <p className="section-eyebrow" style={{ color: 'var(--gold)', marginBottom: '0.5rem' }}>
            Buyonuma
          </p>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.5rem', color: 'var(--white)', marginBottom: '0.5rem' }}>
            Our Sellers
          </h1>
          <p style={{ color: 'var(--font)', fontSize: '0.95rem' }}>
            {total !== null
              ? `Discover ${total} curated seller${total !== 1 ? 's' : ''} on campus`
              : 'Loading sellers…'}
          </p>
        </div>
      </div>

      <div className="container" style={{ padding: '3rem 2rem' }}>
        {/* Filters */}
        <div className="filters-bar">
          <form className="search-form" onSubmit={handleSearch}>
            <Search size={16} />
            <input
              type="text"
              placeholder="Search sellers..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="search-input"
            />
            <button type="submit" className="btn btn-primary btn-sm">Search</button>
          </form>
          <div className="filters-right">
            <div className="filter-group">
              <SlidersHorizontal size={14} />
              <select
                value={sortIdx}
                onChange={e => handleSortChange(Number(e.target.value))}
                className="form-control"
                style={{ width: 'auto' }}
              >
                {SELLER_SORT_OPTIONS.map((o, i) => (
                  <option key={i} value={i}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Category pills */}
  <div className="category-scroll">
           {CATEGORIES.map(cat => (
             <button key={cat}
               className={`category-chip ${category===cat?'active':''}`}
               onClick={() => handleCategoryChange(cat)}
               title={cat}>
               <span className="category-chip-icon">{CATEGORY_ICONS[cat]}</span>
               <span className="category-chip-label">{cat}</span>
             </button>
           ))}
         </div>

        {/* Results count */}
        {total !== null && !loadingInit && (
          <p className="results-count">
            {total} seller{total !== 1 ? 's' : ''} found
          </p>
        )}

        {/* Skeleton */}
        {loadingInit && (
          <div className="grid-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton-card" />
            ))}
          </div>
        )}

        {/* Empty */}
        {!loadingInit && sellers.length === 0 && (
          <div className="empty-state">
            <p>No sellers found. Try a different search or category.</p>
          </div>
        )}

        {/* Cards */}
        {sellers.length > 0 && (
          <div className="grid-4">
            {sellers.map(s => <SellerCard key={s._id} seller={s} />)}
          </div>
        )}

        {/* Sentinel — observer watches this */}
        <div ref={sentinelRef} style={{ height: 1, marginTop: 8 }} />

        {/* Loading more */}
        {loadingMore && (
          <div className="infinite-loading">
            <Loader2 size={22} className="spinning" />
            <span>Loading more sellers…</span>
          </div>
        )}

        {/* End */}
        {!hasMoreRef.current && sellers.length > 0 && !loadingMore && (
          <p className="end-of-results">— You've seen all {total} sellers —</p>
        )}
      </div>

     
    </>
  );
};

export default SellersPage;
