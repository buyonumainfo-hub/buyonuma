import Affiliate from '../models/Affiliate.js';
import AffiliateReferral from '../models/AffiliateReferral.js';
import AffiliateEarning from '../models/AffiliateEarning.js';
import { getAffiliateSettings } from './affiliateSettings.js';

/**
 * Credits the affiliate who referred `seller` (if any) a commission for
 * this plan upgrade, and marks the referral as 'upgraded'. Used from two
 * places that both represent "this seller is now paying for `plan`":
 *
 *   1. routes/payments.js — the Opay webhook, after a real payment
 *      succeeds (`source: 'payment'`, tied to that Payment via
 *      `paymentId`).
 *   2. routes/sellers.js — an admin manually changing a referred
 *      seller's plan from the admin panel (`source: 'admin_grant'`),
 *      treated exactly like the seller paid for it themselves. This can
 *      be switched off entirely via
 *      AffiliateSettings.creditAdminPlanChanges — see the toggle in the
 *      Affiliate Program Settings panel (routes/adminAffiliates.js).
 *
 * Both paths end up with identical bookkeeping (same referral update,
 * same commission math, same earning shape) so an affiliate's dashboard
 * can't tell — and shouldn't need to — which one happened.
 *
 * Safe to call even if the seller wasn't referred by anyone, or the
 * referring affiliate is banned — it just no-ops. Never throws; a
 * duplicate-payment race (E11000 on the partial unique index) is the
 * one error this deliberately swallows, since that just means this
 * exact payment was already credited.
 */
export const creditAffiliateCommission = async ({ seller, plan, amount, source = 'payment', paymentId = null, grantedByAdmin = null }) => {
  if (!seller?.referredByAffiliate) return;

  if (source === 'admin_grant' && !getAffiliateSettings().creditAdminPlanChanges) {
    return; // feature toggled off — see AffiliateSettings.creditAdminPlanChanges
  }

  try {
    const affiliate = await Affiliate.findById(seller.referredByAffiliate);
    if (!affiliate || affiliate.status !== 'active') return;

    const referral = await AffiliateReferral.findOneAndUpdate(
      { affiliate: affiliate._id, seller: seller._id },
      { $set: { status: 'upgraded', plan, lastUpgradeAt: new Date() } },
      { new: true, upsert: true }
    );

    const { commissionPercent } = getAffiliateSettings();
    const commissionAmount = Math.round((amount * commissionPercent) / 100);

    await AffiliateEarning.create({
      affiliate: affiliate._id,
      referral: referral._id,
      seller: seller._id,
      payment: paymentId,
      source,
      grantedByAdmin,
      plan,
      amount,
      commissionPercent,
      commissionAmount,
    });
  } catch (err) {
    if (err.code !== 11000) console.error('Affiliate commission error:', err.message);
  }
};
