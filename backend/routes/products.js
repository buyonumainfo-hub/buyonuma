import express from 'express';
import Product from '../models/Product.js';
import Seller from '../models/Seller.js';
import { protect, protectSeller } from '../middleware/auth.js';
import cache from '../utils/cache.js';
import { isTokenRequired } from '../utils/tokenSetting.js';
import { writeLimiter } from '../middleware/rateLimiter.js';
import { productCreateValidators, productUpdateValidators, mongoIdParam, locationQuery } from '../middleware/validators.js';
import { validate } from '../middleware/validate.js';
import { logActivity } from '../utils/activityLog.js';
import { WORLDWIDE } from '../utils/nigeriaLocations.js';

const router = express.Router();

// Escapes regex metacharacters before interpolating a user-controllable
// value (city query param) into a MongoDB $regex filter — without this,
// a value like "Offa)" or "a.*b" could throw or match far more broadly
// than intended. Cheap, defensive insurance.
const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Mark expired products inactive (run before public queries)
const cleanExpired = async () => {
  await Product.updateMany(
    { expires_at: { $ne: null, $lte: new Date() }, isActive: true },
    { $set: { isActive: false } }
  );
};
const activateAll = async () => {
  await Product.updateMany(
    { isActive: false},
    { $set: { isActive: true } }
  );
};

// ─── GET /api/products — public ─────────────────────────────────────────────
// new

router.get('/', locationQuery, validate, async (req, res) => {
try {
const tokenRequired = await isTokenRequired();
   if (tokenRequired) {
    await cleanExpired();
   }else{
     await activateAll();
   }

const {
page = 1, limit = 12,
sort = 'tiktokScore',
order = 'desc',
category, search, seller, minPrice, maxPrice,
state, city
} = req.query;

const cacheKey = `products:list:${JSON.stringify(req.query)}`;
const cached = await cache.get(cacheKey);
if (cached) return res.json(cached);

const now = new Date();

   // const tokenRequired = await isTokenRequired();

    // If tokens required: only show products from sellers with active tokens
    // If tokens disabled: show all products from approved active sellers
    const sellerFilter = tokenRequired
      ? { isApproved: true, isActive: true, token_expires_at: { $gt: now } }
      : { isApproved: true, isActive: true };
    // Products don't carry their own location — they inherit the seller's.
    // An explicit ?state=&city= filter narrows the seller pool up front;
    // for sort=nearest we instead keep the full pool and re-rank below so
    // we can show closest-first with graceful fallback to "everywhere else"
    // rather than an empty page when nobody's in the exact city/state.
    //
    // Sellers who registered with state="Worldwide" (they ship/sell
    // everywhere rather than being tied to one location) are always
    // included alongside whatever specific state/city the buyer filtered
    // to — they shouldn't be excluded just because they're not physically
    // located there. Only applied when a location filter is actually set;
    // with no filter, worldwide sellers already show normally like anyone
    // else.
    if (sort !== 'nearest') {
      if (state && state !== 'All') {
        const locationMatch = { state };
        if (city) locationMatch.city = { $regex: `^${escapeRegex(city)}$`, $options: 'i' };
        sellerFilter.$or = [locationMatch, { state: WORLDWIDE }];
      }
    }
const activeSellers = await Seller.find(sellerFilter).select('_id rating store_name username profile_picture category whatsapp contact ninStatus state city');

const activeSellersIds = activeSellers.map(s => s._id);
const sellerMap = new Map();
activeSellers.forEach(s => {
sellerMap.set(s._id.toString(), s);
});

const query = {
isActive: true,
seller: { $in: activeSellersIds },
};

if (category && category !== 'All') query.category = category;
if (seller) {
const isActive = activeSellersIds.some(id => id.toString() === seller);
query.seller = isActive ? seller : { $in: [] };
}
if (minPrice || maxPrice) {
query.price = {};
if (minPrice) query.price.$gte = parseFloat(minPrice);
if (maxPrice) query.price.$lte = parseFloat(maxPrice);
}
if (search) query.$or = [
{ name: { $regex: search, $options: 'i' } },
{ description: { $regex: search, $options: 'i' } },
];

let total = await Product.countDocuments(query);
const limitNum = parseInt(limit);
const pageNum = parseInt(page);

let products = [];
let nearestTotal = null; // overridden below for sort=nearest, since that mode uses a capped candidate pool rather than the full unbounded count

if (sort === 'nearest') {
  if (!state) {
    return res.status(400).json({ success: false, message: 'state is required for sort=nearest' });
  }
  // Bucket by proximity: same city first, then same state, then everyone
  // else — each bucket newest-first. Fetched as a bounded pool (not the
  // full collection) to keep this cheap even on a large catalog.
  const POOL_SIZE = 300;

  // BUG FIX: `city` matching already normalized case (`.toLowerCase()`),
  // but `state` matching used strict `===` with no trim/case handling —
  // an inconsistency. Both sides *should* always come from the same
  // canonical NIGERIA_STATES list, but if a seller's `state` was ever
  // set any other way (a direct DB edit, an older data import, a future
  // code path that doesn't enforce the canonical list, incidental
  // whitespace), a silent case/whitespace mismatch here would dump that
  // seller into "elsewhere" instead of matching them — which looks
  // exactly like "nearest isn't doing anything" from a buyer's side.
  // Normalizing both sides the same way closes that gap.
  const normalize = (v) => (v || '').trim().toLowerCase();
  const targetState = normalize(state);
  const targetCity = normalize(city);

  const cityIds = targetCity
    ? new Set(activeSellers.filter(s => normalize(s.state) === targetState && normalize(s.city) === targetCity).map(s => s._id.toString()))
    : new Set();
  const stateIds = new Set(activeSellers.filter(s => normalize(s.state) === targetState && !cityIds.has(s._id.toString())).map(s => s._id.toString()));

  // Sellers who registered as "Worldwide" ship/sell everywhere, so they're
  // more relevant to any buyer than a random seller who just happens to be
  // in some other, unrelated state — ranked as their own bucket, above
  // "elsewhere" but below an actual city/state match.
  const worldwideIds = new Set(
    activeSellers
      .filter(s => s.state === WORLDWIDE && !cityIds.has(s._id.toString()) && !stateIds.has(s._id.toString()))
      .map(s => s._id.toString())
  );

  // BUG FIX: this used to be `Product.find({ ...query, seller: { $nin: [...] } })`.
  // Spreading `query` and then overwriting its `seller` key with `$nin`
  // doesn't merge with the original `seller: { $in: activeSellersIds }` —
  // the later key replaces it outright. That meant the "everyone else"
  // bucket had NO constraint tying it back to approved/active/token-valid
  // sellers, so it could pull in products from sellers who shouldn't be
  // publicly visible at all (unapproved, suspended, expired token) —
  // which looked like "nearest" was just dumping in the whole catalog
  // indiscriminately instead of respecting normal visibility rules.
  // Deriving the elsewhere set explicitly from `activeSellers` (already
  // correctly scoped) fixes this.
  const elsewhereIds = new Set(
    activeSellers
      .filter(s => !cityIds.has(s._id.toString()) && !stateIds.has(s._id.toString()) && !worldwideIds.has(s._id.toString()))
      .map(s => s._id.toString())
  );

  // BUG FIX: sorting by createdAt alone has no tiebreaker for products
  // created in the same millisecond (rare but possible), and — more
  // importantly — each page re-runs these three queries from scratch
  // rather than using a single stable cursor. Without a fully unique
  // secondary sort key, MongoDB doesn't guarantee the same relative
  // ordering across two separate query executions, so page 2's query
  // could shuffle relative to page 1's and re-return an item already
  // shown. `_id` is always unique, so adding it as a tiebreaker makes
  // the sort a true total order — the exact same fix already applied
  // to the tiktokScore branch below (see its `// FIX:` comments).
  const [cityPool, statePool, worldwidePool, elsewherePool] = await Promise.all([
    cityIds.size ? Product.find({ ...query, seller: { $in: [...cityIds] } }).sort({ createdAt: -1, _id: 1 }).limit(POOL_SIZE).lean() : Promise.resolve([]),
    stateIds.size ? Product.find({ ...query, seller: { $in: [...stateIds] } }).sort({ createdAt: -1, _id: 1 }).limit(POOL_SIZE).lean() : Promise.resolve([]),
    worldwideIds.size ? Product.find({ ...query, seller: { $in: [...worldwideIds] } }).sort({ createdAt: -1, _id: 1 }).limit(POOL_SIZE).lean() : Promise.resolve([]),
    elsewhereIds.size ? Product.find({ ...query, seller: { $in: [...elsewhereIds] } }).sort({ createdAt: -1, _id: 1 }).limit(POOL_SIZE).lean() : Promise.resolve([]),
  ]);

  let combined = [...cityPool, ...statePool, ...worldwidePool, ...elsewherePool];

  // Defense in depth: the three buckets are built to be mutually
  // exclusive by construction, but a duplicate here would be very
  // visible to buyers (the same product twice in their feed), so we
  // guard against it explicitly rather than relying solely on that
  // invariant holding — same safeguard already used in the tiktokScore
  // branch below.
  const seenProductIds = new Set();
  combined = combined.filter((p) => {
    const id = p._id.toString();
    if (seenProductIds.has(id)) return false;
    seenProductIds.add(id);
    return true;
  });

  const skip = (pageNum - 1) * limitNum;
  products = combined.slice(skip, skip + limitNum);

  // BUG FIX: `total` above counts the FULL unbounded catalog across all
  // active sellers, but each of the three pools here is capped at
  // POOL_SIZE (300) — once a growing catalog has more than 300 products
  // in any one bucket (almost always "elsewhere", the biggest bucket),
  // `total`/`pages` would overstate how many pages actually exist. The
  // frontend's infinite scroll trusts `pages` to decide whether to keep
  // requesting more, so that mismatch meant it kept firing requests for
  // pages that could never be delivered — looking like it "just keeps
  // fetching" and never settles. Reporting the actual capped-pool size
  // here keeps pagination honest for this sort mode specifically.
  nearestTotal = combined.length;

  // Diagnostics — only computed/returned for sort=nearest, cheap (just
  // counting sets we already built), and genuinely useful for telling
  // "nearest is sorting correctly but there's simply nobody nearby yet"
  // apart from "nearest is broken". Check this in the network tab if
  // proximity sorting still looks wrong after this fix: if
  // sellersWithLocationSet is much lower than totalActiveSellers, most
  // sellers haven't set a state/city on their profile yet, which isn't
  // a code bug — there's nothing to bucket them into.
  req._nearestDebug = {
    requestedState: state,
    requestedCity: city || null,
    totalActiveSellers: activeSellers.length,
    sellersWithLocationSet: activeSellers.filter(s => s.state).length,
    worldwideSellers: activeSellers.filter(s => s.state === WORLDWIDE).length,
    cityBucketSellers: cityIds.size,
    stateBucketSellers: stateIds.size,
    worldwideBucketSellers: worldwideIds.size,
    elsewhereBucketSellers: elsewhereIds.size,
    cityBucketProducts: cityPool.length,
    stateBucketProducts: statePool.length,
    worldwideBucketProducts: worldwidePool.length,
    elsewhereBucketProducts: elsewherePool.length,
  };
} else

if (sort === 'tiktokScore') {
// Per-page ratios: 40% new, 40% high-rated seller, 20% random
const newCount = Math.round(limitNum * 0.4);
const highRatedCount = Math.round(limitNum * 0.4);
const randomCount = limitNum - newCount - highRatedCount;

const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
const highRatedSellerIds = activeSellers
.filter(s => (s.rating || 0) >= 4)
.map(s => s._id);

// --- Build three non-overlapping pools, each in a stable order ---

// 1. New products pool
let newPool = [];
if (newCount > 0) {
newPool = await Product.find({ ...query, createdAt: { $gte: oneWeekAgo } })
.sort({ createdAt: -1, _id: 1 })
.lean();
newPool = deterministicShuffle(newPool, 1);
}

// 2. High-rated seller products pool (exclude products already in newPool)
let highRatedPool = [];
if (highRatedCount > 0 && highRatedSellerIds.length > 0) {
const newPoolIds = newPool.map(p => p._id);
highRatedPool = await Product.find({
...query,
seller: { $in: highRatedSellerIds },
_id: { $nin: newPoolIds }
})
.sort({ createdAt: -1, _id: 1 })
.lean();
highRatedPool = deterministicShuffle(highRatedPool, 2);
}

// 3. Random pool (exclude products already in newPool or highRatedPool)
let randomPool = [];
if (randomCount > 0) {
const excludedIds = [
...newPool.map(p => p._id),
...highRatedPool.map(p => p._id)
];
randomPool = await Product.find({
...query,
_id: { $nin: excludedIds }
})
.sort({ _id: 1 })
.lean();
randomPool = deterministicShuffle(randomPool, 3);
}

// --- Slice each pool for this page (no overlap across pages) ---
const newSkip = (pageNum - 1) * newCount;
const highRatedSkip = (pageNum - 1) * highRatedCount;
const randomSkip = (pageNum - 1) * randomCount;

const newSlice = newPool.slice(newSkip, newSkip + newCount);
const highRatedSlice = highRatedPool.slice(highRatedSkip, highRatedSkip + highRatedCount);
const randomSlice = randomPool.slice(randomSkip, randomSkip + randomCount);

// --- Interleave in 40/40/20 visual order ---
let combined = [];
const maxLen = Math.max(newSlice.length, highRatedSlice.length, randomSlice.length);
for (let i = 0; i < maxLen; i++) {
if (newSlice[i]) combined.push(newSlice[i]);
if (highRatedSlice[i]) combined.push(highRatedSlice[i]);
if (randomSlice[i]) combined.push(randomSlice[i]);
}

// --- Backfill if any bucket ran short (e.g. not enough new products) ---
if (combined.length < limitNum) {
const usedIds = new Set(combined.map(p => p._id.toString()));
const remaining = [
...newPool.slice(newSkip + newCount),
...highRatedPool.slice(highRatedSkip + highRatedCount),
...randomPool.slice(randomSkip + randomCount),
];
for (const p of remaining) {
if (combined.length >= limitNum) break;
const id = p._id.toString();
if (!usedIds.has(id)) {
combined.push(p);
usedIds.add(id);
}
}
}

products = combined.slice(0, limitNum);

} else {
if (sort === 'rating') {
products = await Product.aggregate([
{ $match: query },
{
$lookup: {
from: 'sellers',
localField: 'seller',
foreignField: '_id',
as: 'sellerData'
}
},
{ $unwind: '$sellerData' },
{ $sort: { 'sellerData.rating': order === 'asc' ? 1 : -1 } },
{ $skip: (pageNum - 1) * limitNum },
{ $limit: limitNum },
{ $project: { sellerData: 0 } }
]);
} else {
const sortObj = {};
sortObj[sort] = order === 'asc' ? 1 : -1;

products = await Product.find(query)
.sort(sortObj)
.skip((pageNum - 1) * limitNum)
.limit(limitNum)
.lean();
}
}

// Attach seller data
const productsWithSellers = products.map(product => ({
...product,
seller: sellerMap.get(product.seller.toString())
}));

// For sort=nearest, pagination must reflect the capped candidate pool
// (see the BUG FIX comment above) rather than the unbounded catalog
// count, or infinite scroll will keep requesting pages that can never
// be delivered.
if (nearestTotal !== null) total = nearestTotal;

const result = {
success: true,
products: productsWithSellers,
pagination: {
total,
page: pageNum,
pages: Math.ceil(total / limitNum),
limit: limitNum
},
...(req._nearestDebug ? { _nearestDebug: req._nearestDebug } : {}),
};

await cache.set(cacheKey, result, 30);
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

// ─── GET /api/products/admin/all — admin ────────────────────────────────────
router.get('/admin/all', protect, async (req, res) => {
  try {
    const { page=1, limit=20, sort='createdAt', order='desc', category, search, seller } = req.query;

    const cacheKey = `products:admin:${JSON.stringify(req.query)}`;
    const cached   = await cache.get(cacheKey);
    if (cached) return res.json(cached);

    const query = {};
    if (category && category !== 'All') query.category = category;
    if (seller) query.seller = seller;
    if (search) query.$or = [
      { name:        { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];

    const sortObj  = { [sort]: order === 'asc' ? 1 : -1 };
    const total    = await Product.countDocuments(query);
    const products = await Product.find(query)
      .populate('seller', 'store_name username profile_picture token_expires_at')
      .sort(sortObj)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const result = { success: true, products, pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit), limit: parseInt(limit) } };
   await cache.set(cacheKey, result, 20);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/products/:id — public ─────────────────────────────────────────
router.get('/:id', mongoIdParam('id'), validate, async (req, res) => {
  try {
    const cacheKey = `products:single:${req.params.id}`;
    const cached   =await cache.get(cacheKey);
    if (cached) return res.json(cached);

    const product = await Product.findById(req.params.id)
      .populate('seller', 'store_name username profile_picture rating category contact website social_media_handle whatsapp token_expires_at');

    if (!product || !product.isActive)
      return res.status(404).json({ success: false, message: 'Product not found' });

    const result = { success: true, product };
   await cache.set(cacheKey, result, 30);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /api/products — admin creates product ──────────────────────────────
// router.post('/', protect, async (req, res) => {
//   try {
//     const data = { ...req.body };
//     if (data.expiry_duration_hours && Number(data.expiry_duration_hours) > 0) {
//       const h = Number(data.expiry_duration_hours);
//       data.expires_at = new Date(Date.now() + h * 3600000);
//       data.expiry_duration_hours = h;
//     } else {
//       data.expires_at = null;
//       data.expiry_duration_hours = null;
//     }

//     const seller = await Seller.findById(data.seller);
//     if (!seller) return res.status(404).json({ success: false, message: 'Seller not found' });

//     const product = new Product(data);
//     await product.save();
//     await product.populate('seller', 'store_name username profile_picture rating whatsapp');

//    await cache.delPrefix('products:');
//     res.status(201).json({ success: true, product, message: 'Product created' });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// });

// // ─── PUT /api/products/:id — admin updates product ───────────────────────────
// router.put('/:id', protect, async (req, res) => {
//   try {
//     const data = { ...req.body };
//     if (data.expiry_duration_hours !== undefined) {
//       const h = Number(data.expiry_duration_hours);
//       if (h > 0) { data.expires_at = new Date(Date.now() + h * 3600000); data.expiry_duration_hours = h; }
//       else        { data.expires_at = null; data.expiry_duration_hours = null; }
//     }
//     const product = await Product.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true })
//       .populate('seller', 'store_name username profile_picture rating whatsapp');

//     if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

//     await cache.delPrefix('products:');
//     res.json({ success: true, product, message: 'Product updated' });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// });

router.post('/', protect, writeLimiter, productCreateValidators, validate, async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.expiry_duration_hours && Number(data.expiry_duration_hours) > 0) {
      const h = Number(data.expiry_duration_hours);
      data.expires_at = new Date(Date.now() + h * 3600000);
      data.expiry_duration_hours = h;
    } else { data.expires_at = null; data.expiry_duration_hours = null; }
    if (Array.isArray(data.images)) {
      data.images = data.images.filter(Boolean).slice(0, 5);
      data.product_image = data.images[0] || '';
    }
    if (!(await Seller.findById(data.seller))) return res.status(404).json({ success: false, message: 'Seller not found' });
    const product = new Product(data);
    await product.save();
    await product.populate('seller','store_name username profile_picture rating whatsapp contact ninStatus');
    await cache.delPrefix('products:');
    await logActivity({ type: 'product_added', seller: data.seller, product: product._id, meta: { via: 'admin' } });
    res.status(201).json({ success: true, product, message: 'Product created' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/:id', protect, writeLimiter, mongoIdParam('id'), productUpdateValidators, validate, async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.expiry_duration_hours !== undefined) {
      const h = Number(data.expiry_duration_hours);
      if (h > 0) { data.expires_at = new Date(Date.now() + h * 3600000); data.expiry_duration_hours = h; }
      else { data.expires_at = null; data.expiry_duration_hours = null; }
    }
    if (Array.isArray(data.images)) {
      data.images = data.images.filter(Boolean).slice(0, 5);
      data.product_image = data.images[0] || '';
    }
    const product = await Product.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true }).populate('seller','store_name username profile_picture rating whatsapp contact ninStatus');
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    await Promise.all([cache.delPrefix('products:'), cache.del(`products:single:${req.params.id}`)]);
    await logActivity({ type: 'product_updated', seller: product.seller?._id, product: product._id });
    res.json({ success: true, product, message: 'Product updated' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── DELETE /api/products/:id — admin only ───────────────────────────────────
router.delete('/:id', protect, writeLimiter, mongoIdParam('id'), validate, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    await cache.delPrefix('products:');
    await logActivity({ type: 'product_deleted', seller: product.seller, product: product._id });
    res.json({ success: true, message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── DELETE /api/products/seller/:id — admin seller ───────────────────────────────────
router.delete('/seller/:id', protectSeller, writeLimiter, mongoIdParam('id'), validate, async (req, res) => {
  try {
    // SECURITY: previously this deleted ANY product by ID regardless of
    // which seller owned it — a seller could delete another seller's
    // product just by guessing/enumerating IDs. Now scoped to the
    // authenticated seller's own products only.
    const product = await Product.findOneAndDelete({ _id: req.params.id, seller: req.seller.id });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found or not yours' });
    await cache.delPrefix('products:');
    await logActivity({ type: 'product_deleted', seller: req.seller.id, product: product._id });
    res.json({ success: true, message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
export default router;
