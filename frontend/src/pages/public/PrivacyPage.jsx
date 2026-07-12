import Navbar from '../../components/shared/Navbar';
import Footer from '../../components/shared/Footer';
import './LegalPage.css';

const PrivacyPage = () => (
  <>
    <Navbar />
    <div className="legal-page">
      <div className="legal-page-content">
        <h1>Privacy Policy</h1>
        <p className="legal-page-updated">Last updated: July 2026</p>

        <p>
          This Privacy Policy explains what information BuyOnUma collects, why, and how it's used
          and protected.
        </p>

        <h2>1. Information We Collect</h2>
        <ul>
          <li><strong>Seller account data:</strong> username, email, store name, category, description, contact number, WhatsApp number, social links, state/city, and password (stored hashed, never in plain text).</li>
          <li><strong>Product data:</strong> listings you create, including images, price, and description.</li>
          <li><strong>NIN (optional):</strong> if you apply for a verified badge, your National Identification Number is stored securely and used only to verify your identity. It is never shown publicly or shared with other sellers/buyers.</li>
          <li><strong>Usage data:</strong> aggregate, non-identifying analytics like store views, WhatsApp click-throughs, and product page views — used to power your seller dashboard and improve the Platform.</li>
          <li><strong>Location:</strong> if you enable "Use my current location," we use your browser's geolocation to detect your approximate state/city, which is used to show you nearby sellers/products. This is stored only in your browser (localStorage), not tied to your identity on our servers unless you're a registered seller who has set a location on your profile.</li>
        </ul>

        <h2>2. How We Use Your Information</h2>
        <ul>
          <li>To operate seller accounts, listings, and the marketplace generally.</li>
          <li>To send you account-related emails (welcome, password reset, approval status, broadcasts you're eligible for).</li>
          <li>To send in-app and push notifications about your account, orders-related activity, or platform announcements — you can disable push notifications at any time.</li>
          <li>To detect and prevent abuse, fraud, and security threats (e.g. rate limiting, input validation).</li>
        </ul>

        <h2>3. NIN Verification Data</h2>
        <p>
          Your NIN is stored in our database and is never returned in any public API response or
          shown to other users. It is used only to confirm your identity with our verification
          process and for admin review before a verified badge is granted. You can contact us to
          request removal of your NIN from our systems (this will also remove your verified badge).
        </p>

        <h2>4. Data Sharing</h2>
        <p>
          We do not sell your personal data. We share data only with:
        </p>
        <ul>
          <li>Service providers that power the Platform (hosting, email delivery, image storage, NIN verification, AI chat assistant) — solely to provide those services.</li>
          <li>Law enforcement, if legally required.</li>
        </ul>

        <h2>5. Data Security</h2>
        <p>
          We use industry-standard practices including password hashing, rate limiting, input
          sanitization, and encrypted connections. No system is 100% secure, but we take reasonable
          steps to protect your data.
        </p>

        <h2>6. Your Choices</h2>
        <ul>
          <li>You can update or delete your seller profile information at any time from your dashboard.</li>
          <li>You can disable push notifications from your notification settings.</li>
          <li>You can clear your locally-stored cart and location data at any time by clearing your browser's site data.</li>
        </ul>

        <h2>7. Contact</h2>
        <p>
          Questions about this Privacy Policy or your data? Reach out via our <a href="/contact">Contact page</a>.
        </p>
      </div>
    </div>
    <Footer />
  </>
);

export default PrivacyPage;
