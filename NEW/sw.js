// ===============================
// N1K∅ Service Worker — Offline Audio Cache
// ===============================
const CACHE_NAME = 'niko-music-v1';
const STATIC_ASSETS = [
  '/',
  '/NIKO.html',
  '/styles.css',
  '/player-core.js',
  '/visualizers.js',
  '/language.js',
  '/offline-cache.js',
  '/manifest.json',
];

const AUDIO_CACHE = 'niko-audio-v1';

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => 
      Promise.all(
        keys.filter(k => k !== CACHE_NAME && k !== AUDIO_CACHE).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // [FIX 1] Игнорируем POST, PUT, DELETE — Cache API только для GET
  if (e.request.method !== 'GET') {
    return; // Пропускаем, пусть идёт в сеть как есть
  }

  // [FIX 2] Игнорируем chrome-extension и другие схемы
  if (!url.protocol.startsWith('http')) {
    return; // Пропускаем расширения браузера
  }

  // [FIX 3] Игнорируем Firebase и другие API
  if (url.hostname.includes('googleapis.com') || 
      url.hostname.includes('firebase') ||
      url.hostname.includes('gstatic.com')) {
    return; // Пропускаем API-запросы
  }

  // Аудио — Cache First
  if (e.request.destination === 'audio' || url.pathname.match(/\.(mp3|wav|ogg|m4a|aac|flac)$/i)) {
    e.respondWith(audioCacheStrategy(e.request));
    return;
  }

  // Обложки — Cache First
  if (e.request.destination === 'image' || url.pathname.match(/\.(jpg|jpeg|png|webp|gif|svg)$/i)) {
    e.respondWith(imageCacheStrategy(e.request));
    return;
  }

  // Статика — Network First
  e.respondWith(networkFirstStrategy(e.request));
});

async function audioCacheStrategy(request) {
  const cache = await caches.open(AUDIO_CACHE);
  const cached = await cache.match(request);

  if (cached) {
    fetchAndCache(request, cache);
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    return new Response('', { status: 503, statusText: 'Offline - not cached' });
  }
}

async function imageCacheStrategy(request) {
  const cache = await caches.open(AUDIO_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return cached || new Response('', { status: 503 });
  }
}

async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}

async function fetchAndCache(request, cache) {
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response);
  } catch (e) {}
}

self.addEventListener('message', (e) => {
  if (e.data === 'skipWaiting') {
    self.skipWaiting();
  }
  if (e.data.type === 'CACHE_AUDIO') {
    caches.open(AUDIO_CACHE).then(cache => {
      cache.add(e.data.url);
    });
  }
  if (e.data.type === 'GET_CACHED_TRACKS') {
    caches.open(AUDIO_CACHE).then(async cache => {
      const keys = await cache.keys();
      const urls = keys.map(r => r.url);
      e.source.postMessage({ type: 'CACHED_TRACKS_LIST', urls });
    });
  }
  if (e.data.type === 'CLEAR_AUDIO_CACHE') {
    caches.delete(AUDIO_CACHE).then(() => {
      caches.open(AUDIO_CACHE);
      e.source.postMessage({ type: 'CACHE_CLEARED' });
    });
  }
});
