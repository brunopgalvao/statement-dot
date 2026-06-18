import type { ProductSDK } from "./types";
import { createMockSDK } from "./mock";

export * from "./types";

// ---------------------------------------------------------------------------
// SDK selection.
//
// `getSDK()` returns synchronously and always starts as the in-memory mock, so
// the app can render immediately with no Host and no phone.
//
// `bootSDK()` runs once at startup: if we're inside a Polkadot Host it swaps in
// the real adapter (which dynamically imports the heavy `@parity/product-sdk-*`
// packages, keeping them out of the default browser bundle). Nothing in the UI
// knows which implementation it got — both satisfy `ProductSDK`.
// ---------------------------------------------------------------------------

let instance: ProductSDK = createMockSDK();
instance.log("boot", "Product SDK ready (mock adapter)");

export function getSDK(): ProductSDK {
  return instance;
}

let booted: Promise<ProductSDK> | null = null;

export function bootSDK(): Promise<ProductSDK> {
  return (booted ??= (async () => {
    if (await insideHost()) {
      try {
        const { createLiveSDK } = await import("./live");
        instance = await createLiveSDK();
        instance.log("boot", "Product SDK ready (live adapter)");
      } catch (e) {
        // Stay on the mock if the host adapter can't initialize.
        // eslint-disable-next-line no-console
        console.warn("[statement.dot] live SDK unavailable, using mock", e);
      }
    }
    return instance;
  })());
}

// Lazy-imported so neither the host package nor the live adapter touch the
// default (mock) bundle. Uses the SDK's own container detection (cross-origin
// iframe / webview mark / host API port) — true inside Polkadot Desktop/App/Web.
async function insideHost(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const { isInsideContainerSync } = await import("@parity/product-sdk-host");
    return isInsideContainerSync();
  } catch {
    return false;
  }
}
