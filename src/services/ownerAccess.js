// Shared allowlist for the client-side "owner only" gates (DebugPage, ReferPage, OwnerGate).
// Convenience-only, not a real security boundary - there's no backend to enforce it.
const OWNER_EMAILS = ["paultae2506@proton.me", "paulploynicha2506@gmail.com", "paulta2506@gmail.com"];
const CONTRIBUTOR_EMAILS = [];
export const AUTHORIZED_EMAILS = [...OWNER_EMAILS, ...CONTRIBUTOR_EMAILS];

export function isAuthorizedUser(user) {
  return AUTHORIZED_EMAILS.includes(user?.email);
}
