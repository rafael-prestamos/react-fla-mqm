import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Config de Vite + PWA (instalable y offline-first).
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "favicon-32.png", "apple-touch-icon.png"],
      manifest: {
        name: "Fla MpM",
        short_name: "Fla MpM",
        description: "Gestión de préstamos y cobranzas, offline-first.",
        lang: "es",
        theme_color: "#16325C",
        background_color: "#FBF5E9",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        icons: [
          { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png" },
          { src: "pwa-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,woff2}"],
        // Sprint 5b-2: el SW generado por workbox importa el handler de push notifications.
        importScripts: ["/sw-push.js"],
      },
    }),
  ],
  test: {
    environment: "node",
    globals: true,
  },
});
