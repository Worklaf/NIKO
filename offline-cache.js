// ===============================
// N1K∅ OFFLINE CACHE MANAGER v3
// ===============================

// Prevent double loading
if (typeof window.NIKO_OFFLINE_CACHE_LOADED !== 'undefined') {
  console.warn('⚠️ offline-cache.js already loaded');
} else {
  window.NIKO_OFFLINE_CACHE_LOADED = true;

// === 0. КОНСТАНТЫ ===
const AUDIO_CACHE_NAME = 'niko-audio-v3';      // ДОЛЖНО совпадать с sw.js!
const STATIC_CACHE_NAME = 'niko-music-v3';     // ДОЛЖНО совпадать с sw.js!
const DB_NAME = 'niko-offline-db';
const DB_VERSION = 1;
const TRACKS_STORE = 'tracks';

// === 2. INDEXEDDB: Открытие базы ===
function openOfflineDB() {
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

// === 3. INDEXEDDB: Сохранение треков ===
async function saveTracksToDB(tracks) {
  if (!tracks || !tracks.length) return;
  try {
    const db = await openOfflineDB();
    const tx = db.transaction(TRACKS_STORE, 'readwrite');
    const store = tx.objectStore(TRACKS_STORE);
    
    // Очищаем старые треки
    await new Promise((resolve, reject) => {
      const clearReq = store.clear();
      clearReq.onsuccess = () => resolve();
      clearReq.onerror = () => reject(clearReq.error);
    });
    
    // Сохраняем новые
    for (const track of tracks) {
      store.put(track);
    }
    
    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    
    console.log('💾 Saved', tracks.length, 'tracks to IndexedDB');
  } catch (e) {
    console.warn('❌ saveTracksToDB failed:', e);
  }
}

// === 4. INDEXEDDB: Загрузка треков ===
async function getTracksFromDB() {
  try {
    const db = await openOfflineDB();
    const tx = db.transaction(TRACKS_STORE, 'readonly');
    const store = tx.objectStore(TRACKS_STORE);
    
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('❌ getTracksFromDB failed:', e);
    return [];
  }
}

// === 5. CACHE API: Проверка, закэширован ли аудио-файл ===
async function isTrackCached(url) {
  if (!url || !('caches' in window)) return false;
  try {
    const cache = await caches.open(AUDIO_CACHE_NAME);
    const response = await cache.match(url);
    return !!response;
  } catch (e) {
    console.warn('isTrackCached error:', e);
    return false;
  }
}

// === 6. CACHE API: Получение списка всех закэшированных URL ===
async function getCachedTrackUrls() {
  if (!('caches' in window)) return [];
  try {
    const cache = await caches.open(AUDIO_CACHE_NAME);
    const keys = await cache.keys();
    return keys.map(r => r.url);
  } catch (e) {
    console.warn('getCachedTrackUrls error:', e);
    return [];
  }
}

// === 7. Smart Load для Wavesurfer — сначала кэш, потом сеть ===
async function smartLoadTrack(wavesurfer, trackUrl, trackId) {
  if (!wavesurfer || !trackUrl) throw new Error('Missing wavesurfer or trackUrl');

  // Сначала пробуем загрузить из кэша
  try {
    const cache = await caches.open(AUDIO_CACHE_NAME);
    const cached = await cache.match(trackUrl);

    if (cached) {
      console.log('📂 Loading from cache:', trackId);
      const blob = await cached.blob();
      await wavesurfer.loadBlob(blob);
      return;
    }
  } catch (e) {
    console.warn('Cache load failed, falling back to network:', e);
  }

  // Нет в кэше — грузим из сети
  console.log('🌐 Loading from network:', trackId);
  await wavesurfer.load(trackUrl);

  // Фоном кэшируем для следующего раза
  if (navigator.serviceWorker && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'CACHE_AUDIO',
      url: trackUrl,
      trackId: trackId
    });
  }
}

// === 8. Безопасная загрузка трека с обработкой AbortError ===
async function safeLoadTrack(wavesurfer, trackUrl, trackId, retryCount = 0) {
  try {
    await smartLoadTrack(wavesurfer, trackUrl, trackId);
  } catch (err) {
    if (err.name === 'AbortError' && retryCount < 2) {
      console.warn('⚠️ AbortError, retrying...', trackId);
      await new Promise(r => setTimeout(r, 300));
      return safeLoadTrack(wavesurfer, trackUrl, trackId, retryCount + 1);
    }
    throw err;
  }
}

// === 9. Debounced переключение трека ===
let trackSwitchTimeout = null;

function debouncedTrackSwitch(callback, delay = 150) {
  if (trackSwitchTimeout) {
    clearTimeout(trackSwitchTimeout);
  }
  trackSwitchTimeout = setTimeout(() => {
    trackSwitchTimeout = null;
    callback();
  }, delay);
}

// === 10. Предзагрузка трека в кэш ===
async function preloadTrack(trackUrl) {
  if (!trackUrl || !navigator.onLine) return;
  
  const cached = await isTrackCached(trackUrl);
  if (cached) return;

  try {
    const response = await fetch(trackUrl);
    if (response.ok) {
      const cache = await caches.open(AUDIO_CACHE_NAME);
      await cache.put(trackUrl, response.clone());
      console.log('📦 Preloaded:', trackUrl);
    }
  } catch (e) {
    // Тихо игнорируем ошибки предзагрузки
  }
}

// === 11. Фильтр: только треки с закэшированным аудио ===
async function getOfflineAvailableTracks(allTracks) {
  if (!allTracks || !allTracks.length) {
    // Пробуем загрузить из IndexedDB
    return await getTracksFromDB();
  }
  
  const cachedUrls = await getCachedTrackUrls();
  const cachedSet = new Set(cachedUrls);
  
  // Нормализуем URL для сравнения
  const normalizeUrl = (url) => {
    try {
      const u = new URL(url);
      return u.origin + u.pathname;
    } catch {
      return url;
    }
  };
  
  const normalizedCached = new Set(cachedUrls.map(normalizeUrl));
  
  return allTracks.filter(t => {
    if (!t.audio) return false;
    return cachedSet.has(t.audio) || normalizedCached.has(normalizeUrl(t.audio));
  });
}

// === 12. Поиск следующего/предыдущего доступного трека (offline-aware) ===
async function getNextAvailableTrackIndex(currentIdx, direction, tracks) {
  if (!tracks || !tracks.length) return -1;
  
  const isOnline = navigator.onLine;
  if (isOnline) {
    return direction === 'next' 
      ? (currentIdx + 1) % tracks.length 
      : (currentIdx - 1 + tracks.length) % tracks.length;
  }

  // Офлайн — ищем следующий закэшированный
  let idx = currentIdx;
  const step = direction === 'next' ? 1 : -1;
  const startIdx = currentIdx;

  for (let i = 0; i < tracks.length; i++) {
    idx = (idx + step + tracks.length) % tracks.length;
    if (idx === startIdx && i > 0) break; // Полный круг (но не сразу)

    const track = tracks[idx];
    if (!track || !track.audio) continue;

    const cached = await isTrackCached(track.audio);
    if (cached) {
      console.log('✅ Found cached track at index', idx, ':', track.title);
      return idx;
    }
  }

  console.warn('❌ No cached tracks found in', direction, 'direction');
  return -1;
}

// === 13. Индикатор офлайн-режима ===
function updateOfflineIndicator() {
  const indicator = document.getElementById('offline-indicator');
  if (!indicator) return;

  if (!navigator.onLine) {
    indicator.style.display = 'flex';
    indicator.textContent = '📴 Offline — Cached tracks only';
  } else {
    indicator.style.display = 'none';
  }
}

window.addEventListener('online', updateOfflineIndicator);
window.addEventListener('offline', updateOfflineIndicator);

// === 14. Экспорт в глобальную область ===
window.saveTracksToDB = saveTracksToDB;
window.getTracksFromDB = getTracksFromDB;
window.isTrackCached = isTrackCached;
window.getCachedTrackUrls = getCachedTrackUrls;
window.getOfflineAvailableTracks = getOfflineAvailableTracks;
window.getNextAvailableTrackIndex = getNextAvailableTrackIndex;
window.smartLoadTrack = smartLoadTrack;
window.safeLoadTrack = safeLoadTrack;
window.debouncedTrackSwitch = debouncedTrackSwitch;
window.preloadTrack = preloadTrack;

console.log('📦 offline-cache.js v3 loaded');

} // End of NIKO_OFFLINE_CACHE_LOADED check
