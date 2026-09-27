import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    // Registry code runs in the browser; scripts opt back into node per file.
    environment: "jsdom",
    include: ["registry/**/*.test.{ts,tsx}", "scripts/**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
    restoreMocks: true,
    server: {
      deps: {
        // Its entry re-exports themed components that import CSS modules,
        // which Node cannot load; let Vite process the package instead.
        inline: ["react-tweet"],
      },
    },
  },
});
