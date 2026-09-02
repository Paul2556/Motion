import { useEffect, useRef, useState } from "react";

// Interpolates a live countdown from `anchor` ({time, value}, e.g. Timer.jsx's
// own wall-clock anchor or a delegate view's server-timestamp equivalent) via
// requestAnimationFrame while `running` - the same formula Timer.jsx's ring
// uses, factored out so a passive display doesn't reimplement it. While
// paused, returns `anchor.value` directly (a plain prop-derived read, not
// state) rather than syncing it into state on every anchor change.
export function useAnchoredCountdown(anchor, running) {
  const [liveValue, setLiveValue] = useState(null);
  const anchorRef = useRef(anchor);

  useEffect(() => {
    anchorRef.current = anchor;
  }, [anchor]);

  useEffect(() => {
    if (!running) return;

    let frame;

    const tick = () => {
      const elapsed = (Date.now() - anchorRef.current.time) / 1000;
      setLiveValue(anchorRef.current.value - elapsed);
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [running]);

  return running ? liveValue : (anchor?.value ?? null);
}
