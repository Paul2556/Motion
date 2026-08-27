import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Copy } from "lucide-react";
import DebugTopBar from "../components/DebugTopBar";
import { usePagePermission } from "../services/permissions";

// Gated on the "refer" permission, the same client-side convenience gate the
// rest of the debug area uses. Nothing sensitive here to protect.

const BASE_URL = "https://motionmun.com";

// Generates links tagged for the waitlist form's attribution capture (see
// LandingPage.jsx's handleWaitlistSubmit) - utm_source/utm_medium/utm_campaign
// land in the Sheet's matching columns, so this is just a friendlier way to
// build those query strings than typing them by hand every time.
export default function ReferPage() {
  const navigate = useNavigate();
  const { allowed: isAuthorized, ready: authReady } = usePagePermission("refer");

  useEffect(() => {
    if (!authReady || isAuthorized) return;

    if (window.location.hostname === "debug.motionmun.com") {
      window.location.replace("https://app.motionmun.com/");
    } else {
      navigate("/home");
    }
  }, [authReady, isAuthorized, navigate]);

  const [source, setSource] = useState("");
  const [medium, setMedium] = useState("");
  const [campaign, setCampaign] = useState("");
  const [target, setTarget] = useState("#waitlist");
  const [copied, setCopied] = useState(false);

  // Built with the URL constructor rather than string-concatenating query +
  // target - a path (e.g. "/source") has to come *before* the query string
  // while a hash (e.g. "#waitlist") has to come *after* it, so naive
  // concatenation breaks one of the two depending on which is entered.
  const trimmedTarget = target.trim() || "/";
  const isHashOnly = trimmedTarget.startsWith("#");
  const url = new URL(isHashOnly ? "/" : trimmedTarget, BASE_URL);
  if (isHashOnly) url.hash = trimmedTarget.slice(1);
  if (source.trim()) url.searchParams.set("utm_source", source.trim());
  if (medium.trim()) url.searchParams.set("utm_medium", medium.trim());
  if (campaign.trim()) url.searchParams.set("utm_campaign", campaign.trim());
  const generatedUrl = url.toString();

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(generatedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API unavailable (insecure context, permissions) - the
      // link's still right there in the field to select and copy by hand
    }
  }

  if (!authReady || !isAuthorized) return null;

  const FIELDS = [
    { label: "Source", value: source, onChange: setSource, placeholder: "reddit" },
    { label: "Medium", value: medium, onChange: setMedium, placeholder: "social" },
    { label: "Campaign", value: campaign, onChange: setCampaign, placeholder: "launch" },
    { label: "Path / anchor", value: target, onChange: setTarget, placeholder: "#waitlist" },
  ];

  return (
    <div className="app-shell min-h-screen bg-[var(--app-bg)] p-8 text-[var(--app-text)]">
      <div className="mx-auto max-w-2xl">
        <DebugTopBar />

        <h1 className="text-4xl font-semibold">Referral Links</h1>
        <p className="mt-2 text-[var(--app-text-muted)]">
          Tags a link for the waitlist form's attribution capture. Leave a field blank to omit it.
        </p>

        <div className="mt-8 border border-[var(--app-border)] bg-[var(--app-panel)] p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {FIELDS.map((field) => (
              <label key={field.label} className="block">
                <span className="text-[11px] uppercase tracking-[0.16em] text-[var(--app-text-muted)]">{field.label}</span>
                <input
                  value={field.value}
                  onChange={(event) => field.onChange(event.target.value)}
                  placeholder={field.placeholder}
                  className="mt-1.5 w-full border border-[var(--app-border)] bg-[var(--app-chip)] px-3 py-2 text-sm text-[var(--app-text)] outline-none transition focus:border-[var(--app-border-focus)]"
                />
              </label>
            ))}
          </div>

          <div className="mt-6 flex items-center gap-2 border border-[var(--app-border)] bg-[var(--app-chip)] px-3 py-2.5">
            <code className="flex-1 truncate text-xs text-[var(--app-text-secondary)]">{generatedUrl}</code>
            <button
              onClick={copyLink}
              className="flex shrink-0 items-center gap-1.5 border border-[var(--app-border)] bg-[var(--app-chip)] px-2.5 py-1.5 text-[11px] uppercase tracking-[0.14em] text-[var(--app-text-secondary)] transition hover:bg-[var(--app-chip-active)]"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
