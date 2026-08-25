import { Link } from "react-router-dom";
import Logo from "../components/Logo";
import licenseText from "../../LICENSE?raw";
import { formatLicenseText, splitBold } from "../utils/formatLicenseText";

function InlineText({ text }) {
  return splitBold(text).map((segment) =>
    segment.bold ? (
      <strong key={segment.key} className="font-semibold text-[var(--app-text)]">
        {segment.text}
      </strong>
    ) : (
      <span key={segment.key}>{segment.text}</span>
    )
  );
}

function LicenseBlock({ block }) {
  if (block.type === "rule") return <hr className="my-8 border-[var(--app-border)]" />;

  if (block.type === "title") {
    return (
      <h1 className="text-2xl font-medium tracking-[-0.02em] text-[var(--app-text)] sm:text-3xl">
        <InlineText text={block.text} />
      </h1>
    );
  }

  if (block.type === "heading") {
    return (
      <h2 className="mt-2 text-lg font-medium tracking-[-0.01em] text-[var(--app-text)]">
        <InlineText text={block.text} />
      </h2>
    );
  }

  return (
    <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--app-text-secondary)]">
      <InlineText text={block.text} />
    </p>
  );
}

// Renders the exact text of the repo-root LICENSE file (imported raw, not
// retyped) inside the site's own look, formatted via formatLicenseText.js's
// small hand-rolled block splitter rather than a raw <pre> dump or a full
// markdown library - the license text's own Markdown subset (##, ---, **bold**)
// is simple and author-controlled, so a parser library isn't warranted. The
// raw file is also served as-is at /license.txt for tooling/machine
// consumption and as the ultimate source of truth if this rendering ever drifts.
export default function LicensePage() {
  const blocks = formatLicenseText(licenseText);

  return (
    <div className="app-shell min-h-screen bg-[var(--app-bg)] text-[var(--app-text)]">
      <div className="mx-auto max-w-3xl px-6 py-12 sm:px-8 sm:py-16">
        <header className="mb-10 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-3">
            <Logo compact light />
          </Link>
          <a
            href="/license.txt"
            className="text-[11px] uppercase tracking-[0.18em] text-[var(--app-text-muted)] transition hover:text-[var(--app-text-secondary)]"
          >
            View raw file
          </a>
        </header>

        <p className="text-[11px] uppercase tracking-[0.26em] text-[var(--app-text-muted)]">License</p>

        {/* Non-binding plain-language summary - deliberately smaller/muted
            than the license text below, and explicit that it isn't what
            governs, so it can never be mistaken for the actual terms. */}
        <div className="mt-4 border-l-2 border-[var(--accent)] bg-[var(--app-chip)] py-3 pl-4 pr-4 text-sm leading-relaxed text-[var(--app-text-secondary)]">
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--app-text-muted)]">
            In short
          </p>
          <p>
            you can use, modify, and deploy Motion, even commercially, as long as your
            product visibly displays "Powered by Motion" with a link back here. You may not
            share Motion's source code with others; source access is granted individually (see{" "}
            <Link to="/source" className="underline underline-offset-2 hover:text-[var(--app-text)]">
              /source
            </Link>
            ). This summary is informational only; the license text below governs.
          </p>
        </div>

        <Link
          to="/source"
          className="mt-6 inline-flex items-center gap-1.5 text-sm text-[var(--app-text-secondary)] underline underline-offset-2 transition hover:text-[var(--app-text)]"
        >
          Want the source code? Request access →
        </Link>

        <div className="mt-10 space-y-4 border border-[var(--app-border)] bg-[var(--app-panel)] p-6 sm:p-8">
          {blocks.map((block) => (
            <LicenseBlock key={block.key} block={block} />
          ))}
        </div>

        <p className="mt-6 max-w-xl text-xs leading-relaxed text-[var(--app-text-muted)]">
          If anything above ever conflicts with{" "}
          <a href="/license.txt" className="underline underline-offset-2 hover:text-[var(--app-text-secondary)]">
            the raw file
          </a>
          , the raw file governs.
        </p>
      </div>
    </div>
  );
}
