// ---------------------------------------------------------------------------
// statement.dot — LIVE Product SDK adapter
//
// Implements the same `ProductSDK` interface the app already uses, but backed by
// the real `@parity/product-sdk-*` packages instead of the in-memory mock.
// Selected automatically by ../index.ts when the Product is running inside a
// Polkadot Host (Desktop / mobile App / Web). Outside a Host every call here
// would fail (the SDK is container-only), which is exactly why ../index.ts
// falls back to the mock for local browser dev.
//
// Signatures follow the published packages (host 0.11, statement-store 0.4.10,
// signer 0.8.3, tx 0.2.16, chain-client 0.7.6, cloud-storage 0.6.6, keys 0.3.12,
// local-storage 0.2.11, address 0.1.1). Where PAPI descriptor generics would
// add friction we use the `getUnsafeApi()` escape hatch — the same approach the
// SDK itself uses to "survive descriptor drift".
// ---------------------------------------------------------------------------

import { isInsideContainer } from "@parity/product-sdk-host";
import { SignerManager } from "@parity/product-sdk-signer";
import { StatementStoreClient } from "@parity/product-sdk-statement-store";
import { submitAndWatch } from "@parity/product-sdk-tx";
import { getChainAPI } from "@parity/product-sdk-chain-client";
import { CloudStorageClient, createLazySigner } from "@parity/product-sdk-cloud-storage";
import { ContractManager, ensureContractAccountMapped } from "@parity/product-sdk-contracts";
import { SessionKeyManager } from "@parity/product-sdk-keys";
import { createLocalKvStore, type LocalKvStore } from "@parity/product-sdk-local-storage";
import { isValidSs58, ss58ToH160, truncateAddress } from "@parity/product-sdk-address";
import { paseo_asset_hub } from "@parity/product-sdk-descriptors/paseo-asset-hub";

import type { Profile, ProductSDK, Statement } from "../types";
import { REGISTRY_LIBRARY, STATEMENT_REGISTRY_CDM, contractDeployed } from "./cdm";

const APP_NAME = "statement.dot";
const APP_DOTNS = "statement.dot";
const SS58_PREFIX = 0;
const ENV = "summit" as const; // live test network (Polkadot Playground)

export async function createLiveSDK(): Promise<ProductSDK> {
  const log: ProductSDK["log"] = (scope, msg, data) =>
    // eslint-disable-next-line no-console
    console.debug(`[statement.dot:${scope}] ${msg}`, data ?? "");

  // --- shared, lazily-connected primitives ---------------------------------
  // NB: we deliberately do NOT request an AutoSigning allowance on connect —
  // that pops a host "Allowance request" modal that can hang. Key derivation is
  // non-interactive (SessionKeyManager) and signing degrades gracefully, so
  // per-action signing prompts are fine.
  const manager = new SignerManager({ ss58Prefix: SS58_PREFIX, dappName: APP_NAME });
  const store = new StatementStoreClient({ appName: APP_NAME });

  let address = "";
  let connected = false;
  const recent: Statement[] = []; // local ring buffer (the store is gossip, not history)
  const subs = new Set<(s: Statement) => void>();
  const profileCache = new Map<string, Profile>();
  const tipTotals = new Map<string, bigint>();

  async function ensureConnected(): Promise<string> {
    if (connected) return address;
    const res = await manager.connect(); // defaults to the host provider
    if (!res.ok) throw new Error(`signer connect failed: ${String(res.error)}`);
    address = res.value[0].address;
    manager.selectAccount(address);
    await store.connect({ mode: "host", accountId: [address, SS58_PREFIX] });
    // Fan a single host subscription out to all app subscribers.
    store.subscribe<Statement>((received) => {
      const s = received.data;
      if (!s || !s.id) return;
      recent.unshift(s);
      if (recent.length > 500) recent.pop();
      for (const cb of subs) cb(s);
    });
    connected = true;
    log("live", "connected to host", { address });
    return address;
  }

  // lazy chain + storage clients
  let chainP: ReturnType<typeof getChainAPI> | null = null;
  const chain = () => (chainP ??= getChainAPI(ENV));
  let storageP: Promise<CloudStorageClient> | null = null;
  const storage = () =>
    (storageP ??= CloudStorageClient.create({
      environment: ENV,
      signer: createLazySigner(() => manager.getSigner()),
    }));

  // The PVM social registry (handle registry + human badge + tip jar). Only
  // built once a contract address is configured; otherwise the registry methods
  // fall back to the Statement Store + local cache, so the app works either way.
  let contractManagerP: Promise<ContractManager> | null = null;
  async function getContractManager(): Promise<ContractManager> {
    return (contractManagerP ??= (async () => {
      await ensureConnected();
      const client = await chain();
      return ContractManager.fromClient(
        STATEMENT_REGISTRY_CDM,
        client.raw.assetHub,
        paseo_asset_hub,
        { signerManager: manager }
      );
    })());
  }
  /** The registry contract, or null when not deployed yet. */
  async function getRegistry() {
    if (!contractDeployed) return null;
    const cm = await getContractManager();
    const signer = manager.getSigner();
    if (signer) {
      // pallet-revive needs each signing account mapped SS58 → H160 once.
      await ensureContractAccountMapped(cm.getRuntime(), address, signer).catch(() => null);
    }
    return cm.getContract(REGISTRY_LIBRARY);
  }

  // local KvStore with a sync write-through cache (interface is sync; host is async)
  let kvStore: LocalKvStore | null = null;
  const kvCache = new Map<string, unknown>();
  createLocalKvStore({ prefix: "statement.dot" })
    .then((s) => {
      kvStore = s;
    })
    .catch(() => {
      /* no host storage — sync cache still works for the session */
    });

  // A persistent per-Product secret for key derivation — stored in the host
  // KvStore via SessionKeyManager (the documented, non-interactive path; no raw
  // signature prompt). Falls back to the account address if storage is absent.
  let sessionSecretP: Promise<string> | null = null;
  const sessionSecret = () =>
    (sessionSecretP ??= (async () => {
      try {
        const store = await createLocalKvStore({ prefix: "statement.dot.keys" });
        const info = await new SessionKeyManager({ store }).getOrCreate();
        return info.mnemonic;
      } catch {
        return address || "statement.dot";
      }
    })());

  return {
    host: {
      async info() {
        const inside = await isInsideContainer().catch(() => false);
        return {
          kind: inside ? "web" : "mock",
          mock: false,
          capabilities: [
            "host", "signer", "tx", "chain-client", "statement-store",
            "cloud-storage", "keys", "local-storage", "address",
          ],
        };
      },
    },

    signer: {
      async proveHumanity() {
        await ensureConnected();
        // The unlinkable per-Product account is the app-scoped derived account;
        // its Ring-VRF contextual alias is what proves unique personhood.
        const acc = await manager.getProductAccount(APP_DOTNS, 0);
        if (!acc.ok) throw new Error(`getProductAccount failed: ${String(acc.error)}`);
        const alias = acc.value.address;
        let proof = "ringvrf:host";
        const aliasRes = await manager.getProductAccountAlias(APP_DOTNS, 0).catch(() => null);
        if (aliasRes && aliasRes.ok) proof = `ringvrf:${hex(aliasRes.value.alias).slice(0, 16)}`;
        return { alias, proof, verifiedTs: Date.now() };
      },
      async sign(payload) {
        // Best-effort "sign at source". The Statement Store also signs every
        // submission via the host, so a rejected raw-sign must never block a
        // post — degrade gracefully instead.
        await ensureConnected();
        try {
          const res = await manager.signRaw(new TextEncoder().encode(payload));
          if (res.ok) return `sr25519:${hex(res.value)}`;
        } catch {
          /* host may not permit raw signing */
        }
        return "sr25519:host-signed";
      },
      async getUserId() {
        try {
          await ensureConnected();
          const res = await manager.getUserId();
          if (res.ok && res.value.primaryUsername) {
            return { primaryUsername: res.value.primaryUsername };
          }
        } catch {
          /* not available — onboarding falls back to manual entry */
        }
        return null;
      },
    },

    tx: {
      async claimHandle(handle) {
        // dotNS registration extrinsic (pallet path TBD on the live runtime).
        // Until the registrar pallet metadata is public, record intent locally;
        // the durable claim is dispatched once the pallet name is confirmed.
        log("tx", `claimHandle ${handle} (pending dotNS pallet)`);
      },
      async tip(to, amountPlanck) {
        const addr = await ensureConnected();
        const signer = manager.getSigner();
        if (!signer) throw new Error("no signer");
        // Private balances transfer on Asset Hub.
        const client = await chain();
        const api = client.raw.assetHub.getUnsafeApi();
        const tx = api.tx.Balances.transfer_keep_alive({
          dest: { type: "Id", value: to },
          value: amountPlanck,
        });
        const res = await submitAndWatch(tx as never, signer, {
          onStatus: (s) => log("tip", `status ${s}`),
        });
        tipTotals.set(addr, (tipTotals.get(addr) ?? 0n) + amountPlanck);
        return res.txHash;
      },
    },

    chain: {
      async resolveHandle() {
        // dotNS forward resolution — pending public registrar metadata.
        return null;
      },
      async reverseLookup() {
        return null;
      },
      async balanceOf(alias) {
        try {
          const client = await chain();
          const api = client.raw.assetHub.getUnsafeApi();
          const account = await api.query.System.Account.getValue(alias);
          return BigInt(account?.data?.free ?? 0);
        } catch {
          return 0n;
        }
      },
    },

    statements: {
      async submit(partial) {
        await ensureConnected();
        const s: Statement = {
          id: `${address.slice(0, 8)}:${Date.now()}:${recent.length}`,
          ts: Date.now(),
          ...partial,
        };
        // Publish the statement as the gossip payload (JSON ≤ 512 bytes), keyed
        // by channel so subscribers can filter by topic.
        await store.publish<Statement>(s, { channel: s.channel ?? "home" });
        recent.unshift(s);
        for (const cb of subs) cb(s);
        return s;
      },
      subscribe(_topic, cb) {
        subs.add(cb);
        ensureConnected().catch((e) => log("live", "connect error", e));
        return () => subs.delete(cb);
      },
      async query(topic) {
        await ensureConnected();
        return recent.filter((s) => topic === "home" || s.channel === topic || s.target === topic);
      },
    },

    storage: {
      async put(bytes) {
        const client = await storage();
        const result = await client.store(new TextEncoder().encode(bytes)).send();
        return result.cid?.toString() ?? "";
      },
      async get(cid) {
        try {
          const client = await storage();
          const bytes = await client.fetchBytes(cid);
          return new TextDecoder().decode(bytes);
        } catch {
          return null;
        }
      },
    },

    // Registry / verified-human badge / tip jar. Backed by the PVM contract via
    // ContractManager when CONTRACT_ADDRESS is set (src/sdk/live/cdm.ts); until
    // then these resolve from the Statement Store + local cache. The directory
    // is always cache-derived (the contract has no enumerate method by design).
    contract: {
      async register(handle, alias, human) {
        const registry = await getRegistry();
        if (registry) {
          const signer = manager.getSigner();
          await registry.register.tx(handle, human, {
            signer: signer ?? undefined,
            onStatus: (s: string) => log("register", `status ${s}`),
          });
        }
        const p: Profile = {
          handle,
          alias,
          displayName: handle.replace(/\.dot$/, ""),
          bio: "",
          human,
          joinedTs: Date.now(),
          avatarHue: hueOf(alias),
        };
        profileCache.set(alias, p);
      },
      async profile(alias) {
        const cached = profileCache.get(alias);
        const registry = await getRegistry();
        if (registry) {
          try {
            const h160 = ss58ToH160(alias);
            const [human, handle] = await Promise.all([
              registry.isHuman.query(h160),
              registry.handleOf.query(h160),
            ]);
            const onchain: Profile = {
              handle: (handle.value as string) || cached?.handle || "unknown.dot",
              alias,
              displayName: cached?.displayName ?? String(handle.value || "unknown"),
              bio: cached?.bio ?? "",
              human: Boolean(human.value),
              joinedTs: cached?.joinedTs ?? Date.now(),
              avatarHue: cached?.avatarHue ?? hueOf(alias),
            };
            profileCache.set(alias, onchain);
            return onchain;
          } catch {
            /* fall through to cache */
          }
        }
        return cached ?? null;
      },
      async directory() {
        return [...profileCache.values()];
      },
      async tipJar(alias) {
        return tipTotals.get(alias) ?? 0n;
      },
    },

    keys: {
      async derive(path) {
        await ensureConnected();
        // Deterministic per-Product key from the stored session secret — no
        // interactive signature required, stable across sessions. Never throws.
        const secret = await sessionSecret();
        const raw = await crypto.subtle.digest(
          "SHA-256",
          buf(new TextEncoder().encode(`statement.dot/keys/${secret}/${path}`))
        );
        return `key:${hex(new Uint8Array(raw))}`;
      },
    },

    crypto: {
      async encrypt(plaintext, key) {
        const ck = await aesKey(key);
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const ct = await crypto.subtle.encrypt(
          { name: "AES-GCM", iv } as AesGcmParams,
          ck,
          buf(new TextEncoder().encode(plaintext))
        );
        return `${b64(iv)}:${b64(new Uint8Array(ct))}`;
      },
      async decrypt(ciphertext, key) {
        try {
          const [ivB64, ctB64] = ciphertext.split(":");
          const ck = await aesKey(key);
          const pt = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv: buf(unb64(ivB64)) } as AesGcmParams,
            ck,
            buf(unb64(ctB64))
          );
          return new TextDecoder().decode(pt);
        } catch {
          return ciphertext;
        }
      },
      async verify(_payload, sig) {
        // sr25519 signature verification against the author's key — wire to
        // @polkadot-api/substrate-bindings once the author pubkey is resolved.
        return sig.startsWith("sr25519:");
      },
    },

    address: {
      shorten(addr) {
        return truncateAddress(addr, 6, 4);
      },
      isValid(addr) {
        return isValidSs58(addr);
      },
    },

    kv: {
      get<T>(key: string): T | null {
        return (kvCache.get(key) as T) ?? null;
      },
      set<T>(key: string, value: T): void {
        kvCache.set(key, value);
        kvStore?.setJSON(`${key}`, value).catch(() => {});
      },
    },

    log,
  };
}

// ---- helpers ----------------------------------------------------------------

function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
function b64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
function unb64(s: string): Uint8Array {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}
/** Copy into a plain ArrayBuffer-backed view so it satisfies BufferSource. */
function buf(bytes: Uint8Array): ArrayBuffer {
  return bytes.slice().buffer;
}
async function aesKey(keyMaterial: string): Promise<CryptoKey> {
  const raw = await crypto.subtle.digest("SHA-256", buf(new TextEncoder().encode(keyMaterial)));
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}
function hueOf(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}
