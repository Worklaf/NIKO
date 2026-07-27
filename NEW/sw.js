// ===============================
// N1K∅ Service Worker — Offline Audio Cache
// ===============================

const CACHE_NAME = 'niko-music-v3';
const AUDIO_CACHE = 'niko-audio-v3';

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

// [NEW] Храним треки в IndexedDB для offline-доступа
const DB_NAME = 'niko-offline-db';
const DB_VERSION = 1;
const TRACKS_STORE = 'tracks';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(TRACKS_STORE)) {
        db.createObjectStore(TRACKS_STORE, { keyPath: 'id' });
      }
    };
  });
}

async function saveTracksToIndexedDB(tracks) {
  const db = await openDB();
  const tx = db.transaction(TRACKS_STORE, 'readwrite');
  const store = tx.objectStore(TRACKS_STORE);
  // Очищаем старые
  await store.clear();
  for (const track of tracks) {
    store.put(track);
  }
  return tx.complete;
}

async function getTracksFromIndexedDB() {
  const db = await openDB();
  const tx = db.transaction(TRACKS_STORE, 'readonly');
  const store = tx.objectStore(TRACKS_STORE);
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      await cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('SW: Some static assets failed:', err);
      });
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

  if (e.request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;

  // [NEW] Firebase Firestore — Network First + IndexedDB fallback
  if (url.hostname.includes('googleapis.com') || 
      url.hostname.includes('firebase') ||
      url.hostname.includes('gstatic.com') ||
      url.hostname.includes('firebasestorage')) {
    
    e.respondWith(
      fetch(e.request).catch(async () => {
        // Пытаемся вернуть кэшированный ответ
        const cached = await caches.match(e.request);
        if (cached) return cached;
        // Если это запрос треков — возвращаем пустой успешный ответ
        // Клиент сам возьмет из IndexedDB
        return new Response('[]', { 
          status: 200, 
          headers: { 'Content-Type': 'application/json' } 
        });
      })
    );
    return;
  }

  if (url.hostname.includes('workers.dev')) {
    e.respondWith(
      fetch(e.request).catch(async () => {
        // [NEW] Fallback для аудио из кэша
        if (e.request.destination === 'audio' || url.pathname.match(/\.(mp3|wav|ogg|m4a|aac|flac)$/i)) {
          const cache = await caches.open(AUDIO_CACHE);
          const cached = await cache.match(e.request);
          if (cached) return cached;
        }
        return new Response('', { status: 503 });
      })
    );
    return;
  }

  if (e.request.destination === 'audio' || url.pathname.match(/\.(mp3|wav|ogg|m4a|aac|flac)$/i)) {
    e.respondWith(audioCacheStrategy(e.request));
    return;
  }

  if (e.request.destination === 'image' || url.pathname.match(/\.(jpg|jpeg|png|webp|gif|svg)$/i)) {
    e.respondWith(imageCacheStrategy(e.request));
    return;
  }

  if (EXTERNAL_ASSETS.includes(e.request.url)) {
    e.respondWith(cacheFirstStrategy(e.request, CACHE_NAME));
    return;
  }

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
