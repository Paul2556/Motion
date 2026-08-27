// The real owner identity, trusted both client-side and by
// api/admin/_lib/requireOwner.js. Never merge contributor access in here, or
// granting someone /debug silently grants them api/admin/* too.
export const OWNER_EMAILS = ["paultae2506@proton.me", "paulploynicha2506@gmail.com", "paulta2506@gmail.com"];

export function isOwner(user) {
  return OWNER_EMAILS.includes(user?.email);
}
