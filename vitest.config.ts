/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", "dist"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "src/test/",
        "**/*.d.ts",
        "**/*.config.*",
        "src/main.tsx",
        "src/vite-env.d.ts",
      ],
    },
    // 模拟 Web Audio API 和其他浏览器 API
    deps: {
      optimizer: {
        web: {
          include: ["vexflow"],
        },
      },
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify("1.0.0-test"),
    __BUILD_TIME__: JSON.stringify("test"),
  },
});
