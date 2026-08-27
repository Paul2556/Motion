import Flag from "./Flag";

// Plain controlled list, no service coupling. Flag + country is fixed; the
// right side is caller-supplied via `renderRight`, since an attendance toggle
// and a name/school detail aren't the same shape of "delegate".
export default function DelegateRoster({
  delegates,
  selectedIndex = -1,
  onSelectIndex,
  rowRefs,
  renderRight,
  emptyMessage = "No delegates in this committee.",
  className = "",
}) {
  return (
    <div className={`max-h-[60vh] overflow-y-auto divide-y divide-[var(--app-border-faint)] ${className}`}>
      {delegates.map((delegate, index) => (
        <div
          key={delegate.id}
          ref={rowRefs ? (el) => (rowRefs.current[index] = el) : undefined}
          onClick={onSelectIndex ? () => onSelectIndex(index) : undefined}
          className={`flex items-center justify-between gap-3 px-5 py-4 transition ${
            index === selectedIndex ? "bg-[var(--app-chip)]" : ""
          } ${onSelectIndex ? "cursor-pointer" : ""}`}
        >
          <span className="flex shrink-0 items-center gap-2.5 font-medium text-[var(--app-text)]">
            <Flag countryCode={delegate.countryCode} className="text-lg" />
            {delegate.countryDisplay || delegate.country}
          </span>
          {renderRight?.(delegate, index)}
        </div>
      ))}

      {delegates.length === 0 && (
        <p className="px-5 py-8 text-center text-sm text-[var(--app-text-muted)]">{emptyMessage}</p>
      )}
    </div>
  );
}
