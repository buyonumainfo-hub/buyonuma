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

const router = express.Router();

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
// router.get('/', async (req, res) => {
//   try {
//     await cleanExpired();

//     const {
//       page=1, limit=12, sort='createdAt', order='desc',
//       category, search, seller, minPrice, maxPrice
//     } = req.query;

//     const cacheKey = `products:list:${JSON.stringify(req.query)}`;
//     const cached   =await cache.get(cacheKey);
//     //console.log(cached)
//     if (cached) return res.json(cached);

//     // Only show products that belong to sellers with an active token
//     const now = new Date();
//     const activeSellers = await Seller.find({
//       isApproved: true,
//       isActive:   true,
//       token_expires_at: { $gt: now },  // seller's token must be valid
//     }).select('_id');

//     const activeSellersIds = activeSellers.map(s => s._id);

//     const query = {
//       isActive: true,
//       seller:   { $in: activeSellersIds },
//     };

//     if (category && category !== 'All') query.category = category;
//     if (seller) {
//       // If filtering by specific seller, still require active token
//       query.seller = activeSellersIds.includes(seller) ? seller : { $in: [] };
//     }
//     if (minPrice || maxPrice) {
//       query.price = {};
//       if (minPrice) query.price.$gte = parseFloat(minPrice);
//       if (maxPrice) query.price.$lte = parseFloat(maxPrice);
//     }
//     if (search) query.$or = [
//       { name:        { $regex: search, $options: 'i' } },
//       { description: { $regex: search, $options: 'i' } },
//     ];

//     const sortObj = sort === 'rating' ? {} : { [sort]: order === 'asc' ? 1 : -1 };
//     const total   = await Product.countDocuments(query);
//     let products  = await Product.find(query)
//       .populate('seller', 'store_name username profile_picture rating category whatsapp')
//       .sort(sortObj)
//       .skip((page - 1) * limit)
//       .limit(parseInt(limit));

//     if (sort === 'rating') {
//       products = products.sort((a, b) =>
//         order === 'asc'
//           ? (a.seller?.rating || 0) - (b.seller?.rating || 0)
//           : (b.seller?.rating || 0) - (a.seller?.rating || 0)
//       );
//     }

//     const result = {
//       success: true, products,
//       pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit), limit: parseInt(limit) }
//     };

//   await cache.set(cacheKey, result, 30); // cache public product list for 30 s
//     res.json(result);
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// });


// ─── GET /api/products — public (TikTok Smart Mix with sort options) ────────

// router.get('/', async (req, res) => {
//   try {
//     await cleanExpired();

//     const {
//       page = 1, limit = 12,
//       sort = 'tiktokScore',
//       order = 'desc',
//       category, search, seller, minPrice, maxPrice
//     } = req.query;

//     const cacheKey = `products:list:${JSON.stringify(req.query)}`;
//     const cached = await cache.get(cacheKey);
//     if (cached) return res.json(cached);

//     const now = new Date();
//     const activeSellers = await Seller.find({
//       isApproved: true,
//       isActive: true,
//       token_expires_at: { $gt: now },
//     }).select('_id rating store_name username profile_picture category whatsapp');

//     const activeSellersIds = activeSellers.map(s => s._id);
//     const sellerMap = new Map();
//     activeSellers.forEach(s => {
//       sellerMap.set(s._id.toString(), s);
//     });

//     const query = {
//       isActive: true,
//       seller: { $in: activeSellersIds },
//     };

//     if (category && category !== 'All') query.category = category;
//     if (seller) {
//       // FIX: activeSellersIds is an array of ObjectIds, use .toString() comparison
//       const isActive = activeSellersIds.some(id => id.toString() === seller);
//       query.seller = isActive ? seller : { $in: [] };
//     }
//     if (minPrice || maxPrice) {
//       query.price = {};
//       if (minPrice) query.price.$gte = parseFloat(minPrice);
//       if (maxPrice) query.price.$lte = parseFloat(maxPrice);
//     }
//     if (search) query.$or = [
//       { name: { $regex: search, $options: 'i' } },
//       { description: { $regex: search, $options: 'i' } },
//     ];

//     const total = await Product.countDocuments(query);
//     const limitNum = parseInt(limit);
//     const pageNum = parseInt(page);

//     let products = [];

//     if (sort === 'tiktokScore') {
//       // FIX: Fetch a larger pool of products and paginate from it,
//       // instead of running 3 separate paginated queries that cause duplicates.
//       const POOL_SIZE = 200; // Fetch enough to cover multiple pages

//       const newCount = Math.floor(limitNum * 0.4);
//       const highRatedCount = Math.floor(limitNum * 0.4);
//       const randomCount = limitNum - newCount - highRatedCount;

//       const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
//       const highRatedSellerIds = activeSellers
//         .filter(s => (s.rating || 0) >= 4)
//         .map(s => s._id);

//       // 1. Fetch new products pool (no per-page skip here)
//       let newProducts = [];
//       if (newCount > 0) {
//         newProducts = await Product.find({ ...query, createdAt: { $gte: oneWeekAgo } })
//           .sort({ createdAt: -1 })
//           .limit(Math.ceil(POOL_SIZE * 0.4))
//           .lean();
//       }

//       // 2. Fetch high-rated seller products pool (exclude already fetched)
//       let highRatedProducts = [];
//       if (highRatedCount > 0 && highRatedSellerIds.length > 0) {
//         const existingIds = newProducts.map(p => p._id);
//         highRatedProducts = await Product.find({
//           ...query,
//           seller: { $in: highRatedSellerIds },
//           _id: { $nin: existingIds }
//         })
//           .sort({ createdAt: -1 })
//           .limit(Math.ceil(POOL_SIZE * 0.4))
//           .lean();
//       }

//       // 3. Fetch random products pool (exclude already fetched)
//       let randomProducts = [];
//       if (randomCount > 0) {
//         const existingIds = [
//           ...newProducts.map(p => p._id),
//           ...highRatedProducts.map(p => p._id)
//         ];
//         randomProducts = await Product.aggregate([
//           { $match: { ...query, _id: { $nin: existingIds } } },
//           { $sample: { size: Math.ceil(POOL_SIZE * 0.2) } }
//         ]);
//       }

//       // Interleave all three pools
//       let interleaved = [];
//       const maxLen = Math.max(newProducts.length, highRatedProducts.length, randomProducts.length);
//       for (let i = 0; i < maxLen; i++) {
//         if (newProducts[i]) interleaved.push(newProducts[i]);
//         if (highRatedProducts[i]) interleaved.push(highRatedProducts[i]);
//         if (randomProducts[i]) interleaved.push(randomProducts[i]);
//       }

//       // FIX: Deduplicate by _id before shuffling
//       const seen = new Set();
//       interleaved = interleaved.filter(p => {
//         const id = p._id.toString();
//         if (seen.has(id)) return false;
//         seen.add(id);
//         return true;
//       });

//       // Deterministic shuffle using a fixed seed (not page-dependent for the pool,
//       // so that page 2 is a slice of the same shuffled pool, not a re-shuffle)
//       const shuffled = deterministicShuffle(interleaved, 42);

//       // FIX: Paginate by slicing the shuffled pool
//       const skip = (pageNum - 1) * limitNum;
//       products = shuffled.slice(skip, skip + limitNum);

//     } else {
//       if (sort === 'rating') {
//         products = await Product.aggregate([
//           { $match: query },
//           {
//             $lookup: {
//               from: 'sellers',
//               localField: 'seller',
//               foreignField: '_id',
//               as: 'sellerData'
//             }
//           },
//           { $unwind: '$sellerData' },
//           { $sort: { 'sellerData.rating': order === 'asc' ? 1 : -1 } },
//           { $skip: (pageNum - 1) * limitNum },
//           { $limit: limitNum },
//           { $project: { sellerData: 0 } }
//         ]);
//       } else {
//         const sortObj = {};
//         sortObj[sort] = order === 'asc' ? 1 : -1;

//         products = await Product.find(query)
//           .sort(sortObj)
//           .skip((pageNum - 1) * limitNum)
//           .limit(limitNum)
//           .lean();
//       }
//     }

//     // Attach seller data
//     const productsWithSellers = products.map(product => ({
//       ...product,
//       seller: sellerMap.get(product.seller.toString())
//     }));

//     const result = {
//       success: true,
//       products: productsWithSellers,
//       pagination: {
//         total,
//         page: pageNum,
//         pages: Math.ceil(total / limitNum),
//         limit: limitNum
//       }
//     };

//     await cache.set(cacheKey, result, 30);
//     res.json(result);
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// });

// // Helper function for deterministic shuffling
// function deterministicShuffle(array, seed) {
//   const shuffled = [...array];
//   let currentIndex = shuffled.length;

//   while (currentIndex !== 0) {
//     const x = Math.sin(seed + currentIndex) * 10000;
//     const random = Math.floor((x - Math.floor(x)) * currentIndex);
//     currentIndex--;
//     [shuffled[currentIndex], shuffled[random]] = [shuffled[random], shuffled[currentIndex]];
//   }

//   return shuffled;
// }




// new

router.get('/', async (req, res) => {
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
   if (sort !== 'nearest') {
  if (state && state !== 'All') sellerFilter.state = { $regex: `^${state}$`, $options: 'i' };
  if (city) sellerFilter.city = { $regex: `^${city}$`, $options: 'i' };
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

const total = await Product.countDocuments(query);
const limitNum = parseInt(limit);
const pageNum = parseInt(page);

let products = [];
if (sort === 'nearest') {
  if (!state) {
    return res.status(400).json({ success: false, message: 'state is required for sort=nearest' });
  }

  const stateRegex = { $regex: `^${state}$`, $options: 'i' };

  const citySellerQuery = city
    ? { ...sellerFilter, state: stateRegex, city: { $regex: `^${city}$`, $options: 'i' } }
    : null;
  const stateSellerQuery = { ...sellerFilter, state: stateRegex };

  const [citySellers, stateSellersRaw] = await Promise.all([
    citySellerQuery ? Seller.find(citySellerQuery).select('_id').lean() : Promise.resolve([]),
    Seller.find(stateSellerQuery).select('_id').lean(),
  ]);

  const cityIds = new Set(citySellers.map((s) => s._id.toString()));
  const stateOnlyIds = new Set(
    stateSellersRaw.map((s) => s._id.toString()).filter((id) => !cityIds.has(id))
  );

  const POOL_SIZE = 300;
  const [cityPool, statePool, elsewherePool] = await Promise.all([
    cityIds.size
      ? Product.find({ ...query, seller: { $in: [...cityIds] } }).sort({ createdAt: -1 }).limit(POOL_SIZE).lean()
      : Promise.resolve([]),
    stateOnlyIds.size
      ? Product.find({ ...query, seller: { $in: [...stateOnlyIds] } }).sort({ createdAt: -1 }).limit(POOL_SIZE).lean()
      : Promise.resolve([]),
    (cityIds.size || stateOnlyIds.size)
      ? Product.find({ ...query, seller: { $nin: [...cityIds, ...stateOnlyIds] } }).sort({ createdAt: -1 }).limit(POOL_SIZE).lean()
      : Product.find(query).sort({ createdAt: -1 }).limit(POOL_SIZE).lean(),
  ]);

  const combined = [...cityPool, ...statePool, ...elsewherePool];
  const skip = (pageNum - 1) * limitNum;
  products = combined.slice(skip, skip + limitNum);
} else if (sort === 'tiktokScore') {
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

const result = {
success: true,
products: productsWithSellers,
pagination: {
total,
page: pageNum,
pages: Math.ceil(total / limitNum),
limit: limitNum
}
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
