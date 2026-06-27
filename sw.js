// Service Worker — Local + GitHub хоёуланд ажиллана
const CACHE = 'my-reel-v2';

// Локал дээр ажиллаж байгаа эсэхийг мэдэнэ
const isLocal = self.location.hostname === 'localhost' ||
                self.location.hostname === '127.0.0.1';

// Хэрэв локал бол '/'-оор, GitHub бол '/My-Reel/'-оор эхлэнэ
const BASE = isLocal ? '' : '/My-Reel';

const FILES = [
  `${BASE}/`,
  `${BASE}/index.html`,
  `${BASE}/style.css`,
  `${BASE}/app.js`,
  `${BASE}/data.js`,
  `${BASE}/license.js`,
  `${BASE}/manifest.json`,
  `${BASE}/icon-192.png`,
  `${BASE}/icon-512.png`
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(cache => {
        // Нэг нэгээр нэмнэ — нэг файл алдаатай бол бусад нь ажиллана
        return Promise.allSettled(
          FILES.map(f => cache.add(f).catch(err => {
            console.log('Кэш алдаа:', f, err);
          }))
        );
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.url.includes('mymemory.translated.net')) return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      return cached || fetch(e.request).catch(() => {
        return caches.match(`${BASE}/index.html`);
      });
    })
  );
});