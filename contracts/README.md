# statement.dot social registry (PolkaVM contract)

`contracts/statement-registry/lib.rs` is a `pvm-contract-sdk` contract for
**pallet-revive (PolkaVM)** on Asset Hub. It durably binds a per-Product alias
to the dotNS handle it claims + a verified-human flag:

- `register(handle, human)` — caller-keyed; you can only set your **own** entry
- `handleOf(account) → string` · `isHuman(account) → bool` — read views

This is the on-chain answer to "handles tied to dotNS": resolving `handleOf(alias)`
against the contract replaces trusting an ephemeral gossip broadcast, and one
alias can hold only one handle.

## How the app uses it (product-sdk)

The live adapter reads it through **`@parity/product-sdk-contracts`'**
`ContractManager`, resolving the deployed address from **`cdm.json`** at the repo
root (see `src/sdk/live/cdm.ts` + `getRegistry()` in `src/sdk/live/index.ts`).
Until an address is set there, the app falls back to gossip-based resolution and
keeps working.

## Deploy (Summit testnet, via the Playground CLI)

`pg contract deploy` builds the Rust contract → PolkaVM, deploys it to Asset Hub,
and registers it in the CDM registry — all signed with your phone.

```sh
# 1. Prerequisites (one-time): a Rust toolchain. rust-toolchain.toml pins the
#    nightly; rustup installs it on demand. The PolkaVM target is built via
#    build-std (no separate target install). cargo-pvm-contract is pulled as a
#    git dependency by the build.
#    Install rustup if you don't have it:  https://rustup.rs

cd ~/src/projects/statement-dot

# 2. Build + deploy + register, signed on your phone.
pg contract deploy --signer phone

#    This writes the deployed address back into cdm.json:
#      contracts["@statement/registry"].address = "0x…"
```

## Wire it on

Once `cdm.json` has the address, `contractDeployed` flips to true automatically
(`src/sdk/live/cdm.ts` reads it), so the live adapter starts registering handles
and resolving `handleOf`/`isHuman` on-chain. Commit the updated `cdm.json` and
redeploy the frontend (`pg deploy …`).

> Note: the ABI in `cdm.json` is committed by hand (the `abi-gen` step has a known
> `serde`/PolkaVM-target quirk shared across the contract templates), matching the
> three methods in `lib.rs`.
