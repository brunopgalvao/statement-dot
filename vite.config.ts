import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// statement.dot ships as a static bundle that dotNS publishes to `statement.dot`
// and a Host serves at `statement.dot.li`. No backend — everything goes through
// the Product SDK adapter layer in src/sdk/.
export default defineConfig({
  plugins: [react()],
  base: "./",
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
