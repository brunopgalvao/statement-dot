import type { Address, ChatContent, ChatMessage, ChatRoom, ProductSDK } from "../types";

// Hand-rolled messenger over the product-sdk primitives — NO host chat surface,
// NO @novasamatech. Messages are signed statements published to a per-room
// topic on the Statement Store (real-time); because that store is ephemeral,
// each member also keeps a durable per-room log in the KvStore (and media is
// pinned to the Bulletin Chain via cloud-storage). Typing + presence are
// short-TTL ephemeral statements. Room kinds: dm / group / supergroup / channel
// (channel = admin-only posting).

interface Deps {
  statements: ProductSDK["statements"];
  kv: ProductSDK["kv"];
  getMe: () => Address | null;
  log: ProductSDK["log"];
}

const PREFIX = "chat:"; // statement channel prefix => `chat:<roomId>`

export function createLiveChat(d: Deps): ProductSDK["chat"] {
  const topic = (roomId: string) => `${PREFIX}${roomId}`;
  const loadRooms = (): ChatRoom[] => d.kv.get<ChatRoom[]>("chat.rooms") ?? [];
  const saveRooms = (r: ChatRoom[]) => d.kv.set("chat.rooms", r);
  const loadMsgs = (roomId: string): ChatMessage[] => d.kv.get<ChatMessage[]>(`chat.msgs.${roomId}`) ?? [];
  const saveMsgs = (roomId: string, m: ChatMessage[]) => d.kv.set(`chat.msgs.${roomId}`, m.slice(-300));

  const roomSubs = new Set<(rooms: ChatRoom[]) => void>();
  const msgSubs = new Map<string, Set<(m: ChatMessage) => void>>();
  const typingSubs = new Map<string, Set<(a: Address) => void>>();
  const presenceSubs = new Set<(s: Set<Address>) => void>();
  const online = new Set<Address>();
  let counter = 0;
  const mid = () => `${(d.getMe() ?? "x").slice(0, 8)}-${counter++}-${Math.floor(performance.now())}`;

  const sortedRooms = () =>
    loadRooms().sort((a, b) => (b.lastMessage?.ts ?? 0) - (a.lastMessage?.ts ?? 0));
  const emitRooms = () => roomSubs.forEach((cb) => cb(sortedRooms()));

  function recordMessage(roomId: string, m: ChatMessage, fromMe: boolean) {
    const msgs = loadMsgs(roomId);
    if (msgs.some((x) => x.id === m.id)) return;
    msgs.push(m);
    saveMsgs(roomId, msgs);
    const rooms = loadRooms();
    const r = rooms.find((x) => x.id === roomId);
    if (r) {
      r.lastMessage = m;
      if (!fromMe) r.unread = (r.unread ?? 0) + 1;
      saveRooms(rooms);
    }
    msgSubs.get(roomId)?.forEach((cb) => cb(m));
    emitRooms();
  }

  // One subscription to the People Chain; route chat-channel statements.
  d.statements.subscribe("home", (s) => {
    if (!s.channel?.startsWith(PREFIX)) return;
    const roomId = s.channel.slice(PREFIX.length);
    if (s.author === d.getMe()) return; // our own messages are added optimistically
    if (s.kind === "typing") {
      typingSubs.get(roomId)?.forEach((cb) => cb(s.author));
      return;
    }
    if (s.kind === "presence") {
      online.add(s.author);
      presenceSubs.forEach((cb) => cb(new Set(online)));
      return;
    }
    if (s.kind === "dm" && s.body) {
      try {
        const m = JSON.parse(s.body) as ChatMessage;
        recordMessage(roomId, { ...m, roomId, author: s.author, ts: s.ts }, false);
      } catch (e) {
        d.log("chat", "bad message payload", e);
      }
    }
  });

  const publish = (roomId: string, kind: "dm" | "typing" | "presence", payload: unknown, ttl?: number) =>
    d.statements
      .submit({
        kind,
        author: d.getMe() ?? "",
        body: typeof payload === "string" ? payload : JSON.stringify(payload),
        channel: topic(roomId),
        target: roomId,
        ttl,
      })
      .catch((e) => d.log("chat", "publish failed", e));

  const isAdmin = (room: ChatRoom, who: Address | null) =>
    !!who && (room.admins ?? [room.members[0]]).includes(who);

  return {
    subscribeRooms(cb) {
      roomSubs.add(cb);
      cb(sortedRooms());
      return () => roomSubs.delete(cb);
    },
    async createRoom({ kind, members, title }) {
      const me = d.getMe();
      const all = me && !members.includes(me) ? [me, ...members] : members;
      const id =
        kind === "dm"
          ? `dm-${[...all].sort().join("_")}` // deterministic so both sides share it
          : `${kind}-${mid()}`;
      const rooms = loadRooms();
      if (!rooms.some((r) => r.id === id)) {
        rooms.push({
          id,
          kind,
          title,
          members: all,
          admins: me ? [me] : [all[0]],
          memberCount: kind === "dm" || kind === "group" ? undefined : all.length,
          unread: 0,
        });
        saveRooms(rooms);
        emitRooms();
      }
      return id;
    },
    canPost(room) {
      return room.kind === "channel" ? isAdmin(room, d.getMe()) : true;
    },
    async history(roomId) {
      return loadMsgs(roomId);
    },
    subscribeMessages(roomId, cb) {
      const set = msgSubs.get(roomId) ?? msgSubs.set(roomId, new Set()).get(roomId)!;
      set.add(cb);
      return () => set.delete(cb);
    },
    async send(roomId, content: ChatContent, replyTo) {
      const me = d.getMe();
      if (!me) throw new Error("not signed in");
      const m: ChatMessage = {
        id: mid(),
        roomId,
        author: me,
        ts: Date.now(),
        content,
        replyTo,
        reactions: {},
        readBy: [me],
      };
      recordMessage(roomId, m, true);
      await publish(roomId, "dm", m);
      return m;
    },
    async react(roomId, messageId, emoji) {
      const me = d.getMe();
      if (!me) return;
      const msgs = loadMsgs(roomId);
      const m = msgs.find((x) => x.id === messageId);
      if (!m) return;
      (m.reactions[emoji] ??= []).includes(me) || m.reactions[emoji].push(me);
      saveMsgs(roomId, msgs);
      msgSubs.get(roomId)?.forEach((cb) => cb(m));
      await publish(roomId, "dm", m); // re-broadcast updated message so peers see the reaction
    },
    async markRead(roomId) {
      const rooms = loadRooms();
      const r = rooms.find((x) => x.id === roomId);
      if (r) {
        r.unread = 0;
        saveRooms(rooms);
        emitRooms();
      }
    },
    setTyping(roomId) {
      publish(roomId, "typing", { t: 1 }, 8);
    },
    subscribeTyping(roomId, cb) {
      const set = typingSubs.get(roomId) ?? typingSubs.set(roomId, new Set()).get(roomId)!;
      set.add(cb);
      return () => set.delete(cb);
    },
    setPresence() {
      const me = d.getMe();
      if (me) {
        online.add(me);
        presenceSubs.forEach((cb) => cb(new Set(online)));
        publish("presence", "presence", { online: true }, 60);
      }
    },
    subscribePresence(cb) {
      presenceSubs.add(cb);
      cb(new Set(online));
      return () => presenceSubs.delete(cb);
    },
  };
}
