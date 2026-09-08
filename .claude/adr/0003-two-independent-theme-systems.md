# Two independent theming systems, not one unified theme

`LandingPage` is natively light; every other page (the actual working tool) is natively dark.

**Decision:** keep two separate, independent light/dark mechanisms rather than unifying into one
theme system:

- `LandingPage` manages its own state locally (`localStorage` keys `motion-theme`/`motion-reduced`,
  applied via `.theme-shell`/`.theme-dark` + `data-theme`, scoped to that page).
- Every other page uses `src/appTheme.js` (`getAppTheme`/`setAppTheme`/…, called once in
  `main.jsx`), backed by its own `localStorage` keys `app-theme`/`app-reduced-motion`, applied via
  `data-app-theme`/`data-app-reduced-motion` on `<html>`, opted into per-page via the `app-shell`
  class.

Both apply the same underlying trick, `filter: invert(1)`, as a cheap full-page light/dark flip —
which means a hand-picked hue (accent color, timer ring) visually flips to its complement too
unless it's given a pre-computed inverse via a CSS custom property, rather than a JS conditional.

**Why:** the two halves of the app have opposite native colors, so a single shared theme toggle
would need one of them inverted from its natural design at all times. Splitting the mechanism
keeps each half's default state matching its actual design intent (marketing page bright and
inviting, working tool dark for a room-lit-by-a-projector context) without a conditional
"which page am I on" branch threaded through one shared theme module. A future engineer
consolidating these into one system, "to reduce duplication," would need to first decide which
native color loses — that's a product call, not a refactor, which is why this is recorded here
rather than left implicit in two similarly-named files.
