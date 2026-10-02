function Logo({ compact = false, light = false, size }) {
  // `light` follows the app theme's text color (white everywhere except the
  // White app theme), so the mark stays visible without an invert filter.
  const color = light ? "var(--app-text, white)" : "black";

  return (
    <div className="flex items-center gap-2.5" aria-label="Motion">
      <svg
        viewBox="0 0 68 56"
        fill="none"
        aria-hidden="true"
        className={`${size ?? "w-[34px]"} aspect-[68/56]`}
      >
        <circle cx="22" cy="25" r="20" fill={color} />

        <rect x="41" y="6" width="22" height="6" rx="3" fill={color} />
        <rect x="46" y="16.5" width="20" height="6" rx="3" fill={color} />
        <rect x="46" y="27.5" width="20" height="6" rx="3" fill={color} />
        <rect x="41" y="38" width="22" height="6" rx="3" fill={color} />
      </svg>

      {!compact && (
        <span className="text-[15px] font-semibold tracking-[-0.02em]">
          Motion
        </span>
      )}
    </div>
  );
}

export default Logo;