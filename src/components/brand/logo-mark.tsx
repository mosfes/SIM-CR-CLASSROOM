export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="16" fill="url(#logomark-gradient)" />

      {/* Graduation cap — classroom */}
      <path d="M12 23 L32 13 L52 23 L32 33 Z" fill="white" opacity="0.97" />
      <path
        d="M20 25 L20 33 Q32 41 44 33 L44 25"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.97"
      />
      <path d="M32 24 Q40 29 40 37" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
      <circle cx="40" cy="39" r="2.2" fill="white" opacity="0.9" />

      {/* Heartbeat pulse — medical */}
      <path
        d="M7 49 H17 L21.5 41 L27 55 L31 47 H57"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <defs>
        <linearGradient id="logomark-gradient" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#DC2626" />
          <stop offset="1" stopColor="#F97316" />
        </linearGradient>
      </defs>
    </svg>
  );
}
