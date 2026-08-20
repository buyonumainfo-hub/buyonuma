
export const CATEGORIES = [
  'All',
  'Food & Beverages & Cakes',
  "Jewelry & Accessories",
  "Clothing",
  "Shoes",
  "Perfumes",
  "Beauty & Skincare", 
  "Electronics", 
  "Phones & Accessories",
  "Art & Design", 
  "Textbooks", 
  "Services",
  "Furniture & Home Decor", "Health & Fitness", 
  "Stationery & Supplies", "Event Tickets",
  "Rentals",
  'Other'
];

export const CATEGORIES_NO_ALL = CATEGORIES.slice(1);

export const SORT_OPTIONS = [
    { value: 'tiktokScore', label: 'default sort', order: null },
  { value: 'createdAt', label: 'Newest First', order: 'desc' },
  { value: 'createdAt', label: 'Oldest First', order: 'asc' },
  { value: 'rating', label: 'Highest Rated', order: 'desc' },
  { value: 'price', label: 'Price: Low to High', order: 'asc' },
  { value: 'price', label: 'Price: High to Low', order: 'desc' },
  { value: 'name', label: 'Name A-Z', order: 'asc' },
];

export const SELLER_SORT_OPTIONS = [
   { value: 'tiktokScore', label: 'default sort', order: null },
  { value: 'nearest', label: '📍 Nearest to me', order: null },
  { value: 'rating', label: 'Highest Rated', order: 'desc' },
  { value: 'createdAt', label: 'Newest First', order: 'desc' },
  { value: 'rating', label: 'Lowest Rated', order: 'asc' },
  { value: 'store_name', label: 'Name A-Z', order: 'asc' },
];
export const ADMIN_SELLER_SORT_OPTIONS = [
  
  { value: 'createdAt', label: 'Newest First', order: 'desc' },
  
  { value: 'rating', label: 'Highest Rated', order: 'desc' },
  { value: 'rating', label: 'Lowest Rated', order: 'asc' },
  { value: 'store_name', label: 'Name A-Z', order: 'asc' },
];

export const CATEGORY_ICONS = {
  "Stationery & Supplies" : "🎡",
   "Event Tickets": "🎫",
  'Electronics': '💻',
  "Jewelry & Accessories": "💎",
  "Shoes": "👞",
   "Perfumes": "💮",
  'Clothing': '👗',
    "Beauty & Skincare": "💇‍♀️",
    "Rentals": "🏡",
  'Textbooks': '📚',
  'Food & Beverages & Cakes': '🍜',
  'Health & Fitness': '✨',
  'Sports': '⚽',
  'Furniture & Home Decor': '🏠',
  'Services': '🛠️',
  "Phones & Accessories": "📲",
  'Art & Design': '🎨',
  'Other': '📦',
  'All': '🏪',
};



import {
  PenTool,
  Ticket,
  Laptop,
  Gem,
  Footprints,
  SprayCan,
  Shirt,
  Sparkles,
  KeyRound,
  BookOpen,
  UtensilsCrossed,
  HeartPulse,
  Trophy,
  Sofa,
  Wrench,
  Smartphone,
  Palette,
  Package,
  Store,
} from 'lucide-react';

export const CATEGORY_ICONS_F = {
  "Stationery & Supplies": PenTool,
  "Event Tickets": Ticket,
  "Electronics": Laptop,
  "Jewelry & Accessories": Gem,
  "Shoes": Footprints,
  "Perfumes": SprayCan,
  "Clothing": Shirt,
  "Beauty & Skincare": Sparkles,
  "Rentals": KeyRound,
  "Textbooks": BookOpen,
  "Food & Beverages & Cakes": UtensilsCrossed,
  "Health & Fitness": HeartPulse,
  "Sports": Trophy,
  "Furniture & Home Decor": Sofa,
  "Services": Wrench,
  "Phones & Accessories": Smartphone,
  "Art & Design": Palette,
  "Other": Package,
  "All": Store,
};
