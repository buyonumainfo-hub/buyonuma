import axios from 'axios';
import crypto from 'crypto';

// ── Opay Checkout integration ──────────────────────────────────────────
//
// IMPORTANT: this follows Opay's publicly documented Cashier/Checkout API
// shape (merchantId header, Bearer <publicKey> auth, HMAC-SHA512 request
// signing, HMAC-SHA512 webhook signature verification). Because we don't
// have your live Opay Business credentials, THIS HAS NOT BEEN TESTED
// AGAINST A REAL OPAY ACCOUNT. Before going live:
//   1. Set OPAY_MERCHANT_ID, OPAY_PUBLIC_KEY, OPAY_SECRET_KEY in your env.
//   2. Confirm the endpoint URLs below still match Opay's current docs
//      (https://documentation.opaycheckout.com) — payment provider APIs
//      change occasionally.
//   3. Do one real sandbox transaction end-to-end before accepting live
//      payments.
//
// If keys aren't set, every function here throws a clear, catchable
// error instead of silently doing nothing — routes/payments.js turns
// that into a friendly "payments aren't configured yet" response.

const OPAY_BASE_URL = process.env.OPAY_BASE_URL || 'https://api.opaycheckout.com';

const isOpayConfigured = () =>
  Boolean(process.env.OPAY_MERCHANT_ID && process.env.OPAY_PUBLIC_KEY && process.env.OPAY_SECRET_KEY);

const hmacHex = (data) =>
  crypto.createHmac('sha512', process.env.OPAY_SECRET_KEY).update(data).digest('hex');

/**
 * Starts an Opay Cashier checkout for a seller plan upgrade. Returns the
 * hosted checkout URL to redirect the seller to.
 */
export const initOpayCheckout = async ({ reference, amountNGN, sellerEmail, sellerName, callbackUrl }) => {
  if (!isOpayConfigured()) {
    throw new Error('Opay is not configured yet. Set OPAY_MERCHANT_ID, OPAY_PUBLIC_KEY and OPAY_SECRET_KEY.');
  }

  const payload = {
    reference,
    amount: { total: Math.round(amountNGN * 100), currency: 'NGN' }, // Opay amounts are in kobo
    returnUrl: callbackUrl,
    callbackUrl: `${process.env.BACKEND_PUBLIC_URL || ''}/api/payments/opay/webhook`,
    cancelUrl: callbackUrl,
    country: 'NG',
    payMethod: 'BankCard',
    userInfo: { userEmail: sellerEmail, userName: sellerName, userMobile: '' },
  };

  const res = await axios.post(
    `${OPAY_BASE_URL}/api/v1/international/cashier/create`,
    payload,
    {
      headers: {
        'Authorization': `Bearer ${process.env.OPAY_PUBLIC_KEY}`,
        'MerchantId': process.env.OPAY_MERCHANT_ID,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    }
  );

  const data = res.data?.data;
  if (!data?.cashierUrl) {
    throw new Error(res.data?.message || 'Opay did not return a checkout URL.');
  }
  return { checkoutUrl: data.cashierUrl, orderNo: data.orderNo };
};

/**
 * Verifies an incoming Opay webhook's signature so we only trust
 * payment-success events that genuinely came from Opay (using our
 * secret key), not a forged POST from anywhere else.
 *
 * BUG FIX: this used to sign `JSON.stringify(req.body)` — i.e. Express's
 * already-parsed-then-re-serialized copy of the payload — instead of the
 * exact raw bytes Opay actually sent and signed. Those two are NOT
 * guaranteed to be byte-identical (JSON key order, number formatting,
 * and whitespace can all shift once you parse a JSON body and
 * re-stringify it), which meant a perfectly legitimate webhook could
 * silently fail signature verification and get rejected with a 401 —
 * i.e. real successful payments could fail to upgrade the seller's plan.
 * It now takes the raw request body directly (see index.js's `verify`
 * callback on express.json(), which stashes it on `req.rawBody`, and
 * routes/payments.js which passes that through here) so the exact bytes
 * we hash match the exact bytes Opay signed.
 *
 * `rawBody` may be a Buffer (the normal case) or a string; a plain
 * object is also accepted as a last-resort fallback so this doesn't
 * hard-crash if it's ever called before that raw-body capture exists.
 */
export const verifyOpayWebhookSignature = (rawBody, receivedSignature) => {
  if (!isOpayConfigured() || !rawBody || !receivedSignature) return false;

  const payload = Buffer.isBuffer(rawBody)
    ? rawBody
    : Buffer.from(typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody), 'utf8');

  const expectedHex = hmacHex(payload);

  try {
    const expected = Buffer.from(expectedHex, 'hex');
    const received = Buffer.from(String(receivedSignature), 'hex');
    // timingSafeEqual throws on mismatched lengths rather than just
    // returning false — guard explicitly so a malformed/short signature
    // header can't crash the request instead of just failing verification.
    if (expected.length !== received.length) return false;
    return crypto.timingSafeEqual(expected, received);
  } catch {
    return false;
  }
};

export { isOpayConfigured };
