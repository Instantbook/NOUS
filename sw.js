// ΝΟΥΣ service worker — caches the app shell + CDN libraries for offline
const CACHE = "nous-v2d";
const ASSETS = ["./", "./index.html", "./manifest.json", "./icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c =>
      Promise.all(ASSETS.map(a =>
        fetch(a, { cache: "reload" }).then(r => { if (r.ok) return c.put(a, r); })
      ))
    ).then(() => self.skipWaiting())
  );
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  // Never intercept: the Claude API, or model-weight hosts (their libraries cache those themselves)
  if (url.hostname === "api.anthropic.com") return;
  if (url.hostname.endsWith("huggingface.co") || url.hostname.endsWith("hf.co")) return;
  if (url.hostname.endsWith("mlc.ai") || url.hostname.includes("raw.githubusercontent")) return;
  const cacheable = url.origin === location.origin ||
    url.hostname.includes("jsdelivr.net") || url.hostname.includes("esm.run") ||
    url.hostname.includes("fonts.googleapis") || url.hostname.includes("fonts.gstatic");
  if (!cacheable || e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: url.origin === location.origin }).then(hit =>
      hit || fetch(e.request).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
        return res;
      }).catch(() => hit)
    )
  );
});
