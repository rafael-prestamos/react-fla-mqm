import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Config de Vite + PWA (instalable y offline-first).
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon-32.png", "icons/apple-touch-icon.png"],
      manifest: {
        name: "Fla MpM — Gestor de Préstamos",
        short_name: "Fla MpM",
        description: "Gestión de préstamos y cobranzas, offline-first.",
        lang: "es",
        theme_color: "#16325C",
        background_color: "#122845",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,woff2}"],
      },
    }),
  ],
  test: {
    environment: "node",
    globals: true,
  },
});
