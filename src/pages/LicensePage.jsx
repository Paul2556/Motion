import { Link } from "react-router-dom";
import Logo from "../components/Logo";
import licenseText from "../../LICENSE?raw";
import { formatLicenseText, splitBold } from "../utils/formatLicenseText";

function InlineText({ text }) {
  return splitBold(text).map((segment) =>
    segment.bold ? (
      <strong key={segment.key} className="font-semibold text-white">
        {segment.text}
      </strong>
    ) : (
      <span key={segment.key}>{segment.text}</span>
    )
  );
}

function LicenseBlock({ block }) {
  if (block.type === "rule") return <hr className="my-8 border-white/10" />;

  if (block.type === "title") {
    return (
      <h1 className="text-2xl font-medium tracking-[-0.02em] text-white sm:text-3xl">
        <InlineText text={block.text} />
      </h1>
    );
  }

  if (block.type === "heading") {
    return (
      <h2 className="mt-2 text-lg font-medium tracking-[-0.01em] text-white">
        <InlineText text={block.text} />
      </h2>
    );
  }

  return (
    <p className="whitespace-pre-line text-sm leading-relaxed text-white/70">
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
    <div className="app-shell min-h-screen bg-[#0d0d0d] text-white">
      <div className="mx-auto max-w-3xl px-6 py-12 sm:px-8 sm:py-16">
        <header className="mb-10 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-3">
            <Logo compact light />
          </Link>
          <a
            href="/license.txt"
            className="text-[11px] uppercase tracking-[0.18em] text-white/40 transition hover:text-white/70"
          >
            View raw file
          </a>
        </header>

        <p className="text-[11px] uppercase tracking-[0.26em] text-white/40">License</p>

        {/* Non-binding plain-language summary - deliberately smaller/muted
            than the license text below, and explicit that it isn't what
            governs, so it can never be mistaken for the actual terms. */}
        <div className="mt-4 border-l-2 border-[var(--accent)] bg-white/[0.03] py-3 pl-4 pr-4 text-sm leading-relaxed text-white/60">
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-white/40">
            In short
          </p>
          <p>
            you can use, modify, and deploy Motion — even commercially — as long as your
            product visibly displays "Powered by Motion" with a link back here. You may not
            share Motion's source code with others; source access is granted individually (see{" "}
            <Link to="/source" className="underline underline-offset-2 hover:text-white">
              /source
            </Link>
            ). This summary is informational only; the license text below governs.
          </p>
        </div>

        <Link
          to="/source"
          className="mt-6 inline-flex items-center gap-1.5 text-sm text-white/60 underline underline-offset-2 transition hover:text-white"
        >
          Want the source code? Request access →
        </Link>

        <div className="mt-10 space-y-4 border border-white/10 bg-[#121212] p-6 sm:p-8">
          {blocks.map((block) => (
            <LicenseBlock key={block.key} block={block} />
          ))}
        </div>

        <p className="mt-6 max-w-xl text-xs leading-relaxed text-white/40">
          If anything above ever conflicts with{" "}
          <a href="/license.txt" className="underline underline-offset-2 hover:text-white/70">
            the raw file
          </a>
          , the raw file governs.
        </p>
      </div>
    </div>
  );
}
