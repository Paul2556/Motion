import { getAdminAuth } from "./firebaseAdmin.js";
import { OWNER_EMAILS } from "../../../src/services/ownerAccess.js";

// Verifies the ID token server-side, proving identity cryptographically
// rather than trusting a static secret sitting in client JS, since there IS
// a real signed-in account to check here.
export async function verifyOwner(req) {
  const header = req.headers.authorization ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return null;

  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    // Firebase signs the token regardless of whether the email claim was ever
    // verified, so an unverified self-signup can otherwise impersonate any
    // allowlisted address - require Google sign-in with a verified email.
    if (decoded.firebase?.sign_in_provider !== "google.com") return null;
    if (!decoded.email_verified) return null;
    if (!OWNER_EMAILS.includes(decoded.email)) return null;
    return decoded;
  } catch {
    return null;
  }
}
