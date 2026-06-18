/** Relative time, computed against a supplied `now` so it works with the
 *  mock's deterministic clock (which is not wall-clock). */
export function relTime(ts: number, now: number): string {
  const s = Math.max(1, Math.floor((now - ts) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  const w = Math.floor(d / 7);
  return `${w}w`;
}

export function initials(name: string): string {
  const cleaned = name.replace(/\.dot$/, "").replace(/[^\p{L}\p{N} ]/gu, "");
  const parts = cleaned.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return cleaned.slice(0, 2).toUpperCase() || "··";
}
