// Which custom domains map to which route tree - shared by App.jsx (to pick
// a route tree) and NotFoundPage.jsx (to pick a 404 variant). Kept out of
// App.jsx itself so exporting these plain arrays doesn't break React Fast
// Refresh, which requires a component file to only export components.
export const APP_HOSTS = ["app.motionmun.com"];
export const DEMO_HOSTS = ["demo.motionmun.com"];
export const DEBUG_HOSTS = ["debug.motionmun.com"];
export const MARKETING_HOSTS = ["motionmun.com", "www.motionmun.com"];
