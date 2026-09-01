import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  // Relative base so the built dashboard works from a subpath on any static
  // host (GitHub Pages, S3 prefix) without a rebuild.
  base: "./",
  server: { port: 5173 },
  // The suite covers the pure layer — classification, filtering, ranking, the
  // URL codec, and the CSV writer — which is where the domain rules live and
  // where a regression is silent. No DOM environment is needed for any of it.
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
