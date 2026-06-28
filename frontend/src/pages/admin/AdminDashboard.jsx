import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Package, TrendingUp, ArrowRight, Key, AlertCircle, Plus, Trash2, CheckCircle, Zap, ZapOff } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import './AdminDashboard.css';

const StatCard = ({ icon:Icon, label, value, color, sub }) => (
  <div className="stat-card">
    <div className="stat-card-icon" style={{background:color+'18',color}}><Icon size={22}/></div>
    <div><p className="stat-card-value">{value}</p><p className="stat-card-label">{label}</p>{sub&&<p className="stat-card-sub">{sub}</p>}</div>
  </div>
);

const DURATIONS = [{label:'1 hour',value:1},{label:'6 hours',value:6},{label:'12 hours',value:12},{label:'24 hours (like WhatsApp status)',value:24},{label:'2 days',value:48},{label:'3 days',value:72},{label:'1 week',value:168},{label:'2 weeks',value:336},{label:'1 month',value:720}];


function TokenSystemToggle() {
  const [tokenRequired, setTokenRequired] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/admin/token-setting')
      .then(r => setTokenRequired(r.data.tokenRequired))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = async () => {
    setSaving(true);
    try {
      const res = await api.put('/admin/token-setting', { tokenRequired: !tokenRequired });
      setTokenRequired(res.data.tokenRequired);
      toast.success(res.data.message);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update setting');
    } finally { setSaving(false); }
  };

  return (
    <div className="token-system-card">
      <div className="token-system-left">
        <div className="token-system-icon" style={{ background: tokenRequired ? 'rgba(184,146,58,0.15)' : 'rgba(39,174,96,0.12)', color: tokenRequired ? 'var(--gold)' : '#27ae60' }}>
          {tokenRequired ? <Key size={22}/> : <Zap size={22}/>}
        </div>
        <div>
          <h3 className="token-system-title">Token System</h3>
          <p className="token-system-desc">
            {tokenRequired
              ? 'Sellers must redeem a token before their products appear on the marketplace.'
              : "Token system disabled — all approved sellers' products are publicly visible without a token."}
          </p>
        </div>
      </div>
      <div className="token-system-right">
        <span className="token-system-status" style={{ color: tokenRequired ? 'var(--gold)' : '#27ae60' }}>
          {tokenRequired ? 'Enabled' : 'Disabled'}
        </span>
        <button
          className={`token-toggle-btn ${tokenRequired ? 'on' : 'off'}`}
          onClick={handleToggle}
          disabled={loading || saving}
          aria-label={tokenRequired ? 'Disable token system' : 'Enable token system'}
        >
          <span className="token-toggle-knob"/>
        </button>
      </div>
    </div>
  );
}

function TokenSection() {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [form, setForm] = useState({ duration_hours:24, label:'', token_expires_hours:72 });
  const fetchTokens = () => { api.get('/admin/tokens').then(r=>setTokens(r.data.tokens)).catch(console.error).finally(()=>setLoading(false)); };
  useEffect(()=>{ fetchTokens(); },[]);
  const handleGenerate = async e => {
    e.preventDefault(); setGenerating(true);
    try { await api.post('/admin/tokens', form); toast.success('Token generated!'); fetchTokens(); }
    catch(err){ toast.error(err.response?.data?.message||'Failed'); } finally{ setGenerating(false); }
  };
  const handleDelete = async id => {
    try { await api.delete(`/admin/tokens/${id}`); toast.success('Token deleted'); fetchTokens(); } catch { toast.error('Delete failed'); }
  };
  const fmt = d => d ? new Date(d).toLocaleString('en-NG',{dateStyle:'short',timeStyle:'short'}) : '—';
  return (
    <div>
      <div className="dashboard-section-header" style={{marginBottom:'1.25rem'}}>
        <h3><Key size={16} style={{display:'inline',marginRight:6,color:'var(--gold)'}}/> Seller Tokens</h3>
      </div>
      <form onSubmit={handleGenerate} className="token-gen-form">
        <div className="form-group" style={{flex:2}}>
          <label className="form-label">Listing Duration</label>
          <select className="form-control" value={form.duration_hours} onChange={e=>setForm(f=>({...f,duration_hours:Number(e.target.value)}))}>
            {DURATIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="form-group" style={{flex:2}}>
          <label className="form-label">Label (optional)</label>
          <input className="form-control" placeholder="e.g. For TechHub seller" value={form.label} onChange={e=>setForm(f=>({...f,label:e.target.value}))}/>
        </div>
        <div className="form-group" style={{flex:1}}>
          <label className="form-label">Token expires in</label>
          <select className="form-control" value={form.token_expires_hours} onChange={e=>setForm(f=>({...f,token_expires_hours:Number(e.target.value)}))}>
            <option value={24}>24 hours</option><option value={48}>2 days</option><option value={72}>3 days</option><option value={168}>1 week</option>
          </select>
        </div>
        <div className="form-group"><label className="form-label">&nbsp;</label><button type="submit" className="btn btn-gold" disabled={generating}><Plus size={15}/>{generating?'Generating…':'Generate'}</button></div>
      </form>
      {loading ? <div className="spinner" style={{marginTop:'1rem'}}/> : tokens.length===0 ? <p className="empty-text">No tokens yet.</p> : (
        <div className="admin-table-wrap" style={{marginTop:'1rem'}}>
          <table className="admin-table">
            <thead><tr><th>Token</th><th>Duration</th><th>Label</th><th>Status</th><th>Used By</th><th>Expires</th><th style={{textAlign:'right'}}>Del</th></tr></thead>
            <tbody>
              {tokens.map(t=>(
                <tr key={t._id}>
                  <td><code style={{fontFamily:'monospace',fontSize:'0.82rem',background:'var(--cream-dark)',padding:'0.15rem 0.4rem',borderRadius:4}}>{t.token}</code></td>
                  <td style={{fontSize:'0.82rem'}}>{t.duration_hours}h</td>
                  <td style={{fontSize:'0.8rem',color:'var(--ink-muted)'}}>{t.label||'—'}</td>
                  <td>{t.used?<span className="badge" style={{background:'#e8e4ff',color:'#7c3aed',fontSize:'0.65rem'}}>Used</span>:new Date(t.expires_at)<new Date()?<span className="badge" style={{background:'#fee2e2',color:'#991b1b',fontSize:'0.65rem'}}>Expired</span>:<span className="badge" style={{background:'#d4f5e2',color:'#166534',fontSize:'0.65rem'}}>Available</span>}</td>
                  <td style={{fontSize:'0.8rem'}}>{t.used_by?t.used_by.store_name:'—'}</td>
                  <td style={{fontSize:'0.78rem',color:'var(--ink-muted)'}}>{fmt(t.expires_at)}</td>
                  <td><div style={{display:'flex',justifyContent:'flex-end'}}><button className="btn btn-danger btn-sm" onClick={()=>handleDelete(t._id)}><Trash2 size={13}/></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(()=>{ api.get('/admin/stats').then(r=>setStats(r.data.stats)).catch(console.error).finally(()=>setLoading(false)); },[]);
  return (
    <AdminLayout title="Dashboard">
      {loading ? <div className="spinner"/> : (
        <div className="dashboard fade-up">
          <div className="stats-grid">
            <StatCard icon={Users} label="Total Sellers" value={stats.totalSellers} color="#b8923a"/>
            <StatCard icon={Package} label="Total Products" value={stats.totalProducts} color="#3498db"/>
            <StatCard icon={AlertCircle} label="Pending Approval" value={stats.pendingSellers} color="#e67e22" sub={stats.pendingSellers>0?'Review in Sellers tab':'All caught up!'}/>
            <StatCard icon={TrendingUp} label="Categories" value={stats.categorySellers.length} color="#2ecc71"/>
          </div>
          <div className="dashboard-grid">
            <div className="dashboard-section">
              <div className="dashboard-section-header"><h3>Recent Sellers</h3><Link to="/admin/sellers" className="btn btn-outline btn-sm">View All <ArrowRight size={13}/></Link></div>
              {stats.recentSellers.length===0?<p className="empty-text">No sellers yet.</p>:(
                <div className="recent-list">{stats.recentSellers.map(s=>(
                  <div key={s._id} className="recent-item">
                    <div className="recent-avatar">{s.profile_picture?<img src={s.profile_picture} alt={s.store_name}/>:<span>{s.store_name?.[0]?.toUpperCase()}</span>}</div>
                    <div className="recent-info"><p className="recent-name">{s.store_name}</p><p className="recent-sub">@{s.username} · {s.category}</p></div>
                    <span className="badge" style={{fontSize:'0.62rem',background:s.isApproved?'var(--gold-pale)':'#fef3c7',color:s.isApproved?'var(--gold)':'#92400e'}}>{s.isApproved?'Approved':'Pending'}</span>
                  </div>
                ))}</div>
              )}
            </div>
            <div className="dashboard-section">
              <div className="dashboard-section-header"><h3>Recent Products</h3><Link to="/admin/products" className="btn btn-outline btn-sm">View All <ArrowRight size={13}/></Link></div>
              {stats.recentProducts.length===0?<p className="empty-text">No products yet.</p>:(
                <div className="recent-list">{stats.recentProducts.map(p=>(
                  <div key={p._id} className="recent-item">
                    <div className="recent-img">{p.product_image?<img src={p.product_image} alt={p.name}/>:<span>📦</span>}</div>
                    <div className="recent-info"><p className="recent-name">{p.name}</p><p className="recent-sub">{p.seller?.store_name} · ₦{Number(p.price).toLocaleString()}</p></div>
                    <span className="badge badge-ink" style={{fontSize:'0.65rem'}}>{p.category}</span>
                  </div>
                ))}</div>
              )}
            </div>
          </div>
          <div className="dashboard-section"><div className="dashboard-section-header"><h3>Sellers by Category</h3></div>
            <div className="category-bars">{stats.categorySellers.map(c=>{const pct=stats.totalSellers>0?Math.round((c.count/stats.totalSellers)*100):0;return(<div key={c._id} className="category-bar-row"><span className="category-bar-label">{c._id}</span><div className="category-bar-track"><div className="category-bar-fill" style={{width:`${pct}%`}}/></div><span className="category-bar-count">{c.count}</span></div>);})}</div>
          </div>
          <div className="dashboard-section"><TokenSystemToggle/></div>
          <div className="dashboard-section"><TokenSection/></div>
        </div>
      )}
    </AdminLayout>
  );
}
