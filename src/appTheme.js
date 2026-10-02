// Kept separate from LandingPage's own theme keys because that page is
// natively light and this shell is natively dark, so one shared flag would
// mean opposite things to each. A page opts in via the `.app-shell` class.
const THEME_KEY = "app-theme";
const REDUCED_MOTION_KEY = "app-reduced-motion";

// White is the default; Black and Brown are opt-in from Settings.
export function getAppTheme() {
  const stored = localStorage.getItem(THEME_KEY);
  return stored === "dark" || stored === "brown" ? stored : "light";
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
