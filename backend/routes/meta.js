import express from 'express';
import { NIGERIA_STATES, NIGERIA_CITIES_BY_STATE } from '../utils/nigeriaLocations.js';

const router = express.Router();

/**
 * GET /api/meta/locations
 * Public, static reference data for the state/city dropdowns on the
 * seller registration form and the location filter UI. Cacheable
 * indefinitely client-side since this data never changes at runtime.
 */
router.get('/locations', (req, res) => {
  res.set('Cache-Control', 'public, max-age=86400'); // 1 day — safe since this is static data
  res.json({
    success: true,
    states: NIGERIA_STATES,
    citiesByState: NIGERIA_CITIES_BY_STATE,
  });
});

export default router;
