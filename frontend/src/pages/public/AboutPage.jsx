import { Link } from 'react-router-dom';
import { Shield, Zap, Heart, BookOpen, ArrowRight } from 'lucide-react';
import Navbar from '../../components/shared/Navbar';
import Footer from '../../components/shared/Footer';
import './AboutPage.css';
const values = [
  { icon:<Shield size={24}/>, title:'Trusted & Verified', desc:'Every seller is reviewed and approved by the admin team before going live.' },
  { icon:<Zap size={24}/>, title:'Fast & Simple', desc:'No complicated sign-ups for buyers. Browse, discover, and connect in seconds.' },
  { icon:<Heart size={24}/>, title:'Community First', desc:'We exist to strengthen local economies — supporting independent sellers everywhere.' },
  { icon:<BookOpen size={24}/>, title:'Universal Access', desc:'No location limits — buyers and sellers anywhere can join BuyOnUma.' },
];
export default function AboutPage() {
  return (
    <>
      <Navbar/>
      <section className="page-header about-hero">
        <div className="container">
          <p className="section-eyebrow" style={{color:'var(--gold)',marginBottom:'0.75rem'}}>Our Story</p>
          <h1 style={{fontFamily:'var(--font-serif)',fontSize:'clamp(2rem,5vw,3rem)',fontWeight:900,color:'var(--white)',marginBottom:'1rem'}}>About BuyOnUma</h1>
          <p style={{color:'var(--font-serif)',maxWidth:560,lineHeight:1.75}}>A universal marketplace built to connect buyers and sellers everywhere — making trade simpler, safer, and more accessible for everyone.</p>
        </div>
      </section>
      <section style={{padding:'5rem 0',background:'var(--white)'}}>
        <div className="container about-mission-inner">
          <div className="about-mission-text">
            <p className="section-eyebrow" style={{color:'var(--gold)',marginBottom:'0.5rem'}}>Our Mission</p>
            <h2 style={{fontFamily:'var(--font-serif)',fontSize:'2rem',marginBottom:'1rem'}}>Empowering Universal Market Access</h2>
            <p style={{fontSize:'0.95rem',color:'var(--ink-muted)',lineHeight:1.8,marginBottom:'0.75rem'}}>BuyOnUma was created to give students, staff, and local vendors a dedicated space to trade — without the noise of general social media marketplaces.</p>
            <p style={{fontSize:'0.95rem',color:'var(--ink-muted)',lineHeight:1.8,marginBottom:'1rem'}}>Whether you're a student selling handmade goods or a vendor offering services — this platform was built for you.</p>
            <Link to="/become-a-seller" className="btn btn-gold">Become a Seller <ArrowRight size={16}/></Link>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
            {[{icon:'🏪',num:'100+',label:'Products Listed'},{icon:'👥',num:'50+',label:'Active Sellers'},{icon:'⭐',num:'4.8',label:'Avg. Seller Rating'}].map(s=>(
              <div key={s.label} style={{background:'var(--cream)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'1.5rem',display:'flex',alignItems:'center',gap:'1.25rem'}}>
                <span style={{fontSize:'1.75rem'}}>{s.icon}</span>
                <div><p style={{fontFamily:'var(--font-serif)',fontSize:'1.75rem',fontWeight:700,color:'var(--ink)',lineHeight:1}}>{s.num}</p><p style={{fontSize:'0.78rem',color:'var(--ink-muted)',textTransform:'uppercase',letterSpacing:'0.06em',fontWeight:600}}>{s.label}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section style={{padding:'5rem 0',background:'var(--cream-dark)'}}>
        <div className="container">
          <div style={{textAlign:'center',marginBottom:'3rem'}}><p className="section-eyebrow" style={{color:'var(--gold)',marginBottom:'0.5rem'}}>What We Stand For</p><h2 className="section-title">Our Values</h2></div>
          <div className="grid-4">{values.map((v,i)=><div key={i} className="value-card fade-up"><div className="value-icon">{v.icon}</div><h3>{v.title}</h3><p>{v.desc}</p></div>)}</div>
        </div>
      </section>
      <section style={{background:'var(--ink)',padding:'4rem 0'}}>
        <div className="container" style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'2rem',flexWrap:'wrap'}}>
          <div><h2 style={{fontFamily:'var(--font-serif)',fontSize:'1.6rem',color:'var(--white)',marginBottom:'0.4rem'}}>Ready to explore?</h2><p style={{color:'rgba(255,255,255,0.6)',fontSize:'0.9rem'}}>Browse products and discover sellers near you today.</p></div>
          <div style={{display:'flex',gap:'1rem',flexWrap:'wrap'}}>
            <Link to="/" className="btn btn-gold btn-lg">Browse Products <ArrowRight size={16}/></Link>
            <Link to="/contact" className="btn btn-outlin btn-lg" style={{borderColor:'rgba(255,255,255,0.3)',color:'var(--white)', border: "1px solid black"}}>Contact Us</Link>
          </div>
        </div>
      </section>
      
    </>
  );
}
