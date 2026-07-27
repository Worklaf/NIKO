// ===============================
// N1K∅ Service Worker — Offline Audio Cache
// ===============================

const CACHE_NAME = 'niko-music-v3';
const AUDIO_CACHE = 'niko-audio-v3';

const STATIC_ASSETS = [
  
  './NIKO.html',
  './db.js',
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
    
    // [FIX] Для навигации — отдаём главную страницу
    if (request.mode === 'navigate') {
      const cachedMain = await caches.match('./index.html') || 
                        await caches.match('./') ||
                        await caches.match('./NIKO.html');
      if (cachedMain) return cachedMain;
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
  
  // [NEW] Сохраняем треки в IndexedDB
  if (e.data.type === 'SAVE_TRACKS') {
    saveTracksToIndexedDB(e.data.tracks).then(() => {
      e.source.postMessage({ type: 'TRACKS_SAVED', count: e.data.tracks.length });
    }).catch(err => {
      console.warn('SAVE_TRACKS failed:', err);
    });
  }
  
  // [NEW] Получаем треки из IndexedDB
  if (e.data.type === 'GET_OFFLINE_TRACKS') {
    getTracksFromIndexedDB().then(tracks => {
      e.source.postMessage({ type: 'OFFLINE_TRACKS', tracks });
    }).catch(err => {
      e.source.postMessage({ type: 'OFFLINE_TRACKS', tracks: [] });
    });
  }
  
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
