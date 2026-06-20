import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Clock, Trash2 } from 'lucide-react';
import SellerLayout from '../../components/seller/SellerLayout';
import Pagination from '../../components/shared/Pagination';
import MultiImageUploader from '../../components/shared/MultiImageUploader';
import { CATEGORIES_NO_ALL, CATEGORY_ICONS } from '../../utils/constants';
import { useSellerAuth } from '../../context/SellerAuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';

const api_url = `${import.meta.env.VITE_API_URL}`

const EMPTY = { name:'', description:'', price:'', category:'Food & Beverages & Cakes', time_frame:'', images:[] };

function ProductModal({ product, onClose, onSaved, token }) {
  const isEdit=!!product?._id;
  const [form,setForm]=useState(isEdit?{name:product.name,description:product.description||'',price:product.price,category:product.category,time_frame:product.time_frame||'',images:(product.images&&product.images.length>0)?product.images:(product.product_image?[product.product_image]:[])}:{...EMPTY});
  const [uploading,setUploading]=useState(false);
 
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const h={Authorization:`Bearer ${token}`};
 

  const handleSubmit=async e=>{
    e.preventDefault();setLoading(true);setError('');
    try{if(isEdit){await axios.put(`${api_url}/seller/products/${product._id}`,form,{headers:h});toast.success('Updated!');}else{await axios.post(`${api_url}/seller/products`,form,{headers:h});toast.success('Posted!');}onSaved();onClose();}
    catch(err){setError(err.response?.data?.message||'Error');}finally{setLoading(false);}
  };
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div className="modal-header"><h3 style={{fontFamily:'var(--font-serif)',fontSize:'1.05rem'}}>{isEdit?'Edit Product':'Add New Product'}</h3><button className="btn btn-outline btn-sm" onClick={onClose}>✕</button></div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
            {error&&<div className="alert alert-error">{error}</div>}
            <div className="form-group"><label className="form-label">Product Name *</label><input className="form-control" required value={form.name} onChange={e=>set('name',e.target.value)}/></div>
            <div className="grid-2"><div className="form-group"><label className="form-label">Price (₦) *</label><input type="number" className="form-control" required min="0" step="0.01" value={form.price} onChange={e=>set('price',e.target.value)}/></div><div className="form-group"><label className="form-label">Category *</label><select className="form-control" required value={form.category} onChange={e=>set('category',e.target.value)}>{CATEGORIES_NO_ALL.map(c=><option key={c}>{c}</option>)}</select></div></div>
            <div className="form-group"><label className="form-label">Description</label><textarea className="form-control" rows={3} value={form.description} onChange={e=>set('description',e.target.value)}/></div>
            <div className="form-group"><label className="form-label">Availability / Time Frame</label><input className="form-control" placeholder="e.g. Mon–Fri 9am–5pm" value={form.time_frame} onChange={e=>set('time_frame',e.target.value)}/></div>
            <div className="form-group"><label className="form-label">Product Photos (up to 5)</label><MultiImageUploader images={form.images} onChange={imgs=>set('images',imgs)} uploading={uploading} setUploading={setUploading}/></div>
          </div>
          <div className="modal-footer"><button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button><button type="submit" className="btn btn-primary" disabled={loading||uploading}>{loading?'Saving…':isEdit?'Update':'Post Product'}</button></div>
        </form>
      </div>
    </div>
  );
}

const ExpiryBadge = ({ expires_at }) => {
  if(!expires_at) return <span style={{fontSize:'0.75rem',color:'var(--ink-muted)',fontStyle:'italic'}}>No token set</span>;
  const diff=new Date(expires_at)-new Date();
  if(diff<=0) return <span style={{background:'#f3f4f6',color:'#6b7280',fontSize:'0.7rem',fontWeight:700,padding:'0.2rem 0.55rem',borderRadius:100}}>Expired</span>;
  const h=Math.floor(diff/3600000),m=Math.floor((diff%3600000)/60000);
  const cls=h<1?'#c0392b':h<6?'#e67e22':'#27ae60';
  return <span style={{display:'inline-flex',alignItems:'center',gap:3,background:h<1?'#fee2e2':h<6?'#ffedd5':'#d4f5e2',color:cls,fontSize:'0.7rem',fontWeight:700,padding:'0.2rem 0.55rem',borderRadius:100}}><Clock size={11}/>{h>0?`${h}h `:''}{m}m left</span>;
};

export default function SellerProducts() {
   const handleDelete = async (id) => {
    try {
      await axios.delete(`${api_url}/products/seller/${id}`, {headers:{Authorization:`Bearer ${token}`}}); toast.success('Product deleted'); fetchProducts(); }
    catch (err) { toast.error(err.response?.data?.message || 'Delete failed'); }
    finally { setDeleteId(null); }
  };
   const [deleteId, setDeleteId]   = useState(null);
  const { seller } = useSellerAuth();
  const [products,setProducts]=useState([]);const [pagination,setPagination]=useState(null);const [loading,setLoading]=useState(true);const [page,setPage]=useState(1);const [modal,setModal]=useState(null);
const token = localStorage.getItem('lens_seller_token');
  const fetchProducts=useCallback(async()=>{setLoading(true);try{const res=await axios.get(`${api_url}/seller/products?page=${page}&limit=10`,{headers:{Authorization:`Bearer ${token}`}});setProducts(res.data.products);setPagination(res.data.pagination);}catch(e){console.error(e);}finally{setLoading(false);}}, [page,token]);
  useEffect(()=>{fetchProducts();},[fetchProducts]);
  if(seller&&!seller.isApproved) return (<SellerLayout title="My Products"><div style={{textAlign:'center',padding:'4rem 2rem'}}><div style={{fontSize:'3rem',marginBottom:'1rem'}}>⏳</div><h2 style={{fontFamily:'var(--font-serif)',marginBottom:'0.5rem'}}>Awaiting Approval</h2><p style={{color:'var(--ink-muted)',fontSize:'0.9rem',maxWidth:400,margin:'0 auto'}}>Your account is pending admin approval before you can post products.</p></div></SellerLayout>);
  return (
    <SellerLayout title="My Products">
      <div style={{display:'flex',justifyContent:'flex-end',marginBottom:'1.25rem'}}><button className="btn btn-gold" onClick={()=>setModal('add')}><Plus size={16}/> Add Product</button></div>
      {loading?<div className="spinner"/>:(
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Visible Until</th><th style={{textAlign:'right'}}>Edit</th></tr></thead>
              <tbody>
                {products.length===0?<tr><td colSpan={5} style={{textAlign:'center',padding:'3rem',color:'var(--ink-muted)'}}>No products yet. Click "Add Product" to get started.</td></tr>:products.map(p=>(
                  <tr key={p._id}>
                    <td><div className="table-seller-info"><div className="table-avatar" style={{borderRadius:8}}>{p.product_image?<img src={p.product_image} alt={p.name}/>:<span>{CATEGORY_ICONS[p.category]}</span>}</div><div><p style={{fontWeight:600,fontSize:'0.875rem'}}>{p.name}</p>{p.description&&<p style={{fontSize:'0.72rem',color:'var(--ink-muted)',maxWidth:180,overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}}>{p.description}</p>}</div></div></td>
                    <td><span className="badge badge-gold" style={{fontSize:'0.65rem'}}>{p.category}</span></td>
                    <td style={{fontWeight:600,color:'var(--gold)'}}>₦{Number(p.price).toLocaleString()}</td>
                    <td><ExpiryBadge expires_at={p.expires_at}/></td>
                    <td><div style={{display:'flex',justifyContent:'flex-end'}}><button className="btn btn-outline btn-sm" onClick={()=>setModal(p)}><Pencil size={13}/> Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => setDeleteId(p._id)}><Trash2 size={13} /></button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination pagination={pagination} onPageChange={setPage}/>
        </>
      )}
      {modal&&<ProductModal product={modal==='add'?null:modal} onClose={()=>setModal(null)} onSaved={fetchProducts} token={token}/>}
   
   {deleteId && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDeleteId(null)}>
          <div className="modal" style={{ maxWidth:400 }}>
            <div className="modal-header"><h3>Confirm Delete</h3></div>
            <div className="modal-body"><p style={{ fontSize:'0.9rem' }}>Delete this product permanently? </p></div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteId)}>Delete</button>
            </div>
          </div>
        </div>
      )}
        
    </SellerLayout>
  );
}
