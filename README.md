# statement.dot

**A humans-only social network, built as a Polkadot Product.**

> _Statements you can verify, from humans you can't fake._

**🟢 Live:** [statement.dot.li](https://statement.dot.li) — registered via dotNS on the **summit**
testnet (Polkadot Playground), bundle pinned to the Bulletin Chain.
App CID `bafybeih5ut6zr3ei5sbjhbtbh5hpq26gktm2pwdl2xrkkjex4yjlwnsduy`.

A social network with the one thing X and the rest can't buy: **Proof of
Personhood**. Every account clears a one-time Ring-VRF proof in the Polkadot App and gets an
**unlinkable per-Product alias** — so the network can prove you're a unique human while knowing
nothing about who you are. No bots, no sockpuppets, no engagement farms.

- **Handles** are [dotNS](https://docs.polkadot.com/) names (`alice.dot`).
- **Posts** are signed _statements_ gossiped through the **Statement Store** on the People Chain.
- **Durable** posts + media pin to the **Bulletin Chain** as CIDs.
- **Tips** flow through private **Coinage / Pocket** payments.
- The whole thing is a static bundle published to `statement.dot`, served at `statement.dot.li`.

Built on the [Polkadot Product SDK](https://github.com/paritytech/product-sdk).

## Design

A deliberate "**Record of Record**" aesthetic — an editorial public-affidavit / ledger look.
Warm paper, ink, hairline rules between entries, statements set in **Fraunces**, all metadata in
**Spline Sans Mono**. One brand accent (Polkadot magenta) for actions; one ink-stamp green reserved
exclusively for the **VERIFIED HUMAN** stamp. The "dot" of statement.dot is a polka-dot texture.

## How it uses all 16 product-sdk packages

The app talks to the platform **only** through an adapter layer (`src/sdk/`) that mirrors the
real packages 1:1. Today it runs against an in-memory **mock** (no Host, no phone required);
swapping to live is a one-function change in `src/sdk/index.ts`.

| Package | Where it's used |
| --- | --- |
| `host` | Host detection + capability handshake (`src/sdk` boot) |
| `signer` | Proof of Personhood alias + `under_alias` signing (onboarding, every post) |
| `tx` | Claim `.dot` handle via dotNS; send tips |
| `chain-client` + `descriptors` | Resolve handles, read balances |
| `statement-store` | The live feed — posts, likes, follows, replies, DMs |
| `cloud-storage` | Long posts/media → Bulletin Chain CID (composer auto-pins > 280 chars) |
| `contracts` | PVM social contract: handle registry + verified-human badge + tip jar |
| `keys` | Deterministic per-Product key for DM encryption |
| `crypto` | Encrypt/decrypt DMs (see Messages → "Show ciphertext") |
| `address` | SS58 shorten/validate for aliases |
| `local-storage` | KvStore cache — session + feed |
| `logger` / `utils` / `terminal` / `sdk` | Plumbing + umbrella |

> Note: "Chat / Payment / PoP / dotNS" are **not** separate packages — they're composed from
> `statement-store` / `tx` / `signer` / `chain-client`, exactly as the platform intends.

### Two interchangeable adapters

`src/sdk/` ships **both** implementations of the `ProductSDK` interface:

- **`src/sdk/mock/`** — an in-memory Polkadot (simulated gossip, dotNS, Bulletin Chain, registry).
  Runs anywhere, no Host or phone. This is what the local demo uses.
- **`src/sdk/live/`** — the **real** adapter, wired to the published `@parity/product-sdk-*`
  packages (`SignerManager`, `StatementStoreClient`, `CloudStorageClient`, `getChainAPI`,
  `submitAndWatch`, `KeyManager`, `createLocalKvStore`, `truncateAddress`…). It type-checks and
  builds against the actual packages; its heavy chain-metadata deps are code-split into lazy
  chunks so they never touch the mock bundle.

`bootSDK()` (in `src/sdk/index.ts`) picks the live adapter automatically when the Product detects
it's running inside a Polkadot Host (`window.self !== window.top` / host markers), and otherwise
stays on the mock — so you get a real implementation in production and a frictionless demo locally,
with zero UI changes. The `sdk` binding in the store is a live ES-module binding, so the swap
propagates everywhere.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
```

Onboard with any handle (it's a local mock), then:

- **Make a statement** — posts gossip into the feed live; long ones (> 280) auto-pin to the Bulletin Chain.
- **Open a thread** — click any statement to see replies and add your own.
- **React** — Endorse (like), Echo (repost), and **Tip** (private 1-DOT payment); counts are derived from the feed itself, since every reaction is its own signed statement.
- **Channels** — filter the record by `#polkadot`, `#builders`, `#governance`, `#proof-of-personhood`.
- **Everyone / Following** — scope the feed to humans you follow.
- **Messages** — end-to-end-encrypted DMs with a raw-ciphertext toggle (see exactly what crosses the wire).

```bash
npm run build       # type-check + production bundle
npm run typecheck
node shot.mjs        # capture a screenshot walkthrough into ./shots (needs Playwright Chromium)
```

## Run it live (Polkadot Desktop + App)

The `live/` adapter is fully wired (including the PVM registry via
`@parity/product-sdk-contracts`). With **Polkadot Desktop** installed and the **Polkadot App**
paired, run it for real:

```bash
npm run build && npm run preview -- --port 5179   # or: npm run dev -- --port 5179
```

Then open `http://localhost:5179` **inside Polkadot Desktop** (its load-local-Product / dev view).
Running inside the Host flips three switches automatically:

1. `bootSDK()` detects the container (`isInsideContainerSync()`) and swaps the mock for the **live
   adapter** — the status rail will read the Host instead of `Local · Mock`.
2. `SignerManager.connect()` derives your per-Product account and routes signing to your phone;
   posting publishes real statements to the People Chain Statement Store; long posts pin to the
   **Bulletin Chain** (Paseo); tips dispatch on **Asset Hub**.
3. Grab **Paseo testnet** tokens from the [faucet](https://faucet.polkadot.io/) first (tips +
   Bulletin storage cost a little).

To light up the on-chain **registry / verified-human badge / tip jar**, deploy
`contract/StatementRegistry.sol` to Paseo Asset Hub and set `CONTRACT_ADDRESS` in
`src/sdk/live/cdm.ts` — see [`contract/README.md`](contract/README.md). Until then the live adapter
falls back to the Statement Store + local cache, so everything still works.

Remaining live TODOs (marked in `src/sdk/live/index.ts`): the dotNS registrar pallet path for
`claimHandle`/`resolveHandle` (pending public pallet metadata) and sr25519 signature verification.

## Layout

```
src/
  sdk/            adapter layer — one wrapper per product-sdk package (+ mock/)
  state/          React store wiring SDK groups into actions
  components/     Composer, StatementCard, rails, VerifiedStamp, icons
  routes/         Onboarding (the affidavit), Home, Profile, Channels, Messages
  styles/         the "Record of Record" design system
contract/         PVM (PolkaVM) social contract (handle registry · badge · tip jar)
```
