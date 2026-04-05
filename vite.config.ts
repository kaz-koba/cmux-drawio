import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  root: "src/client",
  build: {
    outDir: path.resolve(__dirname, "dist/client"),
    emptyOutDir: true,
  },
});
