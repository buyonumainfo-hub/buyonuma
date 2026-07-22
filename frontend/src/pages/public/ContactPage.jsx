import { useState } from 'react';
import { Mail, Phone, MapPin, MessageSquare, Send, Clock } from 'lucide-react';
import Navbar from '../../components/shared/Navbar';
import Footer from '../../components/shared/Footer';
import './ContactPage.css';

const WhatsAppIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const contactCards = [
  {
    icon: <Mail size={22} />,
    label: 'Email Us',
    value: 'umaresponse@gmail.com',
    href: 'mailto:umaresponse@gmail.com',
    sub: 'We reply within 24 hours'
  },
  {
    icon: <Phone size={22} />,
    label: 'Call Us',
    value: '+234 903 461 1394',
    href: 'tel:+2349034611394',
    sub: 'Mon – Fri, 8am – 5pm'
  },
  {
    icon: <WhatsAppIcon />,
    label: 'WhatsApp',
    value: 'Chat with us',
    href: 'https://wa.me/2349034611394?text=Hello%20Lens%20University%20Market%20Admin',
    sub: 'Quick responses',
    green: true
  },
  {
    icon: <MapPin size={22} />,
    label: 'Location',
    value: 'Offa',
    href: null,
    sub: 'Navy base area, along ira Road'
  },
];

const faqs = [
  {
    q: 'How do I contact a seller?',
    a: 'Every seller has a WhatsApp button on their product cards and a contact section on their store page. Just tap and message them directly.'
  },
  {
    q: 'How do I report a fraudulent seller?',
    a: 'Send us an email or WhatsApp message with the seller username and a description of the issue. We review and act within 24 hours.'
  },
  {
    q: 'How long does it take to get approved as a seller?',
    a: 'Once you submit the Become a Seller form, our admin reviews it within 1–3 business days and adds your store to the platform.'
  },
  {
    q: 'Can I sell anything on the platform?',
    a: 'Products must be legal, campus-appropriate, and fall within our listed categories. Prohibited items will be removed immediately.'
  },
];

const ContactPage = () => {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [open, setOpen] = useState(null);

  // This sends via mailto — swap for a real backend endpoint / EmailJS / Formspree as needed
  const handleSubmit = (e) => {
    e.preventDefault();
    const body = `Name: ${form.name}\nEmail: ${form.email}\n\n${form.message}`;
    window.location.href = `mailto:umaresponse@gmail.com?subject=${encodeURIComponent(form.subject)}&body=${encodeURIComponent(body)}`;
    setSubmitted(true);
  };

  return (
    <>
      <Navbar />

      <section className="page-header">
        <div className="container">
          <p className="section-eyebrow" style={{ color: 'var(--gold)', marginBottom: '0.75rem' }}>We're Here to Help</p>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(2rem,5vw,3rem)', fontWeight: 900, color: 'var(--white)', marginBottom: '0.75rem' }}>
            Contact Us
          </h1>
          <p style={{ color: 'var(--font-serif)', maxWidth: 500, lineHeight: 1.75 }}>
            Have a question, complaint, or just want to say hi? Reach out — we usually respond within the same business day.
          </p>
        </div>
      </section>

      {/* Contact cards */}
      <section className="contact-cards-section">
        <div className="container">
          <div className="contact-cards-grid">
            {contactCards.map((c, i) => (
              <div key={i} className={`contact-card ${c.green ? 'contact-card-w' : ''}`}>
                <div className={`contact-card-icon ${c.green ? 'wa-icon' : ''}`}>{c.icon}</div>
                <div>
                  <p className="contact-card-label">{c.label}</p>
                  {c.href ? (
                    <a href={c.href} target={c.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer" className="contact-card-value">{c.value}</a>
                  ) : (
                    <p className="contact-card-value">{c.value}</p>
                  )}
                  <p className="contact-card-sub">{c.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Form + Hours */}
      <section className="contact-main">
        <div className="container contact-main-grid">

          {/* Form */}
          <div className="contact-form-wrap">
            <h2>Send Us a Message</h2>
            <p className="contact-form-sub">Fill in the form and we'll get back to you by email.</p>

            {submitted ? (
              <div className="contact-success">
                <Send size={32} />
                <h3>Message Sent!</h3>
                <p>Your email client should have opened. If not, email us directly at <strong>market@lensuniversity.edu.ng</strong></p>
                <button className="btn btn-outline" onClick={() => setSubmitted(false)}>Send Another</button>
              </div>
            ) : (
              <form className="contact-form" onSubmit={handleSubmit}>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Your Name</label>
                    <input className="form-control" required placeholder="John Doe" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input type="email" className="form-control" required placeholder="john@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Subject</label>
                  <select className="form-control" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} required>
                    <option value="">— Select a topic —</option>
                    <option>General Enquiry</option>
                    <option>Report a Seller</option>
                    <option>Become a Seller</option>
                    <option>Technical Issue</option>
                    <option>Partnership</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Message</label>
                  <textarea className="form-control" rows={5} required placeholder="Tell us what's on your mind..." value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} />
                </div>
                <button type="submit" className="btn btn-primary btn-lg" style={{ alignSelf: 'flex-start' }}>
                  <Send size={16} /> Send Message
                </button>
              </form>
            )}
          </div>

          {/* Hours + FAQ */}
          <div className="contact-sidebar">
            <div className="hours-card">
              <div className="hours-header">
                <Clock size={18} />
                <h3>Office Hours</h3>
              </div>
              <div className="hours-rows">
                {[
                  ['Monday – Friday', '8:00 AM – 5:00 PM'],
                  ['Saturday', '10:00 AM – 2:00 PM'],
                  ['Sunday', 'Closed'],
                ].map(([day, time]) => (
                  <div key={day} className="hours-row">
                    <span>{day}</span>
                    <span style={{ fontWeight: 600, color: time === 'Closed' ? 'var(--red)' : 'var(--ink)' }}>{time}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="faq-section">
              <h3>Frequently Asked</h3>
              {faqs.map((f, i) => (
                <div key={i} className="faq-item">
                  <button className="faq-q" onClick={() => setOpen(open === i ? null : i)}>
                    <MessageSquare size={14} />
                    <span>{f.q}</span>
                    <span className="faq-chevron">{open === i ? '−' : '+'}</span>
                  </button>
                  {open === i && <p className="faq-a">{f.a}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      
    </>
  );
};

export default ContactPage;
