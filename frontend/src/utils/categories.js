// Mirrors backend/utils/categories.js — keep both in sync when editing.
// Subcategory is free text on the product (a suggestion list here, not a
// hard enum), so "All" + whatever's actually been used always work even
// if a seller typed something outside this list.
export const SUBCATEGORIES = {
  'Food & Beverages & Cakes': ['Cakes', 'Pastries', 'Drinks', 'Snacks', 'Meals', 'Small Chops'],
  'Jewelry & Accessories': ['Necklaces', 'Earrings', 'Bracelets', 'Rings', 'Watches', 'Bags'],
  'Clothing': ['Men', 'Women', 'Kids', 'Native Wear', 'Streetwear', 'Formal'],
  'Shoes': ['Sneakers', 'Sandals', 'Heels', 'Native', 'Boots'],
  'Perfumes': ['Male', 'Female', 'Unisex', 'Oud', 'Body Spray'],
  'Textbooks': ['100 Level', '200 Level', '300 Level', '400 Level', 'General'],
  'Electronics': ['Laptops', 'Accessories', 'Audio', 'Gaming', 'Cameras'],
  'Services': ['Tutoring', 'Design', 'Repairs', 'Photography', 'Writing'],
  'Phones & Accessories': ['Phones', 'Cases', 'Chargers', 'Earpieces', 'Screen Protectors'],
  'Beauty & Skincare': ['Makeup', 'Skincare', 'Haircare', 'Tools'],
  'Furniture & Home Decor': ['Furniture', 'Decor', 'Bedding', 'Kitchenware'],
  'Health & Fitness': ['Supplements', 'Gym Gear', 'Wellness'],
  'Stationery & Supplies': ['Books', 'Writing', 'Art Supplies', 'Office'],
  'Event Tickets': ['Concerts', 'Parties', 'Conferences'],
  'Art & Design': ['Paintings', 'Prints', 'Custom Art', 'Digital Design'],
  'Rentals': ['Costumes', 'Equipment', 'Venues'],
  'Other': [],
};

export const getSubcategories = (category) => SUBCATEGORIES[category] || [];
