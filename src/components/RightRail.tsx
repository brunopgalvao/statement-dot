import { useStore } from "@/state/store";
import { Avatar } from "./Avatar";
import { VerifiedStamp } from "./VerifiedStamp";

// The 16 product-sdk packages this Product exercises. "hot" = wired into a
// user-visible flow right now; the rest back the plumbing.
const PACKAGES: { name: string; hot?: boolean }[] = [
  { name: "statement-store", hot: true },
  { name: "signer", hot: true },
  { name: "cloud-storage", hot: true },
  { name: "tx", hot: true },
  { name: "contracts", hot: true },
  { name: "chain-client", hot: true },
  { name: "keys", hot: true },
  { name: "host", hot: true },
  { name: "local-storage", hot: true },
  { name: "address", hot: true },
  { name: "crypto" },
  { name: "descriptors" },
  { name: "logger" },
  { name: "utils" },
  { name: "terminal" },
  { name: "sdk" },
];

export function RightRail() {
  const { profiles, session, following, follow, tipsGiven } = useStore();
  const others = Object.values(profiles).filter((p) => p.alias !== session?.pop.alias);

  return (
    <aside className="rail rail--right">
      <div className="panel">
        <div className="panel__title">
          <h3>The Register</h3>
          <span className="mono-label">Verified</span>
        </div>
        {others.map((p) => {
          const on = following.has(p.alias);
          return (
            <div className="who" key={p.alias}>
              <Avatar name={p.displayName} hue={p.avatarHue} size={38} />
              <div className="who__main">
                <div className="who__name">
                  {p.displayName} {p.human && <VerifiedStamp />}
                </div>
                <div className="who__handle">{p.handle}</div>
              </div>
              {session && (
                <button
                  className="who__follow"
                  data-on={on}
                  onClick={() => follow(p.alias)}
                >
                  {on ? "Following" : "Follow"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="panel">
        <div className="panel__title">
          <h3>Tips sent</h3>
          <span className="mono-label">Coinage</span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span className="serif" style={{ fontSize: 38, fontWeight: 600 }}>
            ◈{tipsGiven}
          </span>
          <span style={{ color: "var(--ink-faint)", fontSize: 12 }}>
            DOT, privately, no middleman
          </span>
        </div>
      </div>

      <div className="panel">
        <div className="panel__title">
          <h3>Built on Product&nbsp;SDK</h3>
          <span className="mono-label">16 pkgs</span>
        </div>
        <div className="pkgs">
          {PACKAGES.map((p) => (
            <span key={p.name} className="pkg" data-hot={p.hot}>
              {p.name}
            </span>
          ))}
        </div>
      </div>

      <div className="panel explain">
        <div className="panel__title">
          <h3>Why it's bot-free</h3>
        </div>
        <p>
          Every account clears <b>Proof of Personhood</b> once, in the Polkadot App. You get an
          unlinkable per-Product alias — a Ring-VRF identity the app can never trace back to you.
        </p>
        <p>
          So the network can prove you're a unique human and still know nothing about who you are.
          That's the trick X and the rest can't pull off.
        </p>
      </div>
    </aside>
  );
}
