import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { THEME_COLOR } from "./src/utils/constants";
import packageJson from "./package.json";

const getBuildTime = () => {
  const now = new Date();
  const year = String(now.getFullYear()).slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${year}${month}${day}${hours}${minutes}`;
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg", "icon-180.png", "icon-512.png"],
      // 使用自定义的 service worker 文件
      strategies: "injectManifest",
      srcDir: "public",
      filename: "sw.js",
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
            src: "icon-180.png",
            sizes: "180x180",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
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
    __BUILD_TIME__: JSON.stringify(getBuildTime()),
  },
  server: {
    port: 3000,
    host: "0.0.0.0",
  },
  base: "/drummer/",
});
