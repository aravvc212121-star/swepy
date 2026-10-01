// @ts-nocheck
/* eslint-disable */
/**
 * public/sw.js — Hand-written service worker for Swepy PWA
 */

const VERSION = "v1";
const PRECACHE = `swepy-precache-${VERSION}`;
const RUNTIME = `swepy-runtime-${VERSION}`;

const PRECACHE_URLS = [
  "/offline",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-192.png",
  "/icons/maskable-512.png",
  "/brand/swepy-app-icon-1024.png",
];

// ── Install ──
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PRECACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate ──
self.addEventListener("activate", (event) => {
  const keep = new Set([PRECACHE, RUNTIME]);
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names.filter((n) => !keep.has(n)).map((n) => caches.delete(n))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch ──
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Rule 1: Ignore non-GET, cross-origin, /api, auth
  if (request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api")) return;
  if (url.pathname.includes("auth") || url.pathname.includes("session")) return;

  // Rule 2: Navigation (HTML) — network-first with 4s timeout
  if (request.mode === "navigate") {
    event.respondWith(
      networkFirstWithTimeout(request, 4000)
    );
    return;
  }

  // Rule 3: /_next/static/* — cache-first
  if (url.pathname.startsWith("/_next/static")) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Rule 4: Images, fonts, icons — stale-while-revalidate
  if (
    url.pathname.startsWith("/_next/image") ||
    url.pathname.startsWith("/icons") ||
    url.pathname.startsWith("/brand") ||
    url.pathname.startsWith("/services") ||
    url.pathname.match(/\.(png|jpg|jpeg|webp|svg|gif|woff2?|ttf|otf|ico)$/)
  ) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }
});

// ── Message ──
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// ── Strategies ──

async function networkFirstWithTimeout(request, timeout) {
  const cache = await caches.open(RUNTIME);

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timer);

    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;

    // Fallback to precache offline page
    const offlinePage = await caches.match("/offline");
    if (offlinePage) return offlinePage;

    return new Response("Offline", { status: 503 });
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const cache = await caches.open(RUNTIME);
  const response = await fetch(request);
  if (response.ok) {
    cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);

  return cached || fetchPromise;
}
