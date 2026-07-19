import crypto from "node:crypto";

// Simple shared-secret guard for the admin-only endpoints (approve/deny/
// revoke) - no auth UI, just a header checked against an env var, per spec.
// Hashing both sides to a fixed-length digest before timingSafeEqual avoids
// its length-mismatch throw (provided can be any length) while keeping the
// comparison itself constant-time, so guessing ADMIN_SECRET can't be sped up
// by timing how far a naive === comparison got before it diverged.
export function isAdminAuthorized(req) { 
  const expected = process.env.ADMIN_SECRET;
  const provided = req.headers["x-admin-secret"];
  if (!expected || typeof provided !== "string") return false;

  const expectedHash = crypto.createHash("sha256").update(expected).digest();
  const providedHash = crypto.createHash("sha256").update(provided).digest();
  return crypto.timingSafeEqual(expectedHash, providedHash);
}
