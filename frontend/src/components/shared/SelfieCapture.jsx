import { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, RotateCcw, Check, Loader2, Upload, AlertCircle } from 'lucide-react';
import { uploadToCloudinary } from '../../utils/cloudinary';
import './SelfieCapture.css';

/**
 * Camera-based selfie capture for NIN face verification.
 *
 * Opens the device's front camera, lets the seller take a live photo
 * (rather than pick an existing image from their gallery — a live
 * capture is a basic anti-spoofing measure, since a stored photo can't
 * be "opened" through getUserMedia the same way an upload could bypass
 * intent), then uploads it to Cloudinary and returns the resulting URL
 * to the parent via onCapture(url).
 *
 * Falls back to a native file input with `capture="user"` (which still
 * opens the camera app on most mobile browsers) if getUserMedia isn't
 * available or permission is denied — desktop browsers without a webcam,
 * or a user who declines the permission prompt, still have a path forward.
 *
 * Props: onCapture(url), disabled
 */
const SelfieCapture = ({ onCapture, disabled }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  const [mode, setMode] = useState('idle'); // idle | camera | preview | uploading
  const [previewUrl, setPreviewUrl] = useState(null); // local object URL for preview before upload
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [uploadedUrl, setUploadedUrl] = useState(null);
  const [error, setError] = useState('');
  const [cameraUnavailable, setCameraUnavailable] = useState(false);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => () => stopStream(), [stopStream]);

  const startCamera = async () => {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraUnavailable(true);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false,
      });
      streamRef.current = stream;
      setMode('camera');
      // videoRef isn't attached to the DOM until after this render, so
      // wire the stream up on the next tick.
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      });
    } catch (err) {
      setCameraUnavailable(true);
      setError('Could not access your camera. You can upload a photo instead below.');
    }
  };

  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const size = Math.min(video.videoWidth, video.videoHeight);
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    // Center-crop to a square so the uploaded selfie is consistently framed.
    const sx = (video.videoWidth - size) / 2;
    const sy = (video.videoHeight - size) / 2;
    ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);

    canvas.toBlob((blob) => {
      if (!blob) return;
      setCapturedBlob(blob);
      setPreviewUrl(URL.createObjectURL(blob));
      setMode('preview');
      stopStream();
    }, 'image/jpeg', 0.92);
  };

  const retake = () => {
    setPreviewUrl(null);
    setCapturedBlob(null);
    setUploadedUrl(null);
    startCamera();
  };

  const handleFileInput = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCapturedBlob(file);
    setPreviewUrl(URL.createObjectURL(file));
    setMode('preview');
  };

  const confirmAndUpload = async () => {
    if (!capturedBlob) return;
    setMode('uploading');
    setError('');
    try {
      const url = await uploadToCloudinary(capturedBlob);
      setUploadedUrl(url);
      onCapture(url);
    } catch (err) {
      setError(err.message || 'Upload failed. Please try again.');
      setMode('preview');
    }
  };

  if (uploadedUrl) {
    return (
      <div className="selfie-capture selfie-capture-done">
        <img src={uploadedUrl} alt="Your selfie" className="selfie-preview-img" />
        <div className="selfie-capture-done-info">
          <Check size={16} className="selfie-check" />
          <span>Selfie ready</span>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            disabled={disabled}
            onClick={() => { setUploadedUrl(null); retake(); }}
          >
            <RotateCcw size={13} /> Retake
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="selfie-capture">
      {error && (
        <div className="selfie-capture-error">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {mode === 'idle' && !cameraUnavailable && (
        <button type="button" className="btn btn-outline selfie-start-btn" onClick={startCamera} disabled={disabled}>
          <Camera size={16} /> Open Camera to Take Selfie
        </button>
      )}

      {mode === 'camera' && (
        <div className="selfie-camera-wrap">
          <video ref={videoRef} className="selfie-video" muted playsInline />
          <button type="button" className="selfie-shutter-btn" onClick={capture} aria-label="Capture photo">
            <Camera size={20} />
          </button>
        </div>
      )}

      {mode === 'preview' && previewUrl && (
        <div className="selfie-preview-wrap">
          <img src={previewUrl} alt="Preview" className="selfie-preview-img" />
          <div className="selfie-preview-actions">
            <button type="button" className="btn btn-outline btn-sm" onClick={retake} disabled={disabled}>
              <RotateCcw size={13} /> Retake
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={confirmAndUpload} disabled={disabled}>
              <Check size={13} /> Use This Photo
            </button>
          </div>
        </div>
      )}

      {mode === 'uploading' && (
        <div className="selfie-uploading">
          <Loader2 size={18} className="spin" /> Uploading selfie…
        </div>
      )}

      {/* Fallback path — camera denied/unavailable, or as an alternate option */}
      {(cameraUnavailable || mode === 'idle') && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="user"
            style={{ display: 'none' }}
            onChange={handleFileInput}
          />
          <button
            type="button"
            className="btn btn-outline btn-sm selfie-fallback-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
          >
            <Upload size={13} /> {cameraUnavailable ? 'Upload a Selfie Photo' : 'Or upload a photo instead'}
          </button>
        </>
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};

export default SelfieCapture;
