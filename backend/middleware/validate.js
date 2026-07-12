import { validationResult } from 'express-validator';

/**
 * Runs after an array of express-validator checks. If any failed,
 * responds 400 with the first, clearest error message instead of
 * letting bad input reach a route handler / the database.
 */
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const first = errors.array()[0];
    return res.status(400).json({
      success: false,
      message: first.msg,
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};
