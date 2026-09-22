/* Scores périopératoires — service worker.
   Stratégie :
     - document HTML  : réseau d'abord, cache en secours (une mise en ligne
       est visible au rechargement suivant, et l'application reste utilisable
       hors ligne) ;
     - autres fichiers : cache d'abord (icônes, manifeste — contenus figés).
   Incrémenter CACHE à chaque modification des fichiers précachés. */
const CACHE  = "ccv-scores-v3";
const ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./icon.svg",
                "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png"];

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

/* Une requête vise-t-elle le document HTML ? */
function isDocument(req){
  return req.mode === "navigate" ||
         req.destination === "document" ||
         new URL(req.url).pathname.endsWith("/index.html");
}

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  /* ---- document : réseau d'abord ---------------------------------------- */
  if (isDocument(e.request)) {
    e.respondWith(
      fetch(new Request(e.request, { cache:"reload" }))
        .then(res => {
          if (res && res.status === 200 && res.type === "basic") {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put("./index.html", copy));
          }
          return res;
        })
        .catch(() => caches.match("./index.html", { ignoreSearch:true })
                       .then(hit => hit || caches.match("./")))
    );
    return;
  }

  /* ---- autres fichiers : cache d'abord ----------------------------------- */
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      if (res && res.status === 200 && res.type === "basic") {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
      }
      return res;
    }))
  );
});
