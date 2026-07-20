import { cloudinaryOptimize } from '../../utils/imageOptimize';

/**
 * Drop-in replacement for <img> that:
 *  1. Requests a Cloudinary-optimized version sized for where it's
 *     actually displayed (see utils/imageOptimize.js) instead of the
 *     full original upload.
 *  2. Lazy-loads by default (`loading="lazy"`) so off-screen images
 *     (e.g. the 8th row of a product grid) don't compete with what's
 *     actually visible for bandwidth on page load.
 *  3. Decodes off the main thread (`decoding="async"`) so a large image
 *     finishing decode doesn't janky-freeze a scroll/interaction.
 *
 * Pass `priority` for above-the-fold images (e.g. a store banner that's
 * visible immediately) to opt OUT of lazy loading — lazy-loading a hero
 * image can actually delay when it starts fetching, which hurts perceived
 * load speed for the one image that matters most on that page.
 *
 * width/height here are used both to build the Cloudinary resize
 * transform AND passed through as the actual img attributes, which lets
 * the browser reserve the right amount of space before the image loads
 * (prevents layout shift) — pass them whenever the display size is fixed
 * (e.g. an avatar or a grid thumbnail); omit for images with fluid width.
 */
const OptimizedImage = ({
  src,
  alt = '',
  width,
  height,
  quality,
  crop,
  priority = false,
  className,
  style,
  ...rest
}) => {
  const optimizedSrc = cloudinaryOptimize(src, { width, height, quality, crop });

  return (
    <img
      src={optimizedSrc}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={priority ? 'high' : 'auto'}
      width={width || undefined}
      height={height || undefined}
      className={className}
      style={style}
      {...rest}
    />
  );
};

export default OptimizedImage;
