const MODE_KEY = "app-motion-input-mode";

export function getMotionInputMode() {
  const stored = localStorage.getItem(MODE_KEY);
  return stored === "dropdown" ? "dropdown" : "natural";
}

export function setMotionInputMode(mode) {
  localStorage.setItem(MODE_KEY, mode);
}
