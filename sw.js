const CACHE_NAME = 'tinti-lesen-v4';

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './js/words.js',
  './js/progress.js',
  './js/main.js',
  './js/scenes/BootScene.js',
  './js/scenes/MenuScene.js',
  './js/scenes/QuizScene.js',
  './js/scenes/ShooterScene.js',
  './js/scenes/LevelCompleteScene.js',
  './js/scenes/TrophyScene.js',
  './assets/icons/icon.svg',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Delete ALL old caches on activate
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Network-first: always fetch fresh, only cache audio files
  event.respondWith(
    fetch(event.request).then((response) => {
      // Cache audio files for offline use
      if (event.request.url.includes('/assets/audio/') && response.ok) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
      }
      return response;
    }).catch(() => {
      // Offline fallback: try cache
      return caches.match(event.request);
    })
  );
});
