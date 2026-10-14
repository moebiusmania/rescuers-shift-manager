// Offline-capable service worker
const CACHE_NAME = "shift-planner-cache-v3";
// Paths are relative to the service worker location, so the app works both at
// the domain root and under a sub-path (e.g. GitHub Pages project sites).
const APP_SHELL = "./";
const OFFLINE_URLS = [
  APP_SHELL,
  "./styles.css",
  "./manifest.webmanifest",
  "./favicon.svg",
  "./favicon.ico",
  "./apple-touch-icon.png",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
];

// Vite emits hashed bundles, so read their URLs from the built index.html.
const precacheBundles = async (cache) => {
  const response = await fetch(APP_SHELL, { cache: "no-cache" });
  if (!response.ok) return;
  const html = await response.clone().text();
  await cache.put(APP_SHELL, response);
  const bundles = [...html.matchAll(/(?:src|href)="(\.?\/?assets\/[^"]+)"/g)]
    .map((match) => match[1]);
  await cache.addAll(bundles);
};

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(OFFLINE_URLS);
      await precacheBundles(cache);
    }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        }),
      )
    ),
  );
  self.clients.claim();
});

const putInCache = (request, response) => {
  if (!response.ok) return;
  const clone = response.clone();
  caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
};

self.addEventListener("fetch", (event) => {
  const { request } = event;
  // Bypass non-GET and cross-origin requests
  if (request.method !== "GET") return;
  if (new URL(request.url).origin !== self.location.origin) return;

  // Pages: network first so a new deploy is picked up immediately,
  // falling back to the cached app shell when offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          putInCache(APP_SHELL, response);
          return response;
        })
        .catch(async () =>
          (await caches.match(request, { ignoreSearch: true })) ??
            (await caches.match(APP_SHELL))
        ),
    );
    return;
  }

  // Everything else: stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          putInCache(request, response);
          return response;
        })
        .catch(() => cached);

      return cached || networkFetch;
    }),
  );
});
