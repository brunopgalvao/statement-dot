// Product manifest for the Polkadot Playground / app-deploy CLI (`pg deploy`).
// The tool auto-discovers this file by name (polkadot-app-deploy.config.{ts,js,mjs})
// at the repo root and reads the default export — it's what sets the listing's
// icon, display name, and description (the bare `pg deploy` path can't).
//
// `defineConfig` is a local identity function (the CLI is a global/npx binary,
// not a package dependency, so importing from it would be fragile).
const defineConfig = <T>(config: T): T => config;

declare const process: { env?: Record<string, string | undefined> };

// Lets CI/preview deploys override the bare label; defaults to production.
const domain = process.env?.APP_DOTNS_DOMAIN ?? "statement";
const label = domain.toLowerCase().replace(/\.dot$/, "");

export default defineConfig({
  domain: `${label}.dot`,
  displayName: "statement.dot",
  description:
    "A humans-only social network on Polkadot. Every account is Proof-of-Personhood verified, handles are dotNS names, and posts are signed statements gossiped on the People Chain. Statements you can verify, from humans you can trust.",
  icon: { path: "./assets/icon.png", format: "png" },
  executables: [
    {
      kind: "app",
      path: "./dist",
      appVersion: [0, 1, 0],
    },
  ],
});
