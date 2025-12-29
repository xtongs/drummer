import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { THEME_COLOR } from "./src/utils/constants";
// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: "autoUpdate",
            includeAssets: ["icon.svg"],
            manifest: {
                name: "Drummer - 鼓手节拍器",
                short_name: "Drummer",
                description: "专为鼓手设计的节拍器和节奏型编辑器",
                theme_color: THEME_COLOR,
                background_color: THEME_COLOR,
                display: "standalone",
                orientation: "portrait",
                icons: [
                    {
                        src: "/icon.svg",
                        sizes: "192x192",
                        type: "image/svg+xml",
                        purpose: "any maskable",
                    },
                    {
                        src: "/icon.svg",
                        sizes: "512x512",
                        type: "image/svg+xml",
                        purpose: "any maskable",
                    },
                ],
            },
            workbox: {
                globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
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
    server: {
        port: 3000,
        host: "0.0.0.0",
    },
    base: "/drummer/",
});
