import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  root: ".",
  publicDir: "public",
  base: "/studio-typo-website/", // GitHub Pages base path
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
        effectsTrial: resolve(__dirname, "effects-trial.html"),
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
