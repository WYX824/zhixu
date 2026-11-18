import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/zhixu/",

  plugins: [
    react(),

    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",

      includeAssets: [
        "favicon.ico",
        "logo.svg",
        "apple-touch-icon-180x180.png",
      ],

      manifest: {
        name: "知序 Study Flow",
        short_name: "知序",
        description:
          "本地优先的学习任务、PDF 截止日期提取和提醒工具",

        lang: "zh-HK",
        start_url: "./#/",
        scope: "./",
        display: "standalone",
        orientation: "portrait-primary",

        background_color: "#f3f6fc",
        theme_color: "#5267e8",

        categories: [
          "education",
          "productivity",
        ],

        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },

      workbox: {
        cleanupOutdatedCaches: true,
        navigateFallback: "index.html",

        globPatterns: [
          "**/*.{js,css,html,ico,png,svg,mjs}",
        ],

        runtimeCaching: [
          {
            urlPattern: ({ request }) =>
              request.destination === "document",

            handler: "NetworkFirst",

            options: {
              cacheName: "zhixu-pages",
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 7 * 24 * 60 * 60,
              },
            },
          },
        ],
      },

      devOptions: {
        enabled: true,
      },
    }),
  ],
});