export const CATEGORIES = [
  'All',
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
  { value: 'createdAt', label: 'Newest First', order: 'desc' },
  { value: 'rating', label: 'Highest Rated', order: 'desc' },
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
