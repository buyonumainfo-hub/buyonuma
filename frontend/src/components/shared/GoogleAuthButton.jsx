import { useEffect, useRef } from 'react';

/**
 * Thin wrapper around Google's own Identity Services button (loaded from
 * accounts.google.com — no @react-oauth/google dependency needed). Renders
 * nothing and calls onError if VITE_GOOGLE_CLIENT_ID isn't set, so pages
 * degrade gracefully instead of crashing when Google sign-in isn't
 * configured yet.
 *
 * onCredential receives the raw Google ID token string — hand it straight
 * to POST /api/{buyer,seller}-auth/google, which verifies it server-side.
 * We never read/trust anything about the user on the frontend.
 */
export default function GoogleAuthButton({ onCredential, text = 'continue_with' }) {
  const divRef = useRef(null);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId) return;

    const renderButton = () => {
      if (!window.google?.accounts?.id || !divRef.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => onCredential?.(response.credential),
      });
      window.google.accounts.id.renderButton(divRef.current, {
        theme: 'outline', size: 'large', width: 320, text, shape: 'pill',
      });
    };

    if (window.google?.accounts?.id) {
      renderButton();
    } else {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.onload = renderButton;
      document.head.appendChild(script);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  if (!clientId) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          fontSize: '0.8rem',
          color: 'var(--muted, #888)',
          textAlign: 'center',
          padding: '0.6rem 1rem',
          border: '1px dashed var(--border, #ddd)',
          borderRadius: '999px',
          width: 320,
          maxWidth: '100%',
          margin: '0 auto',
          boxSizing: 'border-box',
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ flexShrink: 0 }}
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <span>Google sign-in — coming soon</span>
      </div>
    );
  }

  return <div ref={divRef} style={{ display: 'flex', justifyContent: 'center' }} />;
}