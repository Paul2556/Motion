import { useState } from "react";
import { Link } from "react-router-dom";
import Logo from "../components/Logo";

// Same form shape as SourceRequestPage.jsx (the other form in this codebase besides the landing
// waitlist): plain useState per field, native required/type validation, manual
// isSubmitting/submitted state, honeypot for bots.
export default function FeedbackPage() {
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
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
      const response = await fetch("/api/feedback/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, email, company }),
      });

      if (!response.ok) throw new Error("request-failed");

      setSubmitted(true);
    } catch {
      setError("Something went wrong submitting your feedback. Please try again.");
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
          <Link to="/home" className="inline-flex items-center gap-3">
            <Logo compact light />
          </Link>
        </header>

        <p className="text-[11px] uppercase tracking-[0.26em] text-white/40">Feedback</p>
        <h1 className="mt-3 text-2xl font-medium tracking-[-0.02em] sm:text-3xl">
          Send feedback
        </h1>

        <p className="mt-4 text-sm leading-relaxed text-white/60">
          Bugs, rough edges, feature requests. Whatever you've got. We'll try our best to react to them as fast and effectively as we can.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5 border border-white/10 bg-[#121212] p-6 sm:p-8">
          {/* Honeypot - see SourceRequestPage.jsx for the same pattern. */}
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
            <label htmlFor="message" className="mb-2 block text-[11px] uppercase tracking-[0.16em] text-white/40">
              Feedback
            </label>
            <textarea
              id="message"
              required
              maxLength={2000}
              rows={6}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              className={`${inputClass} resize-none`}
            />
          </div>

          <div>
            <label htmlFor="email" className="mb-2 block text-[11px] uppercase tracking-[0.16em] text-white/40">
              Email (optional, if you'd like a reply)
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={inputClass}
            />
          </div>

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-none border border-white/10 bg-white px-6 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-white/90 sm:w-auto"
          >
            {submitted ? "Feedback sent ✓" : isSubmitting ? "Sending..." : "Send feedback"}
          </button>

          {submitted && (
            <p className="text-sm text-white/60">Thanks — feedback received.</p>
          )}
          {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
        </form>
      </div>
    </div>
  );
}
