import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    __BUILD_ID__: JSON.stringify(`${Date.now()}`),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  build: {
    target: 'es2022',
    cssMinify: true,
    chunkSizeWarningLimit: 500,
    // Modern bundle target — disable the modulepreload polyfill so the
    // tiny `__vitePreload` helper isn't hoisted into a random vendor chunk
    // (it was landing in vendor-pdf, which forced the entry to statically
    // depend on vendor-pdf and pulled vendor-pdf into the home page's
    // modulepreload list).
    modulePreload: { polyfill: false },
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-supabase': ['@supabase/supabase-js'],
          // Tiny utilities used by virtually every component. Pinning them
          // into their own leaf chunk prevents Rollup from hoisting them
          // into vendor-charts (which would otherwise pull recharts onto
          // the home page's modulepreload list).
          'vendor-utils': ['clsx', 'tailwind-merge', 'class-variance-authority'],
          'vendor-ui': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-tabs',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-popover',
            '@radix-ui/react-select',
          ],
          'vendor-markdown': ['marked', 'marked-highlight', 'highlight.js'],
          'vendor-map': ['leaflet'],
          'vendor-dnd': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
          'vendor-sanitize': ['dompurify'],
          'vendor-charts': ['recharts'],
          'vendor-date': ['date-fns'],
          'vendor-icons': ['lucide-react'],
        },
      },
    },
    minify: 'esbuild',
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2022',
    },
  },
  esbuild: {
    target: 'es2022',
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      // Do NOT auto-inject /registerSW.js into index.html. We register the
      // service worker manually from src/main.tsx after `load` + idle so it
      // never blocks the LCP paint (Lighthouse was flagging the auto-injected
      // registerSW.js as render-blocking on the home page).
      injectRegister: null,
      devOptions: {
        enabled: false,
      },
      workbox: {
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/~oauth/, /^\/templates\//],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 },
              networkTimeoutSeconds: 5,
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "image-cache",
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: /\.(?:js|css|woff2?)$/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "static-cache",
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
        ],
      },
      // IMPORTANT: Do NOT let vite-plugin-pwa generate a manifest here.
      // The authoritative Qitaat manifest is hand-written at
      // `public/manifest.webmanifest` (Qitaat green #0E9E6F, /icons-*.png).
      // Previously the plugin emitted a competing manifest with the legacy
      // gold theme (#C8A767), legacy name, and /pwa-*.png icons, which
      // overwrote the hand-written file at build time and surfaced the
      // wrong favicon/identity to Google + Android. Keep the service
      // worker, drop the manifest generation. Single source of truth.
      manifest: false,
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
