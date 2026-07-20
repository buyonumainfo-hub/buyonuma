/**
 * Rewrites a Cloudinary image URL to request an optimized version instead
 * of the raw, full-resolution upload — this is the single biggest lever
 * for faster image loading in this app, since every product/seller image
 * is uploaded straight to Cloudinary at whatever resolution the buyer's
 * camera/gallery produced (often 3000px+ wide) and was previously served
 * as-is even when displayed in a 180px-tall card.
 *
 * Cloudinary URLs have a predictable shape:
 *   https://res.cloudinary.com/<cloud>/image/upload/<transforms>/v123/<public_id>
 * Transformation params are inserted right after `/upload/`. We add:
 *   f_auto   - serve WebP/AVIF to browsers that support it, falls back
 *              automatically otherwise (usually 30-50% smaller than JPEG)
 *   q_auto   - Cloudinary picks the lowest quality that's visually
 *              indistinguishable, instead of serving the original quality
 *   w_/h_    - resize server-side to roughly the size it's actually
 *              displayed at, instead of shipping a 3000px image for a
 *              200px card
 *   c_fill   - crop-to-fill when both width and height are given, so the
 *              resized image still matches the CSS object-fit: cover look
 *   dpr_auto - automatically serves a sharper version on retina/high-DPI
 *              screens without us having to compute it manually
 *
 * Safe no-op for anything that isn't a Cloudinary URL (empty string,
 * missing image, or a URL from somewhere else) — just returns it
 * untouched rather than risk breaking a non-Cloudinary image.
 */
export const cloudinaryOptimize = (url, { width, height, quality = 'auto', crop = 'fill' } = {}) => {
  if (!url || typeof url !== 'string' || !url.includes('/upload/')) return url;

  const transforms = ['f_auto', `q_${quality}`, 'dpr_auto'];
  if (width) transforms.push(`w_${Math.round(width)}`);
  if (height) transforms.push(`h_${Math.round(height)}`);
  if ((width || height) && crop) transforms.push(`c_${crop}`);

  return url.replace('/upload/', `/upload/${transforms.join(',')}/`);
};
