// Which custom domains map to which route tree - shared by App.jsx (to pick
// a route tree) and NotFoundPage.jsx (to pick a 404 variant). Kept out of
// App.jsx itself so exporting these plain arrays doesn't break React Fast
// Refresh, which requires a component file to only export components.
export const APP_HOSTS = ["app.motionmun.com"];
export const DEMO_HOSTS = ["demo.motionmun.com"];
export const DEBUG_HOSTS = ["debug.motionmun.com"];
export const MARKETING_HOSTS = ["motionmun.com", "www.motionmun.com"];

// True only for hosts reachable from the developer's own machine or local
// network; everything else (preview URLs, *.vercel.app, public IPs) is
// gated in App.jsx. Anchored at both ends on purpose - a prefix-only match
// would treat "127.0.0.1.evil.com" as local and skip that gate.
const PRIVATE_IPV4_RE =
  /^(127|10|192\.168|172\.(1[6-9]|2\d|3[01]))(\.\d{1,3}){1,3}$/;

export function isLocalDevHost(hostname) {
  return hostname === "localhost" || PRIVATE_IPV4_RE.test(hostname);
}
