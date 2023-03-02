/*
 * This file (which will be your service worker)
 * is picked up by the build system ONLY if
 * quasar.config.js > pwa > workboxMode is set to "injectManifest"
 */

declare const self: ServiceWorkerGlobalScope & typeof globalThis

import { clientsClaim } from 'workbox-core'
import {
  precacheAndRoute,
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
} from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { NetworkOnly } from 'workbox-strategies'
import { BackgroundSyncPlugin } from 'workbox-background-sync'

self.skipWaiting()
clientsClaim()

// Use with precache injection
precacheAndRoute(self.__WB_MANIFEST)

cleanupOutdatedCaches()

if (process.env.PROD) {
  // Non-SSR fallback to index.html
  // Production SSR fallback to offline.html (except for dev)
  if (process.env.MODE !== 'ssr') {
    registerRoute(
      new NavigationRoute(createHandlerBoundToURL(process.env.PWA_FALLBACK_HTML), {
        denylist: [/sw\.js$/, /workbox-(.)*\.js$/],
      })
    )
  }

  // Background sync
  const bgSyncPlugin = new BackgroundSyncPlugin('bgSyncQueue', {
    maxRetentionTime: 24 * 60, // Retry for max of 24 Hours (in mins)
  })
  registerRoute(
    // new RegExp('/*'),  // regex for all urls
    `${process.env.APP_API_URL}/site`,
    new NetworkOnly({
      plugins: [bgSyncPlugin],
    }),
    'POST'
  )
}
