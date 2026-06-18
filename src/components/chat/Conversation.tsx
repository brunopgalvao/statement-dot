import { useEffect, useMemo, useRef, useState } from "react";
import { sdk, useStore } from "@/state/store";
import { Avatar } from "../Avatar";
import { VerifiedStamp } from "../VerifiedStamp";
import { MessageBubble } from "./MessageBubble";
import { dayLabel, roomMeta } from "./util";
import type { ChatMessage } from "@/sdk";

export function Conversation() {
  const {
    rooms, activeRoomId, chatMessages, typing, online, profiles, session, closeRoom,
    sendMessage, typingIn, canPostIn,
  } = useStore();
  const me = session?.pop.alias;
  const room = rooms.find((r) => r.id === activeRoomId);
  const msgs = (activeRoomId && chatMessages[activeRoomId]) || [];
  const endRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState("");
  const [reply, setReply] = useState<ChatMessage | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [msgs.length, activeRoomId]);

  const byId = useMemo(() => Object.fromEntries(msgs.map((m) => [m.id, m])), [msgs]);

  if (!room) {
    return (
      <div className="convo convo--empty">
        <div>
          <div className="convo__emptyicon">✺</div>
          <p>Select a chat, or start a new one.</p>
          <span>Every conversation here is with a verified human — no scam bots.</span>
        </div>
      </div>
    );
  }

  const meta = roomMeta(room, profiles, me);
  const typers = (typing[room.id] ?? []).filter((a) => a !== me);
  const isOnline = meta.otherAlias ? online.has(meta.otherAlias) : false;
  const postable = canPostIn(room);

  const subtitle = typers.length
    ? `${typers.length === 1 ? profiles[typers[0]]?.displayName ?? "someone" : `${typers.length} people`} typing…`
    : room.kind === "dm"
      ? isOnline ? "online" : "offline"
      : room.kind === "channel"
        ? `${(room.memberCount ?? room.members.length).toLocaleString()} subscribers`
        : `${(room.memberCount ?? room.members.length).toLocaleString()} members`;

  async function submit() {
    const t = text.trim();
    if (!t || !room) return;
    setText("");
    const r = reply?.id;
    setReply(null);
    await sendMessage(room.id, { kind: "text", text: t }, r);
  }

  async function attach(file: File) {
    if (!room) return;
    const dataUrl = await new Promise<string>((res) => {
      const fr = new FileReader();
      fr.onload = () => res(String(fr.result));
      fr.readAsDataURL(file);
    });
    const cid = await sdk.storage.put(dataUrl); // pinned to the Bulletin Chain
    await sendMessage(room.id, { kind: "image", cid });
  }

  return (
    <div className="convo">
      <header className="convo__head">
        <button className="convo__back" onClick={closeRoom} title="Back">←</button>
        {meta.glyph ? (
          <span className="chatrow__glyph" style={{ "--hue": meta.hue } as React.CSSProperties}>{meta.glyph}</span>
        ) : (
          <Avatar name={meta.avatarName} hue={meta.hue} size={40} />
        )}
        <div className="convo__id">
          <div className="convo__title">
            {meta.title} {meta.human && room.kind === "dm" && <VerifiedStamp />}
          </div>
          <div className={`convo__sub${typers.length ? " is-typing" : ""}`}>{subtitle}</div>
        </div>
      </header>

      <div className="convo__msgs">
        {msgs.map((m, i) => {
          const prev = msgs[i - 1];
          const newDay = !prev || dayLabel(prev.ts) !== dayLabel(m.ts);
          const showSender = room.kind !== "dm" && (!prev || prev.author !== m.author || newDay);
          return (
            <div key={m.id}>
              {newDay && <div className="daysep"><span>{dayLabel(m.ts)}</span></div>}
              <MessageBubble
                m={m}
                mine={m.author === me}
                showSender={showSender}
                replyTo={m.replyTo ? byId[m.replyTo] : undefined}
                members={room.members.length}
              />
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {postable ? (
        <div className="chatcompose">
          {reply && (
            <div className="chatcompose__reply">
              ↩ <b>{profiles[reply.author]?.displayName ?? "…"}</b>{" "}
              <span>{reply.content.kind === "text" ? reply.content.text : "media"}</span>
              <button onClick={() => setReply(null)}>✕</button>
            </div>
          )}
          <div className="chatcompose__row">
            <button className="chatcompose__icon" onClick={() => fileRef.current?.click()} title="Photo">📎</button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => e.target.files?.[0] && attach(e.target.files[0])}
            />
            <textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                typingIn(room.id);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder={`Message ${meta.title}…`}
              rows={1}
            />
            <button className="chatcompose__send" onClick={submit} disabled={!text.trim()}>
              ➤
            </button>
          </div>
        </div>
      ) : (
        <div className="chatcompose chatcompose--readonly">
          🔒 Only admins can post in this channel — you're subscribed.
        </div>
      )}
    </div>
  );
}
