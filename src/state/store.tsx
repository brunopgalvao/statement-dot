import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { bootSDK, getSDK, type PopProof, type Profile, type Statement } from "@/sdk";

// Starts as the mock; `bootSDK()` swaps in the live adapter inside a Host.
// `sdk` is a module `let`, so the swap propagates to importers (live binding).
let sdk = getSDK();

const DOT = 10_000_000_000n; // 1 DOT in planck (mock)

export interface Session {
  profile: Profile;
  pop: PopProof;
  dmKey: string;
}

export type OnboardStep = "pop" | "handle" | "record" | "done";
export type Scope = "everyone" | "following";

export interface Counts {
  like: number;
  reply: number;
  echo: number;
}

interface StoreValue {
  ready: boolean;
  hostKind: string;
  session: Session | null;
  feed: Statement[];
  profiles: Record<string, Profile>;
  following: Set<string>;
  liked: Set<string>;
  echoed: Set<string>;
  tipsGiven: number;
  // navigation
  threadId: string | null;
  profileAlias: string | null;
  activeChannel: string | null;
  scope: Scope;
  // derived
  countsFor(id: string): Counts;
  repliesOf(id: string): Statement[];
  statementById(id: string): Statement | undefined;
  profileFor(alias: string): Profile | undefined;
  // actions
  onboard(
    input: { handle: string; displayName: string; bio: string },
    onStep?: (step: OnboardStep) => void
  ): Promise<void>;
  post(input: { body: string; channel?: string }): Promise<void>;
  reply(parentId: string, body: string): Promise<void>;
  like(statementId: string): Promise<void>;
  echo(statementId: string): Promise<void>;
  follow(alias: string): Promise<void>;
  tip(alias: string, dot?: number): Promise<void>;
  vote(statementId: string, actionId: string): void;
  openThread(id: string): void;
  closeThread(): void;
  openProfile(alias: string): void;
  closeProfile(): void;
  setChannel(channel: string | null): void;
  setScope(scope: Scope): void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [hostKind, setHostKind] = useState("mock");
  const [session, setSession] = useState<Session | null>(null);
  const [feed, setFeed] = useState<Statement[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [echoed, setEchoed] = useState<Set<string>>(new Set());
  const [voted, setVoted] = useState<Set<string>>(new Set());
  const [tipsGiven, setTipsGiven] = useState(0);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [profileAlias, setProfileAlias] = useState<string | null>(null);
  const [activeChannel, setActiveChannel] = useState<string | null>(null);
  const [scope, setScope] = useState<Scope>("everyone");

  // Boot: host handshake, hydrate cache, load directory + feed, subscribe.
  useEffect(() => {
    let unsub = () => {};
    (async () => {
      sdk = await bootSDK();
      const info = await sdk.host.info();
      setHostKind(info.kind);

      const dir = await sdk.contract.directory();
      setProfiles(Object.fromEntries(dir.map((p) => [p.alias, p])));

      const initial = await sdk.statements.query("home");
      // Profile statements resolve aliases -> handles; they're metadata, not feed.
      initial.forEach(ingestProfile);
      setFeed(dedupe(initial.filter((s) => s.kind !== "profile")));

      const cached = sdk.kv.get<Session>("session");
      if (cached) setSession(cached);

      unsub = sdk.statements.subscribe("home", (s) => {
        if (s.kind === "profile") {
          ingestProfile(s);
          return;
        }
        setFeed((prev) => dedupe([s, ...prev]));
        ensureProfile(s.author);
      });

      setReady(true);
    })();
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // dotNS / identity resolution on a gossip network: every user broadcasts a
  // signed `profile` statement carrying their handle + display name, and clients
  // build the alias -> identity map from those. Announce ours once we're ready.
  const announced = useRef(false);
  useEffect(() => {
    if (!ready || !session || announced.current) return;
    announced.current = true;
    const p = session.profile;
    sdk.statements
      .submit({
        kind: "profile",
        author: session.pop.alias,
        body: JSON.stringify({
          handle: p.handle,
          displayName: p.displayName,
          bio: p.bio,
          human: p.human,
          avatarHue: p.avatarHue,
        }),
        channel: "home",
      })
      .catch(() => {});
  }, [ready, session]);

  // Always keep the signed-in user's own profile resolvable, even after a
  // reload when the in-memory registry is empty (otherwise your own posts
  // render as "unknown").
  useEffect(() => {
    if (session) {
      setProfiles((prev) => ({ ...prev, [session.pop.alias]: session.profile }));
    }
  }, [session]);

  const ensureProfile = useCallback((alias: string) => {
    setProfiles((prev) => {
      if (prev[alias]) return prev;
      sdk.contract.profile(alias).then((p) => {
        if (p) setProfiles((cur) => ({ ...cur, [alias]: p }));
      });
      return prev;
    });
  }, []);

  // Parse a broadcast `profile` statement into the alias -> identity map.
  const ingestProfile = useCallback((s: Statement) => {
    if (s.kind !== "profile" || !s.body) return;
    let data: Partial<Profile>;
    try {
      data = JSON.parse(s.body) as Partial<Profile>;
    } catch {
      return;
    }
    if (!data.handle && !data.displayName) return;
    setProfiles((prev) => {
      const existing = prev[s.author];
      // Don't overwrite our own session-backed profile with a stale broadcast.
      const merged: Profile = {
        handle: data.handle ?? existing?.handle ?? "",
        alias: s.author,
        displayName: data.displayName ?? existing?.displayName ?? data.handle ?? "",
        bio: data.bio ?? existing?.bio ?? "",
        human: data.human ?? existing?.human ?? true,
        joinedTs: existing?.joinedTs ?? s.ts,
        avatarHue: data.avatarHue ?? existing?.avatarHue ?? hueOf(s.author),
      };
      return { ...prev, [s.author]: merged };
    });
  }, []);

  // Every like/reply/echo is itself a statement that gossips into the feed, so
  // counts are just an aggregation of the feed — no separate bookkeeping.
  const counts = useMemo(() => {
    const map: Record<string, Counts> = {};
    for (const s of feed) {
      if (!s.target) continue;
      const c = (map[s.target] ??= { like: 0, reply: 0, echo: 0 });
      if (s.kind === "like") c.like++;
      else if (s.kind === "reply") c.reply++;
      else if (s.kind === "repost") c.echo++;
    }
    return map;
  }, [feed]);

  const repliesByTarget = useMemo(() => {
    const map: Record<string, Statement[]> = {};
    for (const s of feed) {
      if (s.kind !== "reply" || !s.target) continue;
      (map[s.target] ??= []).push(s);
    }
    for (const k of Object.keys(map)) map[k].sort((a, b) => a.ts - b.ts);
    return map;
  }, [feed]);

  const byId = useMemo(() => {
    const map: Record<string, Statement> = {};
    for (const s of feed) map[s.id] = s;
    return map;
  }, [feed]);

  const onboard = useCallback<StoreValue["onboard"]>(async ({ handle, displayName, bio }, onStep) => {
    onStep?.("pop");
    const pop = await sdk.signer.proveHumanity();
    onStep?.("handle");
    const dotName = handle.endsWith(".dot") ? handle : `${handle}.dot`;
    await sdk.tx.claimHandle(dotName, pop.alias);
    onStep?.("record");
    await sdk.contract.register(dotName, pop.alias, true);
    const profile = await sdk.contract.profile(pop.alias);
    const merged: Profile = {
      handle: dotName,
      alias: pop.alias,
      displayName: displayName || handle,
      bio,
      human: true,
      joinedTs: profile?.joinedTs ?? 0,
      avatarHue: profile?.avatarHue ?? 300,
    };
    const dmKey = await sdk.keys.derive("dm/v1");
    setProfiles((prev) => ({ ...prev, [pop.alias]: merged }));
    const next: Session = { profile: merged, pop, dmKey };
    setSession(next);
    sdk.kv.set("session", next);
    onStep?.("done");
    sdk.log("onboard", `welcome ${dotName}`);
  }, []);

  const post = useCallback<StoreValue["post"]>(
    async ({ body, channel = "home" }) => {
      if (!session) return;
      const isLong = body.length > 280;
      const cid = isLong ? await sdk.storage.put(body) : undefined;
      await sdk.signer.sign(body);
      await sdk.statements.submit({
        kind: "post",
        author: session.pop.alias,
        body: isLong ? undefined : body,
        cid,
        channel,
      });
    },
    [session]
  );

  const reply = useCallback<StoreValue["reply"]>(
    async (parentId, body) => {
      if (!session) return;
      await sdk.signer.sign(body);
      await sdk.statements.submit({
        kind: "reply",
        author: session.pop.alias,
        body,
        target: parentId,
        channel: "home",
      });
    },
    [session]
  );

  const like = useCallback<StoreValue["like"]>(
    async (statementId) => {
      if (!session || liked.has(statementId)) return;
      setLiked((prev) => new Set(prev).add(statementId));
      await sdk.statements.submit({
        kind: "like",
        author: session.pop.alias,
        target: statementId,
        channel: "home",
      });
    },
    [session, liked]
  );

  const echo = useCallback<StoreValue["echo"]>(
    async (statementId) => {
      if (!session || echoed.has(statementId)) return;
      setEchoed((prev) => new Set(prev).add(statementId));
      await sdk.statements.submit({
        kind: "repost",
        author: session.pop.alias,
        target: statementId,
        channel: "home",
      });
    },
    [session, echoed]
  );

  const follow = useCallback<StoreValue["follow"]>(
    async (alias) => {
      if (!session) return;
      setFollowing((prev) => {
        const next = new Set(prev);
        next.has(alias) ? next.delete(alias) : next.add(alias);
        return next;
      });
      await sdk.statements.submit({
        kind: "follow",
        author: session.pop.alias,
        target: alias,
        channel: "home",
      });
    },
    [session]
  );

  const tip = useCallback<StoreValue["tip"]>(
    async (alias, dot = 1) => {
      if (!session) return;
      await sdk.tx.tip(alias, BigInt(dot) * DOT);
      setTipsGiven((n) => n + dot);
      sdk.log("tip", `sent ${dot} DOT`, { to: alias });
    },
    [session]
  );

  const vote = useCallback<StoreValue["vote"]>(
    (statementId, actionId) => {
      if (voted.has(statementId)) return;
      setVoted((prev) => new Set(prev).add(statementId));
      setFeed((prev) =>
        prev.map((s) => {
          if (s.id !== statementId || !s.frame) return s;
          return {
            ...s,
            frame: {
              ...s.frame,
              tally: { ...s.frame.tally, [actionId]: (s.frame.tally[actionId] ?? 0) + 1 },
            },
          };
        })
      );
      sdk.log("frame", `voted ${statementId}:${actionId}`);
    },
    [voted]
  );

  const openThread = useCallback((id: string) => {
    setThreadId(id);
    setProfileAlias(null);
  }, []);
  const closeThread = useCallback(() => setThreadId(null), []);
  const openProfile = useCallback((alias: string) => {
    setProfileAlias(alias);
    setThreadId(null);
  }, []);
  const closeProfile = useCallback(() => setProfileAlias(null), []);
  const setChannel = useCallback((c: string | null) => setActiveChannel(c), []);

  const countsFor = useCallback(
    (id: string): Counts => counts[id] ?? { like: 0, reply: 0, echo: 0 },
    [counts]
  );
  const repliesOf = useCallback((id: string) => repliesByTarget[id] ?? [], [repliesByTarget]);
  const statementById = useCallback((id: string) => byId[id], [byId]);
  const profileFor = useCallback((alias: string) => profiles[alias], [profiles]);

  const value = useMemo<StoreValue>(
    () => ({
      ready, hostKind, session, feed, profiles, following, liked, echoed, tipsGiven,
      threadId, profileAlias, activeChannel, scope,
      countsFor, repliesOf, statementById, profileFor,
      onboard, post, reply, like, echo, follow, tip, vote,
      openThread, closeThread, openProfile, closeProfile, setChannel, setScope,
    }),
    [ready, hostKind, session, feed, profiles, following, liked, echoed, tipsGiven,
      threadId, profileAlias, activeChannel, scope,
      countsFor, repliesOf, statementById, profileFor,
      onboard, post, reply, like, echo, follow, tip, vote,
      openThread, closeThread, openProfile, closeProfile, setChannel]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within <StoreProvider>");
  return ctx;
}

export { sdk };

function hueOf(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}

function dedupe(list: Statement[]): Statement[] {
  const seen = new Set<string>();
  const out: Statement[] = [];
  for (const s of list) {
    if (seen.has(s.id)) continue;
    seen.add(s.id);
    out.push(s);
  }
  return out.sort((a, b) => b.ts - a.ts);
}
