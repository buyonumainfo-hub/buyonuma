import Navbar from '../../components/shared/Navbar';
import Footer from '../../components/shared/Footer';
import './LegalPage.css';

const TermsPage = () => (
  <>
    <Navbar />
    <div className="legal-page">
      <div className="legal-page-content">
        <h1>Terms of Service</h1>
        <p className="legal-page-updated">Last updated: July 2026</p>

        <p>
          These Terms govern your use of BuyOnUma (the "Platform"). By registering as a seller,
          browsing as a buyer, or otherwise using the Platform, you agree to these Terms.
          If you don't agree, please don't use the Platform.
        </p>

        <h2>1. What BuyOnUma Is</h2>
        <p>
          BuyOnUma is a marketplace that connects independent sellers with buyers. We provide the
          platform for sellers to list products and for buyers to discover them and contact sellers
          directly (via WhatsApp, phone, or other means shown on a listing). <strong>BuyOnUma does not
          process payments, hold inventory, or fulfill orders</strong> — every transaction is agreed
          and completed directly between buyer and seller.
        </p>

        <h2>2. Seller Accounts</h2>
        <ul>
          <li>Sellers must provide accurate store information, contact details, and product listings.</li>
          <li>New seller accounts are reviewed by an admin before becoming active.</li>
          <li>Sellers are responsible for the accuracy of their product descriptions, pricing, and availability.</li>
          <li>Depending on platform settings, sellers may need to redeem a token to keep listings visible for a set period.</li>
          <li>We may suspend or remove accounts that violate these Terms, post prohibited items, or receive credible reports of fraud.</li>
        </ul>

        <h2>3. Verified Badge (NIN Verification)</h2>
        <p>
          Sellers may optionally submit their National Identification Number (NIN) to apply for a
          verified badge. This is used solely to confirm seller identity for buyer trust and is
          reviewed by our verification process and admin team before the badge is granted. See our{' '}
          <a href="/privacy">Privacy Policy</a> for how this data is stored and protected.
        </p>

        <h2>4. Buyer Conduct</h2>
        <p>
          Buyers agree to use contact information (WhatsApp, phone, etc.) shown on listings solely to
          inquire about and arrange purchases in good faith. Harassment, spam, or abuse directed at
          sellers is prohibited and may result in restricted access to the Platform.
        </p>

        <h2>5. Prohibited Items & Conduct</h2>
        <ul>
          <li>Illegal goods or services, counterfeit items, or anything infringing on third-party rights.</li>
          <li>Fraudulent listings, fake reviews, or misrepresentation of products.</li>
          <li>Attempting to interfere with, exploit, or attack the Platform's systems.</li>
        </ul>

        <h2>6. Disputes Between Buyers and Sellers</h2>
        <p>
          Because transactions happen directly between buyer and seller outside the Platform,
          BuyOnUma is not a party to and cannot guarantee the outcome of any transaction. We encourage
          buyers and sellers to communicate clearly about price, delivery, and condition of goods
          before completing a purchase.
        </p>

        <h2>7. Limitation of Liability</h2>
        <p>
          The Platform is provided "as is." To the fullest extent permitted by law, BuyOnUma is not
          liable for losses arising from transactions between buyers and sellers, listing inaccuracies,
          or service interruptions.
        </p>

        <h2>8. Changes to These Terms</h2>
        <p>
          We may update these Terms from time to time. Continued use of the Platform after changes
          take effect constitutes acceptance of the revised Terms.
        </p>

        <h2>9. Contact</h2>
        <p>
          Questions about these Terms? Reach out via our <a href="/contact">Contact page</a>.
        </p>
      </div>
    </div>
    <Footer />
  </>
);

export default TermsPage;
