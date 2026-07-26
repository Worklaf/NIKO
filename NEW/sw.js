// ===============================
// N1K∅ Service Worker — Offline Audio Cache
// ===============================

const CACHE_NAME = 'niko-music-v3';
const AUDIO_CACHE = 'niko-audio-v3';

// [FIX] Относительные пути — работают и на localhost, и на GitHub Pages
const STATIC_ASSETS = [
  './NIKO.html',
  './styles.css',
  './player-core.js',
  './visualizers.js',
  './language.js',
  './offline-cache.js',
  './manifest.json'
];

const EXTERNAL_ASSETS = [
  'https://cdnjs.cloudflare.com/ajax/libs/jsmediatags/3.9.5/jsmediatags.min.js',
  'https://unpkg.com/wavesurfer.js@7/dist/wavesurfer.min.js',
  'https://unpkg.com/modern-normalize/modern-normalize.css'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      // Кэшируем локальные ресурсы
      await cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('SW: Some static assets failed:', err);
      });
      // Кэшируем внешние скрипты
      for (const url of EXTERNAL_ASSETS) {
        try {
          const response = await fetch(url, { mode: 'no-cors' });
          await cache.put(url, response);
        } catch (e) {
          console.warn('SW: External asset failed:', url);
        }
      }
    })
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

  // Только GET
  if (e.request.method !== 'GET') return;
  
  // Игнорируем chrome-extension
  if (!url.protocol.startsWith('http')) return;

  // Firebase / API — Network First
  if (url.hostname.includes('googleapis.com') || 
      url.hostname.includes('firebase') ||
      url.hostname.includes('gstatic.com') ||
      url.hostname.includes('firebasestorage')) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }

  // Worker (R2 proxy) — только сеть
  if (url.hostname.includes('workers.dev')) {
    e.respondWith(fetch(e.request));
    return;
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

  // Внешние скрипты — Cache First
  if (EXTERNAL_ASSETS.includes(e.request.url)) {
    e.respondWith(cacheFirstStrategy(e.request, CACHE_NAME));
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
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return new Response('', { status: 503, statusText: 'Offline' });
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
    return new Response('', { status: 503 });
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
    if (cached) return cached;
    if (request.mode === 'navigate') {
      return caches.match('./NIKO.html');
    }
    return new Response('Offline', { status: 503 });
  }
}

async function cacheFirstStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

async function fetchAndCache(request, cache) {
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response);
  } catch (e) {}
}

self.addEventListener('message', (e) => {
  if (e.data === 'skipWaiting') self.skipWaiting();
  
  if (e.data.type === 'CACHE_AUDIO') {
    caches.open(AUDIO_CACHE).then(cache => {
      cache.add(e.data.url).catch(err => console.warn('CACHE_AUDIO failed:', err));
    });
  }
  
  if (e.data.type === 'GET_CACHED_TRACKS') {
    caches.open(AUDIO_CACHE).then(async cache => {
      const keys = await cache.keys();
      e.source.postMessage({ type: 'CACHED_TRACKS_LIST', urls: keys.map(r => r.url) });
    });
  }
  
  if (e.data.type === 'CLEAR_AUDIO_CACHE') {
    caches.delete(AUDIO_CACHE).then(() => {
      caches.open(AUDIO_CACHE);
      e.source.postMessage({ type: 'CACHE_CLEARED' });
    });
  }
  
  if (e.data.type === 'IS_TRACK_CACHED') {
    caches.open(AUDIO_CACHE).then(async cache => {
      const cached = await cache.match(e.data.url);
      e.source.postMessage({ type: 'TRACK_CACHED_STATUS', url: e.data.url, cached: !!cached });
    });
  }
});
