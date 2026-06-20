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
  }
}, { timestamps: true });

export default mongoose.model('Product', productSchema);
