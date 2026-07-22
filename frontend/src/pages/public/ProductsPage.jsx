import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Search, SlidersHorizontal, Loader2, MapPin } from 'lucide-react';
import Navbar from '../../components/shared/Navbar';
import Footer from '../../components/shared/Footer';
import ProductCard from '../../components/public/ProductCard';
import api from '../../utils/api';
import fCache from '../../utils/frontendCache';
import { CATEGORIES, SORT_OPTIONS, CATEGORY_ICONS } from '../../utils/constants';
import { NIGERIA_STATES, NIGERIA_CITIES_BY_STATE } from '../../utils/nigeriaLocations';
import { useUserLocation } from '../../hooks/useUserLocation';
import './SellersPage.css';

const LIMIT = 12;

export default function ProductsPage() {
const [products, setProducts] = useState([]);
const [loadingInit, setLoadingInit] = useState(true);
const [loadingMore, setLoadingMore] = useState(false);
const [total, setTotal] = useState(null);
const [search, setSearch] = useState('');
const [category, setCategory] = useState('All');
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
const cat = categoryRef.current, si = sortIdxRef.current, q = searchRef.current;
const opt = SORT_OPTIONS[si];
const isNearest = opt.value === 'nearest';
const st = stateFilterRef.current, ct = cityFilterRef.current;
const key = `products:${cat}:${si}:${q}:${isNearest ? `${userLocation?.state}-${userLocation?.city}` : `${st}-${ct}`}:p${pageNum}`;
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
console.log(data)
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
const handleCategory = (cat) => { setCategory(cat); categoryRef.current = cat; fCache.delPrefix('products:'); resetAndFetch(); };
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
<div className="page-header">
<div className="container">
<p className="section-eyebrow" style={{ color:'var(--gold)', marginBottom:'0.5rem' }}>BuyOnUma</p>
<h1 style={{ fontFamily:'var(--font-serif)', fontSize:'2.5rem', color:'var(--white)', marginBottom:'0.5rem' }}>All Products</h1>
<p style={{ color:'var(--font-serif)', fontSize:'0.95rem' }}>{total !== null ? `Browse ${total} product${total!==1?'s':''} from our sellers` : 'Loading…'}</p>
</div>
</div>
<div className="container" style={{ padding:'3rem 2rem' }}>
<div className="filters-bar">
<form className="search-form" onSubmit={handleSearch}>
<Search size={16}/><input type="text" placeholder="Search products..." value={search} onChange={e =>{
    setSearch(e.target.value);
  
   }} className="search-input"/>
<button type="submit" className="btn btn-primary btn-sm"><Search size={13}/></button>
</form>
<div className="filters-right">
<div className="filter-group"><SlidersHorizontal size={14}/>
<select value={sortIdx} onChange={e => handleSort(Number(e.target.value))} className="form-control" style={{ width:'auto' }}>
{SORT_OPTIONS.map((o,i) => <option key={i} value={i}>{o.label}</option>)}
</select>
</div>

{/* Manual State / LGA filters — hidden while "Nearest to me" is active
    since that sort already drives location from auto-detected GPS,
    and mixing both would be confusing/contradictory. */}
{!isNearestSort && (
  <>
    <div className="filter-group">
      <MapPin size={14} />
      <select
        value={stateFilter}
        onChange={(e) => handleStateFilter(e.target.value)}
        className="form-control"
        style={{ width: 'auto' }}
      >
        <option value="">All States</option>
        {NIGERIA_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
    </div>
    <div className="filter-group">
      <select
        value={cityFilter}
        onChange={(e) => handleCityFilter(e.target.value)}
        className="form-control"
        style={{ width: 'auto' }}
        disabled={!stateFilter}
      >
        <option value="">{stateFilter ? 'All LGAs / Cities' : 'Select a state first'}</option>
        {cityOptions.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
    </div>
  </>
)}
</div>
</div>
<div
  style={{
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "12px",
    fontWeight: 500,
    color: "#e0e7f7",
   
    padding: "4px 10px",
    borderRadius: "999px",
    animation: "fadeInHint 0.6s ease-out, pulseHint 2s ease-in-out infinite 0.6s",
  }}
>
  Scroll for more categories
  <span style={{ display: "inline-block", animation: "nudgeArrow 1.2s ease-in-out infinite" }}>
    ➡️
  </span>
</div>
 <div className="category-scroll">
          {CATEGORIES.map(cat => (
            <button key={cat}
              className={`category-chip ${category===cat?'active':''}`}
              onClick={() => handleCategory(cat)}
              title={cat}>
              <span className="category-chip-icon">{CATEGORY_ICONS[cat]}</span>
              <span className="category-chip-label">{cat}</span>
            </button>
          ))}
        </div>
{isNearestSort && (
  <div style={{ display:'flex', alignItems:'center', gap:'0.4rem', fontSize:'0.8rem', color:'var(--ink-muted)', margin:'0.5rem 0' }}>
    <MapPin size={14} />
    {geoStatus === 'locating' && <span>Detecting your location…</span>}
    {geoStatus === 'done' && userLocation?.state && (
      <span>Showing products nearest to {userLocation.city ? `${userLocation.city}, ` : ''}{userLocation.state}</span>
    )}
    {(geoStatus === 'denied' || geoStatus === 'error') && (
      <span>{geoError} <button onClick={detect} style={{ background:'none', border:'none', color:'var(--gold)', cursor:'pointer', textDecoration:'underline', padding:0 }}>Try again</button></span>
    )}
  </div>
)}
{!isNearestSort && (stateFilter || cityFilter) && (
  <div style={{ display:'flex', alignItems:'center', gap:'0.4rem', fontSize:'0.8rem', color:'var(--ink-muted)', margin:'0.5rem 0' }}>
    <MapPin size={14} />
    <span>Showing products in {cityFilter ? `${cityFilter}, ` : ''}{stateFilter}</span>
    <button
      onClick={() => handleStateFilter('')}
      style={{ background:'none', border:'none', color:'var(--gold)', cursor:'pointer', textDecoration:'underline', padding:0 }}
    >
      Clear
    </button>
  </div>
)}
{total !== null && !loadingInit && <p className="results-count">{total} product{total!==1?'s':''} found</p>}
{loadingInit && <div className="grid-4 product-grid">{Array.from({length:8}).map((_,i)=><div key={i} className="skeleton-card"/>)}</div>}
{!loadingInit && products.length===0 && <div className="empty-state"><p>No products found.</p></div>}
{products.length>0 && <div className="grid-4 product-grid">{products.map(p=><ProductCard key={p._id} product={p}/>)}</div>}
<div ref={sentinelRef} style={{ height:1, marginTop:8 }}/>
{loadingMore && <div className="infinite-loading"><Loader2 size={22} className="spinning"/><span>Loading more…</span></div>}
{!hasMoreRef.current && products.length>0 && !loadingMore && <p className="end-of-results">— You've seen all {total} products —</p>}
</div>



<style>{`
  @keyframes fadeInHint {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes pulseHint {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }
  @keyframes nudgeArrow {
    0%, 100% { transform: translateX(0); }
    50% { transform: translateX(4px); }
  }
`}</style>
</>
);
}