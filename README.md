# statement.dot

**A humans-only social network _and_ messenger, built as a Polkadot Product.**

> _Statements you can verify, from humans you can't fake._

**🟢 Live:** [statement.dot.li](https://statement.dot.li) — `.dot` name registered via **dotNS** on the
**summit** testnet (Polkadot Playground), bundle pinned to the **Bulletin Chain**, social registry
contract deployed on **Asset Hub**.

A social network + chat app with the one thing X and the others can't buy: **Proof of Personhood**.
Every account clears a one-time Ring-VRF proof in the Polkadot App and gets an **unlinkable
per-Product alias** — so the network can prove you're a unique human while knowing nothing about
who you are. No bot farms, no sockpuppets, no scam DMs. Authorized bots stay possible, clearly
labelled.

- **Handles** are the **dotNS** name your account already owns (read from `signer.getUserId()` —
  you can't invent one, so nobody can claim a name they don't hold).
- **Posts** are signed _statements_ gossiped through the **Statement Store** on the People Chain;
  pin one to the **Bulletin Chain** to make it durable.
- **Identity** (handle + verified-human badge) is recorded **on-chain** in a PolkaVM registry
  contract, so resolution is durable and tamper-evident.
- **Messages** are a full full real-time messenger — DMs, groups, supergroups, channels — hand-rolled
  over the product-sdk primitives.

Built on the [Polkadot Product SDK](https://github.com/paritytech/product-sdk).

## Design

A dark, **X-inspired** interface: near-black canvas, dense rows, hairline separators, one Polkadot
**magenta** action accent, one **green** VERIFIED HUMAN signal. Type: **Spline Sans** + **Spline
Sans Mono** (self-hosted, no CDN). first-class messenger UX layered on the same tokens.

## How it uses the product-sdk

The app talks to the platform **only** through an adapter layer (`src/sdk/`) implementing one
`ProductSDK` interface, with **two** swappable backends — `mock/` (in-memory, used by the local
demo and tests) and `live/` (the real `@parity/product-sdk-*` packages). `bootSDK()` picks the live
adapter automatically inside a Polkadot Host, otherwise the mock — zero UI changes.

| Capability | product-sdk packages |
| --- | --- |
| Host detection / capability handshake | `host` |
| Proof of Personhood alias + signing | `signer` |
| Claim/own dotNS handle, send tips (Asset Hub) | `tx` + `chain-client` |
| Social feed — posts, likes, echoes, replies, follows | `statement-store` |
| Durable posts + chat media → Bulletin Chain CIDs | `cloud-storage` |
| On-chain handle registry + verified-human badge | `contracts` (PolkaVM, `contracts/`) |
| Per-Product key derivation + DM encryption | `keys` + `crypto` |
| SS58 handling | `address` · client cache | `local-storage` |

> "Chat / Payment / PoP / dotNS" are **not** separate packages — they're **composed** from the
> primitives above, exactly as the platform intends.

### The messenger (hand-rolled, no host chat surface)

The real-time chat is built entirely from product-sdk packages — **no `@novasamatech`, no
`getChatManager`**:

- **Real-time messages** = signed statements published to a per-room topic via `statement-store`.
- **Durable history** = a per-room log cached in `local-storage` (the Statement Store is ephemeral).
- **Media** = images pinned to the **Bulletin Chain** via `cloud-storage` (CID in the message).
- **Typing + presence** = short-TTL ephemeral statements (the Statement Store's canonical use case).
- **Room kinds** — `dm` · `group` · `supergroup` · `channel` (channels are admin-only broadcast).

See `src/sdk/{mock,live}/chat.ts` behind the `chat` group of `ProductSDK`.

## Features

**Feed** — post (Cmd+Enter), **pin to the Bulletin Chain** for durability, threads & replies,
**Endorse / Echo / Tip** (tip picker: ◈1/◈5/◈10, a real Asset Hub transfer on live), channels
(`#polkadot`, `#builders`), Everyone/Following scope. Counts are derived from the feed itself
(every reaction is its own signed statement). Click any name → that person's profile.

**Messenger** — chat list (search, unread badges, online dots, kind badges), conversations with
mine/theirs bubbles, **read ticks**, **replies**, **reactions**, **typing indicators**, **presence**,
**media**, date separators; start a DM by **`.dot` handle**, or create a group / supergroup / channel.
Full-bleed two-pane on desktop, stacked on mobile.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173 — runs against the in-memory mock
npm run typecheck
npm run build
```

Onboard, then explore both **The Record** (feed) and **Messages** (the messenger) — the mock
simulates other verified humans posting, DMing, typing, and coming online.

### Run it live (Polkadot Desktop + App)

```bash
npm run build && npm run preview -- --port 5179
```

Open `http://localhost:5179` **inside Polkadot Desktop**. `bootSDK()` detects the Host and swaps in
the live adapter (the status rail reads **Polkadot Desktop**); signing routes to your phone, posts
hit the real Statement Store, durable posts + chat media pin to the Bulletin Chain, tips dispatch on
Asset Hub. On first connect, approve the **AutoSigning allowance** on your phone so publishing works.
Grab **summit** testnet tokens with `pg drip` first.

## Deploy

The app is published via the **Polkadot Playground CLI** (`pg`):

```bash
pg deploy --domain statement.dot --signer phone --env summit --no-contracts
```

This builds the bundle, uploads it to the Bulletin Chain, and binds `statement.dot` via dotNS. The
listing icon/name/description come from `polkadot-app-deploy.config.ts` + `assets/icon.png`.

**On-chain registry** (`contracts/statement-registry/`, a `pvm-contract-sdk` PolkaVM contract):

```bash
pg contract deploy --signer phone      # builds Rust → PolkaVM, deploys, registers; writes cdm.json
```

Deployed at `0x52367c9159d7e56f1379390a48757503860b4010` on summit Asset Hub. The live adapter reads
the address from `cdm.json` (`src/sdk/live/cdm.ts`); until set, it falls back to gossip-based
resolution and the app still works. See [`contracts/README.md`](contracts/README.md).

## Layout

```
src/
  sdk/            adapter layer — one ProductSDK interface, two backends
    mock/         in-memory Polkadot (feed gossip, chat sim, Bulletin, registry)
    live/         real @parity/product-sdk-* (statement-store, cloud-storage, contracts, …)
                  + chat.ts (hand-rolled messenger)
  state/store.tsx React store wiring SDK groups into feed + chat actions
  components/      feed (StatementCard, Composer, rails) + chat/ (ChatList, Conversation, …)
  routes/         Onboarding, Home, Profile, Channels, Messages (messenger)
  styles/         the dark design system
contracts/        pvm-contract-sdk PolkaVM registry (handle + verified-human badge)
cdm.json          contract manifest resolved by @parity/product-sdk-contracts
```
