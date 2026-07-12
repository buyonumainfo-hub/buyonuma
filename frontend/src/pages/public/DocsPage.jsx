import Navbar from '../../components/shared/Navbar';
import Footer from '../../components/shared/Footer';
import './LegalPage.css';

const DocsPage = () => (
  <>
    <Navbar />
    <div className="legal-page">
      <div className="legal-page-content">
        <h1>Documentation</h1>
        <p className="legal-page-updated">How BuyOnUma works — for buyers and sellers</p>

        <div className="legal-page-toc">
          <a href="#buyers">For Buyers</a>
          <a href="#sellers">For Sellers</a>
          <a href="#cart">Cart</a>
          <a href="#ai-chat">AI Assistant</a>
          <a href="#verified">Verified Badge</a>
          <a href="#notifications">Notifications</a>
          <a href="#location">Location</a>
        </div>

        <h2 id="buyers">For Buyers</h2>
        <p>
          Browse products or sellers from the homepage, or use the Products/Sellers pages to search
          and filter by category, price, rating, or location. Tap "View Product" on any listing to
          see full details, more photos, and the seller's info. From there you can:
        </p>
        <ul>
          <li><strong>Add to Cart</strong> — collect items you're interested in (see Cart below).</li>
          <li><strong>View Contact</strong> — reveal the seller's phone number directly on the listing.</li>
          <li><strong>Chat on WhatsApp</strong> — message the seller directly to ask questions or arrange a purchase.</li>
        </ul>

        <h2 id="sellers">For Sellers</h2>
        <p>
          Register a store from the <a href="/become-a-seller">Become a Seller</a> page with your
          store name, category, contact details, and location. New accounts are reviewed by an admin
          before going live — you'll get an email once approved.
        </p>
        <p>
          Once approved, if the platform requires it, redeem a token from your seller dashboard to
          activate your listings for a set period. From your dashboard you can add/edit products,
          view your analytics (store views, WhatsApp clicks, product views) with charts, manage
          notifications, and apply for a verified badge.
        </p>

        <h2 id="cart">Cart</h2>
        <p>
          The cart lets you collect products from one or more sellers before reaching out. It's
          stored only in your browser (localStorage) — BuyOnUma doesn't process payments directly.
          When you're ready, the cart groups your items by seller and gives you a pre-filled
          WhatsApp message to send each seller to complete your order with them.
        </p>

        <h2 id="ai-chat">AI Shopping Assistant</h2>
        <p>
          Look for the chat bubble in the bottom corner of the screen. It can help you find products
          or sellers across the marketplace, and — when you're viewing a specific product — answer
          questions about that product. It only recommends things that actually exist on BuyOnUma; it
          can't place orders for you.
        </p>

        <h2 id="verified">Verified Badge</h2>
        <p>
          Sellers can apply for a verified badge by submitting their NIN (National Identification
          Number) from their seller dashboard. This is checked and given final review by our team
          before the badge appears on your store. It's a trust signal for buyers — it doesn't affect
          your listings or fees.
        </p>

        <h2 id="notifications">Notifications</h2>
        <p>
          Sellers receive in-app notifications for account approval, verification status, token
          redemption reminders, and admin announcements. You can also opt in to browser push
          notifications from your notification settings to get alerts even when you're not on the site.
        </p>

        <h2 id="location">Location & "Nearest to Me"</h2>
        <p>
          Set your state/city when registering (or update it anytime from your profile). Buyers can
          tap "Use my current location" to see sellers and products nearest to them first, with
          results from further away shown after — so you'll always see something, never an empty page.
        </p>
      </div>
    </div>
    <Footer />
  </>
);

export default DocsPage;
