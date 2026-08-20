import crypto from 'crypto';
import Affiliate from '../models/Affiliate.js';

// Excludes look-alike characters (0/O, 1/I) since this code gets typed,
// read aloud, and pasted into a URL by real people.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const randomCode = (length = 8) => {
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
};

/** Generates an 8-character referral code guaranteed unique among
 *  existing affiliates (retries on the rare collision). */
export const generateUniqueReferralCode = async () => {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = randomCode(8);
    const exists = await Affiliate.findOne({ referralCode: code }).select('_id');
    if (!exists) return code;
  }
  throw new Error('Could not generate a unique referral code — please try again.');
};
