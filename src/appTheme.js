// Kept separate from LandingPage's own theme keys because that page is
// natively light and this shell is natively dark, so one shared flag would
// double-invert one of them. A page opts in via the `.app-shell` class.
const THEME_KEY = "app-theme";
const REDUCED_MOTION_KEY = "app-reduced-motion";

export function getAppTheme() {
  const stored = localStorage.getItem(THEME_KEY);
  return stored === "light" || stored === "brown" ? stored : "dark";
}

export function setAppTheme(theme) {
  localStorage.setItem(THEME_KEY, theme);
  document.documentElement.setAttribute("data-app-theme", theme);
}

export function getAppReducedMotion() {
  return localStorage.getItem(REDUCED_MOTION_KEY) === "true";
}

export function setAppReducedMotion(value) {
  localStorage.setItem(REDUCED_MOTION_KEY, String(value));
  document.documentElement.setAttribute("data-app-reduced-motion", String(value));
}

// Call once on boot so the attributes are correct before/as the first page
// renders, regardless of which route a visitor lands on first.
export function initAppTheme() {
  document.documentElement.setAttribute("data-app-theme", getAppTheme());
  document.documentElement.setAttribute("data-app-reduced-motion", String(getAppReducedMotion()));
}
