// Inline, stroke-based icons tuned for the editorial/ledger look.
// 1.6 stroke weight, round caps — reads like a fine-liner pen on paper.

type P = { className?: string };
const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const CheckSeal = ({ className }: P) => (
  <svg {...base} className={className} strokeWidth={2}>
    <path d="M12 2.5l2.3 1.7 2.8-.3 1 2.7 2.5 1.3-.6 2.8 1.5 2.4-2 2-.4 2.8-2.8.6-1.8 2.2-2.7-1-2.7 1-1.8-2.2-2.8-.6-.4-2.8-2-2 1.5-2.4-.6-2.8 2.5-1.3 1-2.7 2.8.3z" />
    <path d="M8.6 12.2l2.2 2.2 4.6-4.8" />
  </svg>
);

export const Reply = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M9 14l-4-4 4-4" />
    <path d="M5 10h8a6 6 0 016 6v2" />
  </svg>
);

export const Echo = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M4 9l3-3 3 3" />
    <path d="M7 6v8a3 3 0 003 3h7" />
    <path d="M20 15l-3 3-3-3" />
    <path d="M17 18v-8a3 3 0 00-3-3H7" />
  </svg>
);

export const Heart = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M12 20s-7-4.4-7-9.5A3.8 3.8 0 0112 8a3.8 3.8 0 017 2.5C19 15.6 12 20 12 20z" />
  </svg>
);

export const HeartFilled = ({ className }: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 20s-7-4.4-7-9.5A3.8 3.8 0 0112 8a3.8 3.8 0 017 2.5C19 15.6 12 20 12 20z" />
  </svg>
);

export const Coin = ({ className }: P) => (
  <svg {...base} className={className}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5v9M9.5 9.8c0-1.3 1.1-2 2.5-2s2.5.6 2.5 1.9c0 2.6-5 1.4-5 4 0 1.3 1.1 2 2.5 2s2.5-.6 2.5-1.9" />
  </svg>
);

export const Pin = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M9 4h6M10 4l-.5 6L7 13h10l-2.5-3-.5-6M12 13v7" />
  </svg>
);

export const Home = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M4 11l8-6 8 6M6 10v9h12v-9" />
  </svg>
);

export const Hash = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M9 4L7 20M17 4l-2 16M5 9h15M4 15h15" />
  </svg>
);

export const Mail = ({ className }: P) => (
  <svg {...base} className={className}>
    <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
    <path d="M4 7l8 5 8-5" />
  </svg>
);

export const User = ({ className }: P) => (
  <svg {...base} className={className}>
    <circle cx="12" cy="8.5" r="3.5" />
    <path d="M5 19c1-3.5 4-5 7-5s6 1.5 7 5" />
  </svg>
);
