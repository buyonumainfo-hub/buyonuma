import { OAuth2Client } from 'google-auth-library';

// Google Sign-In verification, server-side.
//
// SECURITY: we NEVER trust a profile object the frontend sends us
// ("this is my name/email, log me in") — that would let anyone log in
// as anyone. Instead the frontend sends the raw Google ID token it got
// from Google's own sign-in widget, and we verify that token's
// signature directly with Google here. Only fields Google itself
// vouches for (email, name, picture, the Google account's stable sub id)
// are ever used.
let client = null;
const getClient = () => {
  if (client) return client;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error('GOOGLE_CLIENT_ID is not set in the environment. Google sign-in is disabled until this is configured.');
  }
  client = new OAuth2Client(clientId);
  return client;
};

/**
 * Verifies a Google ID token (credential) sent from the frontend's
 * Google Sign-In button. Returns the verified profile or throws.
 */
export const verifyGoogleToken = async (idToken) => {
  const oAuthClient = getClient();
  const ticket = await oAuthClient.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload || !payload.email_verified) {
    throw new Error('Google account email is not verified.');
  }
  return {
    googleId: payload.sub,
    email: payload.email,
    name: payload.name || payload.email.split('@')[0],
    picture: payload.picture || '',
  };
};

export const isGoogleAuthConfigured = () => Boolean(process.env.GOOGLE_CLIENT_ID);
