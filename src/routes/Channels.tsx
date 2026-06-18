import { useStore } from "@/state/store";
import type { View } from "@/App";

const CHANNELS = [
  { tag: "home", label: "the-record", desc: "The main feed. Everything notable, on the public record.", n: 1284 },
  { tag: "polkadot", label: "polkadot", desc: "Relay chains, JAM, parachains, and protocol talk.", n: 642 },
  { tag: "builders", label: "builders", desc: "Shipping on the Product SDK. Show your work.", n: 318 },
  { tag: "governance", label: "governance", desc: "OpenGov proposals, referenda, and treasury.", n: 205 },
  { tag: "personhood", label: "proof-of-personhood", desc: "Humans only. The whole point.", n: 511 },
];

export function Channels({ goHome }: { goHome: (v: View) => void }) {
  const { setChannel, feed } = useStore();

  const open = (tag: string) => {
    setChannel(tag === "home" ? null : tag);
    goHome("home");
  };

  return (
    <div style={{ padding: "8px 0" }}>
      {CHANNELS.map((c) => {
        const count = feed.filter(
          (s) => s.kind === "post" && (s.channel ?? "home") === c.tag
        ).length;
        return (
          <div key={c.tag} className="stmt stmt--link" style={{ display: "block" }} onClick={() => open(c.tag)}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span
                className="serif"
                style={{ fontSize: 22, fontWeight: 600, color: "var(--magenta-deep)" }}
              >
                #{c.label}
              </span>
              <span style={{ marginLeft: "auto" }} className="mono-label">
                {c.n.toLocaleString()} humans
              </span>
            </div>
            <p className="serif" style={{ fontSize: 15.5, color: "var(--ink-soft)", marginTop: 6 }}>
              {c.desc}
            </p>
            <span className="mono-label" style={{ marginTop: 8, display: "inline-block", color: "var(--ink-faint)" }}>
              {count} statement{count === 1 ? "" : "s"} on the record
            </span>
          </div>
        );
      })}
    </div>
  );
}
