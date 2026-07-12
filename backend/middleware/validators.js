import { body, param, query } from 'express-validator';
import mongoose from 'mongoose';
import { NIGERIA_STATES } from '../utils/nigeriaLocations.js';

const isObjectId = (value) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new Error('Invalid ID format');
  }
  return true;
};

export const mongoIdParam = (name = 'id') =>
  param(name).custom(isObjectId);

export const paginationQuery = [
  query('page').optional().isInt({ min: 1, max: 100000 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
];

export const locationQuery = [
  query('state').optional().trim().isLength({ max: 40 }),
  query('city').optional().trim().isLength({ max: 80 }),
];

// ── Admin auth ───────────────────────────────────────────────────────────
export const adminLoginValidators = [
  body('username').trim().notEmpty().isLength({ max: 100 }).withMessage('Username is required'),
  body('password').notEmpty().isLength({ max: 200 }).withMessage('Password is required'),
];

export const adminChangePasswordValidators = [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6, max: 200 }).withMessage('New password must be at least 6 characters'),
];

// ── Seller auth ──────────────────────────────────────────────────────────
export const sellerRegisterValidators = [
  body('username')
    .trim().isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters')
    .matches(/^[a-z0-9_]+$/).withMessage('Username can only contain lowercase letters, numbers and underscores'),
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 6, max: 200 }).withMessage('Password must be at least 6 characters'),
  body('store_name').trim().isLength({ min: 2, max: 100 }).withMessage('Store name must be 2-100 characters'),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('description').optional().isLength({ max: 1000 }),
  body('contact').optional().isLength({ max: 30 }),
  body('whatsapp').optional().isLength({ max: 20 }),
  body('website').optional({ checkFalsy: true }).isURL().withMessage('Website must be a valid URL'),
  body('social_media_handle').optional().isLength({ max: 100 }),
  body('nin').optional().isLength({ min: 11, max: 11 }).withMessage('NIN must be exactly 11 digits').isNumeric(),
  body('state').trim().notEmpty().withMessage('State is required')
    .isIn(NIGERIA_STATES).withMessage('Please select a valid Nigerian state'),
  body('city').trim().notEmpty().withMessage('City/town is required')
    .isLength({ min: 2, max: 80 }).withMessage('City/town must be 2-80 characters'),
];

export const sellerLoginValidators = [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

export const forgotPasswordValidators = [
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
];

export const resetPasswordValidators = [
  body('email').trim().isEmail().normalizeEmail(),
  body('code').trim().isLength({ min: 5, max: 5 }).isNumeric().withMessage('Invalid code'),
  body('newPassword').isLength({ min: 6, max: 200 }).withMessage('Password must be at least 6 characters'),
];

export const sellerProfileValidators = [
  body('store_name').optional().trim().isLength({ min: 2, max: 100 }),
  body('description').optional().isLength({ max: 1000 }),
  body('contact').optional().isLength({ max: 30 }),
  body('whatsapp').optional().isLength({ max: 20 }),
  body('website').optional({ checkFalsy: true }).isURL(),
  body('social_media_handle').optional().isLength({ max: 100 }),
  body('nin').optional().isLength({ min: 11, max: 11 }).isNumeric(),
  body('state').optional().trim().isIn(NIGERIA_STATES).withMessage('Please select a valid Nigerian state'),
  body('city').optional().trim().isLength({ min: 2, max: 80 }),
];

// ── Products ──────────────────────────────────────────────────────────────
export const productCreateValidators = [
  body('name').trim().isLength({ min: 2, max: 150 }).withMessage('Product name must be 2-150 characters'),
  body('description').optional().isLength({ max: 2000 }),
  body('price').isFloat({ min: 0, max: 100000000 }).withMessage('Price must be a positive number'),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('images').optional().isArray({ max: 5 }).withMessage('A product can have at most 5 images'),
  body('time_frame').optional().isLength({ max: 100 }),
  body('seller').optional().custom(isObjectId),
];

export const productUpdateValidators = [
  body('name').optional().trim().isLength({ min: 2, max: 150 }),
  body('description').optional().isLength({ max: 2000 }),
  body('price').optional().isFloat({ min: 0, max: 100000000 }),
  body('images').optional().isArray({ max: 5 }),
  body('time_frame').optional().isLength({ max: 100 }),
];

// ── Sellers (admin) ───────────────────────────────────────────────────────
export const sellerApproveValidators = [
  body('isApproved').isBoolean().withMessage('isApproved must be true or false'),
];

// ── NIN verification ─────────────────────────────────────────────────────
export const ninSubmitValidators = [
  body('nin').trim().isLength({ min: 11, max: 11 }).withMessage('NIN must be exactly 11 digits').isNumeric(),
];

export const ninReviewValidators = [
  body('status').isIn(['verified', 'rejected']).withMessage('Status must be verified or rejected'),
  body('rejectionReason').optional().isLength({ max: 500 }),
];

// ── AI chat ───────────────────────────────────────────────────────────────
export const aiChatValidators = [
  body('message').trim().isLength({ min: 1, max: 2000 }).withMessage('Message must be 1-2000 characters'),
  body('sessionId').optional().isLength({ max: 100 }),
  body('productId').optional().custom(isObjectId),
];

// ── Views tracking ────────────────────────────────────────────────────────
export const viewTrackValidators = [
  body('sellerId').custom(isObjectId),
  body('type').isIn(['store_view', 'whatsapp_click', 'product_page_view', 'add_to_cart']).withMessage('Invalid view type'),
  body('productId').optional().custom(isObjectId),
];

// ── Notifications / broadcast ────────────────────────────────────────────
export const broadcastEmailValidators = [
  body('subject').trim().isLength({ min: 1, max: 200 }).withMessage('Subject is required'),
  body('message').trim().isLength({ min: 1, max: 10000 }).withMessage('Message is required'),
];

export const notificationPushValidators = [
  body('title').trim().isLength({ min: 1, max: 150 }).withMessage('Title is required'),
  body('message').trim().isLength({ min: 1, max: 1000 }).withMessage('Message is required'),
  body('sellerId').optional().custom(isObjectId),
];

// ── Contact / support ────────────────────────────────────────────────────
export const contactFormValidators = [
  body('name').trim().isLength({ min: 2, max: 100 }),
  body('email').trim().isEmail().normalizeEmail(),
  body('message').trim().isLength({ min: 5, max: 3000 }),
];
