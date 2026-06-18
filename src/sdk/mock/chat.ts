import type { Address, ChatContent, ChatMessage, ChatRoom, ProductSDK, RoomKind } from "../types";
import { SEED_PROFILES } from "./data";

// In-memory real-time chat for the mock adapter: rooms, persistent
// messages, simulated peers that reply/type/come online, read receipts, and
// reactions. Mirrors the `chat` group of ProductSDK so the messenger UI runs
// with zero Host. `getMe` returns the signed-in alias once onboarding completes.

const GAV = SEED_PROFILES[0].alias;
const MIO = SEED_PROFILES[1].alias;
const RIN = SEED_PROFILES[2].alias;
const KAI = SEED_PROFILES[3].alias;

const REPLIES = [
  "ha, fair point.",
  "agreed — verified humans only changes the whole vibe.",
  "want to jam on that sometime?",
  "just pinned mine to the Bulletin Chain. durable now.",
  "tipped you ◈1 for that take 😄",
  "let's move this to a group?",
  "100%. no bots, no noise.",
];

export function createMockChat(getMe: () => Address | null): ProductSDK["chat"] {
  const rooms = new Map<string, ChatRoom>();
  const messages = new Map<string, ChatMessage[]>();
  const roomSubs = new Set<(rooms: ChatRoom[]) => void>();
  const msgSubs = new Map<string, Set<(m: ChatMessage) => void>>();
  const typingSubs = new Map<string, Set<(a: Address) => void>>();
  const presenceSubs = new Set<(s: Set<Address>) => void>();
  const online = new Set<Address>([GAV, RIN]);
  let seeded = false;
  let seq = 0;
  let clock = 1_750_000_000_000 + 4_000_000;
  const now = () => (clock += 60_000);
  const mid = () => `m${seq++}`;

  const text = (s: string): ChatContent => ({ kind: "text", text: s });

  function emitRooms() {
    const list = [...rooms.values()].sort(
      (a, b) => (b.lastMessage?.ts ?? 0) - (a.lastMessage?.ts ?? 0)
    );
    for (const cb of roomSubs) cb(list);
  }
  function emitMessage(roomId: string, m: ChatMessage) {
    for (const cb of msgSubs.get(roomId) ?? []) cb(m);
  }
  function push(roomId: string, m: ChatMessage, unreadBump = 0) {
    (messages.get(roomId) ?? messages.set(roomId, []).get(roomId)!).push(m);
    const room = rooms.get(roomId);
    if (room) {
      room.lastMessage = m;
      room.unread += unreadBump;
    }
    emitMessage(roomId, m);
    emitRooms();
  }
  function msg(roomId: string, author: Address, content: ChatContent, replyTo?: string): ChatMessage {
    return { id: mid(), roomId, author, ts: now(), content, replyTo, reactions: {}, readBy: [author] };
  }

  function seed(me: Address) {
    if (seeded) return;
    seeded = true;
    const mk = (
      id: string,
      kind: RoomKind,
      members: Address[],
      title?: string,
      extra?: Partial<ChatRoom>
    ): ChatRoom => {
      const r: ChatRoom = { id, kind, title, members, admins: [members[0]], unread: 0, ...extra };
      rooms.set(id, r);
      messages.set(id, []);
      return r;
    };
    mk("dm-gav", "dm", [me, GAV]);
    push("dm-gav", msg("dm-gav", GAV, text("hey! saw your statement on bot-free networks — genuinely refreshing.")));
    push("dm-gav", msg("dm-gav", me, text("thanks! every account is a verified human. no scam DMs here 🙂")));
    push("dm-gav", msg("dm-gav", GAV, text("exactly the point. want to jam on JAM sometime?")), 1);

    mk("dm-mio", "dm", [me, MIO]);
    push("dm-mio", msg("dm-mio", MIO, text("did you try pinning a post to the Bulletin Chain yet?")), 2);
    push("dm-mio", msg("dm-mio", MIO, text("it survives the gossip TTL — proper durable.")), 1);

    mk("grp-builders", "group", [me, RIN, KAI, GAV], "Builders ⚒");
    push("grp-builders", msg("grp-builders", RIN, text("shipping the chat layer hand-rolled on the Statement Store today.")));
    push("grp-builders", msg("grp-builders", KAI, text("humans-only group chats. no spam, finally.")));
    push("grp-builders", msg("grp-builders", me, text("presence + typing over the Statement Store next.")), 1);

    // Supergroup — large open group chat.
    mk("sg-polkadot", "supergroup", [me, GAV, MIO, RIN, KAI], "Polkadot Builders", { memberCount: 4210 });
    push("sg-polkadot", msg("sg-polkadot", MIO, text("anyone deploying a PVM contract this week? happy to review.")));
    push("sg-polkadot", msg("sg-polkadot", RIN, text("just shipped one — handle registry, signed on my phone.")), 1);

    // Channel — one-to-many broadcast (only the admin posts).
    mk("ch-announce", "channel", [GAV, me], "statement.dot · announcements", {
      admins: [GAV],
      memberCount: 12840,
    });
    push("ch-announce", msg("ch-announce", GAV, text("📣 Messenger is live: humans-only DMs, groups, supergroups & channels — no scam bots.")), 1);
  }

  const isAdmin = (room: ChatRoom, who: Address | null) =>
    !!who && (room.admins ?? [room.members[0]]).includes(who);

  function ensureSeeded() {
    const me = getMe();
    if (me) seed(me);
  }

  // Gentle liveness: a peer occasionally comes online / goes offline.
  const presenceTimer = setInterval(() => {
    if (presenceSubs.size === 0) return;
    if (online.has(MIO)) online.delete(MIO);
    else online.add(MIO);
    for (const cb of presenceSubs) cb(new Set(online));
  }, 20_000);
  (presenceTimer as unknown as { unref?: () => void }).unref?.();

  // After you send in a DM, the peer types then replies + reads your message.
  function simulatePeerReply(roomId: string) {
    const room = rooms.get(roomId);
    if (!room || room.kind !== "dm") return;
    const me = getMe();
    const peer = room.members.find((a) => a !== me);
    if (!peer) return;
    const typingCbs = typingSubs.get(roomId);
    setTimeout(() => typingCbs?.forEach((cb) => cb(peer)), 500);
    setTimeout(() => {
      // mark your last message read by the peer
      const list = messages.get(roomId) ?? [];
      for (const m of list) if (!m.readBy.includes(peer)) m.readBy.push(peer);
      const reply = REPLIES[(seq + roomId.length) % REPLIES.length];
      push(roomId, msg(roomId, peer, text(reply)), 1);
    }, 1800);
  }

  return {
    subscribeRooms(cb) {
      ensureSeeded();
      roomSubs.add(cb);
      cb([...rooms.values()].sort((a, b) => (b.lastMessage?.ts ?? 0) - (a.lastMessage?.ts ?? 0)));
      return () => roomSubs.delete(cb);
    },
    async createRoom({ kind, members, title }) {
      ensureSeeded();
      const me = getMe();
      const all = me && !members.includes(me) ? [me, ...members] : members;
      const id = kind === "dm" ? `dm-${all.filter((a) => a !== me)[0] ?? mid()}` : `${kind}-${mid()}`;
      if (!rooms.has(id)) {
        rooms.set(id, {
          id,
          kind,
          title,
          members: all,
          admins: me ? [me] : [all[0]],
          memberCount: kind === "dm" || kind === "group" ? undefined : all.length,
          unread: 0,
        });
        messages.set(id, []);
        emitRooms();
      }
      return id;
    },
    canPost(room) {
      // Only admins post in a channel; everyone posts elsewhere.
      return room.kind === "channel" ? isAdmin(room, getMe()) : true;
    },
    async history(roomId) {
      ensureSeeded();
      return [...(messages.get(roomId) ?? [])];
    },
    subscribeMessages(roomId, cb) {
      const set = msgSubs.get(roomId) ?? msgSubs.set(roomId, new Set()).get(roomId)!;
      set.add(cb);
      return () => set.delete(cb);
    },
    async send(roomId, content, replyTo) {
      const me = getMe();
      if (!me) throw new Error("not signed in");
      const m = msg(roomId, me, content, replyTo);
      push(roomId, m);
      simulatePeerReply(roomId);
      return m;
    },
    async react(roomId, messageId, emoji) {
      const me = getMe();
      if (!me) return;
      const m = (messages.get(roomId) ?? []).find((x) => x.id === messageId);
      if (!m) return;
      const list = (m.reactions[emoji] ??= []);
      if (!list.includes(me)) list.push(me);
      emitMessage(roomId, m);
    },
    async markRead(roomId) {
      const me = getMe();
      const room = rooms.get(roomId);
      if (room) room.unread = 0;
      if (me) for (const m of messages.get(roomId) ?? []) if (!m.readBy.includes(me)) m.readBy.push(me);
      emitRooms();
    },
    setTyping() {
      /* in mock, only peers "type" (simulatePeerReply) */
    },
    subscribeTyping(roomId, cb) {
      const set = typingSubs.get(roomId) ?? typingSubs.set(roomId, new Set()).get(roomId)!;
      set.add(cb);
      return () => set.delete(cb);
    },
    setPresence() {
      const me = getMe();
      if (me) {
        online.add(me);
        for (const cb of presenceSubs) cb(new Set(online));
      }
    },
    subscribePresence(cb) {
      presenceSubs.add(cb);
      cb(new Set(online));
      return () => presenceSubs.delete(cb);
    },
  };
}
