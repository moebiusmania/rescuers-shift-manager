import { defineConfig } from "vite";
import preact from "@preact/preset-vite";

export default defineConfig({
  // Relative base so the build works both at the domain root and under the
  // GitHub Pages project path (/rescuers-shift-manager/).
  base: "./",
  plugins: [preact()],
  server: {
    port: 3000,
  },
});
