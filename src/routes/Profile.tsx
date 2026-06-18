import { useMemo } from "react";
import { useStore, sdk } from "@/state/store";
import { Avatar } from "@/components/Avatar";
import { VerifiedStamp } from "@/components/VerifiedStamp";
import { StatementCard } from "@/components/StatementCard";

export function Profile({ alias }: { alias?: string }) {
  const { session, feed, tipsGiven, following, follow, profileFor } = useStore();
  if (!session) return null;

  const targetAlias = alias ?? session.pop.alias;
  const isMe = targetAlias === session.pop.alias;
  const profile = isMe ? session.profile : profileFor(targetAlias);

  const displayName = profile?.displayName ?? sdk.address.shorten(targetAlias);
  const handle = profile?.handle ?? "";
  const hue = profile?.avatarHue ?? 320;
  const human = profile?.human ?? false;
  const bio = profile?.bio ?? "";
  const isFollowing = following.has(targetAlias);

  const posts = useMemo(
    () => feed.filter((s) => s.kind === "post" && s.author === targetAlias),
    [feed, targetAlias]
  );
  const now = (feed[0]?.ts ?? 0) + 1000;

  return (
    <div>
      <div
        style={{
          padding: "28px 30px 24px",
          borderBottom: "1px solid var(--rule)",
          display: "flex",
          gap: 18,
          alignItems: "flex-start",
        }}
      >
        <Avatar name={displayName} hue={hue} size={76} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1 className="serif" style={{ fontSize: 28, fontWeight: 700, lineHeight: 1 }}>
              {displayName}
            </h1>
            {human && <VerifiedStamp large />}
            {!isMe && (
              <button
                className="who__follow"
                data-on={isFollowing}
                style={{ marginLeft: "auto" }}
                onClick={() => follow(targetAlias)}
              >
                {isFollowing ? "Following" : "Follow"}
              </button>
            )}
          </div>
          {handle && (
            <div style={{ color: "var(--magenta-deep)", marginTop: 6, fontSize: 14 }}>{handle}</div>
          )}
          <div className="stmt__alias" style={{ marginTop: 2 }}>
            alias {sdk.address.shorten(targetAlias)} · unlinkable
          </div>
          {bio && (
            <p style={{ marginTop: 12, fontSize: 15.5, color: "var(--ink)", maxWidth: 460 }}>{bio}</p>
          )}
          <div style={{ display: "flex", gap: 22, marginTop: 16 }}>
            <Stat n={posts.length} label="Statements" />
            {isMe && <Stat n={following.size} label="Following" />}
            {isMe && <Stat n={`◈${tipsGiven}`} label="Tips sent" />}
          </div>
        </div>
      </div>

      <div className="center__head" style={{ position: "static", borderTop: "none" }}>
        <div className="center__sub">{isMe ? "Your record" : `${displayName}'s record`}</div>
      </div>
      {posts.length === 0 ? (
        <div className="feed-empty">
          {isMe ? "Nothing on the record yet. Go make a statement." : "No statements on the record yet."}
        </div>
      ) : (
        posts.map((s) => <StatementCard key={s.id} s={s} now={now} />)
      )}
    </div>
  );
}

function Stat({ n, label }: { n: number | string; label: string }) {
  return (
    <div>
      <div className="serif" style={{ fontSize: 22, fontWeight: 700 }}>
        {n}
      </div>
      <div className="mono-label" style={{ fontSize: 10 }}>
        {label}
      </div>
    </div>
  );
}
