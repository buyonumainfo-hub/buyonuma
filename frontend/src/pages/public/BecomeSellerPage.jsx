import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Store, Upload, ArrowRight, Star, Users, Package } from 'lucide-react';
import Navbar from '../../components/shared/Navbar';
import Footer from '../../components/shared/Footer';
import { CATEGORIES_NO_ALL } from '../../utils/constants';
import './BecomeSellerPage.css';
import { uploadToCloudinary } from '../../utils/cloudinary';

const steps = [
  { n: '01', title: 'Submit Application', desc: 'Fill in your store details and upload a profile picture.' },
  { n: '02', title: 'Admin Review', desc: 'Our team reviews your application within 1–3 business days.' },
  { n: '03', title: 'Get Listed', desc: 'Once approved, your store goes live and you can start selling.' },
  { n: '04', title: 'Start Selling', desc: 'Buyers browse your products and contact you directly via WhatsApp.' },
];

const perks = [
  { icon: <Users size={20} />, label: 'Campus Reach', desc: 'Get seen by the entire Lens University student and staff community.' },
  { icon: <Package size={20} />, label: 'Free Listing', desc: 'No listing fees — just submit and get approved.' },
  { icon: <Star size={20} />, label: 'Ratings & Trust', desc: 'Build a verified reputation with our rating system.' },
];




const BecomeSellerPage = () => {
  

  return (
    <>
      <Navbar />

      {/* Hero */}
      <section className="page-header become-hero">
        <div className="container">
          <p className="section-eyebrow" style={{ color: 'var(--gold)', marginBottom: '0.75rem' }}>
            <Store size={14} style={{ display: 'inline', marginRight: 6 }} />
            Join the Marketplace
          </p>
          <h1 className="become-hero-title">Become a Seller on buyon<br/> Universal Market Access</h1>
          <p className="become-hero-sub" style={{"color": "var(--font-serif)"}}>
            Reach hundreds of students and local buyers. Set up your store for free and start selling in days.
          </p>
          <br />
            <Link to="/seller/register" className="btn btn-outline" style={{color: "var(--font-serif)"}}>
               Create a seller account <ArrowRight size={15} />
              </Link>
        </div>
      </section>

      {/* Perks */}
      <section className="become-perks">
        <div className="container become-perks-grid">
          {perks.map((p, i) => (
            <div key={i} className="perk-card">
              <div className="perk-icon">{p.icon}</div>
              <div>
                <h3>{p.label}</h3>
                <p>{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="how-it-works">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <p className="section-eyebrow" style={{ color: 'var(--gold)', marginBottom: '0.5rem' }}>The Process</p>
            <h2 className="section-title">How It Works</h2>
          </div>
          <div className="steps-grid">
            {steps.map((s, i) => (
              <div key={i} className="step-card">
                <span className="step-num">{s.n}</span>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
                {i < steps.length - 1 && <ArrowRight size={18} className="step-arrow" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Application Form */}
      <section className="become-form-section">
        <div className="container become-form-wrap">
          <div className="become-form-header">
            <p className="section-eyebrow" style={{ color: 'var(--gold)', marginBottom: '0.5rem' }}>Apply Now</p>
            <h2>Seller Application</h2>
            <p>Fill in the details below. Our admin team will review and approve your store to the marketplace.</p>
          </div>
                <Link to="/seller/register" className="btn btn-outline">
               Create a seller account <ArrowRight size={15} />
              </Link>
        </div>
      </section>

      
    </>
  );
};

export default BecomeSellerPage;
