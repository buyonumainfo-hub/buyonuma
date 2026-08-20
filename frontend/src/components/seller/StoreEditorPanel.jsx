import { useState } from 'react';
import { Palette, Pin, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

// Shopify-style "customize your storefront" panel — accent color, layout,
// banner text and up to `pinLimit` pinned products, all reflected live on
// the public SellerDetailPage (see backend routes/sellers.js `/:username`
// and `/store/theme` + `/store/pins`).
export default function StoreEditorPanel({ seller, products, onUpdated }) {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState(seller?.storeTheme || { primaryColor: '#b8923a', layout: 'grid', bannerHeadline: '', bannerSubtext: '', darkMode: false });
  const [pinned, setPinned] = useState((seller?.pinnedProducts || []).map(p => p._id || p));
  const [saving, setSaving] = useState(false);
  const pinLimit = seller?.pinLimit || 5;
  console.log(seller)

  const togglePin = (id) => {
    setPinned(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= pinLimit) {
        toast.error(`You can pin up to ${pinLimit} products on the ${seller.plan || 'free'} plan. Upgrade to pin more.`);
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleSaveTheme = async () => {
    setSaving(true);
    try {
      const res = await api.put('/sellers/store/theme', theme, { authRole: 'seller' });
      toast.success('Store look updated');
      onUpdated?.({ storeTheme: res.data.storeTheme });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleSavePins = async () => {
    setSaving(true);
    try {
      const res = await api.put('/sellers/store/pins', { productIds: pinned }, { authRole: 'seller' });
      toast.success('Pinned products updated');
      onUpdated?.({ pinnedProducts: res.data.pinnedProducts });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  return (
    <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
      >
        <span style={{color:'var(--ink-light)'}}><Palette size={15} style={{ verticalAlign: 'middle', marginRight: 6 }} />Customize Your Store</span>
       <span style={{color:'var(--ink-light)'}}> {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />} </span>
      </button>

      {open && (
        <div style={{ marginTop: '1rem', display: 'grid', gap: '1.5rem' }}>
          <div>
            <h4 style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>Look &amp; Feel</h4>
            <div className="grid-2" style={{ gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Accent Color</label>
                <input type="color" value={theme.primaryColor} onChange={e => setTheme({ ...theme, primaryColor: e.target.value })} style={{ width: '100%', height: '38px' }} />
              </div>
              <div className="form-group">
                <label className="form-label">Layout</label>
                <select style={{color:'var(--ink-light)'}} className="form-control"  value={theme.layout} onChange={e => setTheme({ ...theme, layout: e.target.value })}>
                  <option value="grid">Grid</option>
                  <option value="list">List</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Banner Headline</label>
              <input style={{color:'var(--ink-light)'}} className="form-control" maxLength={120} value={theme.bannerHeadline}
                onChange={e => setTheme({ ...theme, bannerHeadline: e.target.value })} placeholder="e.g. Fresh cakes, baked daily" />
            </div>
            <div className="form-group">
              <label className="form-label">Banner Subtext</label>
              <input style={{color:'var(--ink-light)'}} className="form-control" maxLength={200} value={theme.bannerSubtext}
                onChange={e => setTheme({ ...theme, bannerSubtext: e.target.value })} placeholder="A short line under your headline" />
            </div>
            <button style={{color:'white'}} className="btn btn-primary btn-sm" onClick={handleSaveTheme} disabled={saving}>Save Look</button>
          </div>

          <div>
            <h4 style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>
              <Pin size={13} style={{ verticalAlign: 'middle' }} /> Pinned Products ({pinned.length}/{pinLimit})
            </h4>
            <p style={{ fontSize: '0.78rem', color: 'var(--ink-muted)', marginBottom: '0.5rem' }}>
              Pinned products always show first on your store page.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '0.5rem', maxHeight: '220px', overflowY: 'auto' }}>
              {products.map(p => (
                <button
                  key={p._id}
                  onClick={() => togglePin(p._id)}
                  style={{
                    border: pinned.includes(p._id) ? '2px solid var(--gold)' : '1px solid #eee',
                    borderRadius: 8, padding: 4, cursor: 'pointer', background: '#fff', position: 'relative',
                  }}
                  title={p.name}
                >
                  {p.product_image
                    ? <img src={p.product_image} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 4 }} />
                    : <div style={{ width: '100%', aspectRatio: '1', background: '#f2f2f2', borderRadius: 4 }} />}
                  <span style={{ fontSize: '0.65rem', display: 'block', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                  {pinned.includes(p._id) && <Pin size={12} style={{ position: 'absolute', top: 4, right: 4, color: 'var(--gold)' }} />}
                </button>
              ))}
            </div>
            <button className="btn btn-primary btn-sm" style={{ marginTop: '0.75rem', color: 'whitesmoke'}} onClick={handleSavePins} disabled={saving}>Save Pins</button>
          </div>
        </div>
      )}
    </div>
  );
}
