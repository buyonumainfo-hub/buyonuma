import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Search, Star, CheckCircle, XCircle, Upload } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import Pagination from '../../components/shared/Pagination';
import api from '../../utils/api';
import { uploadToCloudinary } from '../../utils/cloudinary';
import toast from 'react-hot-toast';
import { CATEGORIES_NO_ALL, SELLER_SORT_OPTIONS, CATEGORY_ICONS, ADMIN_SELLER_SORT_OPTIONS } from '../../utils/constants';
import './AdminSellers.css';

const EMPTY_FORM = {
  username:'', email:'', store_name:'', description:'', category:'Electronics',
  rating:0, contact:'', website:'', social_media_handle:'', whatsapp:'',
  profile_picture:'', banner:'', isApproved:true
};

const ImageUploadField = ({ label, value, onChange, circle }) => {
  const [uploading, setUploading] = useState(false);

  const handleChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      onChange(url);
      toast.success('Image uploaded!');
    } catch (err) { toast.error('Upload failed: ' + err.message); }
    finally { setUploading(false); }
  };

  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <label className="img-upload-label">
        {uploading ? (
          <span>Uploading…</span>
        ) : value ? (
          <img src={value} alt="" style={{ width: circle ? 48 : '100%', height: 48, borderRadius: circle ? '50%' : 6, objectFit:'cover' }} />
        ) : (
          <span><Upload size={14} /> Upload image</span>
        )}
        <input type="file" accept="image/*" hidden onChange={handleChange} disabled={uploading} />
      </label>
      {value && <button type="button" className="btn btn-outline btn-sm" style={{ marginTop:'0.4rem' }} onClick={() => onChange('')}>Remove</button>}
    </div>
  );
};

const SellerModal = ({ seller, onClose, onSaved }) => {
  const isEdit = !!seller?._id;
  const [form, setForm]     = useState(isEdit ? { ...seller, password:'' } : { ...EMPTY_FORM, password:'' });
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      if (isEdit) {
        await api.put(`/sellers/${seller._id}`, payload);
        toast.success('Seller updated!');
      } else {
        if (!payload.password) return setError('Password is required for new sellers');
        await api.post('/sellers', payload);
        toast.success('Seller added!');
      }
      onSaved(); onClose();
    } catch (err) { setError(err.response?.data?.message || 'Something went wrong'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth:700 }}>
        <div className="modal-header">
          <h3 style={{ fontFamily:'var(--font-serif)', fontSize:'1.1rem' }}>{isEdit ? 'Edit Seller' : 'Add New Seller'}</h3>
          <button className="btn btn-outline btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
            {error && <div className="alert alert-error">{error}</div>}
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Username *</label>
                <input className="form-control" required value={form.username || ""} onChange={e => set('username', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Store Name *</label>
                <input className="form-control" required value={form.store_name} onChange={e => set('store_name', e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Email Address {isEdit ? '' : '*'}</label>
              <input type="email" className="form-control" required={!isEdit} placeholder="seller@example.com"
                value={form.email || ''} onChange={e => set('email', e.target.value)} />
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">{isEdit ? 'New Password' : 'Password *'}</label>
                <input type="password" className="form-control" required={!isEdit} placeholder={isEdit ? 'Leave blank to keep current' : 'Min 6 chars'}
                  value={form.password} onChange={e => set('password', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Category *</label>
                <select className="form-control" required value={form.category} onChange={e => set('category', e.target.value)}>
                  {CATEGORIES_NO_ALL.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Rating (0–5)</label>
                <input type="number" className="form-control" min="0" max="5" step="0.1" value={form.rating} onChange={e => set('rating', e.target.value)} />
              </div>
              <div className="form-group" style={{ justifyContent:'flex-end' }}>
                <label className="form-label">Approved</label>
                <label style={{ display:'flex', alignItems:'center', gap:'0.5rem', cursor:'pointer', paddingTop:'0.65rem' }}>
                  <input type="checkbox" checked={!!form.isApproved} onChange={e => set('isApproved', e.target.checked)} style={{ width:16, height:16 }} />
                  <span style={{ fontSize:'0.85rem' }}>Seller is approved to post products</span>
                </label>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-control" rows={3} value={form.description} onChange={e => set('description', e.target.value)} />
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Contact</label>
                <input className="form-control" value={form.contact} onChange={e => set('contact', e.target.value)} placeholder="+234..." />
              </div>
              <div className="form-group">
                <label className="form-label">WhatsApp</label>
                <input className="form-control" value={form.whatsapp || ''} onChange={e => set('whatsapp', e.target.value)} placeholder="2348012345678" />
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Website</label>
                <input className="form-control" value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://..." />
              </div>
              <div className="form-group">
                <label className="form-label">Tiktok Username</label>
                <input className="form-control" value={form.social_media_handle} onChange={e => set('social_media_handle', e.target.value)} placeholder="tiktok username" />
              </div>
            </div>
            <div className="grid-2">
              <ImageUploadField label="Profile Picture" value={form.profile_picture} onChange={v => set('profile_picture', v)} circle />
              <ImageUploadField label="Banner Image"    value={form.banner}          onChange={v => set('banner', v)} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving…' : isEdit ? 'Update Seller' : 'Add Seller'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AdminSellers = () => {
  const [sellers, setSellers]     = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [category, setCategory]   = useState('All');
  const [sortIdx, setSortIdx]     = useState(0);
  const [page, setPage]           = useState(1);
  const [modal, setModal]         = useState(null);
  const [deleteId, setDeleteId]   = useState(null);

  const fetchSellers = useCallback(async () => {
    setLoading(true);
    try {
      const opt = ADMIN_SELLER_SORT_OPTIONS[sortIdx];
      const res = await api.get('/sellers/admin/all', {
        params:{ page, limit:10, sort:opt.value, order:opt.order, category: category !== 'All' ? category : undefined, search: search || undefined }
      });
      setSellers(res.data.sellers); setPagination(res.data.pagination);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [page, search, category, sortIdx]);

  useEffect(() => { fetchSellers(); }, [fetchSellers]);

  const handleDelete = async (id) => {
    try { await api.delete(`/sellers/${id}`); toast.success('Seller deleted'); fetchSellers(); }
    catch (err) { toast.error(err.response?.data?.message || 'Delete failed'); }
    finally { setDeleteId(null); }
  };

  const toggleApprove = async (s) => {
    try {
      await api.patch(`/sellers/${s._id}/approve`, { isApproved: !s.isApproved });
      toast.success(s.isApproved ? 'Seller suspended' : 'Seller approved');
      fetchSellers();
    } catch { toast.error('Failed'); }
  };

  return (
    <AdminLayout title="Sellers">
      <div className="admin-page-actions">
        <div className="admin-search">
          <Search size={15} />
          <input className="search-input" placeholder="Search sellers…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <div style={{ display:'flex', gap:'0.75rem', alignItems:'center', flexWrap:'wrap' }}>
          <select className="form-control" style={{ width:'auto' }} value={category} onChange={e => { setCategory(e.target.value); setPage(1); }}>
            <option value="All">All Categories</option>
            {CATEGORIES_NO_ALL.map(c => <option key={c}>{c}</option>)}
          </select>
          <select className="form-control" style={{ width:'auto' }} value={sortIdx} onChange={e => { setSortIdx(Number(e.target.value)); setPage(1); }}>
            {ADMIN_SELLER_SORT_OPTIONS.map((o,i) => <option key={i} value={i}>{o.label}</option>)}
          </select>
          <button className="btn btn-gold" onClick={() => setModal('add')}><Plus size={16} /> Add Seller</button>
        </div>
      </div>

      {loading ? <div className="spinner" /> : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Seller</th><th>Category</th><th>Rating</th><th>Status</th><th>Contact</th><th style={{ textAlign:'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sellers.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign:'center', padding:'2rem', color:'var(--ink-muted)' }}>No sellers found</td></tr>
                ) : sellers.map(s => (
                  <tr key={s._id}>
                    <td>
                      <div className="table-seller-info">
                        <div className="table-avatar">
                          {s.profile_picture ? <img src={s.profile_picture} alt={s.store_name} /> : <span>{s.store_name?.[0]}</span>}
                        </div>
                        <div>
                          <p style={{ fontWeight:600, fontSize:'0.875rem' }}>{s.store_name}</p>
                          <p style={{ fontSize:'0.75rem', color:'var(--ink-muted)' }}>@{s.username}</p>
                        </div>
                      </div>
                    </td>
                    <td><span className="badge badge-gold">{CATEGORY_ICONS[s.category]} {s.category}</span></td>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:'0.3rem', color:'var(--gold)' }}>
                        <Star size={13} fill="currentColor" /> {s.rating?.toFixed(1)}
                      </div>
                    </td>
                    <td>
                      <button onClick={() => toggleApprove(s)} className="btn btn-sm"
                        style={{ background: s.isApproved ? '#d4f5e2' : '#fef3c7', color: s.isApproved ? '#166534' : '#92400e', border:'none' }}>
                        {s.isApproved ? <><CheckCircle size={12} /> Approved</> : <><XCircle size={12} /> Pending</>}
                      </button>
                    </td>
                    <td style={{ fontSize:'0.8rem', color:'var(--ink-muted)' }}>{s.contact || '—'}</td>
                    <td>
                      <div style={{ display:'flex', justifyContent:'flex-end', gap:'0.5rem' }}>
                        <button className="btn btn-outline btn-sm" onClick={() => setModal(s)}><Pencil size={13} /></button>
                        <button className="btn btn-danger btn-sm" onClick={() => setDeleteId(s._id)}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination pagination={pagination} onPageChange={setPage} />
        </>
      )}

      {modal && <SellerModal seller={modal === 'add' ? null : modal} onClose={() => setModal(null)} onSaved={fetchSellers} />}

      {deleteId && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDeleteId(null)}>
          <div className="modal" style={{ maxWidth:400 }}>
            <div className="modal-header"><h3>Confirm Delete</h3></div>
            <div className="modal-body"><p style={{ fontSize:'0.9rem' }}>Delete this seller and all their products? This cannot be undone.</p></div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteId)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminSellers;
