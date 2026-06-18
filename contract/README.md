# statement.dot social registry (PVM contract)

`StatementRegistry.sol` is the durable backbone of the network on **pallet-revive (PolkaVM)**,
Polkadot Asset Hub:

- `register(handle, human)` — claim a `.dot` handle + record the verified-human badge
- `tip(to) payable` — pay into an account's tip jar
- `resolve / handleOf / isHuman / tipsOf` — read views

Posts, likes, follows and replies stay on the Statement Store (ephemeral gossip). Only what must
be permanent and provable lives here.

## How the app uses it

The live adapter wires this through `@parity/product-sdk-contracts`' `ContractManager` —
see `src/sdk/live/index.ts` (`getRegistry()`) and the manifest in `src/sdk/live/cdm.ts`. Until a
contract is deployed, `CONTRACT_ADDRESS` stays the zero address and the adapter transparently
falls back to the Statement Store + local cache, so the app runs either way.

## Deploy (Paseo testnet)

The contracts SDK consumes a **Solidity ABI** (viem) and dispatches via pallet-revive, so compile
with the **revive** Solidity compiler (`resolc`) rather than vanilla `solc`:

```bash
# 1. Compile to PolkaVM bytecode + ABI
resolc --bin --abi -O3 contract/StatementRegistry.sol -o contract/out
#    (the ABI in contract/abi/StatementRegistry.json is the canonical copy the
#     app imports; keep it in sync with resolc's output)

# 2. Deploy to Asset Hub on Paseo (e.g. via the polkadot-api `papi` CLI,
#    Remix + the Polkadot plugin, or a small deploy script using
#    @parity/product-sdk-tx). Fund the deployer from the Paseo faucet first.

# 3. Paste the deployed H160 into src/sdk/live/cdm.ts:
#    export const CONTRACT_ADDRESS = "0xYourDeployedAddress";
```

That single edit activates the on-chain path: `register`, `tip`, and the badge/handle/tip-jar
reads all route through the contract — no other code changes.
