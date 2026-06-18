import type { CdmJson } from "@parity/product-sdk-contracts";
import cdm from "../../../cdm.json";

// ---------------------------------------------------------------------------
// The CDM manifest `@parity/product-sdk-contracts` resolves. It lives at the
// repo root (cdm.json) so `pg contract deploy` can write the deployed address
// back into it after building the Rust contract in contracts/statement-registry.
// Until an address is set, the live adapter falls back to gossip-based
// resolution and everything still works.
// ---------------------------------------------------------------------------

export const REGISTRY_LIBRARY = "@statement/registry";
const ZERO = "0x0000000000000000000000000000000000000000";

export const STATEMENT_REGISTRY_CDM = cdm as unknown as CdmJson;

const address =
  (cdm.contracts as Record<string, { address?: string }>)?.[REGISTRY_LIBRARY]?.address ?? ZERO;
export const contractDeployed = address.toLowerCase() !== ZERO;
