// Shared category -> suggested subcategories map. Mirrored in
// frontend/src/utils/categories.js — keep both in sync when editing.
// Subcategory is stored as free text on Product (see models/Product.js),
// so this list is a helpful suggestion in the seller's product form and
// in the "sort by subcategory" filter dropdown, not a hard enum — a
// product's actual subcategory always wins over this list.
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
