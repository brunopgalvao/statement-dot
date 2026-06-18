import type { ChatRoom, Profile } from "@/sdk";

export interface RoomMeta {
  title: string;
  /** avatar seed name + hue */
  avatarName: string;
  hue: number;
  /** the other participant's alias for a DM, else undefined */
  otherAlias?: string;
  /** static glyph for group/supergroup/channel, else "" */
  glyph: string;
  human: boolean;
}

const KIND_GLYPH: Record<ChatRoom["kind"], string> = {
  dm: "",
  group: "⚒",
  supergroup: "◇",
  channel: "📣",
};

export function roomMeta(
  room: ChatRoom,
  profiles: Record<string, Profile>,
  me: string | undefined
): RoomMeta {
  if (room.kind === "dm") {
    const other = room.members.find((a) => a !== me) ?? room.members[0];
    const p = profiles[other];
    return {
      title: p?.displayName ?? shortAlias(other),
      avatarName: p?.displayName ?? other,
      hue: p?.avatarHue ?? hueOf(other),
      otherAlias: other,
      glyph: "",
      human: p?.human ?? true,
    };
  }
  return {
    title: room.title ?? room.kind,
    avatarName: room.title ?? room.id,
    hue: hueOf(room.id),
    glyph: KIND_GLYPH[room.kind],
    human: true,
  };
}

export function previewOf(room: ChatRoom): string {
  const m = room.lastMessage;
  if (!m) return "No messages yet";
  switch (m.content.kind) {
    case "text":
      return m.content.text;
    case "image":
      return "📷 Photo";
    case "card":
      return `▣ ${m.content.title}`;
  }
}

export function relTime(ts: number, now = Date.now()): string {
  const s = Math.max(1, Math.floor((now - ts) / 1000));
  if (s < 60) return "now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function dayLabel(ts: number, now = Date.now()): string {
  const d = new Date(ts);
  const today = new Date(now);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const yest = new Date(now - 86_400_000);
  if (same(d, today)) return "Today";
  if (same(d, yest)) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function clockTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function shortAlias(a: string): string {
  return a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}
function hueOf(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}
