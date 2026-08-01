// ===============================
// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
// ===============================

window.wavesurfer = null;
window.currentTrackIndex = -1;
window.currentTrackSrc = '';
window.currentTrackId = '';
window.durationInterval = null;
window.isShuffleMode = JSON.parse(localStorage.getItem('shuffleMode') || 'false');
window.isLoadingTrack = false;
window.tries = 0;
window.isPlaying = false;

// === НОВОЕ: глобальный контекст воспроизведения ===
window.playerContext = {
  tracks: [],
  currentIndex: -1,
  source: null,
  playlistId: null
};

window.globalTracks = window.globalTracks || [];
if (typeof globalTracks !== 'undefined' && Array.isArray(globalTracks) && globalTracks.length > 0) {
  window.globalTracks = globalTracks;
}
window.currentFilteredIds = window.currentFilteredIds || [];

// ===============================
// PLAYER CONTEXT HELPERS
// ===============================

window.setPlayerContext = function(tracks, source, playlistId) {
  window.playerContext = {
    tracks: tracks || [],
    currentIndex: -1,
    source: source || 'home',
    playlistId: playlistId || null
  };
};

window.getContextIndex = function(trackId) {
  return window.playerContext.tracks.findIndex(t => t && t.id === trackId);
};

// ===============================
// FIRESTORE HELPERS
// ===============================

window.trackDocRef = function (trackId) {
  return db.collection('tracks').doc(trackId);
};

window.bumpCounter = async function (trackId, field, delta) {
  await window.trackDocRef(trackId).update({
    [field]: firebase.firestore.FieldValue.increment(delta)
  });
};

// ===============================
// LIKE / DISLIKE
// ===============================

window.toggleLike = async function (trackId) {
  const userKey = 'like:user:' + trackId;
  const cur = localStorage.getItem(userKey);
  const track = globalTracks.find(t => t.id === trackId);
  if (!track) return;

  let likesDelta = 0;
  let dislikesDelta = 0;

  if (cur === 'like') {
    localStorage.removeItem(userKey);
    likesDelta = -1;
  } else {
    if (cur === 'dislike') {
      dislikesDelta = -1;
    }
    localStorage.setItem(userKey, 'like');
    likesDelta = 1;
  }

  // Обновляем UI сразу (оптимистично)
  if (typeof window.updateLikeUI === 'function') {
    window.updateLikeUI(trackId, likesDelta, dislikesDelta);
  }
  if (typeof window.updateMiniPlayerButtons === 'function') {
    window.updateMiniPlayerButtons();
  }

  // Сначала обновляем Firestore
  if (likesDelta) await window.bumpCounter(trackId, 'likes', likesDelta);
  if (dislikesDelta) await window.bumpCounter(trackId, 'dislikes', dislikesDelta);

  // Потом рассылаем актуальные данные (после await!)
  if (typeof window.broadcastCounters === 'function') {
    window.broadcastCounters(trackId);
  }
};
window.toggleDislike = async function (trackId) {
  const userKey = 'like:user:' + trackId;
  const cur = localStorage.getItem(userKey);
  const track = globalTracks.find(t => t.id === trackId);
  if (!track) return;

  let likesDelta = 0;
  let dislikesDelta = 0;

  if (cur === 'dislike') {
    localStorage.removeItem(userKey);
    dislikesDelta = -1;
  } else {
    if (cur === 'like') {
      likesDelta = -1;
    }
    localStorage.setItem(userKey, 'dislike');
    dislikesDelta = 1;
  }

    if (typeof window.updateLikeUI === 'function') {
    window.updateLikeUI(trackId, likesDelta, dislikesDelta);
  }
  if (typeof window.updateMiniPlayerButtons === 'function') {
    window.updateMiniPlayerButtons();
  }

  if (likesDelta) await window.bumpCounter(trackId, 'likes', likesDelta);
  if (dislikesDelta) await window.bumpCounter(trackId, 'dislikes', dislikesDelta);
  if (typeof window.broadcastCounters === 'function') {
    window.broadcastCounters(trackId);
  }
};

// ===============================
// TRACK DURATION
// ===============================

window.updateTrackDuration = function (trackId, duration) {
  const track = globalTracks.find(t => t.id === trackId);
  if (!track) return;

  const minutes = Math.floor(duration / 60);
  const seconds = Math.floor(duration % 60);
  const formatted = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  if (track.duration !== formatted) {
    db.collection('tracks').doc(trackId).update({ duration: formatted });
  }

  if (window.currentTrackId === trackId) {
    window.updateTimeDisplay(duration);
  }
};

// ===============================
// TIME DISPLAY
// ===============================

window.updateTimeDisplay = function (duration) {
  const miniTime = document.getElementById('mini-time');
  if (!miniTime || !wavesurfer) return;

  const current = wavesurfer.getCurrentTime();
  const total = duration || wavesurfer.getDuration();

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  miniTime.textContent = `${formatTime(current)} / ${formatTime(total)}`;
};

// ===============================
// SHUFFLE
// ===============================

window.updateShuffleButton = function () {
  const btn = document.getElementById('shuffle-btn');
  const icon = document.getElementById('shuffle-icon');
  if (!btn || !icon) return;

  btn.classList.toggle('active', window.isShuffleMode);
  icon.textContent = window.isShuffleMode ? '🔀' : '🔁';
};

window.toggleShuffle = function () {
  window.isShuffleMode = !window.isShuffleMode;
  localStorage.setItem('shuffleMode', window.isShuffleMode);
  window.updateShuffleButton();
};

window.updateTrackPlayIcons = function () {
  const currentTrackId = window.currentTrackId || '';
  const isPlaying = window.isPlaying || false;

  const playButtons = document.querySelectorAll('.play-btn');
  playButtons.forEach(btn => {
    const trackEl = btn.closest('.track');
    if (!trackEl) return;

    const trackId = trackEl.dataset.id || '';
    const isCurrentTrack = trackId === currentTrackId;

    if (isCurrentTrack && isPlaying) {
      btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
      btn.classList.add('playing');
      trackEl.classList.add('playing');
    } else {
      btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M5 3v18l15-9L5 3z"/></svg>';
      btn.classList.remove('playing');
      if (!isCurrentTrack) {
        trackEl.classList.remove('playing');
      }
    }
  });
};

// ===============================
// WAVESURFER INIT
// ===============================

window.initWavesurfer = function () {
  if (!window.WaveSurfer) {
    console.error("WaveSurfer library is not loaded");
    return;
  }

  wavesurfer = WaveSurfer.create({
    container: '#mini-wave',
    waveColor: '#bfc3d6',
    progressColor: '#ff4da6',
    cursorColor: '#00d1ff',
    barWidth: 2,
    barRadius: 3,
    barGap: 2,
    height: 48,
    normalize: true,
    backend: 'MediaElement'
  });

  wavesurfer.on('ready', () => {
    wavesurfer.play();
    const duration = wavesurfer.getDuration();
    window.updateTrackDuration(window.currentTrackId, duration);

    if (window.durationInterval) clearInterval(window.durationInterval);
    window.durationInterval = setInterval(() => {
      window.updateTimeDisplay(duration);
    }, 1000);
  });

  wavesurfer.on('audioprocess', () => window.updateTimeDisplay());
  wavesurfer.on('finish', () => {
  try { window.playNext(); } catch (e) { console.error('finish handler error', e); }
});

  document.getElementById('mini-play').onclick = () => wavesurfer.playPause();

    wavesurfer.on('play', () => {
    window.isPlaying = true;
    const icon = document.getElementById('mini-play-icon');
    if (icon) icon.innerHTML = '<path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>';
    window.updateTrackPlayIcons();
    if (typeof window.broadcastPlayerState === 'function') window.broadcastPlayerState();
  });

  wavesurfer.on('pause', () => {
    window.isPlaying = false;
    const icon = document.getElementById('mini-play-icon');
    if (icon) icon.innerHTML = '<path d="M5 3v18l15-9L5 3z"/>';
    window.updateTrackPlayIcons();
    if (typeof window.broadcastPlayerState === 'function') window.broadcastPlayerState();
  });

  document.getElementById('mini-prev').onclick = () => window.playPrev();
  document.getElementById('mini-next').onclick = () => window.playNext();
  document.getElementById('shuffle-btn').onclick = () => window.toggleShuffle();

  const volSlider = document.getElementById('mini-volume');
  volSlider.value = localStorage.getItem('volume') || '1';
  wavesurfer.setVolume(parseFloat(volSlider.value));

  volSlider.oninput = e => {
    const vol = parseFloat(e.target.value);
    wavesurfer.setVolume(vol);
    localStorage.setItem('volume', vol);
  };

  window.updateShuffleButton();
};

// ===============================
// LOAD & PLAY (чистое воспроизведение)
// ===============================

window.loadAndPlayTrack = function(track) {
  if (!track) return;
  window.isLoadingTrack = true;

  window.currentTrackId = track.id || '';
  window.currentTrackSrc = track.audio || track.url || track.file || '';
    // [FIX] Синхронизируем индекс в контексте, иначе next/prev всегда сбрасываются на 0
  const ctxIdx = window.playerContext.tracks.findIndex(t => t && t.id === track.id);
  if (ctxIdx !== -1) {
    window.playerContext.currentIndex = ctxIdx;
  }
    // Снимаем NEW при любом запуске (ручном или автоматическом)
  const trackEl = document.querySelector(`.track[data-id="${track.id}"]`);
  if (trackEl) {
    trackEl.classList.remove('new-track');
  }
  if (typeof saveListenToFirebase === 'function') {
    saveListenToFirebase(track.id).catch(() => {});
  }
  if (typeof updateNewTracksBadge === 'function') {
    updateNewTracksBadge();
  }
  window.currentTrackIndex = window.globalTracks.findIndex(t => t && t.id === track.id);

  const titleText = track.artist ? `${track.artist} - ${track.title}` : (track.title || '');
  document.getElementById('mini-title').textContent = titleText;
  document.getElementById('mini-thumb').src = track.cover || '';
  document.getElementById('mini-player').style.display = 'flex';

  document.querySelectorAll('.track').forEach(t => t.classList.remove('playing'));
  const el = document.querySelector(`.track[data-id="${track.id}"]`);
  if (el) el.classList.add('playing');
// [NEW] Предзагружаем в кэш при воспроизведении
  if (track.audio && typeof preloadTrackToCache === 'function') {
    preloadTrackToCache(track.audio);
  }
  if (track.cover && typeof preloadTrackToCache === 'function') {
    preloadTrackToCache(track.cover);
  }
  if (wavesurfer) {
    try { wavesurfer.stop(); } catch (e) {}
    setTimeout(async () => {
      try {
        // [FIX] Smart load: сначала кэш, потом сеть, с retry при AbortError
        if (typeof safeLoadTrack === 'function') {
          await safeLoadTrack(wavesurfer, window.currentTrackSrc, track.id);
        } else if (typeof smartLoadTrack === 'function') {
          await smartLoadTrack(wavesurfer, window.currentTrackSrc, track.id);
        } else {
          wavesurfer.load(window.currentTrackSrc);
        }
      } catch (e) { 
        console.error('Load failed:', e);
        // [FIX] При ошибке пробуем обычную загрузку как fallback
        try {
          wavesurfer.load(window.currentTrackSrc);
        } catch (e2) {
          console.error('Fallback load also failed:', e2);
        }
      }
      setTimeout(() => { window.isLoadingTrack = false; }, 500);
    }, 150);
  } else {
    window.isLoadingTrack = false;
  }

      if (track.id) {
    try {
      window.bumpCounter(track.id, 'plays', 1);
      
      // [FIX] Оптимистично обновляем DOM на ВСЕХ страницах сразу
      const newPlays = (track.plays || 0) + 1;
      track.plays = newPlays;
      document.querySelectorAll(`.track[data-id="${track.id}"] .play-count .num`).forEach(el => {
        el.textContent = newPlays;
      });
      
      // Сообщаем iframe'ам (playlist-view)
      document.querySelectorAll('iframe').forEach(function(iframe) {
        try {
          iframe.contentWindow.postMessage({
            type: 'plays-update',
            trackId: track.id,
            delta: 1
          }, '*');
        } catch(e) {}
      });
    } catch (e) { console.warn('bumpCounter failed', e); }
  }

  window.updateMiniPlayerButtons();

  const vizTitle = document.getElementById('visualizer-track-title');
  if (vizTitle) vizTitle.textContent = track.title || '';

  try {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title || '',
        artist: track.artist || 'N1K∅',
        album: track.genre || 'Music',
        artwork: [{ src: track.cover || '', sizes: '512x512', type: 'image/jpeg' }]
      });
      navigator.mediaSession.setActionHandler('play', () => wavesurfer && wavesurfer.play());
      navigator.mediaSession.setActionHandler('pause', () => wavesurfer && wavesurfer.pause());
      navigator.mediaSession.setActionHandler('previoustrack', () => window.playPrev());
      navigator.mediaSession.setActionHandler('nexttrack', () => window.playNext());
      navigator.mediaSession.setActionHandler('seekbackward', () => {
        if (!wavesurfer) return;
        const t = wavesurfer.getCurrentTime();
        wavesurfer.seekTo(Math.max(0, t - 10) / wavesurfer.getDuration());
      });
      navigator.mediaSession.setActionHandler('seekforward', () => {
        if (!wavesurfer) return;
        const t = wavesurfer.getCurrentTime();
        const d = wavesurfer.getDuration();
        wavesurfer.seekTo(Math.min(d, t + 10) / d);
      });
    }
  } catch (e) { console.warn('mediaSession failed', e); }

    if (typeof window.onPlayerTrackChanged === 'function') {
    window.onPlayerTrackChanged(track.id);
  }
  if (typeof window.broadcastPlayerState === 'function') {
    window.broadcastPlayerState();
  }
};

// ===============================
// PLAY TRACK (из DOM)
// ===============================

window.playTrack = function (trackEl, contextOptions) {
  if (!trackEl) return;

  if (contextOptions && contextOptions.tracks) {
    window.setPlayerContext(contextOptions.tracks, contextOptions.source, contextOptions.playlistId);
  }

  const trackId = trackEl.dataset.id || '';

  if (!window.playerContext.tracks.length && window.homeState && window.homeState.filtered.length) {
    window.setPlayerContext(window.homeState.filtered, 'home');
  }

  const ctxIdx = window.playerContext.tracks.findIndex(t => t && t.id === trackId);
  if (ctxIdx !== -1) {
    window.playerContext.currentIndex = ctxIdx;
  } else if (window.playerContext.tracks.length === 0) {
    window.playerContext.tracks = [{
      id: trackId, audio: trackEl.dataset.src, title: trackEl.dataset.title || '',
      cover: trackEl.querySelector('.thumb')?.src || '',
      lyrics: trackEl.dataset.lyrics || '', artist: trackEl.dataset.artist || ''
    }];
    window.playerContext.currentIndex = 0;
    window.playerContext.source = 'single';
  }

  const track = window.playerContext.tracks[window.playerContext.currentIndex];
  if (track) {
    window.loadAndPlayTrack(track);
  }
};

// ===============================
// PLAY BY INDEX / ID
// ===============================

window.playTrackByIndex = function (idx) {
  if (!Number.isFinite(idx)) return;
  const ctx = window.playerContext;
  if (!ctx.tracks.length) return;
  if (idx < 0 || idx >= ctx.tracks.length) return;

  ctx.currentIndex = idx;
  window.loadAndPlayTrack(ctx.tracks[idx]);
};

window.playTrackById = function (id) {
  if (!id) return;
  const idx = window.playerContext.tracks.findIndex(t => t && t.id === id);
  if (idx === -1) return;
  window.playTrackByIndex(idx);
};

// ===============================
// NEXT / PREV
// ===============================
window.playNext = async function () {
  if (window.isSwitchingTrack) return; // блокируем двойные вызовы
  window.isSwitchingTrack = true;

  try {
    const ctx = window.playerContext;
    if (!ctx.tracks.length) return;

    let nextIdx;
    if (window.isShuffleMode) {
      if (ctx.tracks.length === 1) nextIdx = 0;
      else {
        let attempts = 0;
        do {
          nextIdx = Math.floor(Math.random() * ctx.tracks.length);
          attempts++;
        } while (nextIdx === ctx.currentIndex && attempts < 10);
      }
    } else {
      nextIdx = (ctx.currentIndex + 1) % ctx.tracks.length;
    }

    // Офлайн: ищем ближайший закэшированный трек, но НЕ убиваем процесс
    let checked = 0;
    const total = ctx.tracks.length;
    while (checked < total) {
      const track = ctx.tracks[nextIdx];
      if (track && track.audio) {
        try {
          // Если офлайн — проверим кэш, иначе сразу грузим
          if (!navigator.onLine && typeof isTrackCached === 'function') {
            const cached = await isTrackCached(track.audio);
            if (!cached) {
              nextIdx = (nextIdx + 1) % ctx.tracks.length;
              checked++;
              continue; // пропускаем незакэшированный
            }
          }
          // Загружаем и обновляем индекс ТУТ, а не раньше
          ctx.currentIndex = nextIdx;
          window.loadAndPlayTrack(track);
          return;
        } catch (e) {
          console.warn('⏭️ playNext skip:', track.title, e.message);
          nextIdx = (nextIdx + 1) % ctx.tracks.length;
          checked++;
        }
      } else {
        nextIdx = (nextIdx + 1) % ctx.tracks.length;
        checked++;
      }
    }
    console.warn('❌ playNext: нет доступных треков');
  } finally {
    setTimeout(() => { window.isSwitchingTrack = false; }, 400);
  }
};

window.playPrev = async function () {
  if (window.isSwitchingTrack) return;
  window.isSwitchingTrack = true;

  try {
    // Если прошло >3 сек — начинаем трек сначала
    try {
      if (wavesurfer && wavesurfer.getCurrentTime() > 3) {
        wavesurfer.seekTo(0);
        return;
      }
    } catch (e) {}

    const ctx = window.playerContext;
    if (!ctx.tracks.length) return;

    let prevIdx;
    if (window.isShuffleMode) {
      if (ctx.tracks.length === 1) prevIdx = 0;
      else {
        let attempts = 0;
        do {
          prevIdx = Math.floor(Math.random() * ctx.tracks.length);
          attempts++;
        } while (prevIdx === ctx.currentIndex && attempts < 10);
      }
    } else {
      prevIdx = (ctx.currentIndex - 1 + ctx.tracks.length) % ctx.tracks.length;
    }

    let checked = 0;
    const total = ctx.tracks.length;
    while (checked < total) {
      const track = ctx.tracks[prevIdx];
      if (track && track.audio) {
        try {
          if (!navigator.onLine && typeof isTrackCached === 'function') {
            const cached = await isTrackCached(track.audio);
            if (!cached) {
              prevIdx = (prevIdx - 1 + ctx.tracks.length) % ctx.tracks.length;
              checked++;
              continue;
            }
          }
          ctx.currentIndex = prevIdx;
          window.loadAndPlayTrack(track);
          return;
        } catch (e) {
          console.warn('⏭️ playPrev skip:', track.title, e.message);
          prevIdx = (prevIdx - 1 + ctx.tracks.length) % ctx.tracks.length;
          checked++;
        }
      } else {
        prevIdx = (prevIdx - 1 + ctx.tracks.length) % ctx.tracks.length;
        checked++;
      }
    }
    console.warn('❌ playPrev: нет доступных треков');
  } finally {
    setTimeout(() => { window.isSwitchingTrack = false; }, 400);
  }
};
// ===============================
// MINI PLAYER BUTTONS
// ===============================

window.updateMiniPlayerButtons = function () {
  const miniLike = document.getElementById('mini-like');
  const miniDislike = document.getElementById('mini-dislike');
  const miniDownload = document.getElementById('mini-download');

  if (miniLike) {
    miniLike.onclick = () => window.toggleLike(window.currentTrackId);
    const val = window.currentTrackId ? localStorage.getItem('like:user:' + window.currentTrackId) : null;
    miniLike.classList.toggle('active', val === 'like');
  }

  if (miniDislike) {
    miniDislike.onclick = () => window.toggleDislike(window.currentTrackId);
    const val = window.currentTrackId ? localStorage.getItem('like:user:' + window.currentTrackId) : null;
    miniDislike.classList.toggle('active', val === 'dislike');
  }

  if (miniDownload) {
    miniDownload.href = window.currentTrackSrc || '#';
    const track = window.playerContext.tracks[window.playerContext.currentIndex];
    miniDownload.download = (track && (track.title || 'track.mp3')) || 'track.mp3';
  }
};

// ===============================
// EXTRA BUTTONS
// ===============================

document.getElementById('mini-open-text')?.addEventListener('click', () => {
  const trackEl = document.querySelector(`.track[data-id="${window.currentTrackId}"]`);
  if (trackEl && typeof openText === 'function') openText(trackEl);
});

document.getElementById('mini-comment')?.addEventListener('click', () => {
  if (typeof openComments === 'function') openComments(window.currentTrackId);
});

document.getElementById('mini-share')?.addEventListener('click', () => {
  const modal = document.getElementById('share-modal');
  if (modal) {
    modal.classList.add('open');
  }
});

// Share modal close
document.getElementById('share-modal-close')?.addEventListener('click', () => {
  const modal = document.getElementById('share-modal');
  if (modal) {
    modal.classList.remove('open');
    document.getElementById('share-socials').classList.remove('open');
  }
});

// Close modal on backdrop click
document.getElementById('share-modal')?.addEventListener('click', (e) => {
  if (e.target.id === 'share-modal') {
    e.target.classList.remove('open');
    document.getElementById('share-socials').classList.remove('open');
  }
});
// ===============================
// SHARE: правильный трек + тост-уведомление
// ===============================

// [FIX] Показываем тост вместо изменения HTML модалки
function showShareToast(message) {
  // Удаляем старый тост
  const oldToast = document.getElementById('share-toast');
  if (oldToast) oldToast.remove();
  
  const toast = document.createElement('div');
  toast.id = 'share-toast';
  toast.style.cssText = `
    position: fixed;
    bottom: 100px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(90deg, #ff4da6, #ff7a4d);
    color: white;
    padding: 12px 24px;
    border-radius: 50px;
    font-size: 14px;
    font-weight: 600;
    z-index: 99999;
    box-shadow: 0 4px 20px rgba(255,77,166,0.4);
    animation: toastIn 0.3s ease;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

// Добавляем анимации тоста в стили (если еще нет)
if (!document.getElementById('toast-styles')) {
  const style = document.createElement('style');
  style.id = 'toast-styles';
  style.textContent = `
    @keyframes toastIn {
      from { opacity: 0; transform: translateX(-50%) translateY(20px); }
      to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    @keyframes toastOut {
      from { opacity: 1; transform: translateX(-50%) translateY(0); }
      to { opacity: 0; transform: translateX(-50%) translateY(20px); }
    }
  `;
  document.head.appendChild(style);
}

// [FIX] Получаем трек по кнопке, на которую нажали (не глобальный currentTrack)
function getTrackFromShareButton(btn) {
  // Ищем ближайший .track к кнопке
  const trackEl = btn.closest('.track');
  if (!trackEl) return null;
  
  const trackId = trackEl.dataset.id;
  return window.globalTracks.find(t => t.id === trackId);
}

// Copy link — ИСПРАВЛЕННЫЙ
document.getElementById('share-copy-link')?.addEventListener('click', async function() {
  // [FIX] Определяем, из какого трека открыта модалка
  // Модалка одна на страницу, но currentTrackId должен быть установлен
  let trackId = window.currentTrackId;
  let track = null;
  
  if (trackId) {
    track = window.globalTracks.find(t => t.id === trackId);
  }
  
  // Если currentTrackId пустой — берем первый видимый трек
  if (!track) {
    const firstVisible = document.querySelector('.track:not([style*="none"])');
    if (firstVisible) {
      trackId = firstVisible.dataset.id;
      track = window.globalTracks.find(t => t.id === trackId);
    }
  }
  
  if (!trackId || !track) {
    showShareToast('❌ No track selected');
    return;
  }
  
  const shareUrl = window.location.origin + window.location.pathname + '?track=' + encodeURIComponent(trackId);
  
  try {
    await navigator.clipboard.writeText(shareUrl);
    showShareToast('✅ ' + (typeof t === 'function' ? t('copied') : 'Copied!'));
  } catch (err) {
    const textArea = document.createElement('textarea');
    textArea.value = shareUrl;
    textArea.style.cssText = 'position:fixed;left:-9999px;top:0;';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      showShareToast('✅ ' + (typeof t === 'function' ? t('copied') : 'Copied!'));
    } catch (e) {
      showShareToast('❌ ' + (typeof t === 'function' ? t('copyFailed') : 'Failed to copy'));
    }
    document.body.removeChild(textArea);
  }
});

// Social buttons — ИСПРАВЛЕННЫЕ
document.querySelectorAll('.social-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const platform = btn.dataset.platform;
    
    // [FIX] Тот же надежный способ получения трека
    let trackId = window.currentTrackId;
    let track = null;
    
    if (trackId) {
      track = window.globalTracks.find(t => t.id === trackId);
    }
    if (!track) {
      const firstVisible = document.querySelector('.track:not([style*="none"])');
      if (firstVisible) {
        trackId = firstVisible.dataset.id;
        track = window.globalTracks.find(t => t.id === trackId);
      }
    }
    
    if (!track) {
      showShareToast('❌ No track selected');
      return;
    }
    
    const trackTitle = track.title || 'Check out this track';
    const shareUrl = window.location.origin + window.location.pathname + '?track=' + encodeURIComponent(trackId);
    
    let socialUrl = '';
    
    switch(platform) {
      case 'twitter':
        socialUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent('🎵 ' + trackTitle)}&url=${encodeURIComponent(shareUrl)}`;
        break;
      case 'facebook':
        socialUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
        break;
      case 'messenger':
        socialUrl = `https://www.facebook.com/dialog/send?link=${encodeURIComponent(shareUrl)}&app_id=YOUR_APP_ID`;
        break;
      case 'telegram':
        socialUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(trackTitle)}`;
        break;
      case 'viber':
        socialUrl = `viber://forward?text=${encodeURIComponent(trackTitle + ' ' + shareUrl)}`;
        break;
      case 'tiktok':
        if (navigator.share) {
          navigator.share({ title: trackTitle, url: shareUrl });
          return;
        }
        break;
      case 'whatsapp':
        socialUrl = `https://wa.me/?text=${encodeURIComponent(trackTitle + ' ' + shareUrl)}`;
        break;
      case 'native':
        if (navigator.share) {
          navigator.share({ title: trackTitle, url: shareUrl });
          return;
        } else {
          showShareToast('Native sharing not supported');
          return;
        }
    }
    
    if (socialUrl) {
      window.open(socialUrl, '_blank', 'width=600,height=400');
    }
    
    document.getElementById('share-modal')?.classList.remove('open');
  });
});

document.getElementById('prevPageFixed')?.addEventListener('click', () => { window.playPrev(); });
document.getElementById('nextPageFixed')?.addEventListener('click', () => { window.playNext(); });

// ===============================
// INIT PLAYER
// ===============================

window.initPlayer = function () {
  document.getElementById('mini-visualizer')?.addEventListener('click', () => {
    if (typeof toggleVisualizerFullscreen === 'function') {
      toggleVisualizerFullscreen();
    } else {
      console.warn('visualizers.js not loaded yet');
    }
  });

  document.querySelectorAll('.visualizer-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (typeof changeVisualizerType === 'function') {
        changeVisualizerType(btn.dataset.type);
      }
    });
  });

  try {
    window.initWavesurfer();
  } catch (e) {
    console.warn('initWavesurfer failed', e);
  }
  window.updateShuffleButton();
};
// ===============================
// SYNC: broadcast state to iframe overlays
// ===============================

window.broadcastPlayerState = function() {
  document.querySelectorAll('iframe').forEach(function(iframe) {
    try {
      iframe.contentWindow.postMessage({
        type: 'player-state',
        trackId: window.currentTrackId,
        isPlaying: window.isPlaying
      }, '*');
    } catch(e) {}
  });
};

window.broadcastCounters = function(trackId) {
  var track = (window.globalTracks || []).find(function(t) { return t && t.id === trackId; });
  var userVote = localStorage.getItem('like:user:' + trackId);
  
  // Обновляем локальные значения на основе того, что мы знаем
  var likes = track ? (track.likes || 0) : 0;
  var dislikes = track ? (track.dislikes || 0) : 0;
  
  document.querySelectorAll('iframe').forEach(function(iframe) {
    try {
      iframe.contentWindow.postMessage({
        type: 'counters-update',
        trackId: trackId,
        likes: likes,
        dislikes: dislikes,
        userVote: userVote
      }, '*');
    } catch(e) {}
  });
};
// Слушаем изменения localStorage из других вкладок
window.addEventListener('storage', function(e) {
  if (e.key && e.key.startsWith('like:user:')) {
    const trackId = e.key.replace('like:user:', '');
    // Обновляем UI для этого трека
    const userVote = e.newValue;
    const likeEl = document.querySelector('.likes-count[data-key="' + trackId + '"]');
    const dislikeEl = document.querySelector('.dislikes-count[data-key="' + trackId + '"]');
    if (likeEl) likeEl.classList.toggle('active', userVote === 'like');
    if (dislikeEl) dislikeEl.classList.toggle('active', userVote === 'dislike');
    if (typeof window.updateMiniPlayerButtons === 'function') {
      window.updateMiniPlayerButtons();
    }
  }
});

// ===============================
// DEEP LINKING: ?track=ID при загрузке
// ===============================

(function initDeepLinking() {
  const params = new URLSearchParams(window.location.search);
  const trackId = params.get('track');
  
  if (!trackId) return;
  
  console.log('🔗 Deep link detected:', trackId);
  
  // Ждем загрузки треков из Firebase
  let attempts = 0;
  const maxAttempts = 50;
  
  const tryPlay = setInterval(() => {
    attempts++;
    
    if (!window.globalTracks || window.globalTracks.length === 0) {
      if (attempts >= maxAttempts) {
        clearInterval(tryPlay);
        console.warn('⏱️ Deep link timeout');
      }
      return;
    }
    
    clearInterval(tryPlay);
    
    // [FIX] Ищем трек ПО ID, а не по индексу!
    const track = window.globalTracks.find(t => t.id === trackId);
    if (!track) {
      console.warn('❌ Deep link: track not found:', trackId);
      return;
    }
    
    console.log('✅ Deep link: track found:', track.title);
    
    // Проверяем пагинацию — может трек на другой странице
    if (window.homeState && window.homeState.filteredIds) {
      const idx = window.homeState.filteredIds.indexOf(trackId);
      if (idx !== -1) {
        const page = Math.floor(idx / window.homeState.perPage) + 1;
        if (page !== window.homeState.currentPage && typeof window.changeHomePage === 'function') {
          window.changeHomePage(page);
          setTimeout(() => proceedWithTrack(track), 400);
          return;
        }
      }
    }
    
    proceedWithTrack(track);
    
    // Убираем ?track= из URL
    if (window.history.replaceState) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
  }, 200);
  
  function proceedWithTrack(track) {
    // Находим DOM-элемент
    const trackEl = document.querySelector(`.track[data-id="${track.id}"]`);
    
    if (trackEl) {
      trackEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    // [FIX] НЕ запускаем автоматически — ждем клика пользователя!
    // Вместо этого: загружаем трек в wavesurfer, но НЕ играем
    
    window.currentTrackId = track.id;
    window.currentTrackSrc = track.audio || '';
    
    // Устанавливаем контекст плеера
    const visibleTracks = Array.from(document.querySelectorAll('.track:not([style*="none"])'))
      .map(el => window.globalTracks.find(t => t.id === el.dataset.id))
      .filter(Boolean);
    
    window.setPlayerContext(visibleTracks.length ? visibleTracks : [track], 'home');
    
    // Находим индекс в контексте
    const ctxIdx = window.playerContext.tracks.findIndex(t => t.id === track.id);
    if (ctxIdx !== -1) {
      window.playerContext.currentIndex = ctxIdx;
    }
    
    // [FIX] Загружаем в wavesurfer, но НЕ вызываем play()
    // Показываем "Ready to play" UI
    if (window.wavesurfer && track.audio) {
      try {
        window.wavesurfer.load(track.audio);
        // wavesurfer.load НЕ запускает play — только загружает
      } catch (e) {
        console.warn('Deep link: wavesurfer load failed', e);
      }
    }
    
    // Обновляем мини-плеер
    const titleText = track.artist ? `${track.artist} - ${track.title}` : (track.title || '');
    document.getElementById('mini-title').textContent = titleText;
    document.getElementById('mini-thumb').src = track.cover || '';
    document.getElementById('mini-player').style.display = 'flex';
    
    // Обновляем UI иконок
    if (typeof window.updateTrackPlayIcons === 'function') {
      window.updateTrackPlayIcons();
    }
    
    // Помечаем трек как "готов к воспроизведению" — подсвечиваем
    if (trackEl) {
      trackEl.classList.add('ready-to-play');
      setTimeout(() => trackEl.classList.remove('ready-to-play'), 2000);
    }
    
    // Сохраняем прослушивание (без фактического воспроизведения — или уберите эту строку)
    // if (typeof window.saveListenToFirebase === 'function') {
    //   window.saveListenToFirebase(track.id);
    // }
    
    console.log('▶️ Deep link: track loaded, waiting for user click to play');
  }
})();
