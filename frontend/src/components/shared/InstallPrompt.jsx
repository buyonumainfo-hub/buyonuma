import { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import './InstallPrompt.css';

/**
 * PWAInstallPrompt
 *
 * Android  — listens for the native `beforeinstallprompt` event and shows a
 *             custom banner. When the user taps "Install", it triggers the
 *             browser's native install dialog.
 *
 * iOS       — Safari doesn't fire `beforeinstallprompt`. We detect iOS and
 *             show manual instructions ("tap Share → Add to Home Screen").
 *
 * Dismissed — saved to localStorage so it doesn't reappear for 7 days.
 */

const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;

const isInStandaloneMode = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true;

const DISMISSED_KEY = 'pwa_prompt_dismissed_until';

const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null); // Android
  const [showIOS, setShowIOS]               = useState(false);
  const [visible, setVisible]               = useState(false);

  useEffect(() => {
    // Don't show if already installed
    if (isInStandaloneMode()) return;

    // Don't show if dismissed recently
    const until = localStorage.getItem(DISMISSED_KEY);
    if (until && Date.now() < Number(until)) return;

    if (isIOS()) {
      // Show iOS instructions after 3 seconds
      const t = setTimeout(() => { setShowIOS(true); setVisible(true); }, 3000);
      return () => clearTimeout(t);
    }

    // Android / Chrome — wait for browser event
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setVisible(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setVisible(false);
    // Don't show again for 7 days
    localStorage.setItem(DISMISSED_KEY, String(Date.now() + 7 * 24 * 60 * 60 * 1000));
  };

  if (!visible) return null;

  return (
    <div className="pwa-banner" role="dialog" aria-label="Install app">
      <div className="pwa-banner-icon">
        <Smartphone size={28} />
      </div>

      <div className="pwa-banner-text">
        <p className="pwa-banner-title" style={{'color':'white'}}>Install Buyonuma</p>
        {showIOS ? (
          <p className="pwa-banner-sub" style={{'color':'white'}}>
            Tap <strong>Share</strong> <span className="ios-share">⎙</span> then{' '}
            <strong>"Add to Home Screen"</strong> to install.
          </p>
        ) : (
          <p className="pwa-banner-sub">
            Install the app for faster access — works offline too.
          </p>
        )}
      </div>

      <div className="pwa-banner-actions">
        {!showIOS && (
          <button className="btn btn-gold btn-sm pwa-install-btn" onClick={handleInstall}>
            <Download size={14} /> Install
          </button>
        )}
        <button className="pwa-dismiss" onClick={handleDismiss} aria-label="Dismiss">
          <X size={18} />
        </button>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;
