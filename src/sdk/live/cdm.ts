import type { CdmJson } from "@parity/product-sdk-contracts";
import abi from "../../../contract/abi/StatementRegistry.json";

// ---------------------------------------------------------------------------
// `cdm.json` manifest for the statement.dot social registry. This is what
// @parity/product-sdk-contracts' ContractManager consumes. The ABI is the
// canonical deploy artifact in contract/abi/StatementRegistry.json (compiled
// from contract/StatementRegistry.sol with the revive Solidity compiler).
//
// CONTRACT_ADDRESS is the H160 the contract is deployed at. Until it's deployed
// it stays the zero address, and the live adapter transparently falls back to
// the Statement Store + local cache (the app works either way). Set this (and
// REGISTRY_ADDRESS, if you use the on-chain CDM registry) after `cdm install` /
// deploy and the contract path lights up with no other code changes.
// ---------------------------------------------------------------------------

export const REGISTRY_LIBRARY = "statement.dot/registry";

/** Set to the deployed contract's H160 to activate the on-chain path. */
export const CONTRACT_ADDRESS: string = "0x0000000000000000000000000000000000000000";

const ZERO = "0x0000000000000000000000000000000000000000";

export const contractDeployed = CONTRACT_ADDRESS.toLowerCase() !== ZERO;

export const STATEMENT_REGISTRY_CDM = {
  dependencies: {},
  contracts: {
    [REGISTRY_LIBRARY]: {
      version: 1,
      address: CONTRACT_ADDRESS,
      abi,
    },
  },
} as unknown as CdmJson;
