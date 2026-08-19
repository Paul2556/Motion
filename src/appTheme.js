// Theme/reduced-motion state for the app shell (Home/Session/Debug/Motion/
// Settings pages) - deliberately separate from LandingPage's own `motion-theme`/
// `motion-reduced` localStorage keys and .theme-shell mechanism, since that
// system is scoped to LandingPage (which is natively light and inverts to
// dark) while the app shell is natively dark and inverts to light - sharing
// one flag between opposite-native-color systems would double-invert one of
// them. Applied via a `data-app-theme`/`data-app-reduced-motion` attribute on
// <html> plus a CSS rule scoped to `.app-shell` (see themes.css), so any page
// can opt in by adding that one class to its root element.
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
