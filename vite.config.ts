import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { THEME_COLOR } from "./src/utils/constants";
import packageJson from "./package.json";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg", "icon-180.png", "icon-512.png"],
      manifest: {
        name: "Drummer - Beat Maker",
        short_name: "Drummer",
        description: "A metronome and pattern editor designed for drummers",
        theme_color: THEME_COLOR,
        background_color: THEME_COLOR,
        display: "standalone",
        orientation: "portrait",
        icons: [
          {
            src: "icon.svg",
            sizes: "192x192",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
          {
            src: "icon.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        // 包含 mp3 音频文件以支持离线使用
        globPatterns: ["**/*.{js,css,html,ico,png,svg,mp3,webmanifest}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  server: {
    port: 3000,
    host: "0.0.0.0",
  },
  base: "/drummer/",
});
