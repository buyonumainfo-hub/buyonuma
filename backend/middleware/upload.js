// Images are now uploaded directly from the browser to Cloudinary.
// This file is kept as a placeholder — multer is no longer needed.
// The backend receives Cloudinary URLs as plain JSON strings.
export const upload = { single: () => (req, res, next) => next(), fields: () => (req, res, next) => next() };
