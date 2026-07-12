import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Users, ArrowRight, Star, MapPin } from 'lucide-react';
import Navbar from '../../components/shared/Navbar';
import Footer from '../../components/shared/Footer';
import SellerCard from '../../components/public/SellerCard';
import ProductCard from '../../components/public/ProductCard';
import api from '../../utils/api';
import { useUserLocation } from '../../hooks/useUserLocation';
import './HomePage.css';


const HomePage = () => {
  const [sellers, setSellers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ sellers: 0, products: 0 });
  const { location: userLocation, status: geoStatus, detect } = useUserLocation();
  const [nearbySellers, setNearbySellers] = useState([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sRes, pRes] = await Promise.all([
          api.get('/sellers?limit=4&sort=rating&order=desc'),
          api.get('/products?limit=8&sort=createdAt&order=desc')
        ]);
        setSellers(sRes.data.sellers);
        setProducts(pRes.data.products);
        setStats({
          sellers: sRes.data.pagination.total,
          products: pRes.data.pagination.total
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Auto-detect quietly on first Home visit if we don't already have a
  // cached location — this is what powers "fetch content related to the
  // location" without requiring the buyer to click anything first. If the
  // browser has already denied permission previously, this call resolves
  // immediately to 'denied' and we just skip the section — no repeated
  // nagging popups.
  useEffect(() => {
    if (!userLocation) detect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (geoStatus === 'done' && userLocation?.state) {
      setNearbyLoading(true);
      api.get('/sellers', { params: { limit: 4, sort: 'nearest', state: userLocation.state, city: userLocation.city } })
        .then(res => setNearbySellers(res.data.sellers || []))
        .catch(() => setNearbySellers([]))
        .finally(() => setNearbyLoading(false));
    }
  }, [geoStatus, userLocation]);

  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
        <section className="hero">
          <div className="hero-bg-pattern" />
          <div className="container hero-content">
             <div className="hero-eyebrow"><Star size={14} fill="currentColor" /><span>Universal Market Access </span></div>
                     <h1 style={{'color':'white'}} className="hero-title">Discover, Shop &amp; <br /><span className="hero-title-accent">Sell Anywhere</span></h1>
                     <p className="hero-desc">BuyOnUma — Universal Market Access. Browse curated sellers, unique products, and services from a growing community of buyers and sellers everywhere.</p>
            <div className="hero-actions">
              <Link to="/" className="btn btn-gold btn-lg">
                Browse Products <ArrowRight size={18} />
              </Link>
              <Link to="/sellers" style={{"color": "var(--font)", "background-color":"black"}} className=" btn-outline-one btn-lg">
                Meet Sellers
              </Link>
            </div>
            <div className="hero-stats">
              <div className="hero-stat">
                <span className="hero-stat-num">{stats.sellers}</span>
                <span className="hero-stat-label">Active Sellers</span>
              </div>
              <div className="hero-stat-divider" />
              <div className="hero-stat">
                <span className="hero-stat-num">{stats.products}</span>
                <span className="hero-stat-label">Products Listed</span>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Sellers */}
        <section className="section">
          <div className="container">
            <div className="section-header">
              <div>
                <p className="section-eyebrow">Top Rated</p>
                <h2 className="section-title">Featured Sellers</h2>
              </div>
              <Link to="/sellers" className="btn btn-outline">
                View All <ArrowRight size={15} />
              </Link>
            </div>

            {loading ? (
              <div className="spinner" />
            ) : sellers.length === 0 ? (
              <div className="empty-state">
                <Users size={40} />
                <p>No sellers yet. Check back soon!</p>
              </div>
            ) : (
              <div className="grid-4 fade-up">
                {sellers.map(s => <SellerCard key={s._id} seller={s} />)}
              </div>
            )}
          </div>
        </section>

        {/* Near You — only shown once we have a detected/known location */}
        {userLocation?.state && nearbySellers.length > 0 && (
          <section className="section">
            <div className="container">
              <div className="section-header">
                <div>
                  <p className="section-eyebrow" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <MapPin size={13} /> Near {userLocation.city ? `${userLocation.city}, ` : ''}{userLocation.state}
                  </p>
                  <h2 className="section-title">Sellers Near You</h2>
                </div>
                <Link to={`/sellers?state=${encodeURIComponent(userLocation.state)}`} className="btn btn-outline">
                  View All <ArrowRight size={15} />
                </Link>
              </div>
              {nearbyLoading ? (
                <div className="spinner" />
              ) : (
                <div className="grid-4 fade-up">
                  {nearbySellers.map(s => <SellerCard key={s._id} seller={s} />)}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Latest Products */}
        <section className="section section-alt">
          <div className="container">
            <div className="section-header">
              <div>
                <p className="section-eyebrow">Just Listed</p>
                <h2 className="section-title">Latest Products</h2>
              </div>
              <Link to="/products" className="btn btn-outline">
                View All <ArrowRight size={15} />
              </Link>
            </div>

            {loading ? (
              <div className="spinner" />
            ) : products.length === 0 ? (
              <div className="empty-state">
                <ShoppingBag size={40} />
                <p>No products yet. Check back soon!</p>
              </div>
            ) : (
              <div className="grid-2 fade-up">
                {products.map(p => <ProductCard key={p._id} product={p} />)}
              </div>
            )}
          </div>
        </section>

        {/* CTA Banner */}
        <section className="cta-banner">
          <div className="container cta-inner">
            <div>
              <h2>Want to sell on BuyOnUma?</h2>
              <p>Click the link below to register your store and start selling today.</p>
            </div>
            <Link to="/seller/register" className="btn btn-gold btn-lg">
              Create a seller account <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
};

export default HomePage;
