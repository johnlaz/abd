// ABD service worker
// CACHE_VERSION must match APP_VERSION in index.html ("abd-v" + APP_VERSION).
// Bump both on every deploy that changes any cached file; old caches are purged on activate.
const CACHE_VERSION = "abd-v2.0.1";

// Everything the app needs to run offline. All same-origin, so a failed fetch
// fails the install (and retries next visit) instead of leaving a half-cached app.
const PRECACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./vendor/dexie.min.js",
  "./vendor/konva.min.js",
  "./vendor/html2canvas.min.js",
];

const scopeUrl = (p) => new URL(p, self.registration.scope).href;
const SHELL_URL = scopeUrl("./index.html");

self.addEventListener("install", (event) => {
  // No automatic skipWaiting: the page shows an "update ready" prompt and
  // sends SKIP_WAITING, so a layout in progress is never swapped under the user.
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(PRECACHE.map(scopeUrl)))
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          // purge our own old caches (including the pre-rename "aimav-*" ones), never anything else
          .filter((k) => (k.startsWith("abd-") || k.startsWith("aimav-")) && k !== CACHE_VERSION)
          .map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // Only handle our own origin. Gemini API calls and anything else go straight to the network.
  if (url.origin !== self.location.origin) return;

  // Pages: network-first so deploys show up when online; cached shell when offline.
  if (request.mode === "navigate" || request.destination === "document") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((c) => c.put(SHELL_URL, copy));
          }
          return res;
        })
        .catch(() => caches.match(SHELL_URL).then((r) => r || caches.match(scopeUrl("./"))))
    );
    return;
  }

  // Static assets (scripts, icons, manifest, screenshots): cache-first, filled on demand.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(request, copy));
        }
        return res;
      });
    })
  );
});
