import { useEffect, useState } from "react";
import type { Statement } from "@/sdk";
import { sdk, useStore } from "@/state/store";
import { relTime } from "@/lib/format";
import { Avatar } from "./Avatar";
import { VerifiedStamp } from "./VerifiedStamp";
import { Coin, Echo, Heart, HeartFilled, Pin, Reply } from "./icons";

export function StatementCard({
  s,
  now,
  fresh,
  linkToThread = true,
  onReply,
}: {
  s: Statement;
  now: number;
  fresh?: boolean;
  /** Clicking the card opens its thread (off when already inside a thread). */
  linkToThread?: boolean;
  /** When provided, Reply triggers this instead of navigating to the thread. */
  onReply?: () => void;
}) {
  const { profileFor, like, liked, echo, echoed, tip, vote, countsFor, openThread } = useStore();
  const author = profileFor(s.author);
  const [body, setBody] = useState(s.body ?? "");
  const [tipped, setTipped] = useState(false);

  useEffect(() => {
    if (!s.body && s.cid) sdk.storage.get(s.cid).then((b) => b && setBody(b));
  }, [s.cid, s.body]);

  const name = author?.displayName ?? "unknown";
  const handle = author?.handle ?? "…resolving.dot";
  const hue = author?.avatarHue ?? 320;
  const c = countsFor(s.id);
  const isLiked = liked.has(s.id);
  const isEchoed = echoed.has(s.id);

  const open = () => linkToThread && openThread(s.id);

  return (
    <article className={`stmt${fresh ? " stmt--fresh" : ""}${linkToThread ? " stmt--link" : ""}`}>
      <Avatar name={name} hue={hue} />
      <div className="stmt__main">
        <header className="stmt__head">
          <span className="stmt__name">{name}</span>
          {author?.human && <VerifiedStamp />}
          <span className="stmt__handle">{handle}</span>
          <span className="stmt__dot">·</span>
          <span className="stmt__alias">{sdk.address.shorten(s.author)}</span>
          <span className="stmt__time">{relTime(s.ts, now)}</span>
        </header>

        <div className="stmt__body" onClick={open} role={linkToThread ? "button" : undefined}>
          {body}
        </div>

        {s.cid && (
          <span className="stmt__pin">
            <Pin /> Pinned to Bulletin Chain · {s.cid.slice(0, 14)}…
          </span>
        )}

        {s.frame && <FramePoll s={s} onVote={(a) => vote(s.id, a)} />}

        <div className="acts">
          <button
            className="act"
            onClick={() => (onReply ? onReply() : openThread(s.id))}
            title="Reply"
          >
            <Reply /> {c.reply > 0 ? c.reply : "Reply"}
          </button>
          <button
            className={`act${isEchoed ? " act--echoed" : ""}`}
            onClick={() => echo(s.id)}
            title="Echo (repost)"
          >
            <Echo /> {c.echo > 0 ? c.echo : "Echo"}
          </button>
          <button
            className={`act${isLiked ? " act--liked" : ""}`}
            onClick={() => like(s.id)}
            title="Endorse"
          >
            {isLiked ? <HeartFilled /> : <Heart />} {c.like > 0 ? c.like : "Endorse"}
          </button>
          <button
            className="act act--tip"
            onClick={() => {
              tip(s.author, 1);
              setTipped(true);
            }}
            title="Tip 1 DOT — private payment"
          >
            <Coin /> {tipped ? "Tipped ◈1" : "Tip"}
          </button>
        </div>
      </div>
    </article>
  );
}

function FramePoll({ s, onVote }: { s: Statement; onVote: (actionId: string) => void }) {
  const frame = s.frame!;
  const total = Math.max(1, Object.values(frame.tally).reduce((a, b) => a + b, 0));
  return (
    <div className="frame">
      <div className="frame__title">{frame.title}</div>
      <div className="frame__opts">
        {frame.actions.map((a) => {
          const v = frame.tally[a.id] ?? 0;
          const pct = Math.round((v / total) * 100);
          return (
            <button key={a.id} className="frame__opt" onClick={() => onVote(a.id)}>
              <div className="frame__fill" style={{ width: `${pct}%` }} />
              <span>
                {a.label}
                <span className="frame__pct">{pct}%</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
