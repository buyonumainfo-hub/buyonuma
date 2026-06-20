import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Eye, EyeOff, Lock, User } from 'lucide-react';
import { useSellerAuth } from '../../context/SellerAuthContext';
import toast from 'react-hot-toast';
import './SellerAuth.css';

const SellerLogin = () => {
  const { login } = useSellerAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await login(form.username, form.password);
      toast.success('Welcome back!');
      navigate('/seller/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="seller-auth-page">
      <div className="seller-auth-card">
        <div className="seller-auth-header">
          <Link to="/" className="seller-auth-logo">
            <ShoppingBag size={22} />
            <span>BuyOnUma</span>
          </Link>
          <h1>Seller Sign In</h1>
          <p>Access your seller dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="seller-auth-form">
          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-group">
            <label className="form-label">Username</label>
            <div className="input-wrap">
              <User size={15} className="input-icon-left" />
              <input className="form-control" required placeholder="yourusername"
                value={form.username} onChange={e => setForm({ ...form, username: e.target.value })}
                style={{ paddingLeft: '2.5rem' }} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-wrap">
              <Lock size={15} className="input-icon-left" />
              <input type={showPw ? 'text' : 'password'} className="form-control" required
                placeholder="••••••••" value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }} />
              <button type="button" className="pw-toggle" onClick={() => setShowPw(!showPw)}>
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.8rem' }} disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>

          <p className="seller-auth-switch" style={{ textAlign:'right', marginBottom:'-0.5rem' }}>
            <Link to="/seller/forgot-password" style={{ color:'var(--ink-muted)', fontSize:'0.8rem' }}>Forgot password?</Link>
          </p>
          <p className="seller-auth-switch">
            No account yet? <Link to="/seller/register">Create one</Link>
          </p>
          <p className="seller-auth-switch" style={{ marginTop: '0.25rem' }}>
            <Link to="/">← Back to marketplace</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default SellerLogin;
