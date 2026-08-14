import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@concord-protocol/sdk": new URL("../sdk/typescript/src/index.ts", import.meta.url).pathname,
    },
  },
  server: {
    fs: {
      allow: [new URL("..", import.meta.url).pathname],
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    css: true,
  },
});
