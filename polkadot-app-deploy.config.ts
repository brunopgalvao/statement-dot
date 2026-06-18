// Product manifest for the Polkadot Playground / app-deploy CLI (`pg deploy`).
// The CLI auto-discovers this file by name (polkadot-app-deploy.config.{ts,js,mjs})
// at the repo root and reads the default export — it sets the bundle's icon,
// display name, and description. Kept as a plain object literal (no generics,
// no `declare`, no env logic) so any config loader evaluates it cleanly.
export default {
  domain: "statement.dot",
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
};
