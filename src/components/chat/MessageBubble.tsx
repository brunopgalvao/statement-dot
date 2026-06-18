import { useEffect, useState } from "react";
import { sdk, useStore } from "@/state/store";
import { Avatar } from "../Avatar";
import { clockTime } from "./util";
import type { ChatMessage } from "@/sdk";

const EMOJI = ["👍", "❤️", "🔥", "😂", "🙏"];

export function MessageBubble({
  m,
  mine,
  showSender,
  replyTo,
  members,
}: {
  m: ChatMessage;
  mine: boolean;
  showSender: boolean;
  replyTo?: ChatMessage;
  members: number;
}) {
  const { profileFor, reactMessage, session } = useStore();
  const author = profileFor(m.author);
  const me = session?.pop.alias;
  const [img, setImg] = useState<string | null>(null);
  const [pick, setPick] = useState(false);

  useEffect(() => {
    if (m.content.kind === "image") sdk.storage.get(m.content.cid).then(setImg);
  }, [m]);

  // "read by everyone else" → double tick
  const readByOthers = m.readBy.filter((a) => a !== me).length;
  const seen = readByOthers >= Math.max(1, members - 1);

  return (
    <div className={`brow${mine ? " brow--mine" : ""}`}>
      {!mine && showSender && (
        <Avatar name={author?.displayName ?? m.author} hue={author?.avatarHue ?? 320} size={28} />
      )}
      {!mine && !showSender && <span className="brow__spacer" />}
      <div className="bubble" onMouseLeave={() => setPick(false)}>
        {!mine && showSender && (
          <div className="bubble__sender">{author?.displayName ?? "unknown"}</div>
        )}
        {replyTo && (
          <div className="bubble__reply">
            <span className="bubble__reply-name">
              {profileFor(replyTo.author)?.displayName ?? "…"}
            </span>
            <span className="bubble__reply-text">
              {replyTo.content.kind === "text" ? replyTo.content.text : "media"}
            </span>
          </div>
        )}

        {m.content.kind === "text" && <div className="bubble__text">{m.content.text}</div>}
        {m.content.kind === "image" && (
          <div className="bubble__media">
            {img ? <img src={img} alt={m.content.caption ?? ""} /> : <div className="bubble__imgload" />}
            {m.content.caption && <div className="bubble__cap">{m.content.caption}</div>}
          </div>
        )}
        {m.content.kind === "card" && (
          <div className="bubble__card">
            <div className="bubble__card-title">{m.content.title}</div>
            <div className="bubble__card-actions">
              {m.content.actions.map((a) => (
                <button key={a.id} className="bubble__card-btn">
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="bubble__meta">
          <span>{clockTime(m.ts)}</span>
          {mine && <span className={`bubble__ticks${seen ? " is-seen" : ""}`}>✓✓</span>}
        </div>

        {Object.keys(m.reactions).length > 0 && (
          <div className="bubble__reacts">
            {Object.entries(m.reactions).map(([e, who]) => (
              <span key={e} className={who.includes(me ?? "") ? "is-mine" : ""}>
                {e} {who.length}
              </span>
            ))}
          </div>
        )}

        <button className="bubble__addreact" onClick={() => setPick((p) => !p)} title="React">
          ☺
        </button>
        {pick && (
          <div className="bubble__picker">
            {EMOJI.map((e) => (
              <button
                key={e}
                onClick={() => {
                  reactMessage(m.roomId, m.id, e);
                  setPick(false);
                }}
              >
                {e}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
