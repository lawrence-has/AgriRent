/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-a4b5df9a'], (function (workbox) { 'use strict';

  importScripts("sw-push-handler.js");
  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "/index.html",
    "revision": "0.on57jatcdds"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("/index.html"), {
    allowlist: [/^\/$/],
    denylist: [/^\/api\//, /\/uploads\//]
  }));
  workbox.registerRoute(({
    url,
    request
  }) => url.pathname === "/api/equipment" && request.method === "GET", new workbox.NetworkFirst({
    "cacheName": "equipment-listings-v1",
    "networkTimeoutSeconds": 8,
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 30,
      maxAgeSeconds: 7200
    }), new workbox.CacheableResponsePlugin({
      statuses: [200]
    })]
  }), 'GET');
  workbox.registerRoute(({
    url,
    request
  }) => /^\/api\/equipment\/\d+$/.test(url.pathname) && request.method === "GET", new workbox.NetworkFirst({
    "cacheName": "equipment-detail-v1",
    "networkTimeoutSeconds": 8,
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 50,
      maxAgeSeconds: 7200
    }), new workbox.CacheableResponsePlugin({
      statuses: [200]
    })]
  }), 'GET');
  workbox.registerRoute(({
    url,
    request
  }) => /^\/api\/equipment\/\d+\/availability$/.test(url.pathname) && request.method === "GET", new workbox.NetworkFirst({
    "cacheName": "equipment-availability-v1",
    "networkTimeoutSeconds": 5,
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 30,
      maxAgeSeconds: 900
    }), new workbox.CacheableResponsePlugin({
      statuses: [200]
    })]
  }), 'GET');
  workbox.registerRoute(/\/uploads\/equipment\/.*/i, new workbox.CacheFirst({
    "cacheName": "equipment-images-v1",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 100,
      maxAgeSeconds: 2592000
    }), new workbox.CacheableResponsePlugin({
      statuses: [200]
    })]
  }), 'GET');
  workbox.registerRoute(/\/uploads\/profiles\/.*/i, new workbox.CacheFirst({
    "cacheName": "profile-images-v1",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 30,
      maxAgeSeconds: 604800
    }), new workbox.CacheableResponsePlugin({
      statuses: [200]
    })]
  }), 'GET');
  workbox.registerRoute(({
    url
  }) => ["/api/reservations", "/api/transactions", "/api/notifications", "/api/chat", "/api/dashboard", "/api/users", "/api/auth", "/api/push", "/api/archive"].some(p => url.pathname.startsWith(p)), new workbox.NetworkOnly(), 'GET');
  workbox.registerRoute(/^\/api\/reservations$/, new workbox.NetworkOnly({
    plugins: [new workbox.BackgroundSyncPlugin("reservation-sync-v1", {
      maxRetentionTime: 1440
    })]
  }), 'POST');
  workbox.registerRoute(/^https:\/\/fonts\.googleapis\.com\/.*/i, new workbox.StaleWhileRevalidate({
    "cacheName": "google-fonts-stylesheets",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 5,
      maxAgeSeconds: 86400
    })]
  }), 'GET');

}));
