// Flat, rounded-rectangle flags (sourced from Flagpack, MIT-licensed) copied
// into src/assets/flags at build time - keyed by each file's own basename,
// which matches delegate.countryCode/country.code directly (usually an
// ISO 3166-1 alpha-3 like "FRA", but a few constituent-nation entries like
// Scotland use their ISO 3166-2 subdivision code "GB-SCT" instead).
const FLAG_URLS = import.meta.glob("../assets/flags/*.svg", { eager: true, query: "?url", import: "default" });

const URL_BY_CODE = new Map(
  Object.entries(FLAG_URLS).map(([path, url]) => [path.match(/([^/]+)\.svg$/)[1], url])
);

// Renders nothing for an unresolved or historical/defunct country code
// (no Flagpack asset exists), rather than a broken image.
export default function Flag({ countryCode, className = "" }) {
  const url = countryCode ? URL_BY_CODE.get(countryCode) : null;
  if (!url) return null;

  return <img src={url} alt="" className={`inline-block h-[0.75em] w-[1em] rounded-[2px] object-cover ${className}`} />;
}
