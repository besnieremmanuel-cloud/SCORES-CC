/* Scores périopératoires — service worker.
   Cache-first sur un jeu de fichiers statiques figés.
   Incrémenter CACHE à chaque modification d'index.html. */
const CACHE = "ccv-scores-v2";
const ASSETS = ["./","./index.html","./manifest.webmanifest","./icon.svg",
                "./icon-192.png","./icon-512.png","./icon-maskable-512.png"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => Promise.allSettled(ASSETS.map(a => c.add(new Request(a, { cache:"reload" })))))
    .then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(caches.match(e.request, { ignoreSearch:true }).then(hit => hit || fetch(e.request)
    .then(res => {
      if (res && res.status === 200 && res.type === "basic") {
        const c = res.clone(); caches.open(CACHE).then(x => x.put(e.request, c));
      }
      return res;
    }).catch(() => caches.match("./index.html"))));
});
