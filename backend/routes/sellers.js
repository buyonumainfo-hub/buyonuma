import express from 'express';
import Seller from '../models/Seller.js';
import Product from '../models/Product.js';
import { protect, requirePermission } from '../middleware/auth.js';
import cache from '../utils/cache.js';
import { isTokenRequired } from '../utils/tokenSetting.js';
import { writeLimiter } from '../middleware/rateLimiter.js';
import { mongoIdParam, sellerApproveValidators, locationQuery } from '../middleware/validators.js';
import { validate } from '../middleware/validate.js';
import { logActivity } from '../utils/activityLog.js';
import { createNotification } from '../utils/notify.js';
import { protectSeller } from '../middleware/auth.js';
import { creditAffiliateCommission } from '../utils/affiliateCommission.js';
import { getPlan } from '../utils/plans.js';
import { body } from 'express-validator';

const router = express.Router();

// ─── PUT /api/sellers/store/theme — seller customizes their store page ─────
// This is what makes the seller's SellerDetailPage look "theirs" — accent
// color, layout, banner text — read back by the public GET /:id above.
router.put('/store/theme', protectSeller, writeLimiter,
  body('primaryColor').optional().matches(/^#[0-9a-fA-F]{6}$/).withMessage('primaryColor must be a hex color like #b8923a'),
  body('layout').optional().isIn(['grid', 'list']),
  body('bannerHeadline').optional().isLength({ max: 120 }),
  body('bannerSubtext').optional().isLength({ max: 200 }),
  body('darkMode').optional().isBoolean(),
  validate,
  async (req, res) => {
    try {
      const allowed = ['primaryColor', 'layout', 'bannerHeadline', 'bannerSubtext', 'darkMode'];
      const seller = await Seller.findById(req.seller.id);
      if (!seller) return res.status(404).json({ success: false, message: 'Seller not found' });

      allowed.forEach(k => { if (req.body[k] !== undefined) seller.storeTheme[k] = req.body[k]; });
      await seller.save();

      // The public store page (SellerDetailPage) reads via GET
      // /sellers/user/:username, which caches under `seller:<username>` —
      // NOT `seller:<id>`. Clearing only the id-keyed entry left the
      // public page serving a stale cached response until the 30s TTL
      // expired, which looked like "the edit doesn't work."
      await cache.delPrefix('sellers:');
      await cache.del(`seller:${req.seller.id}`);
      await cache.del(`seller:${seller.username}`);
      res.json({ success: true, storeTheme: seller.storeTheme });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
  }
);

// ─── PUT /api/sellers/store/pins — pin up to pinLimit products to the top ──
router.put('/store/pins', protectSeller, writeLimiter,
  body('productIds').isArray().withMessage('productIds must be an array'),
  validate,
  async (req, res) => {
    try {
      const seller = await Seller.findById(req.seller.id);
      if (!seller) return res.status(404).json({ success: false, message: 'Seller not found' });

      const { productIds } = req.body;
     // console.log(productIds, seller.pinLimit);
      if (productIds.length > seller.pinLimit) {
        return res.status(403).json({
          success: false,
          message: `You can pin up to ${seller.pinLimit} products on the ${seller.plan} plan. Upgrade to pin more.`,
          pinLimit: seller.pinLimit,
        });
      }

      // Only allow pinning the seller's own products.
      const owned = await Product.find({ _id: { $in: productIds }, seller: seller._id }).select('_id');
      // console.log('owned', owned.map(p => p._id.toString()));
      if (owned.length !== productIds.length) {
        return res.status(400).json({ success: false, message: 'One or more products are not yours' });
      }

      seller.pinnedProducts = productIds;
      await seller.save();

      await cache.delPrefix('sellers:');
      await cache.del(`seller:${req.seller.id}`);
      await cache.del(`seller:${seller.username}`);
      res.json({ success: true, pinnedProducts: seller.pinnedProducts });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
  }
);

// ─── PUT /api/sellers/settings/email — change login email ──────────────────
router.put('/settings/email', protectSeller, writeLimiter,
  body('email').trim().isEmail().normalizeEmail(),
  body('currentPassword').notEmpty().withMessage('Enter your current password to confirm this change'),
  validate,
  async (req, res) => {
    try {
      const seller = await Seller.findById(req.seller.id).select('+password');
      if (!seller) return res.status(404).json({ success: false, message: 'Seller not found' });
      if (!seller.password) {
        return res.status(400).json({ success: false, message: 'Your account uses Google sign-in and has no password set. Set a password first, then you can change your email.' });
      }
      const match = await seller.comparePassword(req.body.currentPassword);
      if (!match) return res.status(401).json({ success: false, message: 'Current password is incorrect' });

      const taken = await Seller.findOne({ email: req.body.email, _id: { $ne: seller._id } });
      if (taken) return res.status(400).json({ success: false, message: 'That email is already in use' });

      seller.email = req.body.email;
      await seller.save();
      await cache.del(`seller:${req.seller.id}`);
      res.json({ success: true, message: 'Email updated' });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
  }
);

// ─── PUT /api/sellers/settings/theme-preference — light/dark/system ────────
router.put('/settings/theme-preference', protectSeller, writeLimiter,
  body('themePreference').isIn(['light', 'dark', 'system']),
  validate,
  async (req, res) => {
    try {
      const seller = await Seller.findByIdAndUpdate(
        req.seller.id,
        { themePreference: req.body.themePreference },
        { new: true }
      ).select('-password');
      if (!seller) return res.status(404).json({ success: false, message: 'Seller not found' });
      res.json({ success: true, themePreference: seller.themePreference });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
  }
);

// // ─── GET /api/sellers — public ──────────────────────────────────────────────
// router.get('/', async (req, res) => {
//   try {
//     const cacheKey = `sellers:list:${JSON.stringify(req.query)}`;
//     const cached   =await cache.get(cacheKey);
//     if (cached) return res.json(cached);

//     const { page=1, limit=12, sort='createdAt', order='desc', category, search, minRating } = req.query;
//     const query = { isActive: true, isApproved: true };
//     if (category && category !== 'All') query.category = category;
//     if (minRating) query.rating = { $gte: parseFloat(minRating) };
//     if (search) query.$or = [
//       { store_name:  { $regex: search, $options: 'i' } },
//       { username:    { $regex: search, $options: 'i' } },
//       { description: { $regex: search, $options: 'i' } },
//     ];

//     const sortObj = { [sort]: order === 'asc' ? 1 : -1 };
//     const total   = await Seller.countDocuments(query);
//     const sellers = await Seller.find(query).select('-password').sort(sortObj).skip((page-1)*limit).limit(parseInt(limit));

//     const result = { success: true, sellers, pagination: { total, page: parseInt(page), pages: Math.ceil(total/limit), limit: parseInt(limit) } };
//   await cache.set(cacheKey, result, 60); // 60 s
//     res.json(result);
//   } catch (err) { res.status(500).json({ success: false, message: err.message }); }
// });

// ─── GET /api/sellers — public (TikTok Smart Mix with sort options) ─────────
router.get('/', locationQuery, validate, async (req, res) => {
  try {
    const cacheKey = `sellers:list:${JSON.stringify(req.query)}`;
    const cached = await cache.get(cacheKey);
    if (cached) return res.json(cached);

    const {
      page = 1,
      limit = 12,
      sort = 'tiktokScore',
      order = 'desc',
      category,
      search,
      minRating,
      state,
      city
    } = req.query;

    const query = {
      isActive: true,
      isApproved: true,
      // token_expires_at: { $gt: new Date() }
    };

    if (category && category !== 'All') query.category = category;
    if (minRating) query.rating = { $gte: parseFloat(minRating) };
    // Location filters — used both for an explicit "browse this state/city"
    // filter and for the "nearest" sort mode below.
    // "Worldwide" sellers aren't tied to any one state, so they're pulled in
    // alongside an exact state match rather than only showing when state
    // is left unset.
    if (state && state !== 'All') query.state = { $in: [state, 'Worldwide'] };
    if (city) query.city = { $regex: `^${city}$`, $options: 'i' };
    if (search) query.$or = [
      { store_name:  { $regex: search, $options: 'i' } },
      { username:    { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];

    const limitNum = parseInt(limit);
    const pageNum = parseInt(page);
    const total = await Seller.countDocuments(query);

    let sellers;

    if (sort === 'nearest') {
      // Location-based sort: sellers in the buyer's exact city first, then
      // same state (plus Worldwide sellers, who ship anywhere), then
      // everyone else — each bucket sorted by rating so the ordering still
      // feels meaningful within a bucket. Requires ?state=...&city=...
      // (typically the buyer's auto-detected location).
      if (!state) {
        return res.status(400).json({ success: false, message: 'state is required for sort=nearest' });
      }
      const baseQuery = { ...query };
      delete baseQuery.state;
      delete baseQuery.city;

      const cityQuery = city ? { ...baseQuery, state, city: { $regex: `^${city}$`, $options: 'i' } } : null;
      const stateQuery = { ...baseQuery, state: { $in: [state, 'Worldwide'] } };

      const [cityMatches, stateMatchesRaw] = await Promise.all([
        cityQuery ? Seller.find(cityQuery).select('-password').sort({ rating: -1 }).lean() : Promise.resolve([]),
        Seller.find(stateQuery).select('-password').sort({ rating: -1 }).lean(),
      ]);

      const cityIds = new Set(cityMatches.map((s) => s._id.toString()));
      const stateOnlyMatches = stateMatchesRaw.filter((s) => !cityIds.has(s._id.toString()));

      const usedIds = new Set([...cityIds, ...stateOnlyMatches.map((s) => s._id.toString())]);
      const elsewhereQuery = { ...baseQuery, _id: { $nin: [...usedIds] } };
      const elsewhereMatches = await Seller.find(elsewhereQuery).select('-password').sort({ rating: -1 }).limit(200).lean();

      const combined = [...cityMatches, ...stateOnlyMatches, ...elsewhereMatches];
      const skip = (pageNum - 1) * limitNum;
      sellers = combined.slice(skip, skip + limitNum);
    } else if (sort === 'tiktokScore') {
      // FIX: Fetch a large pool once and paginate by slicing,
      // instead of 3 separate paginated queries that cause duplicates.
      const POOL_SIZE = 200;

      const topRatedCount = Math.floor(limitNum * 0.4);
      const newCount = Math.floor(limitNum * 0.4);
      const randomCount = limitNum - topRatedCount - newCount;

      const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // 1. Fetch top-rated sellers pool (no per-page skip)
      let topRatedSellers = [];
      if (topRatedCount > 0) {
        topRatedSellers = await Seller.find({
          ...query,
          rating: { $gte: 4 }
        })
          .select('-password')
          .sort({ rating: -1, createdAt: -1 })
          .limit(Math.ceil(POOL_SIZE * 0.4))
          .lean();
      }

      // 2. Fetch new sellers pool (exclude already fetched)
      let newSellers = [];
      if (newCount > 0) {
        const existingIds = topRatedSellers.map(s => s._id);
        newSellers = await Seller.find({
          ...query,
          createdAt: { $gte: oneMonthAgo },
          _id: { $nin: existingIds }
        })
          .select('-password')
          .sort({ createdAt: -1 })
          .limit(Math.ceil(POOL_SIZE * 0.4))
          .lean();
      }

      // 3. Fetch random sellers pool (exclude already fetched)
      let randomSellers = [];
      if (randomCount > 0) {
        const existingIds = [
          ...topRatedSellers.map(s => s._id),
          ...newSellers.map(s => s._id)
        ];
        randomSellers = await Seller.aggregate([
          { $match: { ...query, _id: { $nin: existingIds } } },
          { $sample: { size: Math.ceil(POOL_SIZE * 0.2) } }
        ]);
        // Strip password from aggregation results
        randomSellers = randomSellers.map(({ password, ...seller }) => seller);
      }

      // Interleave all three pools
      let interleaved = [];
      const maxLen = Math.max(topRatedSellers.length, newSellers.length, randomSellers.length);
      for (let i = 0; i < maxLen; i++) {
        if (topRatedSellers[i]) interleaved.push(topRatedSellers[i]);
        if (newSellers[i]) interleaved.push(newSellers[i]);
        if (randomSellers[i]) interleaved.push(randomSellers[i]);
      }

      // FIX: Deduplicate by _id before shuffling
      const seen = new Set();
      interleaved = interleaved.filter(s => {
        const id = s._id.toString();
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });

      // FIX: Use a fixed seed (not page number) so the pool order is
      // consistent across pages — then paginate by slicing.
      const shuffled = deterministicShuffle(interleaved, 42);

      const skip = (pageNum - 1) * limitNum;
      sellers = shuffled.slice(skip, skip + limitNum);

    } else {
      const sortObj = {};
      sortObj[sort] = order === 'asc' ? 1 : -1;

      sellers = await Seller.find(query)
        .select('-password')
        .sort(sortObj)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean();
    }

    const result = {
      success: true,
      sellers,
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
        limit: limitNum
      }
    };

    await cache.set(cacheKey, result, 60);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Helper function for deterministic shuffling
function deterministicShuffle(array, seed) {
  const shuffled = [...array];
  let currentIndex = shuffled.length;

  while (currentIndex !== 0) {
    const x = Math.sin(seed + currentIndex) * 10000;
    const random = Math.floor((x - Math.floor(x)) * currentIndex);
    currentIndex--;
    [shuffled[currentIndex], shuffled[random]] = [shuffled[random], shuffled[currentIndex]];
  }

  return shuffled;
}


// ─── GET /api/sellers/admin/all — admin ─────────────────────────────────────
router.get('/admin/all', protect, requirePermission('sellers.view'), async (req, res) => {
  try {
    const cacheKey = `sellers:admin:${JSON.stringify(req.query)}`;
    const cached   =await cache.get(cacheKey);
    if (cached) return res.json(cached);

    const { page=1, limit=20, sort='createdAt', order='desc', category, search } = req.query;
    const query = {};
    if (category && category !== 'All') query.category = category;
    if (search) query.$or = [
      { store_name: { $regex: search, $options: 'i' } },
      { username:   { $regex: search, $options: 'i' } },
    ];

    const sortObj = { [sort]: order === 'asc' ? 1 : -1 };
    const total   = await Seller.countDocuments(query);
    const sellers = await Seller.find(query).select('-password').sort(sortObj).skip((page-1)*limit).limit(parseInt(limit));

    const result = { success: true, sellers, pagination: { total, page: parseInt(page), pages: Math.ceil(total/limit), limit: parseInt(limit) } };
   await cache.set(cacheKey, result, 20); // admin sees fresher data
    res.json(result);
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── GET /api/sellers/:id — public ──────────────────────────────────────────
router.get('/:id', mongoIdParam('id'), validate, async (req, res) => {
  try {
    const cacheKey = `seller:${req.params.id}`;
    const cached   =await cache.get(cacheKey);
    if (cached) return res.json(cached);

    const seller = await Seller.findById(req.params.id).select('-password');
    if (!seller || !seller.isActive) return res.status(404).json({ success: false, message: 'Seller not found' });

      const now = new Date();
      const tokenRequired = await isTokenRequired();
        const hasToken      = !tokenRequired || (seller.token_expires_at && new Date(seller.token_expires_at) > now);
       

    // Only show products if seller has active token
    let products = hasToken
      ? await Product.find({
          seller: seller._id,
          isActive: true,
          $or: [{ expires_at: null }, { expires_at: { $gt: now } }],
        }).populate('seller', 'store_name username profile_picture rating category contact website social_media_handle whatsapp token_expires_at state city ninStatus')
      : [];

    // Pinned products (up to seller.pinLimit) surface first, in the
    // order the seller arranged them, followed by everything else.
    if (seller.pinnedProducts?.length) {
      const pinnedIds = seller.pinnedProducts.map(String);
      const pinnedSet = new Set(pinnedIds);
      const pinnedFirst = pinnedIds
        .map(id => products.find(p => p._id.toString() === id))
        .filter(Boolean);
      const rest = products.filter(p => !pinnedSet.has(p._id.toString()));
      products = [...pinnedFirst, ...rest];
    }

    const Review = (await import('../models/Review.js')).default;
    const reviewCount = await Review.countDocuments({ seller: seller._id });

    const result = {
      success: true,
      seller,
      products,
      sellerInfo: {
        reviewCount,
        isVerified: seller.ninStatus === 'verified',
        location: [seller.city, seller.state].filter(Boolean).join(', '),
        pinnedCount: seller.pinnedProducts?.length || 0,
      },
    };
   await cache.set(cacheKey, result, 30);
    res.json(result);
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── GET /api/sellers/:username — public ──────────────────────────────────────────
router.get('/user/:username', async (req, res) => {
  console.log(req.params.username)
  try {
    const cacheKey = `seller:${req.params.username}`;
    const cached   =await cache.get(cacheKey);
    if (cached) return res.json(cached);

    const seller = await Seller.findOne({username: req.params.username}).select('-password');
    if (!seller || !seller.isActive) return res.status(404).json({ success: false, message: 'Seller not found' });

    const now = new Date();
    const tokenRequired = await isTokenRequired();
    const hasToken      = !tokenRequired || (seller.token_expires_at && new Date(seller.token_expires_at) > now);
       

    // Only show products if seller has active token
    let products = hasToken
      ? await Product.find({
          seller: seller._id,
          isActive: true,
         // $or: [{ expires_at: null }, { expires_at: { $gt: now } }],
        }).populate('seller', 'store_name username profile_picture rating category contact website social_media_handle whatsapp token_expires_at state city ninStatus')
      : [];

    if (seller.pinnedProducts?.length) {
      const pinnedIds = seller.pinnedProducts.map(String);
      const pinnedSet = new Set(pinnedIds);
      const pinnedFirst = pinnedIds.map(pid => products.find(p => p._id.toString() === pid)).filter(Boolean);
      const rest = products.filter(p => !pinnedSet.has(p._id.toString()));
      products = [...pinnedFirst, ...rest];
    }

    const Review = (await import('../models/Review.js')).default;
    const reviewCount = await Review.countDocuments({ seller: seller._id });

    const result = {
      success: true,
      seller,
      products,
      sellerInfo: {
        reviewCount,
        isVerified: seller.ninStatus === 'verified',
        location: [seller.city, seller.state].filter(Boolean).join(', '),
        pinnedCount: seller.pinnedProducts?.length || 0,
      },
    };
   await cache.set(cacheKey, result, 30);
    res.json(result);
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── POST /api/sellers — admin creates seller ────────────────────────────────
router.post('/admin/', protect, requirePermission('sellers.create'), writeLimiter, async (req, res) => {
  try {
    const data = { ...req.body };
    data.isApproved = true;
    if (!data.password) data.password = Math.random().toString(36).slice(-8);
    const seller = new Seller(data);
    await seller.save();
    const out = seller.toObject(); delete out.password;
    await cache.delPrefix('sellers:');
    await logActivity({ type: 'seller_registered', seller: seller._id, meta: { via: 'admin_created' } });
    res.status(201).json({ success: true, seller: out, message: 'Seller created successfully' });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ success: false, message: 'Username or email already exists' });
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PUT /api/sellers/:id — admin updates seller ─────────────────────────────
router.put('/admin/:id', protect, requirePermission('sellers.edit'), writeLimiter, mongoIdParam('id'), validate, async (req, res) => {
  try {
    const data = { ...req.body };
    delete data.password;
    delete data.nin; delete data.ninStatus; delete data.ninProviderRef; // use the dedicated verification endpoint instead

    const before = await Seller.findById(req.params.id).select('plan referredByAffiliate');
    if (!before) return res.status(404).json({ success: false, message: 'Seller not found' });

    const seller = await Seller.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true }).select('-password');
    if (!seller) return res.status(404).json({ success: false, message: 'Seller not found' });
    await cache.delPrefix('sellers:');
    await cache.del(`seller:${req.params.id}`);
<<<<<<< HEAD
    await cache.del(`seller:${seller.username}`);
=======
>>>>>>> b403b42571a91fae11e3332f19cf5691d2aba20a

    // ── Affiliate commission on an admin-granted plan change ────────────
    // If the admin just moved this seller onto a higher-value plan than
    // they were on, treat it exactly like the seller paid for that
    // upgrade themselves — see utils/affiliateCommission.js. Only fires
    // for an actual upgrade (new plan costs more than the old one), and
    // only if the seller was referred by an affiliate in the first
    // place; the whole behavior can be switched off from the Affiliate
    // Program Settings panel (AffiliateSettings.creditAdminPlanChanges).
    if (data.plan && data.plan !== before.plan && before.referredByAffiliate) {
      const oldPrice = getPlan(before.plan).priceNGN;
      const newPrice = getPlan(data.plan).priceNGN;
      if (newPrice > oldPrice) {
        await creditAffiliateCommission({
          seller,
          plan: data.plan,
          amount: newPrice,
          source: 'admin_grant',
          grantedByAdmin: req.admin.id,
        });
      }
    }

    res.json({ success: true, seller, message: 'Seller updated successfully' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── PATCH /api/sellers/:id/approve — admin approve/suspend ─────────────────
router.patch('/admin/:id/approve',protect, requirePermission('sellers.approve'), writeLimiter, mongoIdParam('id'), sellerApproveValidators, validate, async (req, res) => {
  try {
    const { isApproved } = req.body;
    const seller = await Seller.findByIdAndUpdate(req.params.id, { isApproved }, { new: true }).select('-password');
    if (!seller) return res.status(404).json({ success: false, message: 'Seller not found' });
    await cache.delPrefix('sellers:');
    await cache.del(`seller:${req.params.id}`);
    await cache.delPrefix('products:'); // seller approval affects visible products

    await logActivity({ type: isApproved ? 'seller_approved' : 'seller_suspended', seller: seller._id });

    if (isApproved) {
      await createNotification({
        recipientType: 'seller',
        seller: seller._id,
        title: 'Your store is approved! 🎉',
        message: 'Your seller account has been approved. You can now redeem a token and start posting products.',
        type: 'approval',
        link: '/seller/dashboard',
      });
    }

    res.json({ success: true, seller, message: `Seller ${isApproved ? 'approved' : 'suspended'}` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── DELETE /api/sellers/:id ─────────────────────────────────────────────────
router.delete('/admin/:id', protect, requirePermission('sellers.delete'), writeLimiter, mongoIdParam('id'), validate, async (req, res) => {
  try {
    const seller = await Seller.findByIdAndDelete(req.params.id);
    if (!seller) return res.status(404).json({ success: false, message: 'Seller not found' });
    await Product.deleteMany({ seller: req.params.id });
    await cache.delPrefix('sellers:');
    await cache.del(`seller:${req.params.id}`);
    await cache.delPrefix('products:');
    res.json({ success: true, message: 'Seller and products deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

export default router;