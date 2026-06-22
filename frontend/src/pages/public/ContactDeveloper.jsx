import { Github, Twitter, Linkedin, Globe, Mail, Code2, Smartphone, Server, Database, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/shared/Navbar';
import Footer from '../../components/shared/Footer';
import './ContactDeveloper.css';

const TikTokIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 15.58a6.34 6.34 0 0 0 10.86 4.23 6.33 6.33 0 0 0 1.81-4.46V9.91a7.55 7.55 0 0 0 4.2 1.37V8.11a4.24 4.24 0 0 1-2.28-1.42z"/>
  </svg>
);

/* ── UPDATE THESE WITH REAL DETAILS ── */
const DEV = {
  name:        'Odebunmi Quadri oyewale',
  title:       'Full-Stack Developer',
  subtitle:    'Creator of BuyonUma',
  bio:         `A passionate software developer with expertise in building modern web applications. Specialising in React, Node.js and MongoDB, with a focus on clean architecture, great user experiences, and scalable systems. Built the Lens University Market platform from scratch to empower campus commerce.`,
  bio2:        `Available for freelance projects, collaborations, and full-time opportunities. If you have an idea you want to bring to life, let's talk.`,
  avatar:      'https://i.postimg.cc/d19GK0gn/IMG-20250622-WA0011.jpg', // put your Cloudinary image URL here e.g. 'https://res.cloudinary.com/...'
  email:       'quadriodebunmi41@gmail.com',
  whatsapp:    '2348077128030',
  github:      'https://github.com/fhiness4',
  tiktok:     'https://tiktok.com/@mr_hello_world',
  linkedin:    'https://www.linkedin.com/in/odebunmi-quadri-094878368',
  website:     'https://qudriportfolio.netlify.app',
  location:    'Lagos, Nigeria',
  available:   true,
};

const SKILLS = [
  { icon: <Code2 size={18} />,    label: 'Frontend',  items: ['React', 'Vite', 'HTML/CSS', 'Tailwind'] },
  { icon: <Server size={18} />,   label: 'Backend',   items: ['Node.js', 'Express', 'REST APIs', 'JWT Auth'] },
  { icon: <Database size={18} />, label: 'Database',  items: ['MongoDB', 'Mongoose', 'Caching', 'Indexing'] },
  { icon: <Smartphone size={18} />, label: 'Other',   items: ['Cloudinary', 'Nodemailer', 'Git', 'Figma'] },
];



const WaIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const ContactDeveloper = () => {
  const waMsg = encodeURIComponent(`Hi ${DEV.name}! I saw your work on Lens University Market and would like to connect.`);

  return (
    <>
      <Navbar />

      {/* Hero */}
      <section className="dev-hero page-header">
        <div className="container dev-hero-inner">
          <div className="dev-avatar-wrap">
            {DEV.avatar ? (
              <img src={DEV.avatar} alt={DEV.name} className="dev-avatar-img" />
            ) : (
              <div style={{"color": "var(--font-serif)"}} className="dev-avatar-placeholder">
                <Code2 size={40} />
              </div>
            )}
            
          </div>
          <div className="dev-hero-text">
            <p className="section-eyebrow" style={{ color:'var(--gold)', marginBottom:'0.5rem' }}>Meet the Developer</p>
            <h1 className="dev-name">{DEV.name}</h1>
            <p className="dev-title">{DEV.title}</p>
            <p className="dev-subtitle" style={{"color": "var(--font-serif)"}}>{DEV.subtitle}</p>
            <div className="dev-socials" style={{"color": "var(--font-serif)"}}>
              {DEV.github   && <a href={DEV.github}   target="_blank" rel="noreferrer" className="dev-social-link" style={{"color": "var(--font-serif)"}} title="GitHub"><Github size={20} /></a>}
              {DEV.tiktok  && <a href={DEV.tiktok}  target="_blank" rel="noreferrer" className="dev-social-link" title="Twitter" style={{"color": "var(--font-serif)"}}><TikTokIcon /></a>}
              {DEV.linkedin && <a href={DEV.linkedin} target="_blank" rel="noreferrer" className="dev-social-link" title="LinkedIn" style={{"color": "var(--font-serif)"}}><Linkedin size={20} /></a>}
              {DEV.website  && <a href={DEV.website}  target="_blank" rel="noreferrer" className="dev-social-link" title="Portfolio" style={{"color": "var(--font-serif)"}}><Globe size={20} /></a>}
            </div>
          </div>
        </div>
      </section>

      {/* About + Contact */}
      <section className="dev-about-section">
        <div className="container dev-about-grid">
          <div className="dev-bio-card">
            <h2>About Me</h2>
            <p>{DEV.bio}</p>
            <p>{DEV.bio2}</p>
            <div className="dev-meta-rows">
              <div className="dev-meta-row"><span>📍 Location</span><strong>{DEV.location}</strong></div>
              <div className="dev-meta-row"><span>📧 Email</span><a href={`mailto:${DEV.email}`}>{DEV.email}</a></div>
              <div className="dev-meta-row"><span>🟢 Status</span>
                <strong style={{ color: DEV.available ? '#27ae60' : '#e67e22' }}>
                  {DEV.available ? 'Open to opportunities' : 'Not available'}
                </strong>
              </div>
            </div>
          </div>

          <div className="dev-contact-card">
            <h2>Get in Touch</h2>
            <p>Have a project, question, or just want to connect? Reach out via any channel below.</p>

            <div className="dev-contact-links">
              <a href={`mailto:${DEV.email}`} className="dev-contact-btn email-btn" style={{"color": "var(--font-serif)"}}>
                <Mail size={18} /> Email Me
              </a>
              {DEV.whatsapp && (
                <a href={`https://wa.me/${DEV.whatsapp}?text=${waMsg}`}
                  target="_blank" rel="noreferrer" className="dev-contact-btn wa-btn-dev">
                  <WaIcon /> WhatsApp
                </a>
              )}
              {DEV.website && (
                <a href={DEV.website} target="_blank" rel="noreferrer" className="dev-contact-btn portfolio-btn">
                  <Globe size={18} /> Portfolio
                </a>
              )}
              {DEV.github && (
                <a href={DEV.github} target="_blank" rel="noreferrer" className="dev-contact-btn github-btn">
                  <Github size={18} /> GitHub
                </a>
              )}
            </div>

            <div className="dev-hiring-note">
              <strong>💼 Open to freelance &amp; full-time work</strong>
              <p>Web apps, APIs, dashboards, e-commerce, and custom software solutions.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Skills */}
      <section className="dev-skills-section">
        <div className="container">
          <div style={{ textAlign:'center', marginBottom:'2.5rem' }}>
            <p className="section-eyebrow" style={{ color:'var(--gold)', marginBottom:'0.5rem' }}>Technical Expertise</p>
            <h2 className="section-title">Skills & Stack</h2>
          </div>
          <div className="dev-skills-grid">
            {SKILLS.map((s, i) => (
              <div key={i} className="dev-skill-card">
                <div className="dev-skill-icon">{s.icon}</div>
                <h3>{s.label}</h3>
                <div className="dev-skill-tags">
                  {s.items.map(item => <span key={item} className="dev-skill-tag">{item}</span>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>



      {/* CTA */}
      <section style={{ background:'var(--ink)', padding:'3.5rem 0' }}>
        <div className="container" style={{ textAlign:'center' }}>
          <h2 style={{ fontFamily:'var(--font-serif)', color:'var(--white)', fontSize:'1.6rem', marginBottom:'0.5rem' }}>
            Let's Build Something Together
          </h2>
          <p style={{ color:'rgba(255,255,255,0.6)', marginBottom:'1.5rem', fontSize:'0.9rem' }}>
            Got a project idea? I'm just a message away.
          </p>
          <div style={{ display:'flex', gap:'1rem', justifyContent:'center', flexWrap:'wrap' }}>
            <a href={`mailto:${DEV.email}`} className="btn btn-gold btn-lg">
              <Mail size={16} /> Email Me
            </a>
            {DEV.whatsapp && (
              <a href={`https://wa.me/${DEV.whatsapp}?text=${waMsg}`}
                target="_blank" rel="noreferrer"
                className="btn btn-lg" style={{ background:'#25D366', color:'#fff', border:'none' }}>
                <WaIcon /> WhatsApp
              </a>
            )}
          </div>
        </div>
      </section>

    
    </>
  );
};

export default ContactDeveloper;
