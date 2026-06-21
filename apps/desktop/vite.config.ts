import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: "apps/desktop",
  plugins: [react()],
  build: {
    outDir: "../../dist/desktop/renderer",
    emptyOutDir: true
  },
  test: {
    environment: "jsdom"
  }
});

