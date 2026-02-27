import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  root: ".",
  publicDir: "public",
  base: "/",
  build: {
    outDir: "dist",
    assetsDir: "assets",
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
      },
    },
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        trial: resolve(__dirname, "trial.html"),
      },
      output: {
        manualChunks: {
          three: ["three"],
        },
      },
    },
    chunkSizeWarningLimit: 200,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  server: {
    allowedHosts: ["arpits-macbook-air.local"],
  },
});
