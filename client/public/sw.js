/*
 * Service worker of the installed app. It does not make the app work offline (plans, files and saves
 * all need the server) and never touches API requests, files or assets: it only answers a page load
 * that fails for lack of a connection with a short "you are offline" page, so the installed app
 * does not show the browser's error screen. Android Chrome also wants a worker like this to offer
 * "Install app".
 *
 * Bump CACHE when this file or offline.html changes.
 */
const CACHE = 'blueprints-offline-v1';
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add(new Request(OFFLINE_URL, { cache: 'reload' }))));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Page loads start at once, in parallel with waking this worker up (no extra delay per load).
    if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  // Page loads only, and not API downloads opened as a page (project ZIP, files): everything else
  // goes to the network exactly as without a worker.
  if (request.mode !== 'navigate' || new URL(request.url).pathname.startsWith('/api/')) return;
  event.respondWith((async () => {
    try {
      return (await event.preloadResponse) || (await fetch(request));
    } catch {
      return (await caches.match(OFFLINE_URL)) || Response.error();
    }
  })());
});
