// AIM AV service worker
// Bump this on every deploy that changes cached files — old caches are purged on activate.
const CACHE_VERSION = "aimav-v1";

const APP_SHELL = [
  "./aim-av.html",
  "./manifest.json",
  "./icons/icon-16.png",
  "./icons/icon-32.png",
  "./icons/icon-72.png",
  "./icons/icon-96.png",
  "./icons/icon-128.png",
  "./icons/icon-144.png",
  "./icons/icon-152.png",
  "./icons/icon-180.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-192-maskable.png",
  "./icons/icon-512-maskable.png",
  "./icons/apple-touch-icon.png",
];

// Pinned CDN libraries the app depends on — safe to cache aggressively since
// the URLs are version-locked (they won't silently change under us).
const CDN_SHELL = [
  "https://cdn.jsdelivr.net/npm/dexie@4.0.8/dist/dexie.min.js",
  "https://cdn.jsdelivr.net/npm/konva@9.3.14/konva.min.js",
  "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then(async (cache) => {
      // App shell: same-origin, must succeed.
      await cache.addAll(APP_SHELL).catch((err) => {
        console.warn("[sw] app shell cache failed (non-fatal):", err);
      });
      // CDN libs: best-effort, opaque cross-origin responses are fine to cache.
      await Promise.all(
        CDN_SHELL.map((url) =>
          fetch(url, { mode: "no-cors" })
            .then((res) => cache.put(url, res))
            .catch((err) => console.warn("[sw] CDN cache miss:", url, err))
        )
      );
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const isHtml = request.mode === "navigate" || request.destination === "document";
  const isCdnLib = CDN_SHELL.includes(request.url);

  if (isHtml) {
    // Network-first for the app itself, so you get updates when online;
    // falls back to the cached shell when offline.
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(APP_SHELL[0], copy));
          return res;
        })
        .catch(() => caches.match(APP_SHELL[0]))
    );
    return;
  }

  if (isCdnLib || APP_SHELL.includes(request.url) || request.url.includes("/icons/")) {
    // Cache-first for pinned libs and static assets.
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
    return;
  }

  // Everything else (fonts, Gemini API calls, etc.) — just pass through.
  event.respondWith(fetch(request).catch(() => caches.match(request)));
});
