const cloud_name = `${import.meta.env.VITE_cloud_name}`;
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`;
const CLOUDINARY_PRESET =  `${import.meta.env.VITE_CLOUDINARY_PRESET}`;

/**
 * Upload a file directly to Cloudinary from the browser.
 * Returns the secure URL string on success, throws on failure.
 */
export const uploadToCloudinary = async (file) => {
  if (!file) throw new Error('No file selected');
// getting a seller toke verified
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', CLOUDINARY_PRESET);
  fd.append('cloud_name', cloud_name );

  const res  = await fetch(CLOUDINARY_URL, { method: 'POST', body: fd });
  const data = await res.json();

  if (data.secure_url || data.url) {
    return data.secure_url || data.url;
  }
  throw new Error(data.error?.message || 'Upload failed');
};