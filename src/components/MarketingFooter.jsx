import Logo from "./Logo";

// `children` is the page's own links row, rendered above the license line.
export default function MarketingFooter({ children }) {
  return (
    <footer className="bg-[#101010] py-10 text-white">
      <div className="page-container flex flex-col justify-between gap-8 sm:flex-row sm:items-end">
        <div><Logo light /><p className="mt-4 text-sm text-white/40">From motion to resolution.</p></div>
        <div className="flex flex-col gap-3 text-sm text-white/50 sm:items-end">
          {children}
          <a
            href="https://github.com/Paul2556/Motion"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 leading-none text-xs text-white/30 transition-colors hover:text-white/50"
          >
            Fully open source on GitHub. Licensed under the Motion Attribution License.
          </a>
        </div>
      </div>
    </footer>
  );
}
