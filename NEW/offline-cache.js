// ===============================
// N1K∅ OFFLINE CACHE INTEGRATION
// ===============================

// === 1. Регистрация Service Worker ===
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js')
    .then(reg => console.log('✅ SW registered:', reg.scope))
    .catch(err => console.log('❌ SW failed:', err));
}

// === 2. Проверка, закэширован ли трек ===
async function isTrackCached(url) {
  if (!('caches' in window)) return false;
  const cache = await caches.open('niko-audio-v1');
  const response = await cache.match(url);
  return !!response;
}

// === 3. Получение списка закэшированных треков ===
async function getCachedTrackUrls() {
  if (!('caches' in window)) return [];
  const cache = await caches.open('niko-audio-v1');
  const keys = await cache.keys();
  return keys.map(r => r.url);
}

// === 4. Smart Load для Wavesurfer ===
async function smartLoadTrack(wavesurfer, trackUrl, trackId) {
  const cache = await caches.open('niko-audio-v1');
  const cached = await cache.match(trackUrl);

  if (cached) {
    console.log('📂 Loading from cache:', trackId);
    const blob = await cached.blob();
    await wavesurfer.loadBlob(blob);
    return;
  }

  console.log('🌐 Loading from network:', trackId);
  await wavesurfer.load(trackUrl);

  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'CACHE_AUDIO',
      url: trackUrl,
      trackId: trackId
    });
  }
}

// === 5. Офлайн-фильтр ===
async function getOfflineAvailableTracks(allTracks) {
  const cachedUrls = await getCachedTrackUrls();
  const cachedSet = new Set(cachedUrls);
  return allTracks.filter(t => cachedSet.has(t.audio));
}

// === 6. Пропуск недоступных треков ===
async function getNextAvailableTrackIndex(currentIdx, direction, tracks) {
  const isOnline = navigator.onLine;
  if (isOnline) return direction === 'next' ? (currentIdx + 1) % tracks.length : (currentIdx - 1 + tracks.length) % tracks.length;

  let idx = currentIdx;
  const step = direction === 'next' ? 1 : -1;

  for (let i = 0; i < tracks.length; i++) {
    idx = (idx + step + tracks.length) % tracks.length;
    if (idx === currentIdx) break;
    const cached = await isTrackCached(tracks[idx].audio);
    if (cached) return idx;
  }
  return -1;
}

// === 7. Индикатор офлайн-режима ===
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
setTimeout(updateOfflineIndicator, 1000);

// === 8. Безопасная загрузка трека ===
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

// === 9. Debounce переключения ===
let trackSwitchTimeout = null;
function debouncedTrackSwitch(callback, delay = 100) {
  if (trackSwitchTimeout) clearTimeout(trackSwitchTimeout);
  trackSwitchTimeout = setTimeout(() => {
    trackSwitchTimeout = null;
    callback();
  }, delay);
}

// === 10. Предзагрузка трека ===
async function preloadTrack(trackUrl) {
  if (!navigator.onLine) return;
  const cached = await isTrackCached(trackUrl);
  if (cached) return;
  fetch(trackUrl).then(response => {
    if (response.ok) {
      caches.open('niko-audio-v1').then(cache => {
        cache.put(trackUrl, response);
        console.log('📦 Preloaded:', trackUrl);
      });
    }
  }).catch(() => {});
}
