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

window.globalTracks = window.globalTracks || [];


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

  // Обновляем UI немедленно (до Firestore)
  if (typeof window.updateLikeUI === 'function') {
    window.updateLikeUI(trackId, likesDelta, dislikesDelta);
  }

  // Обновляем Firestore асинхронно
  if (likesDelta) await window.bumpCounter(trackId, 'likes', likesDelta);
  if (dislikesDelta) await window.bumpCounter(trackId, 'dislikes', dislikesDelta);
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

  // Обновляем UI немедленно (до Firestore)
  if (typeof window.updateLikeUI === 'function') {
    window.updateLikeUI(trackId, likesDelta, dislikesDelta);
  }

  // Обновляем Firestore асинхронно
  if (likesDelta) await window.bumpCounter(trackId, 'likes', likesDelta);
  if (dislikesDelta) await window.bumpCounter(trackId, 'dislikes', dislikesDelta);
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

// Обновление иконок play/pause на карточках треков
window.updateTrackPlayIcons = function () {
  const currentTrackId = window.currentTrackId || '';
  const isPlaying = window.isPlaying || false;

  // Находим все кнопки play-btn
  const playButtons = document.querySelectorAll('.play-btn');
  playButtons.forEach(btn => {
    const trackEl = btn.closest('.track');
    if (!trackEl) return;

    const trackId = trackEl.dataset.id || '';
    const isCurrentTrack = trackId === currentTrackId;

    if (isCurrentTrack && isPlaying) {
      // Показываем иконку паузы
      btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
      btn.classList.add('playing');
      trackEl.classList.add('playing');
    } else {
      // Показываем иконку play
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
  wavesurfer.on('finish', () => window.playNext());

  document.getElementById('mini-play').onclick = () => wavesurfer.playPause();

  wavesurfer.on('play', () => {
    window.isPlaying = true;
    const icon = document.getElementById('mini-play-icon');
    if (icon) icon.innerHTML = '<path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>';
    // обновляем иконки на карточках треков
    window.updateTrackPlayIcons();
  });

  wavesurfer.on('pause', () => {
    window.isPlaying = false;
    const icon = document.getElementById('mini-play-icon');
    if (icon) icon.innerHTML = '<path d="M5 3v18l15-9L5 3z"/>';
    // обновляем иконки на карточках треков
    window.updateTrackPlayIcons();
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
// PLAY TRACK
// ===============================

window.playTrack = function (trackEl) {
  if (!trackEl) return;
  if (window.isLoadingTrack) return;

  window.isLoadingTrack = true;

  const src = trackEl.dataset.src;
  const title = trackEl.dataset.title || '';
  const cover = trackEl.querySelector('.thumb')?.src || '';
  const id = trackEl.dataset.id || '';
  let index = Number.isFinite(Number(trackEl.dataset.index)) ? parseInt(trackEl.dataset.index, 10) : NaN;

  // Попытка найти корректный глобальный индекс:
  // 1) если index валиден и globalTracks[index] совпадает по id — используем его
  // 2) иначе ищем по id в globalTracks
  if (!Number.isFinite(index) || !globalTracks[index] || (id && globalTracks[index].id !== id)) {
    if (id) {
      const found = globalTracks.findIndex(t => t && t.id === id);
      if (found !== -1) index = found;
      else index = NaN;
    } else {
      // если нет id, но есть src — ищем по src
      const foundBySrc = globalTracks.findIndex(t => t && (t.audio === src || t.url === src || t.file === src));
      if (foundBySrc !== -1) index = foundBySrc;
    }
  }

  // Если индекс всё ещё невалидный, пытаемся воспроизвести напрямую (без bumpCounter и без mediaSession)
  if (!Number.isFinite(index) || !globalTracks[index]) {
    console.warn('playTrack: index not found in globalTracks, attempting direct play', { id, index, src });
    // Устанавливаем текущие поля, но не пытаемся bumpCounter по undefined
    window.currentTrackId = id || '';
    window.currentTrackSrc = src || '';
    window.currentTrackIndex = -1;

    document.getElementById('mini-title').textContent = title;
    document.getElementById('mini-thumb').src = cover;
    document.getElementById('mini-player').style.display = 'flex';

    document.querySelectorAll('.track').forEach(t => t.classList.remove('playing'));
    trackEl.classList.add('playing');

    if (wavesurfer) {
      try { wavesurfer.stop(); } catch (e) {}
      setTimeout(() => {
        try { wavesurfer.load(src); } catch (e) { console.error(e); }
        setTimeout(() => { window.isLoadingTrack = false; }, 500);
      }, 150);
    } else {
      window.isLoadingTrack = false;
    }

    // update UI/buttons/download
    window.updateMiniPlayerButtons();
    const lyricsText = (globalTracks[index] && globalTracks[index].lyrics) || 'No lyrics available';
    const lyricsContent = document.getElementById('lyrics-content');
    if (lyricsContent) lyricsContent.textContent = lyricsText;
    return;
  }

  // У нас есть валидный глобальный индекс
  window.currentTrackIndex = index;
  window.currentTrackId = globalTracks[index].id || '';
  window.currentTrackSrc = src || (globalTracks[index].audio || globalTracks[index].url || '');

  document.getElementById('mini-title').textContent = title || (globalTracks[index].title || '');
  document.getElementById('mini-thumb').src = cover || (globalTracks[index].cover || '');
  document.getElementById('mini-player').style.display = 'flex';

  document.querySelectorAll('.track').forEach(t => t.classList.remove('playing'));
  trackEl.classList.add('playing');

  if (wavesurfer) {
    try { wavesurfer.stop(); } catch (e) {}
    setTimeout(() => {
      try { wavesurfer.load(window.currentTrackSrc); } catch (e) { console.error(e); }
      setTimeout(() => { window.isLoadingTrack = false; }, 500);
    }, 150);
  } else {
    window.isLoadingTrack = false;
  }

  // Безопасный bumpCounter: проверяем наличие id
  if (globalTracks[window.currentTrackIndex] && globalTracks[window.currentTrackIndex].id) {
    try {
      window.bumpCounter(globalTracks[window.currentTrackIndex].id, 'plays', 1);
    } catch (e) {
      console.warn('bumpCounter failed', e);
    }
  }

  window.updateMiniPlayerButtons();

  const vizTitle = document.getElementById('visualizer-track-title');
  if (vizTitle) vizTitle.textContent = title || (globalTracks[window.currentTrackIndex] && globalTracks[window.currentTrackIndex].title) || '';

  // mediaSession — защищённо
  try {
    if ('mediaSession' in navigator) {
      const track = globalTracks[window.currentTrackIndex] || {};
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title || title || '',
        artist: 'N1K∅',
        album: track.genre || 'Music',
        artwork: [{ src: track.cover || cover || '', sizes: '512x512', type: 'image/jpeg' }]
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
  } catch (e) {
    console.warn('mediaSession handlers failed', e);
  }

  const lyricsText = globalTracks[window.currentTrackIndex] && globalTracks[window.currentTrackIndex].lyrics || 'No lyrics available';
  const lyricsContent = document.getElementById('lyrics-content');
  if (lyricsContent) lyricsContent.textContent = lyricsText;
};


// ===============================
// PLAY BY INDEX / ID (HELPERS)
// ===============================

window.playTrackByIndex = function (idx) {
  if (!Number.isFinite(idx)) return;
  if (idx < 0 || idx >= globalTracks.length) {
    console.warn('playTrackByIndex: index out of range', idx, 'length', globalTracks.length);
    return;
  }
  // Найдём DOM-элемент с data-index === idx, если он есть — используем его, иначе создаём временный объект
  const el = document.querySelector(`.track[data-index="${idx}"]`);
  if (el) {
    return window.playTrack(el);
  } else {
    // создаём временный объект-подстановку с нужными данными
    const t = globalTracks[idx];
    if (!t) return;
    const fakeEl = document.createElement('div');
    fakeEl.dataset.src = t.audio || t.url || t.file || '';
    fakeEl.dataset.title = t.title || '';
    fakeEl.dataset.id = t.id || '';
    fakeEl.dataset.index = idx;
    // не добавляем в DOM, просто передаём в playTrack
    return window.playTrack(fakeEl);
  }
};

window.playTrackById = function (id) {
  if (!id) return;
  const idx = globalTracks.findIndex(t => t && t.id === id);
  if (idx === -1) {
    console.warn('playTrackById: id not found', id);
    return;
  }
  return window.playTrackByIndex(idx);
};


// ===============================
// NEXT / PREV
// ===============================

window.playNext = function () {
  // Защита: если нет глобального списка — ничего не делаем
  if (!Array.isArray(globalTracks) || globalTracks.length === 0) {
    console.warn('playNext: no tracks available');
    return;
  }

  // Если shuffle — выбираем случайный индекс, отличный от текущего (если возможно)
  if (window.isShuffleMode) {
    if (globalTracks.length === 1) {
      // только один трек — перезапускаем
      return window.playTrackByIndex(0);
    }
    let next;
    let attempts = 0;
    do {
      next = Math.floor(Math.random() * globalTracks.length);
      attempts++;
    } while (next === window.currentTrackIndex && attempts < 10);
    return window.playTrackByIndex(next);
  }

  // Последовательный режим
  const nextIndex = (Number.isFinite(window.currentTrackIndex) ? window.currentTrackIndex : -1) + 1;
  if (nextIndex >= globalTracks.length) {
    // достигли конца — останавливаемся или можно зациклить
    console.info('playNext: reached end of playlist');
    // если нужен loop: uncomment next lines
    // window.playTrackByIndex(0);
    return;
  }
  window.playTrackByIndex(nextIndex);
};

window.playPrev = function () {
  if (!Array.isArray(globalTracks) || globalTracks.length === 0) {
    console.warn('playPrev: no tracks available');
    return;
  }

  // если прошло мало времени — можно перемотать к началу, иначе перейти к предыдущему
  try {
    const currentTime = wavesurfer ? wavesurfer.getCurrentTime() : 0;
    if (currentTime > 3) {
      // просто перематываем в начало текущего трека
      if (wavesurfer) wavesurfer.seekTo(0);
      return;
    }
  } catch (e) {
    // ignore
  }

  const prevIndex = (Number.isFinite(window.currentTrackIndex) ? window.currentTrackIndex : 0) - 1;
  if (prevIndex < 0) {
    console.info('playPrev: at start of playlist');
    return;
  }
  window.playTrackByIndex(prevIndex);
};


// ===============================
// MINI PLAYER BUTTONS (SAFE)
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
    miniDownload.download = (globalTracks[window.currentTrackIndex] && (globalTracks[window.currentTrackIndex].title || 'track.mp3')) || 'track.mp3';
  }
};


// ===============================
// EXTRA BUTTONS
// ===============================

// ===============================
// EXTRA BUTTONS
// ===============================

document.getElementById('mini-open-text')?.addEventListener('click', () => {
  // ищем трек по id (надежнее, чем по src)
  const trackEl = document.querySelector(`.track[data-id="${window.currentTrackId}"]`);
  if (trackEl) openText(trackEl);
});

document.getElementById('mini-comment')?.addEventListener('click', () => {
  openComments(window.currentTrackId);
});



document.getElementById('mini-share')?.addEventListener('click', () => {
  const url = window.location.origin + window.location.pathname + '?track=' + encodeURIComponent(window.currentTrackSrc || '');
  navigator.clipboard.writeText(url).then(() => {
    const btn = document.getElementById('mini-share');
    if (!btn) return;
    const oldHTML = btn.innerHTML;
    btn.innerHTML = '✓';
    setTimeout(() => btn.innerHTML = oldHTML, 1500);
  }).catch(() => {
    // ignore clipboard errors silently
  });
});

// Поддержка фиксированных кнопок пагинации (если они есть в DOM)
document.getElementById('prevPageFixed')?.addEventListener('click', () => {
  // если есть оригинальные обработчики — они уже связаны; просто вызываем playPrev
  window.playPrev();
});
document.getElementById('nextPageFixed')?.addEventListener('click', () => {
  window.playNext();
});



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
