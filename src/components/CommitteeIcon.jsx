import { getCommitteeIconMarkup } from "../utils/committeeIcon";

// Renders `fallback` when `title` doesn't match a known committee (see constants.js's
// `committee` + src/utils/committeeIcon.js) - dangerouslySetInnerHTML is safe here since the
// markup only ever comes from this repo's own bundled SVG files, never user input.
export default function CommitteeIcon({ title, size = 24, className = "", fallback = null }) {
  const markup = getCommitteeIconMarkup(title);
  if (!markup) return fallback;

  return (
    <div
      style={{ width: size, height: size }}
      className={`[&>svg]:h-full [&>svg]:w-full ${className}`}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
