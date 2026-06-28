import express from 'express';
import Product from '../models/Product.js';
import SellerToken from '../models/SellerToken.js';
import Seller from '../models/Seller.js';
import { protectSeller } from '../middleware/auth.js';
import cache from '../utils/cache.js';
import { isTokenRequired } from '../utils/tokenSetting.js';

const router = express.Router();

// ─── POST /api/seller/redeem-token ─────────────────────────────────────────
router.post('/redeem-token', protectSeller, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, message: 'Token required' });

    // 1. Confirm seller is approved
    const sellerDoc = await Seller.findById(req.seller.id);
    if (!sellerDoc)
      return res.status(404).json({ success: false, message: 'Seller not found' });
    if (!sellerDoc.isApproved)
      return res.status(403).json({ success: false, message: 'Your account is not yet approved by admin' });

    // 2. Find and validate the token
    const tokenDoc = await SellerToken.findOne({ token: token.trim().toUpperCase() });
    if (!tokenDoc)
      return res.status(404).json({ success: false, message: 'Invalid token — check the code and try again' });
    if (tokenDoc.used)
      return res.status(400).json({ success: false, message: 'This token has already been used' });
    if (new Date() > new Date(tokenDoc.expires_at))
      return res.status(400).json({ success: false, message: 'This token has expired — ask the admin for a new one' });

    // 3. Compute new expiry
    const expiresAt = new Date(Date.now() + tokenDoc.duration_hours * 60 * 60 * 1000);

    // 4. Mark token used
    tokenDoc.used    = true;
    tokenDoc.used_by = req.seller.id;
    tokenDoc.used_at = new Date();
    await tokenDoc.save();

    // 5. Store expiry directly on the seller — single source of truth
    sellerDoc.token_expires_at    = expiresAt;
    sellerDoc.token_duration_hours = tokenDoc.duration_hours;
    await sellerDoc.save();

    // 6. Re-activate ALL this seller's products and stamp the expiry on each
    await Product.updateMany(
      { seller: req.seller.id },
      {
        $set: {
          expires_at:            expiresAt,
          expiry_duration_hours: tokenDoc.duration_hours,
          isActive:              true,
        }
      }
    );

    // 7. Bust caches
   await cache.delPrefix('products:');
  await  cache.delPrefix(`seller:${req.seller.id}`);
  await  cache.delPrefix('sellers:');

    res.json({
      success: true,
      message: `Token redeemed! Your products are now visible for ${tokenDoc.duration_hours} hour${tokenDoc.duration_hours !== 1 ? 's' : ''}.`,
      duration_hours: tokenDoc.duration_hours,
      expires_at:     expiresAt,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/seller/token-status ──────────────────────────────────────────
router.get('/token-status', protectSeller, async (req, res) => {
  try {
    const seller = await Seller.findById(req.seller.id).select('token_expires_at token_duration_hours');
    if (!seller) return res.status(404).json({ success: false, message: 'Seller not found' });

    const tokenRequired  = await isTokenRequired();
    const hasActiveToken = !tokenRequired || (seller.token_expires_at && new Date(seller.token_expires_at) > new Date());
    res.json({ success: true, has_active_token: hasActiveToken, token_required: tokenRequired, expires_at: seller.token_expires_at || null, duration_hours: seller.token_duration_hours || null });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/seller/products ───────────────────────────────────────────────
router.get('/products', protectSeller, async (req, res) => {
  try {
    const { page = 1, limit = 12 } = req.query;
    const query = { seller: req.seller.id };
    const total    = await Product.countDocuments(query);
    const products = await Product.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // Attach seller's token status to each product for the dashboard UI
    const seller = await Seller.findById(req.seller.id).select('token_expires_at');
    const tokenExpiresAt = seller?.token_expires_at || null;

    res.json({
      success: true, products, tokenExpiresAt,
      total,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit), limit: parseInt(limit) }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// // ─── POST /api/seller/products ──────────────────────────────────────────────
// router.post('/products', protectSeller, async (req, res) => {
//   try {
//     const sellerDoc = await Seller.findById(req.seller.id);
//     if (!sellerDoc?.isApproved)
//       return res.status(403).json({ success: false, message: 'Your account must be approved by admin before posting products' });

//     const { name, description, price, category, product_image, time_frame } = req.body;
//     if (!name || price === undefined || !category)
//       return res.status(400).json({ success: false, message: 'Name, price and category required' });

//     // New product is visible only if the seller has an active token
//     const hasActiveToken = sellerDoc.token_expires_at && new Date(sellerDoc.token_expires_at) > new Date();

//     const product = new Product({
//       name,
//       description:           description   || '',
//       price,
//       category,
//       product_image:         product_image || '',
//       time_frame:            time_frame    || '',
//       seller:                req.seller.id,
//       isActive:              hasActiveToken,          // visible immediately if token active
//       expires_at:            hasActiveToken ? sellerDoc.token_expires_at : null,
//       expiry_duration_hours: sellerDoc.token_duration_hours || null,
//     });
//     await product.save();
//     await product.populate('seller', 'store_name username profile_picture rating whatsapp');

//     // Bust product list cache
//    await cache.delPrefix('products:');

//     const msg = hasActiveToken
//       ? 'Product posted and is now live!'
//       : 'Product saved. Redeem an admin token to make it visible on the marketplace.';

//     res.status(201).json({ success: true, product, message: msg });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// });

// // ─── PUT /api/seller/products/:id ───────────────────────────────────────────
// router.put('/products/:id', protectSeller, async (req, res) => {
//   try {
//     const product = await Product.findOne({ _id: req.params.id, seller: req.seller.id });
//     if (!product) return res.status(404).json({ success: false, message: 'Product not found or not yours' });

//     const allowed = ['name','description','price','category','product_image','time_frame'];
//     allowed.forEach(k => { if (req.body[k] !== undefined) product[k] = req.body[k]; });
//     await product.save();
//     await product.populate('seller', 'store_name username profile_picture rating whatsapp');

//     await cache.delPrefix('products:');
//     res.json({ success: true, product, message: 'Product updated' });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// });


router.post('/products', protectSeller, async (req, res) => {
  try {
    const sellerDoc = await Seller.findById(req.seller.id);
    if (!sellerDoc?.isApproved) return res.status(403).json({ success: false, message: 'Account must be approved before posting products' });
    const { name, description, price, category, product_image, images, time_frame } = req.body;
    if (!name || price === undefined || !category) return res.status(400).json({ success: false, message: 'Name, price and category required' });

     const tokenRequired = await isTokenRequired();
     const hasToken = !tokenRequired || (sellerDoc.token_expires_at && new Date(sellerDoc.token_expires_at) > new Date());
    let imageList = Array.isArray(images) ? images.filter(Boolean) : (product_image ? [product_image] : []);
    if (imageList.length > 5) imageList = imageList.slice(0, 5);
    const product  = new Product({
      name, description: description||'', price, category,
      images: imageList,
      product_image: imageList[0] || '',
      time_frame: time_frame||'',
      seller: req.seller.id,
      isActive: hasToken,
    expires_at: hasToken && tokenRequired ? sellerDoc.token_expires_at : null,
      expiry_duration_hours: sellerDoc.token_duration_hours || null,
    });
    await product.save();
    await product.populate('seller','store_name username profile_picture rating whatsapp');
    await cache.delPrefix('products:');
    res.status(201).json({ success: true, product, message: hasToken ? 'Product posted and live!' : 'Product saved. Redeem a token to make it visible.' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/products/:id', protectSeller, async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, seller: req.seller.id });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found or not yours' });
    const allowed = ['name','description','price','category','product_image','images','time_frame'];
    allowed.forEach(k => { if (req.body[k] !== undefined) product[k] = req.body[k]; });
    if (Array.isArray(product.images)) {
      if (product.images.length > 5) product.images = product.images.slice(0, 5);
      product.product_image = product.images[0] || '';
    }
    await product.save();
    await product.populate('seller','store_name username profile_picture rating whatsapp');
    await cache.delPrefix('products:');
    res.json({ success: true, product, message: 'Product updated' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

export default router;
