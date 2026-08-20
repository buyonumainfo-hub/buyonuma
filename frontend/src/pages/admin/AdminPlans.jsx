import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, X, Package, Pin, Users, GripVertical } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import './AdminPlans.css';

const EMPTY_FORM = { key: '', label: '', productLimit: 50, pinLimit: 5, priceNGN: 0, benefits: [''], isActive: true, sortOrder: 0 };

export default function AdminPlans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null); // the plan object being edited, or null for "create"
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/admin-plans')
      .then(res => setPlans(res.data.plans || []))
      .catch(err => toast.error(err.response?.data?.message || 'Failed to load plans'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setShowForm(true); };
  const openEdit = (plan) => {
    setEditing(plan);
    setForm({
      key: plan.key, label: plan.label, productLimit: plan.productLimit, pinLimit: plan.pinLimit,
      priceNGN: plan.priceNGN, benefits: plan.benefits?.length ? plan.benefits : [''],
      isActive: plan.isActive, sortOrder: plan.sortOrder || 0,
    });
    setShowForm(true);
  };

  const setBenefit = (i, value) => {
    setForm(f => {
      const next = [...f.benefits];
      next[i] = value;
      return { ...f, benefits: next };
    });
  };
  const addBenefit = () => setForm(f => ({ ...f, benefits: [...f.benefits, ''] }));
  const removeBenefit = (i) => setForm(f => ({ ...f, benefits: f.benefits.filter((_, idx) => idx !== i) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      productLimit: Number(form.productLimit),
      pinLimit: Number(form.pinLimit),
      priceNGN: Number(form.priceNGN),
      sortOrder: Number(form.sortOrder) || 0,
      benefits: form.benefits.map(b => b.trim()).filter(Boolean),
    };
    try {
      if (editing) {
        // key is immutable — never sent on update
        const { key, ...updatePayload } = payload;
        await api.put(`/admin-plans/${editing._id}`, updatePayload);
        toast.success('Plan updated');
      } else {
        await api.post('/admin-plans', payload);
        toast.success('Plan created');
      }
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save plan');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (plan) => {
    try {
      await api.put(`/admin-plans/${plan._id}`, { isActive: !plan.isActive });
      toast.success(plan.isActive ? 'Plan deactivated' : 'Plan activated');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update plan');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/admin-plans/${deleteTarget._id}`);
      toast.success('Plan deleted');
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete plan');
    }
  };

  return (
    <AdminLayout title="Plans">
      <div className="fade-up">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <p style={{ color: 'var(--ink-muted)', fontSize: '0.85rem', maxWidth: 480, margin: 0 }}>
            Control what sellers can buy: pricing, product/pin limits, and the benefits shown
            on their upgrade page. Changes apply immediately — sellers already on a plan keep
            their current limits until you change it or they switch.
          </p>
          <button className="btn btn-primary btn-sm" onClick={openCreate}><Plus size={14} /> New Plan</button>
        </div>

        {loading ? <p>Loading…</p> : (
          <div className="admin-plans-grid">
            {plans.map(p => (
              <div key={p._id} className={`admin-plan-card ${!p.isActive ? 'admin-plan-card-inactive' : ''}`}>
                <div className="admin-plan-card-head">
                  <div>
                    <h3 style={{ color: 'white' }}>{p.label}</h3>
                    <span className="admin-plan-key">key: {p.key}</span>
                  </div>
                  {!p.isActive && <span className="admin-plan-inactive-badge">Inactive</span>}
                </div>

                <p className="admin-plan-price">{p.priceNGN === 0 ? 'Free' : `₦${p.priceNGN.toLocaleString()}`}</p>

                <div className="admin-plan-stats">
                  <span><Package size={13} /> {p.productLimit} products</span>
                  <span><Pin size={13} /> {p.pinLimit} pins</span>
                  <span><Users size={13} /> {p.sellerCount} seller{p.sellerCount === 1 ? '' : 's'}</span>
                </div>

                {p.benefits?.length > 0 && (
                  <ul className="admin-plan-benefits">
                    {p.benefits.map(b => <li key={b}>{b}</li>)}
                  </ul>
                )}

                <div className="admin-plan-actions" style={{ color: 'white' }}>
                  <button style={{ color: 'white' }} className="btn btn-outline btn-sm" onClick={() => openEdit(p)}><Pencil size={13} /> Edit</button>
                  <button style={{ color: 'white' }} className="btn btn-outline btn-sm" onClick={() => handleToggleActive(p)}>
                    {p.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button style={{ color: 'white' }}
                    className="btn btn-outline btn-sm admin-plan-delete-btn"
                    onClick={() => setDeleteTarget(p)}
                    disabled={p.key === 'free'}
                    title={p.key === 'free' ? "The free plan can't be deleted" : 'Delete plan'}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="admin-plan-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="admin-plan-modal" onClick={e => e.stopPropagation()}>
            <button className="admin-plan-modal-close" onClick={() => setShowForm(false)}><X size={18} /></button>
            <h3>{editing ? `Edit ${editing.label}` : 'New Plan'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Key {editing && '(locked)'}</label>
                  <input
                    className="form-control"
                    required
                    disabled={Boolean(editing)}
                    placeholder="e.g. business"
                    value={form.key}
                    onChange={e => setForm({ ...form, key: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })}
                  />
                  {!editing && <span className="admin-plan-hint">Lowercase letters, numbers, - or _ only. Can't be changed later.</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Display Name</label>
                  <input className="form-control" required maxLength={40} value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Price (₦)</label>
                  <input type="number" className="form-control" required min={0} value={form.priceNGN} onChange={e => setForm({ ...form, priceNGN: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Sort Order</label>
                  <input type="number" className="form-control" value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: e.target.value })} />
                  <span className="admin-plan-hint">Lower numbers show first.</span>
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Product Limit</label>
                  <input type="number" className="form-control" required min={1} value={form.productLimit} onChange={e => setForm({ ...form, productLimit: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Pin Limit</label>
                  <input type="number" className="form-control" required min={0} value={form.pinLimit} onChange={e => setForm({ ...form, pinLimit: e.target.value })} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Benefits (shown to sellers on the upgrade page)</label>
                {form.benefits.map((b, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem' }}>
                    <GripVertical size={14} style={{ marginTop: '0.6rem', color: 'var(--ink-muted)', flexShrink: 0 }} />
                    <input className="form-control" value={b} onChange={e => setBenefit(i, e.target.value)} placeholder="e.g. Priority support" maxLength={120} />
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => removeBenefit(i)} disabled={form.benefits.length === 1}>
                      <X size={13} />
                    </button>
                  </div>
                ))}
                <button type="button" className="btn btn-outline btn-sm" onClick={addBenefit}><Plus size={12} /> Add benefit</button>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', margin: '0.75rem 0' }}>
                <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} />
                Active (visible to sellers as an upgrade option)
              </label>

              <button className="btn btn-gold" type="submit" disabled={saving} style={{ width: '100%', justifyContent: 'center' }}>
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Plan'}
              </button>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="admin-plan-modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="admin-plan-modal admin-plan-modal-sm" onClick={e => e.stopPropagation()}>
            <h3>Delete "{deleteTarget.label}"?</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--ink-muted)' }}>
              {deleteTarget.sellerCount > 0
                ? `${deleteTarget.sellerCount} seller(s) are on this plan — you'll need to move them first.`
                : 'This cannot be undone.'}
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button className="btn btn-outline btn-sm" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="btn btn-sm admin-plan-delete-confirm" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
