// Which custom domains map to which route tree - shared by App.jsx (to pick
// a route tree) and NotFoundPage.jsx (to pick a 404 variant). Kept out of
// App.jsx itself so exporting these plain arrays doesn't break React Fast
// Refresh, which requires a component file to only export components.
export const APP_HOSTS = ["app.motionmun.com"];
export const DEMO_HOSTS = ["demo.motionmun.com"];
export const DEBUG_HOSTS = ["debug.motionmun.com"];
export const MARKETING_HOSTS = ["motionmun.com", "www.motionmun.com"];

// True only for hosts reachable exclusively from the developer's own machine
// or local network - localhost, loopback, and the private IPv4 ranges (see
// SEC-010 in .claude/issues.md). Anything else that isn't a recognized
// production subdomain (a Vercel preview URL, the default *.vercel.app
// domain, a public IP) is treated as untrusted and gated in App.jsx, since
// those are reachable by anyone on the internet, not just the developer.
// Anchored at both ends and requiring a complete 4-octet address on purpose:
// a prefix-only match would treat an attacker-registered domain like
// "127.0.0.1.evil.com" as local and skip the gate entirely.
const PRIVATE_IPV4_RE =
  /^(127|10|192\.168|172\.(1[6-9]|2\d|3[01]))(\.\d{1,3}){1,3}$/;

export function isLocalDevHost(hostname) {
  return hostname === "localhost" || PRIVATE_IPV4_RE.test(hostname);
}
