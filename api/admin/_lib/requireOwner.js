import { getAdminAuth } from "./firebaseAdmin.js";
import { OWNER_EMAILS } from "../../../src/services/ownerAccess.js";

// The admin panel's caller is always a real signed-in Firebase user (unlike
// api/source's approve/deny/revoke, which are called by an unauthenticated
// Discord-bot webhook and so use a shared-secret header instead - see
// _lib/requireAdmin.js there). Verifying the ID token server-side proves
// identity cryptographically rather than trusting a static secret sitting in
// client JS, which is the right fit here since there IS a real account to
// check.
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
