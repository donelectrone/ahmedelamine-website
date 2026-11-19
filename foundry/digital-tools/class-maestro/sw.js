/* Service worker.
   - App files and programmes: network first (3 s), so an update reaches teachers the next time they are online; the cached copy is the offline fallback.
   - Fonts and icons never change under the same name: cache first.
   The programme list and the cache name are generated (node tools/programmes.js --build). When you add or rename an app file, add it to FILES below. */
/* BUILD:START written by tools/programmes.js --build. Do not edit. */
const BUILD = 'c4f91e8b';
const PROGRAMME_FILES = ['./programmes/index.json', './programmes/3AP-english.json', './programmes/4AP-english.json', './programmes/5AP-english.json'];
/* BUILD:END */
const CACHE = 'class-maestro-v6-' + BUILD;   // a new build name makes phones drop the old copies
const FILES = [
  ...PROGRAMME_FILES,
  './', './index.html', './style.css', './fonts.css', './i18n.js', './app.js', './programmes.js', './manifest.webmanifest', './icon.svg',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png',
  './fonts/bricolage-grotesque-latin-500-normal.woff2', './fonts/bricolage-grotesque-latin-700-normal.woff2',
  './fonts/instrument-sans-latin-400-normal.woff2', './fonts/instrument-sans-latin-500-normal.woff2', './fonts/instrument-sans-latin-600-normal.woff2',
  './fonts/noto-sans-arabic-arabic-400-normal.woff2', './fonts/noto-sans-arabic-arabic-600-normal.woff2', './fonts/noto-sans-arabic-arabic-700-normal.woff2',
  './fonts/noto-sans-arabic-latin-400-normal.woff2', './fonts/noto-sans-arabic-latin-600-normal.woff2', './fonts/noto-sans-arabic-latin-700-normal.woff2'
];
// One missing file must not stop the whole install.
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => Promise.all(FILES.map(f => c.add(f).catch(() => {})))).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));

const fallback = req => caches.match(req).then(hit => hit || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error()));
function networkFirst(req, ms) {
  return new Promise(resolve => {
    let done = false;
    const finish = r => { if (!done) { done = true; resolve(r); } };
    const timer = setTimeout(() => fallback(req).then(hit => { if (hit && hit.type !== 'error') finish(hit); }), ms);   // slow network: show the saved copy, keep waiting in the background
    fetch(req.mode === 'navigate' ? req : new Request(req, { cache: 'no-cache' })).then(res => {
      clearTimeout(timer);
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {}); }
      finish(res);
    }).catch(() => { clearTimeout(timer); fallback(req).then(finish); });
  });
}
function cacheFirst(req) {
  return caches.match(req).then(hit => hit || fetch(req).then(res => { if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {}); } return res; }));
}
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  const immutable = /\/(fonts|icons)\//.test(url.pathname);
  e.respondWith(immutable ? cacheFirst(req) : networkFirst(req, 3000));
});
