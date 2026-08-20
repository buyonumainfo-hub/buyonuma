<<<<<<< HEAD
import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: String,
    required: true,
    enum: ['All',
  'Food & Beverages & Cakes',
  "Jewelry & Accessories",
  "Clothing",
  "Shoes",
  "Perfumes",
  "Textbooks", 
  "Electronics", 
  "Services",
  "Phones & Accessories", 
  "Beauty & Skincare", 
  "Furniture & Home Decor", "Health & Fitness", 
  "Stationery & Supplies", "Event Tickets", "Art & Design", 
  "Rentals",
  'Other']
  },
  // Free-text subcategory, scoped under `category` (see
  // utils/categories.js for the suggested list per category shown in
  // the seller's product form). Not a strict enum: sellers can type a
  // subcategory that isn't in the suggested list yet, so the
  // sort-by-subcategory filter on the product listing page always
  // reflects what's actually been used.
  subcategory: {
    type: String,
    default: '',
    trim: true,
    index: true
  },
  product_image: {
    type: String,
    default: ''
  },
  images: {
    type: [String],
    default: [],
    validate: {
      validator: (arr) => arr.length <= 5,
      message: 'A product can have a maximum of 5 images',
    },
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seller',
    required: true
  },
  time_frame: {
    type: String,
    default: ''  // display label e.g. "Available Mon-Fri"
  },
  expires_at: {
    type: Date,
    default: null   // null = never expires; set by admin
  },
  expiry_duration_hours: {
    type: Number,
    default: null   // how many hours admin chose (stored for display)
  },
  isActive: {
    type: Boolean,
    default: true
  },
  viewCount: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

// Related-products lookup: same seller's other items, then same
// category/subcategory across sellers. Both benefit from these indexes.
productSchema.index({ category: 1, subcategory: 1 });
productSchema.index({ seller: 1, isActive: 1 });

export default mongoose.model('Product', productSchema);
=======
import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: String,
    required: true,
    enum: ['All',
  'Food & Beverages & Cakes',
  "Jewelry & Accessories",
  "Clothing",
  "Shoes",
  "Perfumes",
  "Textbooks", 
  "Electronics", 
  "Services",
  "Phones & Accessories", 
  "Beauty & Skincare", 
  "Furniture & Home Decor", "Health & Fitness", 
  "Stationery & Supplies", "Event Tickets", "Art & Design", 
  "Rentals",
  'Other']
  },
  // Free-text subcategory, scoped under `category` (see
  // utils/categories.js for the suggested list per category shown in
  // the seller's product form). Not a strict enum: sellers can type a
  // subcategory that isn't in the suggested list yet, so the
  // sort-by-subcategory filter on the product listing page always
  // reflects what's actually been used.
  subcategory: {
    type: String,
    default: '',
    trim: true,
    index: true
  },
  product_image: {
    type: String,
    default: ''
  },
  images: {
    type: [String],
    default: [],
    validate: {
      validator: (arr) => arr.length <= 5,
      message: 'A product can have a maximum of 5 images',
    },
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seller',
    required: true
  },
  time_frame: {
    type: String,
    default: ''  // display label e.g. "Available Mon-Fri"
  },
  expires_at: {
    type: Date,
    default: null   // null = never expires; set by admin
  },
  expiry_duration_hours: {
    type: Number,
    default: null   // how many hours admin chose (stored for display)
  },
  isActive: {
    type: Boolean,
    default: true
  },
  viewCount: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

// Related-products lookup: same seller's other items, then same
// category/subcategory across sellers. Both benefit from these indexes.
productSchema.index({ category: 1, subcategory: 1 });
productSchema.index({ seller: 1, isActive: 1 });

export default mongoose.model('Product', productSchema);
>>>>>>> b403b42571a91fae11e3332f19cf5691d2aba20a
