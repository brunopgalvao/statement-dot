import { useMemo, useState } from "react";
import { useStore } from "@/state/store";
import { Avatar } from "../Avatar";
import { roomMeta, previewOf, relTime } from "./util";
import type { ChatRoom } from "@/sdk";

const KIND_LABEL: Partial<Record<ChatRoom["kind"], string>> = {
  supergroup: "Supergroup",
  channel: "Channel",
  group: "Group",
};

export function ChatList({ onNewChat }: { onNewChat: () => void }) {
  const { rooms, profiles, session, online, activeRoomId, openRoom } = useStore();
  const me = session?.pop.alias;
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rooms;
    return rooms.filter((r) => roomMeta(r, profiles, me).title.toLowerCase().includes(term));
  }, [rooms, q, profiles, me]);

  return (
    <div className="chatlist">
      <div className="chatlist__head">
        <h2>Messages</h2>
        <button className="chatlist__new" onClick={onNewChat} title="New chat">
          ＋
        </button>
      </div>
      <div className="chatlist__search">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search chats or @handle…"
        />
      </div>
      <div className="chatlist__rooms">
        {filtered.length === 0 && (
          <div className="chatlist__empty">
            {rooms.length === 0 ? "No chats yet — start one." : "No matches."}
          </div>
        )}
        {filtered.map((room) => {
          const m = roomMeta(room, profiles, me);
          const isOnline = m.otherAlias ? online.has(m.otherAlias) : false;
          return (
            <button
              key={room.id}
              className={`chatrow${activeRoomId === room.id ? " is-active" : ""}`}
              onClick={() => openRoom(room.id)}
            >
              <div className="chatrow__av">
                {m.glyph ? (
                  <span className="chatrow__glyph" style={{ "--hue": m.hue } as React.CSSProperties}>
                    {m.glyph}
                  </span>
                ) : (
                  <Avatar name={m.avatarName} hue={m.hue} size={46} />
                )}
                {isOnline && <span className="chatrow__online" />}
              </div>
              <div className="chatrow__body">
                <div className="chatrow__top">
                  <span className="chatrow__name">{m.title}</span>
                  {KIND_LABEL[room.kind] && (
                    <span className="chatrow__kind">{KIND_LABEL[room.kind]}</span>
                  )}
                  {room.lastMessage && (
                    <span className="chatrow__time">{relTime(room.lastMessage.ts)}</span>
                  )}
                </div>
                <div className="chatrow__bottom">
                  <span className="chatrow__preview">{previewOf(room)}</span>
                  {room.unread > 0 && <span className="chatrow__badge">{room.unread}</span>}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
