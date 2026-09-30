import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import UnoCSS from "unocss/vite"
import { VitePWA } from "vite-plugin-pwa"
import path from "path"

export default defineConfig({
  base: "/",

  plugins: [
    react(),
    UnoCSS(),

    VitePWA({
      registerType: "autoUpdate",
      injectRegister: false,
      includeAssets: [
        "favicon.png",
        "favicon.ico",
        "apple-touch-icon.png",
        "RCRaceday_logo_192x192.png",
        "RCRaceday_logo_512x512.png",
        "pwa/icon-192.png",
        "pwa/icon-512.png",
        "pwa/icon-512-maskable.png",
        "push-sw-handler.js",
      ],
      devOptions: {
        enabled: false,
      },
      workbox: {
        importScripts: ["/push-sw-handler.js"],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: ["**/*.{js,css,html,ico,woff,woff2}"],
        globIgnores: ["**/flags/**"],
        navigateFallback: "index.html",
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
      },
      showMaximumFileSizeToCacheInBytesWarning: true,
      manifest: {
        id: "/",
        name: "RCRaceday",
        short_name: "RCRaceday",
        description: "Race day management for RC clubs",
        start_url: "/",
        scope: "/",
        display: "standalone",
        display_override: ["standalone", "browser"],
        orientation: "portrait",
        background_color: "#000000",
        theme_color: "#000000",
        prefer_related_applications: false,
        icons: [
          {
            src: "/pwa/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa/icon-512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    })
  ],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@app": path.resolve(__dirname, "src/app"),
      "@components": path.resolve(__dirname, "src/components"),
      "@context": path.resolve(__dirname, "src/context"),
      "@utils": path.resolve(__dirname, "src/utils"),
"@cms": path.resolve(__dirname, "src/app/pages/admin/cms")
    },
    extensions: [".mjs", ".js", ".ts", ".jsx", ".tsx", ".json"],
  },
})
