/**
 * NIN (National Identification Number) verification provider adapter.
 *
 * This wraps whichever third-party NIN verification API you use (e.g.
 * VerifyMe, Youverify, Prembly/QoreID, Dojah — all common Nigerian
 * identity-verification providers) behind one small interface, so the
 * rest of the app never depends on a specific vendor's request/response
 * shape.
 *
 * ── SETUP ─────────────────────────────────────────────────────────────
 * Set these in your .env:
 *   NIN_PROVIDER_URL      - the provider's NIN lookup/verify endpoint
 *   NIN_PROVIDER_API_KEY  - your API key/secret with that provider
 *
 * Then fill in `callProvider()` below with the exact request shape your
 * provider expects (most are a POST with { nin } and an Authorization
 * header). The example below is written for a generic REST provider that
 * returns { valid: boolean, full_name, reference }. Adjust field names to
 * match your provider's actual response — check their API docs.
 *
 * If NIN_PROVIDER_URL isn't set, we fail safe: submissions are accepted
 * as 'pending' with no automated check, and rely entirely on the
 * mandatory admin manual review step (see routes/verification.js). This
 * keeps the feature usable in development/staging without a live
 * contract, without ever silently approving anyone.
 */

const PROVIDER_URL = process.env.NIN_PROVIDER_URL;
const PROVIDER_KEY = process.env.NIN_PROVIDER_API_KEY;

/**
 * @param {{ nin: string, fullName: string }} params
 * @returns {Promise<{ status: 'valid'|'invalid'|'unverified', reference?: string, reason?: string }>}
 */
export const verifyNIN = async ({ nin, fullName }) => {
  if (!PROVIDER_URL || !PROVIDER_KEY) {
    // No provider configured — don't block the flow, but don't fabricate
    // a "valid" result either. Admin manual review is the safety net.
    console.warn('⚠️ NIN_PROVIDER_URL/NIN_PROVIDER_API_KEY not set — skipping automated NIN check, relying on admin review only.');
    return { status: 'unverified', reason: 'Automated check not configured' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(PROVIDER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${PROVIDER_KEY}`,
      },
      body: JSON.stringify({ nin, full_name: fullName }),
      signal: controller.signal,
    });

    if (!response.ok) {
      // 4xx from the provider usually means "NIN not found / invalid format"
      if (response.status >= 400 && response.status < 500) {
        return { status: 'invalid', reason: 'NIN could not be validated by the verification service' };
      }
      throw new Error(`NIN provider returned ${response.status}`);
    }

    const data = await response.json();

    // ── Adjust this mapping to match your provider's actual response shape ──
    if (data.valid === true || data.status === 'success' || data.verified === true) {
      return { status: 'valid', reference: data.reference || data.id || '' };
    }
    return { status: 'invalid', reason: data.message || 'NIN validation failed' };
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('NIN verification service timed out');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
};
