import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'icons/icon-192.png',
        'icons/icon-512.png',
        'icons/icon-192-maskable.png',
      ],

      // ── Web App Manifest ────────────────────────────────────────
      manifest: {
        name: 'AgriRent',
        short_name: 'AgriRent',
        description: 'Agricultural Machinery Rental Platform for Local Farmers',
        theme_color: '#16a34a',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        lang: 'en',
        categories: ['productivity', 'business', 'utilities'],
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-192-maskable.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Browse Equipment',
            short_name: 'Browse',
            description: 'Browse available farming equipment',
            url: '/farmer/browse',
            icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }],
          },
          {
            name: 'My Reservations',
            short_name: 'Reservations',
            description: 'View your reservations',
            url: '/farmer/reservations',
            icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }],
          },
        ],
      },

      // ── Workbox config ──────────────────────────────────────────
      strategies: 'generateSW',
      workbox: {
        // ── App shell precaching ──────────────────────────────────
        // Precache all static assets built by Vite (JS, CSS, HTML, icons)
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2}'],

        // Skip waiting so new SW activates immediately on update
        skipWaiting: true,
        clientsClaim: true,

        // Offline fallback: serve offline.html when navigation fails
        navigateFallback: '/offline.html',
        navigateFallbackDenylist: [
          /^\/api\//,       // never intercept API calls
          /\/uploads\//,    // never intercept uploads
        ],

        // ── Runtime caching rules ─────────────────────────────────
        runtimeCaching: [

          // 1. PUBLIC equipment LISTINGS — NetworkFirst
          //    Cached so farmers can browse offline.
          //    Only caches GET requests with no Authorization header
          //    (public endpoint, no auth required).
          //    Key: /api/equipment with query params
          {
            urlPattern: ({ url, request }) =>
              url.pathname === '/api/equipment' &&
              request.method === 'GET',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'equipment-listings-v1',
              networkTimeoutSeconds: 8,
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 2, // 2 hours
              },
              cacheableResponse: {
                statuses: [200],
              },
            },
          },

          // 2. PUBLIC equipment DETAIL pages — NetworkFirst
          //    /api/equipment/123 (single item)
          {
            urlPattern: ({ url, request }) =>
              /^\/api\/equipment\/\d+$/.test(url.pathname) &&
              request.method === 'GET',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'equipment-detail-v1',
              networkTimeoutSeconds: 8,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 2, // 2 hours
              },
              cacheableResponse: {
                statuses: [200],
              },
            },
          },

          // 3. EQUIPMENT AVAILABILITY — NetworkFirst, short TTL
          //    Availability changes frequently; short cache prevents
          //    stale booking calendars.
          {
            urlPattern: ({ url, request }) =>
              /^\/api\/equipment\/\d+\/availability$/.test(url.pathname) &&
              request.method === 'GET',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'equipment-availability-v1',
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 15, // 15 minutes only
              },
              cacheableResponse: {
                statuses: [200],
              },
            },
          },

          // 4. EQUIPMENT IMAGES — CacheFirst
          //    Images rarely change; serve from cache immediately.
          {
            urlPattern: /\/uploads\/equipment\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'equipment-images-v1',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: {
                statuses: [200],
              },
            },
          },

          // 5. PROFILE IMAGES — CacheFirst, shorter TTL
          {
            urlPattern: /\/uploads\/profiles\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'profile-images-v1',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
              cacheableResponse: {
                statuses: [200],
              },
            },
          },

          // 6. AUTHENTICATED API ROUTES — NetworkOnly (NEVER cache)
          //    These contain sensitive user data: reservations,
          //    transactions, notifications, chat, dashboard stats,
          //    user profiles. Must never be cached.
          {
            urlPattern: ({ url }) =>
              [
                '/api/reservations',
                '/api/transactions',
                '/api/notifications',
                '/api/chat',
                '/api/dashboard',
                '/api/users',
                '/api/auth',
                '/api/push',
                '/api/archive',
              ].some((p) => url.pathname.startsWith(p)),
            handler: 'NetworkOnly',
          },

          // 7. BACKGROUND SYNC for offline reservation creation
          //    POST /api/reservations is queued when offline and
          //    replayed automatically when connection is restored.
          {
            urlPattern: /^\/api\/reservations$/,
            handler: 'NetworkOnly',
            method: 'POST',
            options: {
              backgroundSync: {
                name: 'reservation-sync-v1',
                options: {
                  maxRetentionTime: 24 * 60, // 24 hours in minutes
                },
              },
            },
          },

          // 8. Google Fonts (if ever used) — StaleWhileRevalidate
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
        ],
      },
    }),
  ],

  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:5000', changeOrigin: true },
      '/uploads': { target: 'http://localhost:5000', changeOrigin: true },
    },
  },
});
