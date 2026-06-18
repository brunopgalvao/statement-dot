import { useMemo } from "react";
import { useStore, sdk } from "@/state/store";
import { Avatar } from "@/components/Avatar";
import { VerifiedStamp } from "@/components/VerifiedStamp";
import { StatementCard } from "@/components/StatementCard";

export function Profile() {
  const { session, feed, tipsGiven, following } = useStore();
  if (!session) return null;
  const me = session.profile;

  const mine = useMemo(
    () => feed.filter((s) => s.kind === "post" && s.author === me.alias),
    [feed, me.alias]
  );
  const now = (feed[0]?.ts ?? 0) + 1000;

  return (
    <div>
      <div
        style={{
          padding: "28px 30px 24px",
          borderBottom: "8px double var(--rule)",
          display: "flex",
          gap: 18,
          alignItems: "flex-start",
        }}
      >
        <Avatar name={me.displayName} hue={me.avatarHue} size={76} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1 className="serif" style={{ fontSize: 30, fontWeight: 600, lineHeight: 1 }}>
              {me.displayName}
            </h1>
            <VerifiedStamp large />
          </div>
          <div style={{ color: "var(--magenta-deep)", marginTop: 6, fontSize: 14 }}>
            {me.handle}
          </div>
          <div className="stmt__alias" style={{ marginTop: 2 }}>
            alias {sdk.address.shorten(me.alias)} · unlinkable
          </div>
          {me.bio && (
            <p
              className="serif"
              style={{ marginTop: 12, fontSize: 16, color: "#2a241d", maxWidth: 440 }}
            >
              {me.bio}
            </p>
          )}
          <div style={{ display: "flex", gap: 22, marginTop: 16 }}>
            <Stat n={mine.length} label="Statements" />
            <Stat n={following.size} label="Following" />
            <Stat n={`◈${tipsGiven}`} label="Tips sent" />
          </div>
        </div>
      </div>

      <div className="center__head" style={{ position: "static", borderTop: "none" }}>
        <div className="center__sub">Your record</div>
      </div>
      {mine.length === 0 ? (
        <div
          style={{
            padding: "48px 30px",
            textAlign: "center",
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            color: "var(--ink-faint)",
            fontSize: 17,
          }}
        >
          Nothing on the record yet. Go make a statement.
        </div>
      ) : (
        mine.map((s) => <StatementCard key={s.id} s={s} now={now} />)
      )}
    </div>
  );
}

function Stat({ n, label }: { n: number | string; label: string }) {
  return (
    <div>
      <div className="serif" style={{ fontSize: 22, fontWeight: 600 }}>
        {n}
      </div>
      <div className="mono-label" style={{ fontSize: 10 }}>
        {label}
      </div>
    </div>
  );
}
