import { useEffect, useState, useRef, useCallback } from 'react';
import { Search, SlidersHorizontal, Loader2 } from 'lucide-react';
import Navbar from '../../components/shared/Navbar';
import Footer from '../../components/shared/Footer';
import ProductCard from '../../components/public/ProductCard';
import api from '../../utils/api';
import fCache from '../../utils/frontendCache';
import { CATEGORIES, SORT_OPTIONS, CATEGORY_ICONS } from '../../utils/constants';
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

const pageRef = useRef(1);
const hasMoreRef = useRef(true);
const isFetchingRef = useRef(false);
const categoryRef = useRef('All');
const sortIdxRef = useRef(0);
const searchRef = useRef('');
const sentinelRef = useRef(null);
const observerRef = useRef(null);

const doFetch = useCallback(async (pageNum) => {
if (isFetchingRef.current) return;
isFetchingRef.current = true;
const cat = categoryRef.current, si = sortIdxRef.current, q = searchRef.current;
const key = `products:${cat}:${si}:${q}:p${pageNum}`;
const cached = fCache.get(key);
if (pageNum === 1) setLoadingInit(true); else setLoadingMore(true);
try {
let data;
if (cached) { data = cached; }
else {
const opt = SORT_OPTIONS[si];
const res = await api.get('/products', { params: { page: pageNum, limit: LIMIT, sort: opt.value, order: opt.order, category: cat !== 'All' ? cat : undefined, search: q || undefined } });
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
}, []);

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

const handleSearch = (e) => { e.preventDefault(); searchRef.current = search; fCache.delPrefix('products:'); resetAndFetch(); };
const handleCategory = (cat) => { setCategory(cat); categoryRef.current = cat; fCache.delPrefix('products:'); resetAndFetch(); };
const handleSort = (idx) => { setSortIdx(idx); sortIdxRef.current = idx; fCache.delPrefix('products:'); resetAndFetch(); };

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
<Search size={16}/><input type="text" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} className="search-input"/>
<button type="submit" className="btn btn-primary btn-sm">Search</button>
</form>
<div className="filters-right">
<div className="filter-group"><SlidersHorizontal size={14}/>
<select value={sortIdx} onChange={e => handleSort(Number(e.target.value))} className="form-control" style={{ width:'auto' }}>
{SORT_OPTIONS.map((o,i) => <option key={i} value={i}>{o.label}</option>)}
</select>
</div>
</div>
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
{total !== null && !loadingInit && <p className="results-count">{total} product{total!==1?'s':''} found</p>}
{loadingInit && <div className="grid-4 product-grid">{Array.from({length:8}).map((_,i)=><div key={i} className="skeleton-card"/>)}</div>}
{!loadingInit && products.length===0 && <div className="empty-state"><p>No products found.</p></div>}
{products.length>0 && <div className="grid-4 product-grid">{products.map(p=><ProductCard key={p._id} product={p}/>)}</div>}
<div ref={sentinelRef} style={{ height:1, marginTop:8 }}/>
{loadingMore && <div className="infinite-loading"><Loader2 size={22} className="spinning"/><span>Loading more…</span></div>}
{!hasMoreRef.current && products.length>0 && !loadingMore && <p className="end-of-results">— You've seen all {total} products —</p>}
</div>

</>
);
}