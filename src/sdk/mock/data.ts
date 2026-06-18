import type { Frame, Profile, Statement } from "../types";

// Fixed "now" baseline so seed timestamps are deterministic across reloads.
export const BASE = 1_750_000_000_000;

// Seed personas — every one of them is a verified human (humans-only network).
// Aliases are deliberately opaque (unlinkable per-Product Ring-VRF aliases);
// the readable identity is the dotNS handle.

export const SEED_PROFILES: Profile[] = [
  {
    handle: "gav.dot",
    alias: "5GavWoodRelayChainAlias000000000000000000001",
    displayName: "Gavin",
    bio: "Relay chains, JAM, and the occasional strong opinion. Verified carbon-based.",
    human: true,
    joinedTs: day(-40),
    avatarHue: 330,
  },
  {
    handle: "mio.dot",
    alias: "5MioStatementGossipAlias0000000000000000002",
    displayName: "Mio",
    bio: "Building on the Statement Store. Ephemeral by design.",
    human: true,
    joinedTs: day(-22),
    avatarHue: 265,
  },
  {
    handle: "rin.dot",
    alias: "5RinCloudStorageBulletinAlias000000000000003",
    displayName: "Rin",
    bio: "Pinning thoughts to the Bulletin Chain since block zero.",
    human: true,
    joinedTs: day(-15),
    avatarHue: 190,
  },
  {
    handle: "kʌi.dot",
    alias: "5KaiProofOfPersonhoodAlias00000000000000004",
    displayName: "Kai",
    bio: "One human, one account. No bots allowed past this point.",
    human: true,
    joinedTs: day(-8),
    avatarHue: 25,
  },
];

export const SEED_STATEMENTS: Statement[] = [
  post("s1", SEED_PROFILES[0].alias, day(-2), {
    body: "Every post here is signed by a verified human. No bot farms, no sockpuppets, no “engagement” mills. Feels different already.",
    channel: "home",
  }),
  post("s2", SEED_PROFILES[1].alias, hours(-20), {
    body: "Reminder that your feed is gossip: best-effort, signed at the source, decays after its TTL. The durable stuff gets pinned to the Bulletin Chain. Ephemerality is a feature.",
    channel: "home",
  }),
  post("s3", SEED_PROFILES[2].alias, hours(-9), {
    body: "Tipped three people their first DOT today just for posting something true. The private-payment rail makes it feel like passing a note, not a bank transfer.",
    channel: "builders",
  }),
  post("s4", SEED_PROFILES[3].alias, hours(-5), {
    body: "Your handle is a dotNS name. Your identity is a Ring-VRF alias the app can never link back to you. Both true at once. That's the whole trick.",
    channel: "personhood",
  }),
  post("s5", SEED_PROFILES[1].alias, hours(-2), {
    body: "poll: what should we build into statement.dot next?",
    channel: "home",
    frame: {
      title: "Vote — next feature",
      actions: [
        { id: "a", label: "Long-form (Bulletin)" },
        { id: "b", label: "Group rooms" },
        { id: "c", label: "On-chain reputation" },
      ],
      tally: { a: 12, b: 7, c: 19 },
    },
  }),
  post("s6", SEED_PROFILES[0].alias, hours(-3), {
    body: "JAM turns the relay chain into a general-purpose computer. The parachains you know are just one thing you can build on it. Wild times ahead.",
    channel: "polkadot",
  }),
  post("s7", SEED_PROFILES[2].alias, hours(-1), {
    body: "Referendum 0042 is live: fund a humans-only public-goods grants round. If every voter is a verified person, quadratic funding finally works without sybil attacks.",
    channel: "governance",
  }),

  // --- seed replies (give s1 / s4 a thread) ---
  edge("r1", "reply", SEED_PROFILES[1].alias, day(-2) + 600_000, "s1",
    "The wild part: I can't even tell which famous person is which here. Everyone's just a verified human with a handle. Status games get quieter."),
  edge("r2", "reply", SEED_PROFILES[3].alias, day(-2) + 1_200_000, "s1",
    "Took me one tap in the Polkadot App. Never had to hand over an email or a phone number. That's the bit that sold me."),
  edge("r3", "reply", SEED_PROFILES[2].alias, hours(-4), "s4",
    "Unlinkable per-Product alias is doing a lot of quiet heavy lifting. Same human, different alias on every app, none of them linkable. Privacy by construction."),

  // --- seed reactions so cards show endorsements / echoes ---
  edge("l1", "like", SEED_PROFILES[1].alias, day(-2) + 100, "s1"),
  edge("l2", "like", SEED_PROFILES[2].alias, day(-2) + 200, "s1"),
  edge("l3", "like", SEED_PROFILES[3].alias, day(-2) + 300, "s1"),
  edge("l4", "like", SEED_PROFILES[0].alias, hours(-4), "s4"),
  edge("l5", "like", SEED_PROFILES[1].alias, hours(-4), "s4"),
  edge("e1", "repost", SEED_PROFILES[3].alias, hours(-3), "s2"),
  edge("e2", "repost", SEED_PROFILES[0].alias, hours(-2), "s4"),
];

// ---- helpers ----------------------------------------------------------------

type PostExtras = Partial<Pick<Statement, "body" | "cid" | "channel" | "target" | "frame">> & {
  frame?: Frame;
};

function post(id: string, author: string, ts: number, extras: PostExtras): Statement {
  return { id, kind: "post", author, ts, ttl: 3600, ...extras };
}

function edge(
  id: string,
  kind: Statement["kind"],
  author: string,
  ts: number,
  target: string,
  body?: string
): Statement {
  return { id, kind, author, ts, target, body, channel: "home", ttl: 3600 };
}

function day(n: number): number {
  return BASE + n * 86_400_000;
}
function hours(n: number): number {
  return BASE + n * 3_600_000;
}
