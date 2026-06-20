import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import Pagination from '../../components/shared/Pagination';
import MultiImageUploader from '../../components/shared/MultiImageUploader';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { CATEGORIES_NO_ALL, SORT_OPTIONS, CATEGORY_ICONS } from '../../utils/constants';

const EMPTY = { name:'', description:'', price:'', category:'Food & Beverages & Cakes', seller:'', time_frame:'', expiry_duration_hours:'', images:[] };

function ProductModal({ product, sellers, onClose, onSaved }) {
  const isEdit = !!product?._id;
  const [form, setForm] = useState(isEdit?{name:product.name,description:product.description||'',price:product.price,category:product.category,seller:product.seller?._id||product.seller||'',time_frame:product.time_frame||'',expiry_duration_hours:product.expiry_duration_hours||'',images:(product.images&&product.images.length>0)?product.images:(product.product_image?[product.product_image]:[])}:{...EMPTY});
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const handleSubmit = async e => {
    e.preventDefault(); setLoading(true); setError('');
    try { if(isEdit){await api.put(`/products/${product._id}`,form);toast.success('Updated!');}else{await api.post('/products',form);toast.success('Added!');} onSaved(); onClose(); }
    catch(err){setError(err.response?.data?.message||'Error');} finally{setLoading(false);}
  };
  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div className="modal-header"><h3 style={{fontFamily:'var(--font-serif)',fontSize:'1.1rem'}}>{isEdit?'Edit Product':'Add Product'}</h3><button className="btn btn-outline btn-sm" onClick={onClose}>✕</button></div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
            {error&&<div className="alert alert-error">{error}</div>}
            <div className="form-group"><label className="form-label">Product Name *</label><input className="form-control" required value={form.name} onChange={e=>set('name',e.target.value)}/></div>
            <div className="grid-2">
              <div className="form-group"><label className="form-label">Price (₦) *</label><input type="number" className="form-control" required min="0" step="0.01" value={form.price} onChange={e=>set('price',e.target.value)}/></div>
              <div className="form-group"><label className="form-label">Category *</label><select className="form-control" required value={form.category} onChange={e=>set('category',e.target.value)}>{CATEGORIES_NO_ALL.map(c=><option key={c}>{c}</option>)}</select></div>
            </div>
            <div className="form-group"><label className="form-label">Seller *</label><select className="form-control" required value={form.seller} onChange={e=>set('seller',e.target.value)}><option value="">— Select —</option>{sellers.map(s=><option key={s._id} value={s._id}>{s.store_name} (@{s.username})</option>)}</select></div>
            <div className="form-group"><label className="form-label">Description</label><textarea className="form-control" rows={3} value={form.description} onChange={e=>set('description',e.target.value)}/></div>
            <div className="form-group"><label className="form-label">Time Frame</label><input className="form-control" placeholder="e.g. Mon–Fri 9am–5pm" value={form.time_frame} onChange={e=>set('time_frame',e.target.value)}/></div>
            <div className="form-group">
              <label className="form-label">⏳ Auto-expire After</label>
              <select className="form-control" value={form.expiry_duration_hours} onChange={e=>set('expiry_duration_hours',e.target.value)}>
                <option value="">Never expires</option><option value="1">1 hour</option><option value="6">6 hours</option><option value="12">12 hours</option><option value="24">24 hours (like WhatsApp status)</option><option value="48">2 days</option><option value="72">3 days</option><option value="168">1 week</option><option value="336">2 weeks</option><option value="720">1 month</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Product Photos (up to 5)</label>
              <MultiImageUploader images={form.images} onChange={imgs=>set('images',imgs)} uploading={uploading} setUploading={setUploading}/>
            </div>
          </div>
          <div className="modal-footer"><button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button><button type="submit" className="btn btn-primary" disabled={loading||uploading}>{loading?'Saving…':isEdit?'Update':'Add Product'}</button></div>
        </form>
      </div>
    </div>
  );
}

export default function AdminProducts() {
  const [products, setProducts] = useState([]); const [sellers, setSellers] = useState([]); const [pagination, setPagination] = useState(null); const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(''); const [category, setCategory] = useState('All'); const [sortIdx, setSortIdx] = useState(0); const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null); const [deleteId, setDeleteId] = useState(null);
  const fetch = useCallback(async()=>{ setLoading(true); try{ const opt=SORT_OPTIONS[sortIdx]; const res=await api.get('/products/admin/all',{params:{page,limit:10,sort:opt.value,order:opt.order,category:category!=='All'?category:undefined,search:search||undefined}}); setProducts(res.data.products); setPagination(res.data.pagination); }catch(e){console.error(e);}finally{setLoading(false);}}, [page,search,category,sortIdx]);
  useEffect(()=>{ fetch(); api.get('/sellers?limit=200').then(r=>setSellers(r.data.sellers)).catch(console.error); },[fetch]);
  const handleDelete = async id=>{ try{await api.delete(`/products/${id}`);toast.success('Deleted');fetch();}catch(err){toast.error(err.response?.data?.message||'Failed');}finally{setDeleteId(null);} };
  return (
    <AdminLayout title="Products">
      <div className="admin-page-actions">
        <div className="admin-search"><Search size={15}/><input className="search-input" placeholder="Search products…" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}/></div>
        <div style={{display:'flex',gap:'0.75rem',alignItems:'center',flexWrap:'wrap'}}>
          <select className="form-control" style={{width:'auto'}} value={category} onChange={e=>{setCategory(e.target.value);setPage(1);}}><option value="All">All Categories</option>{CATEGORIES_NO_ALL.map(c=><option key={c}>{c}</option>)}</select>
          <select className="form-control" style={{width:'auto'}} value={sortIdx} onChange={e=>{setSortIdx(Number(e.target.value));setPage(1);}}>{SORT_OPTIONS.map((o,i)=><option key={i} value={i}>{o.label}</option>)}</select>
          <button className="btn btn-gold" onClick={()=>setModal('add')}><Plus size={16}/> Add Product</button>
        </div>
      </div>
      {loading?<div className="spinner"/>:(
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Product</th><th>Seller</th><th>Category</th><th>Price</th><th>Expires In</th><th style={{textAlign:'right'}}>Actions</th></tr></thead>
              <tbody>
                {products.length===0?<tr><td colSpan={6} style={{textAlign:'center',padding:'2rem',color:'var(--ink-muted)'}}>No products found</td></tr>:products.map(p=>(
                  <tr key={p._id}>
                    <td><div className="table-seller-info"><div className="table-avatar" style={{borderRadius:8}}>{p.product_image?<img src={p.product_image} alt={p.name}/>:<span style={{fontSize:'1rem'}}>{CATEGORY_ICONS[p.category]}</span>}</div><div><p style={{fontWeight:600,fontSize:'0.875rem'}}>{p.name}</p>{p.description&&<p style={{fontSize:'0.72rem',color:'var(--ink-muted)',maxWidth:200,overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}}>{p.description}</p>}</div></div></td>
                    <td style={{fontSize:'0.82rem'}}>{p.seller?.store_name||'—'}</td>
                    <td><span className="badge badge-gold" style={{fontSize:'0.65rem'}}>{p.category}</span></td>
                    <td style={{fontWeight:600,color:'var(--gold)'}}>₦{Number(p.price).toLocaleString()}</td>
                    <td style={{fontSize:'0.78rem'}}>{p.expires_at?(()=>{const diff=new Date(p.expires_at)-new Date();if(diff<=0)return<span style={{color:'#c0392b',fontWeight:600}}>Expired</span>;const h=Math.floor(diff/3600000),m=Math.floor((diff%3600000)/60000);const color=h<1?'#c0392b':h<6?'#e67e22':'#27ae60';return<span style={{color,fontWeight:600}}>{h>0?`${h}h `:''}{m}m left</span>;})():<span style={{color:'var(--ink-muted)'}}>Never</span>}</td>
                    <td><div style={{display:'flex',justifyContent:'flex-end',gap:'0.5rem'}}><button className="btn btn-outline btn-sm" onClick={()=>setModal(p)}><Pencil size={13}/></button><button className="btn btn-danger btn-sm" onClick={()=>setDeleteId(p._id)}><Trash2 size={13}/></button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination pagination={pagination} onPageChange={setPage}/>
        </>
      )}
      {modal&&<ProductModal product={modal==='add'?null:modal} sellers={sellers} onClose={()=>setModal(null)} onSaved={fetch}/>}
      {deleteId&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setDeleteId(null)}>
          <div className="modal" style={{maxWidth:400}}><div className="modal-header"><h3>Confirm Delete</h3></div><div className="modal-body"><p style={{fontSize:'0.9rem'}}>Delete this product permanently?</p></div><div className="modal-footer"><button className="btn btn-outline" onClick={()=>setDeleteId(null)}>Cancel</button><button className="btn btn-danger" onClick={()=>handleDelete(deleteId)}>Delete</button></div></div>
        </div>
      )}
    </AdminLayout>
  );
}
