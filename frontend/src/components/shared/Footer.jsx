import { Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import './Footer.css';

const Footer = () => (
  <footer className="footer">
    <div className="container footer-inner">
      <div className="footer-brand">
        <div className="footer-logo">
          <ShoppingBag size={18} />
          <span style={{"color": "white"}}>UMA</span>
        </div>
         <p>A universal marketplace — connecting buyers and sellers everywhere, on and off campus.</p>
      </div>
      <div className="footer-links">
        <div>
          <h4>Browse</h4>
          <Link to="/sellers">Sellers</Link>
          <Link to="/">Products</Link>
        </div>
        <div>
          <h4>Company</h4>
          <Link to="/about">About Us</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/become-a-seller">Become a Seller</Link>
          <Link to="/developer">Developer</Link>
        </div>
        <div>
          <h4>Account</h4>
          <Link to="/seller/login">Seller Login</Link>
          <Link to="/seller/register">Seller Register</Link>
        </div>
        <div>
          <h4>Legal</h4>
          <Link to="/terms">Terms of Service</Link>
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/docs">Documentation</Link>
        </div>
      </div>
    </div>
    <div className="footer-bottom">
      <div className="container">
        <p>© {new Date().getFullYear()} UMA. All rights reserved.</p>
      </div>
    </div>
  </footer>
);

export default Footer;
