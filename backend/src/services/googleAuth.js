import { OAuth2Client } from "google-auth-library";
import config from "../config/index.js";

export const oauthClient = new OAuth2Client({
  clientId: config.google.clientId,
  clientSecret: config.google.clientSecret,
  redirectUri: config.google.redirectUri,
});

/**
 * Build the Google consent URL.
 * @param {string} state - opaque short string, e.g. "login" or "checkout"
 */
export function buildGoogleAuthUrl(state = "login") {
  return oauthClient.generateAuthUrl({
    access_type: "online",
    prompt: "select_account",
    scope: ["openid", "email", "profile"],
    state,
  });
}

/**
 * Exchange the code from Google for the user's profile.
 * Throws on any failure.
 */
export async function exchangeCodeForProfile(code) {
  const { tokens } = await oauthClient.getToken(code);
  if (!tokens.id_token) {
    throw new Error("Google did not return an id_token");
  }

  const ticket = await oauthClient.verifyIdToken({
    idToken: tokens.id_token,
    audience: config.google.clientId,
  });

  const payload = ticket.getPayload();
  if (!payload || !payload.email) {
    throw new Error("Google did not return an email");
  }

  return {
    email: String(payload.email).toLowerCase(),
    name: payload.name || String(payload.email).split("@")[0],
    picture: payload.picture || "",
    emailVerified: !!payload.email_verified,
  };
}
