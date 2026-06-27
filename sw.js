// Service Worker — Офлайн ажиллуулна
const CACHE = 'my-reel-v1';

// Кэш хийх файлууд
const FILES = [
  '/My-REEL/',
  '/My-REEL/index.html',
  '/My-REEL/style.css',
  '/My-REEL/app.js',
  '/My-REEL/data.js',
  '/My-REEL/license.js',
  '/My-REEL/manifest.json',
  '/My-REEL/icon-192.png',
  '/My-REEL/icon-512.png'
];

// Суулгах үед кэш хийнэ
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(FILES))
  );
  self.skipWaiting();
});

// Идэвхжих үед хуучин кэш устгана
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

// Хүсэлт ирэхэд кэшээс өгнө
self.addEventListener('fetch', e => {
  // API хүсэлтийг кэш хийхгүй
  if (e.request.url.includes('mymemory.translated.net')) {
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => {
      return cached || fetch(e.request).catch(() => {
        // Офлайн бол index.html буцаана
        return caches.match('/My-Reel/index.html');
      });
    })
  );
});