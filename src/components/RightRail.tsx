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
  const { profiles, session, following, follow, tipsGiven, openProfile } = useStore();
  const others = Object.values(profiles).filter((p) => p.alias !== session?.pop.alias);

  return (
    <aside className="rail rail--right">
      <div className="panel">
        <div className="panel__title">
          <h3>Verified Humans</h3>
          <span className="mono-label">{others.length}</span>
        </div>
        {others.length === 0 ? (
          <p style={{ color: "var(--ink-faint)", fontSize: 13, lineHeight: 1.5 }}>
            Just you so far. As other humans join and post, they'll show up here — tap anyone to see
            their record.
          </p>
        ) : (
          others.map((p) => {
            const on = following.has(p.alias);
            return (
              <div className="who" key={p.alias}>
                <button className="who__open" onClick={() => openProfile(p.alias)} title={`View ${p.displayName}`}>
                  <Avatar name={p.displayName} hue={p.avatarHue} size={38} />
                  <div className="who__main">
                    <div className="who__name">
                      {p.displayName} {p.human && <VerifiedStamp />}
                    </div>
                    <div className="who__handle">{p.handle}</div>
                  </div>
                </button>
                {session && (
                  <button className="who__follow" data-on={on} onClick={() => follow(p.alias)}>
                    {on ? "Following" : "Follow"}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="panel">
        <div className="panel__title">
          <h3>Tips sent</h3>
          <span className="mono-label">Coinage</span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span className="serif" style={{ fontSize: 38, fontWeight: 700 }}>
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
          <h3>Verified, not anonymous</h3>
        </div>
        <p>
          Every account clears{" "}
          <b>Proof of Personhood</b> once, in the Polkadot App — so every poster is a unique,
          verified human, not a bot farm or an anonymous sockpuppet. You still get an unlinkable
          per-Product alias the app can never trace back to you.
        </p>
        <p>
          It doesn't make people <i>honest</i> — but it does make them <i>real</i> and accountable,
          and every statement is signed, so you can always verify exactly who said what.
        </p>
      </div>
    </aside>
  );
}
