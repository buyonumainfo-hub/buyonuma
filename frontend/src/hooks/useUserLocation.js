import { useState, useEffect, useCallback } from 'react';
import { NIGERIA_STATES } from '../utils/nigeriaLocations';

const STORAGE_KEY = 'buyonuma_user_location';

/**
 * Normalizes whatever a reverse-geocoder returns for "state" into one of
 * our canonical NIGERIA_STATES values (handles "Federal Capital Territory"
 * vs "FCT (Abuja)", trailing "State", etc.).
 */
const matchToKnownState = (rawState) => {
  if (!rawState) return null;
  const cleaned = rawState.replace(/\s*state\s*$/i, '').trim().toLowerCase();

  if (/federal capital|abuja|fct/i.test(rawState)) return 'FCT (Abuja)';

  const found = NIGERIA_STATES.find(
    (s) => s.toLowerCase() === cleaned || s.toLowerCase().startsWith(cleaned)
  );
  return found || null;
};

/**
 * Detects the user's approximate location (state + city) using the
 * browser Geolocation API + free reverse geocoding, matched against our
 * Nigeria states list. Result is cached in localStorage so we don't
 * re-prompt / re-geocode on every visit, and so the rest of the app
 * (sort=nearest, "shop near you" sections) can read it synchronously.
 *
 * Never blocks the page — if geolocation is denied, unsupported, or the
 * geocoding call fails, `location` just stays null and callers should
 * fall back to their default (non-location) behavior.
 */
export const useUserLocation = () => {
  const [location, setLocation] = useState(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [status, setStatus] = useState(location ? 'done' : 'idle'); // idle | locating | done | denied | error
  const [error, setError] = useState('');

  const detect = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus('error');
      setError('Location is not supported on this device/browser.');
      return;
    }

    setStatus('locating');
    setError('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`,
            { headers: { Accept: 'application/json' } }
          );
          if (!res.ok) throw new Error('Reverse geocoding failed');
          const data = await res.json();
          const addr = data.address || {};

          const rawState = addr.state || '';
          const state = matchToKnownState(rawState);
          const city = addr.city || addr.town || addr.county || addr.suburb || addr.village || '';

          if (!state) {
            setStatus('error');
            setError("Couldn't match your location to a Nigerian state. Please select manually.");
            return;
          }

          const detected = { state, city, detectedAt: Date.now() };
          setLocation(detected);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(detected));
          setStatus('done');
        } catch (err) {
          setStatus('error');
          setError('Could not determine your location. Please select manually.');
        }
      },
      (geoErr) => {
        setStatus(geoErr.code === geoErr.PERMISSION_DENIED ? 'denied' : 'error');
        setError(
          geoErr.code === geoErr.PERMISSION_DENIED
            ? 'Location access was denied. You can still select your state/city manually.'
            : 'Could not get your location. Please select manually.'
        );
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 }
    );
  }, []);

  const setManualLocation = useCallback((state, city = '') => {
    const manual = { state, city, detectedAt: Date.now(), manual: true };
    setLocation(manual);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(manual));
    setStatus('done');
  }, []);

  const clearLocation = useCallback(() => {
    setLocation(null);
    localStorage.removeItem(STORAGE_KEY);
    setStatus('idle');
  }, []);

  return { location, status, error, detect, setManualLocation, clearLocation };
};
