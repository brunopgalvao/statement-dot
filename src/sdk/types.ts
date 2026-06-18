// ---------------------------------------------------------------------------
// statement.dot — Product SDK adapter surface
//
// This file is the ONLY place that knows about the shape of the Polkadot
// Product SDK (`@parity/product-sdk` family). Every TrUAPI call flows through
// one of the namespaced groups below, and each group maps 1:1 to a real
// package in https://github.com/paritytech/product-sdk/tree/main/product-sdk.
//
// The docs warn that method signatures are still provisional and that the
// mobile Host uses a different JSON bridge, so we pin our app to THIS interface
// and keep two implementations behind it: `mock/` (offline dev + tests) and,
// later, a `live/` adapter that imports the real packages. Swapping one for the
// other never touches the UI.
// ---------------------------------------------------------------------------

/** A `.dot` handle, e.g. `alice.dot`. Resolved + claimed through dotNS. */
export type DotName = string;

/** SS58 account address (or, for posts, an unlinkable per-Product PoP alias). */
export type Address = string;

/** Content identifier for durable bytes pinned to the Bulletin Chain. */
export type Cid = string;

export type StatementKind =
  | "post"
  | "like"
  | "repost"
  | "follow"
  | "reply"
  | "dm"
  | "profile"
  | "typing"
  | "presence";

/**
 * The atomic unit of the network. Short text lives inline in `body`; longer
 * text or media is pinned to the Bulletin Chain via `cloud-storage` and carried
 * as a `cid`. Likes/follows/replies are lightweight statements that reference a
 * `target`. Every statement is signed at the source under a PoP alias.
 */
export interface Statement {
  id: string;
  kind: StatementKind;
  /** Author's unlinkable per-Product alias (Ring-VRF). Display name resolves via dotNS. */
  author: Address;
  ts: number;
  body?: string;
  cid?: Cid;
  /** Statement id this one reacts to / replies to, or alias being followed. */
  target?: string;
  channel?: string;
  /** Optional interactive "Frame-style" action card. */
  frame?: Frame;
  /** Best-effort gossip TTL (seconds) before the statement decays. */
  ttl?: number;
}

export interface Profile {
  handle: DotName;
  alias: Address;
  displayName: string;
  bio: string;
  /** True once Proof of Personhood is recorded on the social contract. */
  human: boolean;
  joinedTs: number;
  avatarHue: number;
}

export interface HostInfo {
  /** Which Host the Product is running inside. */
  kind: "desktop" | "app" | "web" | "mock";
  /** Capabilities advertised during the TrUAPI handshake. */
  capabilities: string[];
  /** True when backed by the in-memory mock (no devices required). */
  mock: boolean;
}

export interface PopProof {
  alias: Address;
  /** Opaque Ring-VRF proof handle; the Product never sees the underlying identity. */
  proof: string;
  verifiedTs: number;
}

export interface FrameAction {
  id: string;
  label: string;
}

/** An interactive "Frame-style" action card carried inside a statement. */
export interface Frame {
  title: string;
  actions: FrameAction[];
  /** actionId -> tally */
  tally: Record<string, number>;
}

// --- Chat (full real-time messenger) ----------------------------------------

export type ChatContent =
  | { kind: "text"; text: string }
  | { kind: "image"; cid: Cid; caption?: string }
  | { kind: "card"; title: string; actions: FrameAction[] };

export interface ChatMessage {
  id: string;
  roomId: string;
  author: Address;
  ts: number;
  content: ChatContent;
  /** id of the message this one replies to. */
  replyTo?: string;
  /** emoji -> aliases who reacted. */
  reactions: Record<string, Address[]>;
  /** aliases who have read up to (incl.) this message. */
  readBy: Address[];
}

/**
 * Room kinds:
 * - `dm`         — 1:1 direct message.
 * - `group`      — small private group chat (everyone posts).
 * - `supergroup` — large open group chat (everyone posts, many members).
 * - `channel`    — one-to-many broadcast (only admins post; others read + react).
 */
export type RoomKind = "dm" | "group" | "supergroup" | "channel";

export interface ChatRoom {
  id: string;
  kind: RoomKind;
  /** title for group/supergroup/channel (DMs derive it from the other member). */
  title?: string;
  members: Address[];
  /** admins; for a `channel` only admins may post. Defaults to [members[0]]. */
  admins?: Address[];
  /** subscriber count for supergroups/channels (members.length may be a sample). */
  memberCount?: number;
  lastMessage?: ChatMessage;
  unread: number;
  pinned?: boolean;
  muted?: boolean;
}

// --- The aggregate SDK, one group per product-sdk package --------------------

export interface ProductSDK {
  /** `@parity/product-sdk-host` — detect Host + capability handshake. */
  host: {
    info(): Promise<HostInfo>;
  };

  /** `@parity/product-sdk-signer` — mediated signing + PoP alias / under_alias. */
  signer: {
    /** Run Proof of Personhood once; returns an unlinkable per-Product alias. */
    proveHumanity(): Promise<PopProof>;
    /** Sign an arbitrary payload under the current alias (routes to the phone). */
    sign(payload: string): Promise<string>;
    /** The signed-in account's primary username (for onboarding prefill), or null. */
    getUserId(): Promise<{ primaryUsername: string } | null>;
  };

  /** `@parity/product-sdk-tx` — build + dispatch extrinsics. */
  tx: {
    /** Claim a `.dot` handle via dotNS. */
    claimHandle(handle: DotName, alias: Address): Promise<void>;
    /** Send a tip (balances/Pocket transfer) to a poster. */
    tip(to: Address, amountPlanck: bigint): Promise<string>;
  };

  /** `@parity/product-sdk-chain-client` (+ `descriptors`) — read chain state. */
  chain: {
    resolveHandle(handle: DotName): Promise<Address | null>;
    reverseLookup(alias: Address): Promise<DotName | null>;
    balanceOf(alias: Address): Promise<bigint>;
  };

  /** `@parity/product-sdk-statement-store` — the live, gossiped feed. */
  statements: {
    submit(s: Omit<Statement, "id" | "ts">): Promise<Statement>;
    /** Subscribe to a topic ("home", a channel, or a thread id). Returns unsub. */
    subscribe(topic: string, onStatement: (s: Statement) => void): () => void;
    query(topic: string): Promise<Statement[]>;
  };

  /**
   * Full-featured real-time messenger — hand-rolled over the product-sdk primitives
   * (no host chat surface): messages are signed statements on a per-room topic
   * via `statement-store`, durable history is cached in `local-storage`, media
   * is pinned to the Bulletin Chain via `cloud-storage`, and typing/presence are
   * short-TTL ephemeral statements. Rooms: dm / group / supergroup / channel.
   */
  chat: {
    subscribeRooms(onRooms: (rooms: ChatRoom[]) => void): () => void;
    createRoom(input: { kind: RoomKind; members: Address[]; title?: string }): Promise<string>;
    /** Can the current user post in this room? (false for channel non-admins.) */
    canPost(room: ChatRoom): boolean;
    history(roomId: string, opts?: { before?: string; limit?: number }): Promise<ChatMessage[]>;
    subscribeMessages(roomId: string, onMessage: (m: ChatMessage) => void): () => void;
    send(roomId: string, content: ChatContent, replyTo?: string): Promise<ChatMessage>;
    react(roomId: string, messageId: string, emoji: string): Promise<void>;
    markRead(roomId: string, upToTs: number): Promise<void>;
    /** Ephemeral typing signal (Statement Store, short TTL). */
    setTyping(roomId: string): void;
    subscribeTyping(roomId: string, onTyping: (alias: Address) => void): () => void;
    /** Ephemeral presence ping; subscribe to the set of online aliases. */
    setPresence(): void;
    subscribePresence(onOnline: (online: Set<Address>) => void): () => void;
  };

  /** `@parity/product-sdk-cloud-storage` — pin durable bytes to the Bulletin Chain. */
  storage: {
    put(bytes: string): Promise<Cid>;
    get(cid: Cid): Promise<string | null>;
  };

  /** `@parity/product-sdk-contracts` — PVM social contract (registry/badge/tips). */
  contract: {
    register(handle: DotName, alias: Address, human: boolean): Promise<void>;
    profile(alias: Address): Promise<Profile | null>;
    directory(): Promise<Profile[]>;
    tipJar(alias: Address): Promise<bigint>;
  };

  /** `@parity/product-sdk-keys` — deterministic per-Product key derivation. */
  keys: {
    derive(path: string): Promise<string>;
  };

  /** `@parity/product-sdk-crypto` — sign/verify + encrypt DMs. */
  crypto: {
    encrypt(plaintext: string, key: string): Promise<string>;
    decrypt(ciphertext: string, key: string): Promise<string>;
    verify(payload: string, sig: string, author: Address): Promise<boolean>;
  };

  /** `@parity/product-sdk-address` — SS58 encode / shorten / validate. */
  address: {
    shorten(addr: Address): string;
    isValid(addr: string): boolean;
  };

  /** `@parity/product-sdk-local-storage` — KvStore client cache. */
  kv: {
    get<T>(key: string): T | null;
    set<T>(key: string, value: T): void;
  };

  /** `@parity/product-sdk-logger` — structured logging. */
  log: (scope: string, msg: string, data?: unknown) => void;
}
