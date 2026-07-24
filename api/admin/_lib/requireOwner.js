import { getAdminAuth } from "./firebaseAdmin.js";
import { AUTHORIZED_EMAILS } from "../../../src/services/ownerAccess.js";

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
    if (!AUTHORIZED_EMAILS.includes(decoded.email)) return null;
    return decoded;
  } catch {
    return null;
  }
}
