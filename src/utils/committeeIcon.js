import { committee } from "../constants";

// Raw markup (not a URL) - these icons use stroke="currentColor" internally, which only
// resolves against the page's inherited text color when the <svg> is actually in the DOM.
// Loading them via <img src="..."> would render them in an isolated context where
// currentColor falls back to black, invisible against this app's dark backgrounds.
const ICON_MARKUP = import.meta.glob("../assets/committee/*.svg", { eager: true, query: "?raw", import: "default" });

const MARKUP_BY_ID = new Map(
  Object.entries(ICON_MARKUP).map(([path, svg]) => [path.match(/([^/]+)\.svg$/)[1], svg])
);

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Matches a freeform committee/conference title against `committee`'s aliases (see
// constants.js) - case-insensitive, whole word/phrase, first match wins. Returns the raw SVG
// markup for that committee's icon, or null if nothing matched (or no title was given).
export function getCommitteeIconMarkup(title) {
  if (!title) return null;

  const normalized = title.toLowerCase();

  const match = committee.find((entry) =>
    entry.aliases.some((alias) => new RegExp(`\\b${escapeRegExp(alias.toLowerCase())}\\b`).test(normalized))
  );

  return match ? MARKUP_BY_ID.get(match.icon) ?? null : null;
}
