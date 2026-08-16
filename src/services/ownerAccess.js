// The real owner identity - trusted both client-side (fast-path in
// permissions.js) and server-side (api/admin/_lib/requireOwner.js). Never
// merge contributor access into this list: contributor page access is
// managed per-permission via src/services/permissions.js +
// contributorPermissions/{uid}, specifically so adding someone to see
// /debug can never silently also grant them real api/admin/* access (see
// SEC-008 in .claude/issues.md for the incident this replaced).
export const OWNER_EMAILS = ["paultae2506@proton.me", "paulploynicha2506@gmail.com", "paulta2506@gmail.com"];

export function isOwner(user) {
  return OWNER_EMAILS.includes(user?.email);
}
