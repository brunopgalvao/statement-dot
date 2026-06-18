import { useEffect, useState, type MouseEvent } from "react";
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
  const { profileFor, like, liked, echo, echoed, tip, vote, countsFor, openThread, openProfile } =
    useStore();
  const author = profileFor(s.author);
  const [body, setBody] = useState(s.body ?? "");
  const [tippedAmount, setTippedAmount] = useState<number | null>(null);
  const [tipOpen, setTipOpen] = useState(false);

  useEffect(() => {
    if (!s.body && s.cid) sdk.storage.get(s.cid).then((b) => b && setBody(b));
  }, [s.cid, s.body]);

  const name = author?.displayName ?? sdk.address.shorten(s.author);
  const handle = author?.handle ?? "";
  const hue = author?.avatarHue ?? 320;
  const c = countsFor(s.id);
  const isLiked = liked.has(s.id);
  const isEchoed = echoed.has(s.id);

  const open = () => linkToThread && openThread(s.id);

  const goToProfile = (e: MouseEvent) => {
    e.stopPropagation();
    openProfile(s.author);
  };

  return (
    <article className={`stmt${fresh ? " stmt--fresh" : ""}${linkToThread ? " stmt--link" : ""}`}>
      <button className="stmt__avatar" onClick={goToProfile} title={`View ${name}`}>
        <Avatar name={name} hue={hue} />
      </button>
      <div className="stmt__main">
        <header className="stmt__head">
          <button className="stmt__name stmt__namebtn" onClick={goToProfile}>
            {name}
          </button>
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
          <span className="stmt__pin" title={s.cid}>
            <Pin /> Durable · Bulletin Chain · {s.cid.slice(0, 12)}…
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
          <div className="tipwrap">
            <button
              className="act act--tip"
              onClick={() => setTipOpen((o) => !o)}
              title="Tip DOT — private payment on Asset Hub"
            >
              <Coin /> {tippedAmount ? `Tipped ◈${tippedAmount}` : "Tip"}
            </button>
            {tipOpen && (
              <div className="tipmenu" onMouseLeave={() => setTipOpen(false)}>
                <span className="tipmenu__label">Tip privately</span>
                <div className="tipmenu__amounts">
                  {[1, 5, 10].map((amt) => (
                    <button
                      key={amt}
                      className="tipmenu__amt"
                      onClick={() => {
                        tip(s.author, amt);
                        setTippedAmount((t) => (t ?? 0) + amt);
                        setTipOpen(false);
                      }}
                    >
                      ◈{amt}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
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
