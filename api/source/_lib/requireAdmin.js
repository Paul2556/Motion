// Simple shared-secret guard for the admin-only endpoints (approve/deny/
// revoke) - no auth UI, just a header checked against an env var, per spec.
export function isAdminAuthorized(req) {
  const expected = process.env.ADMIN_SECRET;
  const provided = req.headers["x-admin-secret"];
  return Boolean(expected) && provided === expected;
}
