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
manifest: {
  id: "/",
  name: "RC RaceDay",
  short_name: "RaceDay",
  description: "Race day management for Chargers RC",
  start_url: "/",
  scope: "/",
  display: "standalone",
  orientation: "portrait",
  background_color: "#000000",
  theme_color: "#000000",

  icons: [
    {
      src: "/pwa/icon-192.png",
      sizes: "192x192",
      type: "image/png",
      purpose: "any"
    },
    {
      src: "/pwa/icon-512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "any"
    },
    {
      src: "/pwa/icon-512-maskable.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable"
    }
  ],

  screenshots: [
    {
      src: "/splash/splash-640x1136.png",
      sizes: "640x1136",
      type: "image/png",
      form_factor: "narrow"
    },
    {
      src: "/splash/splash-750x1334.png",
      sizes: "750x1334",
      type: "image/png",
      form_factor: "narrow"
    },
    {
      src: "/splash/splash-1125x2436.png",
      sizes: "1125x2436",
      type: "image/png",
      form_factor: "wide"
    },
    {
      src: "/splash/splash-1242x2688.png",
      sizes: "1242x2688",
      type: "image/png",
      form_factor: "wide"
    },
    {
      src: "/splash/splash-1536x2048.png",
      sizes: "1536x2048",
      type: "image/png",
      form_factor: "tablet"
    },
    {
      src: "/splash/splash-1668x2224.png",
      sizes: "1668x2224",
      type: "image/png",
      form_factor: "tablet"
    },
    {
      src: "/splash/splash-2048x2732.png",
      sizes: "2048x2732",
      type: "image/png",
      form_factor: "tablet"
    }
  ]
}
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
