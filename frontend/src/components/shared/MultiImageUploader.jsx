import { Upload, X, GripVertical } from 'lucide-react';
import { uploadToCloudinary } from '../../utils/cloudinary';
import toast from 'react-hot-toast';
import './MultiImageUploader.css';

const MAX_IMAGES = 5;

/**
 * MultiImageUploader
 * Props:
 *  - images: string[]            current image URLs
 *  - onChange: (images) => void  called whenever the array changes
 *  - uploading / setUploading     optional external loading state
 */
export default function MultiImageUploader({ images = [], onChange, uploading, setUploading }) {
  const remaining = MAX_IMAGES - images.length;

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const toUpload = files.slice(0, remaining);
    if (files.length > remaining) {
      toast.error(`Only ${remaining} more image${remaining === 1 ? '' : 's'} can be added (max ${MAX_IMAGES}).`);
    }
    if (toUpload.length === 0) return;

    setUploading?.(true);
    try {
      const uploaded = await Promise.all(toUpload.map(f => uploadToCloudinary(f)));
      onChange([...images, ...uploaded]);
      toast.success(`${uploaded.length} image${uploaded.length > 1 ? 's' : ''} uploaded!`);
    } catch (err) {
      toast.error('Upload failed: ' + err.message);
    } finally {
      setUploading?.(false);
      e.target.value = '';
    }
  };

  const removeAt = (idx) => {
    onChange(images.filter((_, i) => i !== idx));
  };

  const setAsPrimary = (idx) => {
    if (idx === 0) return;
    const next = [...images];
    const [picked] = next.splice(idx, 1);
    next.unshift(picked);
    onChange(next);
  };

  return (
    <div className="miu-wrap">
      <div className="miu-grid">
        {images.map((img, i) => (
          <div key={img + i} className={`miu-thumb ${i === 0 ? 'primary' : ''}`}>
            <img src={img} alt={`Image ${i + 1}`} />
            {i === 0 && <span className="miu-primary-badge">Cover</span>}
            <div className="miu-thumb-actions">
              {i !== 0 && (
                <button type="button" className="miu-action-btn" title="Set as cover" onClick={() => setAsPrimary(i)}>
                  <GripVertical size={13} />
                </button>
              )}
              <button type="button" className="miu-action-btn miu-remove" title="Remove" onClick={() => removeAt(i)}>
                <X size={13} />
              </button>
            </div>
          </div>
        ))}

        {images.length < MAX_IMAGES && (
          <label className={`miu-thumb miu-upload-slot ${uploading ? 'uploading' : ''}`}>
            {uploading ? <span className="miu-loading">Uploading…</span> : (
              <>
                <Upload size={18} />
                <span>Add Photo</span>
              </>
            )}
            <input type="file" accept="image/*" multiple hidden onChange={handleFiles} disabled={uploading} />
          </label>
        )}
      </div>
      <p className="miu-hint">{images.length}/{MAX_IMAGES} images • First image is the cover photo. Click the drag icon to set a new cover.</p>
    </div>
  );
}