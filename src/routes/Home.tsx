import { useMemo, useRef } from "react";
import { useStore } from "@/state/store";
import { Composer } from "@/components/Composer";
import { StatementCard } from "@/components/StatementCard";

export function Home() {
  const { feed, session, following, scope, setScope, activeChannel, setChannel } = useStore();

  const posts = useMemo(() => {
    let p = feed.filter((s) => s.kind === "post");
    if (activeChannel) p = p.filter((s) => (s.channel ?? "home") === activeChannel);
    if (scope === "following" && session) {
      p = p.filter((s) => s.author === session.pop.alias || following.has(s.author));
    }
    return p;
  }, [feed, activeChannel, scope, following, session]);

  const now = useMemo(() => (feed[0]?.ts ?? 0) + 1000, [feed]);

  // Mark statements that arrive after first paint as "fresh gossip".
  const seen = useRef<Set<string>>(new Set());
  const firstRun = useRef(true);
  if (firstRun.current) {
    feed.forEach((p) => seen.current.add(p.id));
    firstRun.current = false;
  }

  return (
    <>
      <div className="feedbar">
        <div className="feedbar__scopes">
          <button
            className={`feedbar__scope${scope === "everyone" ? " is-on" : ""}`}
            onClick={() => setScope("everyone")}
          >
            Everyone
          </button>
          <button
            className={`feedbar__scope${scope === "following" ? " is-on" : ""}`}
            onClick={() => setScope("following")}
          >
            Following
          </button>
        </div>
        {activeChannel && (
          <button className="feedbar__chip" onClick={() => setChannel(null)} title="Clear filter">
            #{activeChannel} ✕
          </button>
        )}
      </div>

      <Composer />

      <div>
        {posts.map((s) => {
          const fresh = !seen.current.has(s.id);
          seen.current.add(s.id);
          return <StatementCard key={s.id} s={s} now={now} fresh={fresh} />;
        })}
        {posts.length === 0 && (
          <div className="feed-empty">
            {scope === "following"
              ? "You're not following anyone who's posted yet. Follow some humans."
              : activeChannel
                ? `Nothing in #${activeChannel} yet. Be the first to make a statement.`
                : "No statements on the record yet. Be the first to make one."}
          </div>
        )}
      </div>
    </>
  );
}
