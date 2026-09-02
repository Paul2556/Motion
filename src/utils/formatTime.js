// Shared by Timer.jsx (the interactive countdown) and the delegate view's
// read-only display, so mm:ss formatting (including the "-01:30" overtime
// form) exists exactly once. Split into its own file, not exported from
// Timer.jsx, so that component file keeps exporting only the component
// (react-refresh/only-export-components).
export function formatTime(seconds) {
  const abs = Math.abs(seconds);

  const minutes = Math.floor(abs / 60);
  const secs = abs % 60;

  const formatted = `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  return seconds < 0 ? `-${formatted}` : formatted;
}
