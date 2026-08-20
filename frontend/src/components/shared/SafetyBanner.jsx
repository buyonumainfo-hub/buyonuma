import { ShieldAlert } from 'lucide-react';
import './SafetyBanner.css';

/**
 * Buyer-safety reminder shown anywhere a buyer might be about to pay or
 * commit to a seller they haven't met: contact reveal, WhatsApp chat,
 * cart/checkout, and the in-app messaging thread. This app has no
 * escrow or buyer-protection system, so this is the app's one honest
 * safeguard — keep it visible rather than a one-time dismissible toast.
 */
export default function SafetyBanner({ compact = false }) {
  return (
    <div className={`safety-banner ${compact ? 'safety-banner-compact' : ''}`} role="note">
      <ShieldAlert size={compact ? 14 : 18} />
      <p>
        <strong>Stay safe:</strong> never send money to a seller upfront. Always ask to meet in a
        public place and see the product before you pay.
      </p>
    </div>
  );
}
