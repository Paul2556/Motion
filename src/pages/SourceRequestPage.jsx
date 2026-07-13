import { useState } from "react";
import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import Logo from "../components/Logo";

// Mirrors LandingPage's waitlist form (the only existing form in this
// codebase): plain useState per field, native required/type validation, no
// validation library, manual isSubmitting/submitted state, no `disabled` on
// the submit button - re-entrancy is guarded inside the handler instead.
export default function SourceRequestPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [purpose, setPurpose] = useState("");
  const [consent, setConsent] = useState(false);
  // Honeypot - a real field named innocuously (not "honeypot"), hidden
  // off-screen rather than display:none, so real users never see or fill it
  // but naive bots that autofill every input do. Server rejects-as-success
  // silently if this is non-empty, so bots get no signal they were caught.
  const [company, setCompany] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitted || isSubmitting) return;

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/source/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, purpose, company }),
      });

      if (!response.ok) throw new Error("request-failed");

      setSubmitted(true);
    } catch {
      setError("Something went wrong submitting your request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputClass =
    "w-full rounded-none border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-white/30";

  return (
    <div className="app-shell min-h-screen bg-[#0d0d0d] text-white">
      <div className="mx-auto max-w-2xl px-6 py-12 sm:px-8 sm:py-16">
        <header className="mb-10 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-3">
            <Logo compact light />
          </Link>
        </header>

        <p className="text-[11px] uppercase tracking-[0.26em] text-white/40">Source access</p>
        <h1 className="mt-3 text-2xl font-medium tracking-[-0.02em] sm:text-3xl">
          Requesting source access
        </h1>

        {/* Verbatim copy - do not alter, the wording is legally deliberate. */}
        <p className="mt-4 text-sm leading-relaxed text-white/60">
          Motion's source is available on request. Tell me your name and what you'd like to use
          it for, and I'll add you. In practice, nearly all reasonable requests are granted —
          usually quickly.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-white/60">
          Access is granted case-by-case at the sole discretion of the copyright holder. Nothing
          on this page constitutes an offer, a promise, or an obligation to grant access to any
          person, and access may be declined or revoked for any reason or no reason.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5 border border-white/10 bg-[#121212] p-6 sm:p-8">
          {/* Honeypot - visually hidden via clipping (not display:none, not
              an off-screen negative offset - that can widen the page's
              scrollable area), unreachable by keyboard/screen-reader
              navigation. */}
          <div
            className="absolute h-px w-px overflow-hidden whitespace-nowrap border-0 p-0"
            style={{ clip: "rect(0, 0, 0, 0)" }}
            aria-hidden="true"
          >
            <label htmlFor="company">Company</label>
            <input
              id="company"
              name="company"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={company}
              onChange={(event) => setCompany(event.target.value)}
            />
          </div>

          <div>
            <label htmlFor="name" className="mb-2 block text-[11px] uppercase tracking-[0.16em] text-white/40">
              Name
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="email" className="mb-2 block text-[11px] uppercase tracking-[0.16em] text-white/40">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="purpose" className="mb-2 block text-[11px] uppercase tracking-[0.16em] text-white/40">
              Intended use
            </label>
            <textarea
              id="purpose"
              required
              maxLength={500}
              rows={4}
              value={purpose}
              onChange={(event) => setPurpose(event.target.value)}
              className={`${inputClass} resize-none`}
            />
          </div>

          <label className="flex items-start gap-3 text-sm text-white/60">
            <span className="relative mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center border border-white/20 bg-white/5">
              <input
                type="checkbox"
                required
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
                className="peer absolute inset-0 h-full w-full cursor-pointer appearance-none"
              />
              <Check size={14} strokeWidth={3} className="pointer-events-none hidden text-white peer-checked:block" />
            </span>
            <span>
              I have read the{" "}
              <Link to="/licensing" className="underline underline-offset-2 hover:text-white">
                Motion Attribution License
              </Link>{" "}
              and understand that source code may not be redistributed.
            </span>
          </label>

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-none border border-white/10 bg-white px-6 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-white/90 sm:w-auto"
          >
            {submitted ? "Request received ✓" : isSubmitting ? "Sending..." : "Send request"}
          </button>

          {submitted && (
            <p className="text-sm text-white/60">Request received — you'll hear back by email.</p>
          )}
          {error && <p className="text-sm text-red-400">{error}</p>}
        </form>
      </div>
    </div>
  );
}
