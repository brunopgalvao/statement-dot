import type {
  Address,
  DotName,
  HostInfo,
  PopProof,
  Profile,
  ProductSDK,
  Statement,
} from "../types";
import { BASE, SEED_PROFILES, SEED_STATEMENTS } from "./data";

// ---------------------------------------------------------------------------
// In-memory mock of the whole Product SDK. Simulates the People Chain Statement
// Store (gossip + subscribers), the Bulletin Chain (CID store), dotNS, and the
// PVM social contract. Lets the entire app run with zero devices, then gets
// swapped for a `live/` adapter that imports the real @parity/product-sdk
// packages behind the same `ProductSDK` interface.
// ---------------------------------------------------------------------------

type Subscriber = { topic: string; cb: (s: Statement) => void };

export function createMockSDK(): ProductSDK {
  const profiles = new Map<Address, Profile>(SEED_PROFILES.map((p) => [p.alias, p]));
  const handles = new Map<DotName, Address>(SEED_PROFILES.map((p) => [p.handle, p.alias]));
  const statements: Statement[] = [...SEED_STATEMENTS];
  const blobs = new Map<string, string>();
  const tipJars = new Map<Address, bigint>();
  const subscribers = new Set<Subscriber>();
  const balances = new Map<Address, bigint>();
  let clock = BASE + 3_600_000; // a little after the newest seed
  let seq = 100;

  // A monotonic, reload-stable clock (Date.now is unavailable in some hosts /
  // breaks determinism, so we tick our own).
  const now = () => (clock += 1000);
  const id = () => `s${seq++}`;

  const fanout = (s: Statement) => {
    for (const sub of subscribers) {
      if (sub.topic === "home" || sub.topic === s.channel || sub.topic === s.target) {
        sub.cb(s);
      }
    }
  };

  // Gentle simulated liveness: seeded humans occasionally say something so the
  // feed feels alive. (They're humans, not bots — this network has no bots.)
  const chatter: { body: string; channel: string }[] = [
    { body: "just claimed my handle. the .dot name resolving to an alias the app can't link back to me still feels like magic.", channel: "home" },
    { body: "watching a statement gossip across the network in real time. no server in the middle. wild.", channel: "builders" },
    { body: "tipped a stranger for a good take. private payment, no invoice, no middleman.", channel: "home" },
    { body: "verified-human badge means my replies are from a person. the signal-to-noise here is unreal.", channel: "personhood" },
    { body: "elastic scaling on the relay chain means a parachain can grab more blockspace exactly when it needs it. no more fixed slots.", channel: "polkadot" },
    { body: "treasury tip just cleared via OpenGov. governance that actually ships, who knew.", channel: "governance" },
  ];
  let chatterIdx = 0;
  const liveTimer = setInterval(() => {
    if (subscribers.size === 0) return;
    const author = SEED_PROFILES[chatterIdx % SEED_PROFILES.length].alias;
    const c = chatter[chatterIdx % chatter.length];
    const s: Statement = {
      id: id(),
      kind: "post",
      author,
      ts: now(),
      body: c.body,
      channel: c.channel,
      ttl: 3600,
    };
    chatterIdx++;
    statements.unshift(s);
    fanout(s);
  }, 18_000);
  // Don't keep the event loop alive in test/node contexts.
  (liveTimer as unknown as { unref?: () => void }).unref?.();

  const ns = "statement.dot";

  return {
    host: {
      async info(): Promise<HostInfo> {
        return {
          kind: "mock",
          mock: true,
          capabilities: [
            "host", "signer", "tx", "chain-client", "statement-store",
            "cloud-storage", "contracts", "keys", "crypto", "address",
            "local-storage", "logger",
          ],
        };
      },
    },

    signer: {
      async proveHumanity(): Promise<PopProof> {
        await wait(450);
        // Unlinkable per-Product alias — deterministic for this mock session.
        const alias = `5You${ns.replace(/\W/g, "")}Alias${seq}00000000000000`.slice(0, 47);
        return { alias, proof: `ringvrf:${alias.slice(0, 12)}`, verifiedTs: now() };
      },
      async sign(payload: string): Promise<string> {
        await wait(120);
        return `sr25519:${hash(payload)}`;
      },
      async getUserId() {
        // No signed-in Host identity in the mock — onboarding stays manual.
        return null;
      },
    },

    tx: {
      async claimHandle(handle: DotName, alias: Address): Promise<void> {
        await wait(400);
        if (handles.has(handle)) throw new Error(`${handle} is already claimed`);
        handles.set(handle, alias);
      },
      async tip(to: Address, amountPlanck: bigint): Promise<string> {
        await wait(350);
        tipJars.set(to, (tipJars.get(to) ?? 0n) + amountPlanck);
        balances.set(to, (balances.get(to) ?? 0n) + amountPlanck);
        return `0xtip${hash(to + amountPlanck)}`;
      },
    },

    chain: {
      async resolveHandle(handle) {
        await wait(60);
        return handles.get(handle) ?? null;
      },
      async reverseLookup(alias) {
        await wait(60);
        for (const [h, a] of handles) if (a === alias) return h;
        return null;
      },
      async balanceOf(alias) {
        await wait(60);
        return balances.get(alias) ?? 0n;
      },
    },

    statements: {
      async submit(partial) {
        await wait(80);
        const s: Statement = { id: id(), ts: now(), ...partial };
        statements.unshift(s);
        fanout(s);
        return s;
      },
      subscribe(topic, cb) {
        const sub: Subscriber = { topic, cb };
        subscribers.add(sub);
        return () => subscribers.delete(sub);
      },
      async query(topic) {
        await wait(60);
        return statements.filter(
          (s) => topic === "home" || s.channel === topic || s.target === topic
        );
      },
    },

    storage: {
      async put(bytes) {
        await wait(200);
        const cid = `bafy${hash(bytes)}`;
        blobs.set(cid, bytes);
        return cid;
      },
      async get(cid) {
        await wait(120);
        return blobs.get(cid) ?? null;
      },
    },

    contract: {
      async register(handle, alias, human) {
        await wait(300);
        const existing = profiles.get(alias);
        profiles.set(alias, {
          handle,
          alias,
          displayName: existing?.displayName ?? handle.replace(/\.dot$/, ""),
          bio: existing?.bio ?? "",
          human,
          joinedTs: existing?.joinedTs ?? now(),
          avatarHue: existing?.avatarHue ?? hueOf(alias),
        });
      },
      async profile(alias) {
        await wait(50);
        return profiles.get(alias) ?? null;
      },
      async directory() {
        await wait(80);
        return [...profiles.values()];
      },
      async tipJar(alias) {
        await wait(50);
        return tipJars.get(alias) ?? 0n;
      },
    },

    keys: {
      async derive(path) {
        await wait(40);
        return `key:${hash(ns + path)}`;
      },
    },

    crypto: {
      async encrypt(plaintext, key) {
        await wait(20);
        return `enc(${key.slice(0, 6)}):${btoa(unescape(encodeURIComponent(plaintext)))}`;
      },
      async decrypt(ciphertext, _key) {
        await wait(20);
        const m = ciphertext.match(/^enc\([^)]+\):(.*)$/);
        return m ? decodeURIComponent(escape(atob(m[1]))) : ciphertext;
      },
      async verify(payload, sig) {
        await wait(20);
        return sig === `sr25519:${hash(payload)}`;
      },
    },

    address: {
      shorten(addr) {
        return addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
      },
      isValid(addr) {
        return typeof addr === "string" && addr.length >= 8;
      },
    },

    kv: {
      get<T>(key: string): T | null {
        try {
          const raw = globalThis.localStorage?.getItem(`statement.dot:${key}`);
          return raw ? (JSON.parse(raw) as T) : null;
        } catch {
          return null;
        }
      },
      set<T>(key: string, value: T): void {
        try {
          globalThis.localStorage?.setItem(`statement.dot:${key}`, JSON.stringify(value));
        } catch {
          /* storage unavailable — non-fatal */
        }
      },
    },

    log(scope, msg, data) {
      // eslint-disable-next-line no-console
      console.debug(`[statement.dot:${scope}] ${msg}`, data ?? "");
    },
  };
}

// ---- tiny deterministic helpers --------------------------------------------

function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function hash(input: string | bigint): string {
  const s = String(input);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

function hueOf(alias: string): number {
  return parseInt(hash(alias).slice(0, 4), 16) % 360;
}
