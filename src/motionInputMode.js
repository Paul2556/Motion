import { local } from "./utils/storage";

const MODE_KEY = "app-motion-input-mode";

export function getMotionInputMode() {
  return local.get(MODE_KEY) === "dropdown" ? "dropdown" : "natural";
}

export function setMotionInputMode(mode) {
  local.set(MODE_KEY, mode);
}
