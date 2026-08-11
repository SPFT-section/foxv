const CACHE = "fox-v-v4";
const ASSETS = [
  "./",
  "index.html",
  "reader.html",
  "novel.html",
  "about.html",
  "manifest.webmanifest",
  "icon.svg",
  "css/base.css",
  "css/style.css",
  "js/icons.js",
  "js/common.js",
  "js/data.js",
  "js/db.js",
  "js/translate.js",
  "js/library.js",
  "js/reader.js",
  "js/novel.js"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      const fetched = fetch(e.request)
        .then(res => {
          if (res && res.ok && new URL(e.request.url).origin === self.location.origin) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => cached);
      return cached || fetched;
    })
  );
});