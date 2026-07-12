import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Clock, Trash2, X, Package } from 'lucide-react';
import SellerLayout from '../../components/seller/SellerLayout';
import Pagination from '../../components/shared/Pagination';
import MultiImageUploader from '../../components/shared/MultiImageUploader';
import { CATEGORIES_NO_ALL, CATEGORY_ICONS } from '../../utils/constants';
import { useSellerAuth } from '../../context/SellerAuthContext';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import './SellerProducts.css';

const EMPTY = { name: '', description: '', price: '', category: 'Food & Beverages & Cakes', time_frame: '', images: [] };

function ProductModal({ product, onClose, onSaved }) {
  const isEdit = !!product?._id;
  const [form, setForm] = useState(
    isEdit
      ? {
          name: product.name,
          description: product.description || '',
          price: product.price,
          category: product.category,
          time_frame: product.time_frame || '',
          images: (product.images && product.images.length > 0) ? product.images : (product.product_image ? [product.product_image] : []),
        }
      : { ...EMPTY }
  );
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isEdit) {
        await api.put(`/seller/products/${product._id}`, form);
        toast.success('Updated!');
      } else {
        await api.post('/seller/products', form);
        toast.success('Posted!');
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="sp-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sp-modal">
        <div className="sp-modal-header">
          <h3>{isEdit ? 'Edit Product' : 'Add New Product'}</h3>
          <button type="button" className="sp-modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="sp-modal-form">
          <div className="sp-modal-body">
            {error && <div className="alert alert-error">{error}</div>}

            <div className="form-group">
              <label className="form-label">Product Name *</label>
              <input className="form-control" required value={form.name} onChange={(e) => set('name', e.target.value)} />
            </div>

            <div className="sp-form-grid-2">
              <div className="form-group">
                <label className="form-label">Price (₦) *</label>
                <input type="number" className="form-control" required min="0" step="0.01" value={form.price} onChange={(e) => set('price', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Category *</label>
                <select className="form-control" required value={form.category} onChange={(e) => set('category', e.target.value)}>
                  {CATEGORIES_NO_ALL.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-control" rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">Availability / Time Frame</label>
              <input className="form-control" placeholder="e.g. Mon–Fri 9am–5pm" value={form.time_frame} onChange={(e) => set('time_frame', e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">Product Photos (up to 5)</label>
              <MultiImageUploader images={form.images} onChange={(imgs) => set('images', imgs)} uploading={uploading} setUploading={setUploading} />
            </div>
          </div>

          <div className="sp-modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading || uploading}>
              {loading ? 'Saving…' : isEdit ? 'Update' : 'Post Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const ExpiryBadge = ({ expires_at }) => {
  if (!expires_at) return <span className="expiry-none">No token set</span>;
  const diff = new Date(expires_at) - new Date();
  if (diff <= 0) return <span className="expiry-dead">Expired</span>;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const cls = h < 1 ? 'expiry-critical' : h < 6 ? 'expiry-warn' : 'expiry-ok';
  return (
    <span className={`expiry-tag ${cls}`}>
      <Clock size={11} />{h > 0 ? `${h}h ` : ''}{m}m left
    </span>
  );
};

export default function SellerProducts() {
  const [deleteId, setDeleteId] = useState(null);
  const { seller } = useSellerAuth();
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/seller/products?page=${page}&limit=10`);
      setProducts(res.data.products);
      setPagination(res.data.pagination);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const handleDelete = async (id) => {
    try {
      await api.delete(`/products/seller/${id}`);
      toast.success('Product deleted');
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    } finally {
      setDeleteId(null);
    }
  };

  if (seller && !seller.isApproved) {
    return (
      <SellerLayout title="My Products">
        <div className="sp-pending-state">
          <div className="sp-pending-icon">⏳</div>
          <h2>Awaiting Approval</h2>
          <p>Your account is pending admin approval before you can post products.</p>
        </div>
      </SellerLayout>
    );
  }

  return (
    <SellerLayout title="My Products">
      <div className="sp-toolbar">
        <button className="btn btn-gold" onClick={() => setModal('add')}>
          <Plus size={16} /> Add Product
        </button>
      </div>

      {loading ? (
        <div className="spinner" />
      ) : products.length === 0 ? (
        <div className="empty-state">
          <Package size={36} />
          <p>No products yet. Tap "Add Product" to get started.</p>
        </div>
      ) : (
        <>
          {/* Table layout — desktop/tablet only (hidden on mobile via CSS) */}
          <div className="admin-table-wrap sp-table-view">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Visible Until</th>
                  <th style={{ textAlign: 'right' }}>Edit</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p._id}>
                    <td>
                      <div className="table-seller-info">
                        <div className="table-avatar" style={{ borderRadius: 8 }}>
                          {p.product_image ? <img src={p.product_image} alt={p.name} /> : <span>{CATEGORY_ICONS[p.category]}</span>}
                        </div>
                        <div>
                          <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{p.name}</p>
                          {p.description && <p className="sp-table-desc">{p.description}</p>}
                        </div>
                      </div>
                    </td>
                    <td><span className="badge badge-gold" style={{ fontSize: '0.65rem' }}>{p.category}</span></td>
                    <td style={{ fontWeight: 600, color: 'var(--gold)' }}>₦{Number(p.price).toLocaleString()}</td>
                    <td><ExpiryBadge expires_at={p.expires_at} /></td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                        <button className="btn btn-outline btn-sm" onClick={() => setModal(p)}><Pencil size={13} /> Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => setDeleteId(p._id)}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Card layout — mobile only (hidden on desktop via CSS) */}
          <div className="sp-card-view">
            {products.map((p) => (
              <div key={p._id} className="sp-product-card">
                <div className="sp-product-card-image">
                  {p.product_image ? <img src={p.product_image} alt={p.name} /> : <span>{CATEGORY_ICONS[p.category]}</span>}
                </div>
                <div className="sp-product-card-body">
                  <div className="sp-product-card-top">
                    <p className="sp-product-card-name">{p.name}</p>
                    <span className="badge badge-gold sp-product-card-category">{p.category}</span>
                  </div>
                  {p.description && <p className="sp-product-card-desc">{p.description}</p>}
                  <div className="sp-product-card-meta">
                    <span className="sp-product-card-price">₦{Number(p.price).toLocaleString()}</span>
                    <ExpiryBadge expires_at={p.expires_at} />
                  </div>
                  <div className="sp-product-card-actions">
                    <button className="btn btn-outline btn-sm" onClick={() => setModal(p)}><Pencil size={13} /> Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => setDeleteId(p._id)}><Trash2 size={13} /> Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Pagination pagination={pagination} onPageChange={setPage} />
        </>
      )}

      {modal && <ProductModal product={modal === 'add' ? null : modal} onClose={() => setModal(null)} onSaved={fetchProducts} />}

      {deleteId && (
        <div className="sp-modal-overlay" onClick={(e) => e.target === e.currentTarget && setDeleteId(null)}>
          <div className="sp-modal sp-modal-sm">
            <div className="sp-modal-header"><h3>Confirm Delete</h3></div>
            <div className="sp-modal-body"><p style={{ fontSize: '0.9rem' }}>Delete this product permanently?</p></div>
            <div className="sp-modal-footer">
              <button className="btn btn-outline" onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteId)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </SellerLayout>
  );
}
