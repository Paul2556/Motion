function Logo({ compact = false, light = false }) {
  const color = light ? "white" : "black";

  return (
    <div className="flex items-center gap-2.5" aria-label="Motion">
      <svg
        width="34"
        height="28"
        viewBox="0 0 68 56"
        fill="none"
        aria-hidden="true"
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