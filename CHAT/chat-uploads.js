/* ========================================
   CHAT — ПАКЕТНАЯ ЗАГРУЗКА И АЛЬБОМЫ
   ======================================== */

(function () {
  'use strict';

  const MAX_BATCH = 30;
  const WORKER_URL = "https://r2-upload-proxy.nikolfar91.workers.dev";
  const STORAGE_FOLDER_CHAT = "NIKO_music/chat";

  // ===== КРУГОВОЙ ПРОГРЕСС ЗАГРУЗКИ =====
  let uploadOverlayEl = null;
  let uploadRingFill = null;
  let uploadPercentEl = null;
  let uploadSizeEl = null;
  let uploadFileListEl = null;

  function ensureUploadOverlay() {
    if (uploadOverlayEl) return;

    uploadOverlayEl = document.createElement('div');
    uploadOverlayEl.className = 'upload-overlay';
    uploadOverlayEl.innerHTML = `
      <div class="upload-overlay-panel">
        <svg width="0" height="0" style="position:absolute">
          <defs>
            <linearGradient id="uploadGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#ff4da6"/>
              <stop offset="100%" stop-color="#00d1ff"/>
            </linearGradient>
          </defs>
        </svg>
        <div class="upload-progress-ring">
          <svg viewBox="0 0 180 180">
            <circle class="ring-bg" cx="90" cy="90" r="80"/>
            <circle class="ring-fill" cx="90" cy="90" r="80"/>
          </svg>
          <div class="upload-progress-text">
            <div class="upload-progress-percent">0%</div>
            <div class="upload-progress-size">0 / 0 MB</div>
          </div>
        </div>
        <div class="upload-title">Загрузка файлов…</div>
        <div class="upload-subtitle" id="upload-subtitle-text">Подготовка…</div>
        <div class="upload-file-list" id="upload-file-list"></div>
      </div>
    `;
    document.body.appendChild(uploadOverlayEl);

    uploadRingFill = uploadOverlayEl.querySelector('.ring-fill');
    uploadPercentEl = uploadOverlayEl.querySelector('.upload-progress-percent');
    uploadSizeEl = uploadOverlayEl.querySelector('.upload-progress-size');
    uploadFileListEl = uploadOverlayEl.querySelector('#upload-file-list');
    uploadOverlayEl._subtitleEl = uploadOverlayEl.querySelector('#upload-subtitle-text');
  }

  function openUploadOverlay() {
    ensureUploadOverlay();
    uploadOverlayEl.classList.add('open');
  }
  function closeUploadOverlay() {
    if (uploadOverlayEl) uploadOverlayEl.classList.remove('open');
  }

  function setUploadProgress(loadedBytes, totalBytes) {
    if (!uploadOverlayEl) return;
    const percent = totalBytes > 0 ? Math.round((loadedBytes / totalBytes) * 100) : 0;
    const dashOffset = 502 - (502 * percent / 100);

    uploadRingFill.style.strokeDashoffset = dashOffset;
    uploadPercentEl.textContent = percent + '%';
    uploadSizeEl.textContent = fmtBytes(loadedBytes) + ' / ' + fmtBytes(totalBytes);
  }

  function fmtBytes(b) {
    if (!b) return '0 KB';
    if (b < 1024) return b + ' B';
    if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
    return (b / 1024 / 1024).toFixed(2) + ' MB';
  }

  function setUploadSubtitle(text) {
    if (uploadOverlayEl && uploadOverlayEl._subtitleEl) {
      uploadOverlayEl._subtitleEl.textContent = text;
    }
  }

  function setUploadFileList(files) {
  if (!uploadFileListEl) return;
  uploadFileListEl.innerHTML = '';
  files.forEach((f, idx) => {
    const div = document.createElement('div');
    div.className = 'upload-file-item';
    div.dataset.index = idx;
    const iconHtml = getFileIconSvg(f.name, f.type);  // ← SVG
    div.innerHTML = `
      <span class="file-icon">${iconHtml}</span>
      <span class="file-name">${escapeHtml(f.name)}</span>
      <span class="file-status">ожидание</span>
    `;
    uploadFileListEl.appendChild(div);
  });
}

  function getFileIconSvg(fileName, mime) {
  const ext = (fileName || '').split('.').pop().toLowerCase();
  const m = (mime || '').toLowerCase();

  // Определяем тип и цвет
  let type = 'file';
  let color = '#8b8fa3';
  let label = 'FILE';

  if (m.startsWith('image/') || ['jpg','jpeg','png','gif','webp','bmp','svg','heic','ico'].includes(ext)) {
    type = 'image'; color = '#4dff8a'; label = 'IMG';
  } else if (m.startsWith('video/') || ['mp4','mov','avi','mkv','webm','flv','wmv'].includes(ext)) {
    type = 'video'; color = '#ff7a4d'; label = 'VID';
  } else if (m.startsWith('audio/') || ['mp3','wav','ogg','flac','m4a','aac','opus'].includes(ext)) {
    type = 'audio'; color = '#b084ff'; label = 'AUD';
  } else if (ext === 'pdf') {
    type = 'pdf'; color = '#ff4d4d'; label = 'PDF';
  } else if (ext === 'json') {
    type = 'json'; color = '#ffd700'; label = 'JSON';
  } else if (['js','mjs','ts','tsx','jsx'].includes(ext)) {
    type = 'js'; color = '#f7df1e'; label = ext.toUpperCase();
  } else if (ext === 'csv' || ext === 'xls' || ext === 'xlsx') {
    type = 'csv'; color = '#27b646'; label = 'CSV';
  } else if (['doc','docx','rtf','odt'].includes(ext)) {
    type = 'doc'; color = '#2b7cd3'; label = 'DOC';
  } else if (['txt','md','log'].includes(ext)) {
    type = 'txt'; color = '#bfc3d6'; label = 'TXT';
  } else if (['html','htm'].includes(ext)) {
    type = 'html'; color = '#e34c26'; label = 'HTML';
  } else if (ext === 'css') {
    type = 'css'; color = '#2965f1'; label = 'CSS';
  } else if (['zip','rar','7z','tar','gz'].includes(ext)) {
    type = 'zip'; color = '#ffa726'; label = 'ZIP';
  } else if (ext === 'xml') {
    type = 'xml'; color = '#ff9800'; label = 'XML';
  } else if (['yml','yaml'].includes(ext)) {
    type = 'yaml'; color = '#cb171e'; label = 'YML';
  } else if (ext === 'env' || ext === 'ini' || ext === 'conf') {
    type = 'config'; color = '#6b6f7e'; label = 'CFG';
  } else if (ext) {
    label = ext.toUpperCase().slice(0, 4);
  }

  // Общая форма "документа" с загнутым уголком
  return `
    <div class="file-icon-svg" title="${label}">
      <svg viewBox="0 0 38 46" xmlns="http://www.w3.org/2000/svg">
        <!-- Тело файла -->
        <path d="M4 4 Q4 0 8 0 L24 0 L34 10 L34 42 Q34 46 30 46 L8 46 Q4 46 4 42 Z"
              fill="${color}" opacity="0.18"/>
        <path d="M4 4 Q4 0 8 0 L24 0 L34 10 L34 42 Q34 46 30 46 L8 46 Q4 46 4 42 Z"
              fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round"/>
        <!-- Загнутый уголок -->
        <path d="M24 0 L34 10 L24 10 Z"
              fill="${color}" opacity="0.6"/>
        <path d="M24 0 L24 10 L34 10"
              fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round"/>
        <!-- Буква/метка типа по центру -->
        <text x="19" y="32" text-anchor="middle"
              font-family="-apple-system, system-ui, sans-serif"
              font-size="${label.length > 3 ? 8 : 10}"
              font-weight="800"
              fill="${color}"
              letter-spacing="0.5">${label}</text>
      </svg>
    </div>
  `;
}

/**
 * Простая версия — только SVG без обёртки (для вставки внутрь element.innerHTML)
 */
function getFileIconSvgInline(fileName, mime) {
  return getFileIconSvg(fileName, mime);
}

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }

  function markUploadFileDone(idx) {
    if (!uploadFileListEl) return;
    const el = uploadFileListEl.querySelector(`[data-index="${idx}"]`);
    if (el) {
      el.classList.add('done');
      el.classList.remove('active');
      el.querySelector('.file-status').textContent = '✓';
    }
  }
  function markUploadFileActive(idx) {
    if (!uploadFileListEl) return;
    const el = uploadFileListEl.querySelector(`[data-index="${idx}"]`);
    if (el) {
      el.classList.add('active');
      el.querySelector('.file-status').textContent = '…';
    }
  }

  // ===== РЕНДЕР АЛЬБОМА =====
  /**
   * @param {HTMLElement} bubble — куда рендерить
   * @param {Array<{fileUrl, fileName, fileSize, fileType}>} photos
   * @param {string} msgId
   */
  function renderAlbum(bubble, photos, msgId) {
  const container = document.createElement('div');
  container.className = 'album-container';
  container.dataset.count = String(Math.min(photos.length, 5));   // до 5
  container.dataset.msgId = msgId;

  // Показываем максимум 5 карточек + бейдж "+N"
  const maxVisible = 5;
  const visible = photos.slice(0, maxVisible);
  const hiddenCount = photos.length - maxVisible;

  visible.forEach((p, i) => {
    const wrap = document.createElement('div');
    wrap.className = 'album-photo';
    const img = document.createElement('img');
    img.src = p.fileUrl;
    img.alt = p.fileName || '';
    img.loading = 'lazy';
    wrap.appendChild(img);

    // Бейдж "+N" только на верхней (последней видимой) карточке
    if (i === maxVisible - 1 && hiddenCount > 0) {
      const more = document.createElement('div');
      more.className = 'album-more';
      more.textContent = '+' + hiddenCount;
      wrap.appendChild(more);
    }

    container.appendChild(wrap);
  });

  container.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    openAlbumViewer(photos, 0);
  });

  bubble.appendChild(container);
}

  // ===== ПОЛНОЭКРАННЫЙ ПРОСМОТР АЛЬБОМА =====
  let albumViewerEl = null;
  let albumFullscreenEl = null;
  let albumState = { photos: [], index: 0 };

  function ensureAlbumViewer() {
    if (albumViewerEl) return;

    albumViewerEl = document.createElement('div');
    albumViewerEl.className = 'album-viewer';
    albumViewerEl.innerHTML = `
      <div class="album-viewer-header">
        <div class="album-viewer-counter">1 / 1</div>
        <div class="album-viewer-actions">
          <button class="album-viewer-download" title="Скачать">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </button>
          <button class="album-viewer-close" title="Закрыть">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="album-viewer-grid"></div> 
    `;
    document.body.appendChild(albumViewerEl);

    albumViewerEl.querySelector('.album-viewer-close').addEventListener('click', closeAlbumViewer);
    albumViewerEl.querySelector('.album-viewer-download').addEventListener('click', () => {
      const p = albumState.photos[albumState.index];
      if (p) downloadFile(p.fileUrl, p.fileName);
    }); 
  }

  function openAlbumViewer(photos, startIndex = 0) {
  ensureAlbumViewer();
  albumState.photos = photos;
  albumState.index = startIndex;
  albumViewerEl.classList.remove('fullscreen');
  renderAlbumGrid();
  albumViewerEl.classList.add('open');
  document.body.style.overflow = 'hidden'; 
}

  function closeAlbumViewer() {
  if (albumViewerEl) {
    albumViewerEl.classList.remove('open');
    albumViewerEl.classList.remove('fullscreen');
  }
  document.body.style.overflow = '';
  document.getElementById('img-viewer')?.classList.remove('open');

  // ✅ УДАЛЯЕМ стрелки ЖЁСТКО
  const nav = document.getElementById('album-fs-nav');
  if (nav) nav.remove();
}

  function renderAlbumGrid() {
    const grid = albumViewerEl.querySelector('.album-viewer-grid');
    grid.innerHTML = '';
    albumState.photos.forEach((p, i) => {
      const thumb = document.createElement('div');
      thumb.className = 'album-thumb';
      const img = document.createElement('img');
      img.src = p.fileUrl;
      img.alt = p.fileName || '';
      img.loading = 'lazy';
      thumb.appendChild(img);
      thumb.addEventListener('click', () => {
        albumState.index = i;
        openFullscreenPhoto(i);
      });
      grid.appendChild(thumb);
    });
    updateAlbumCounter();
  }

  function updateAlbumCounter() {
    const counter = albumViewerEl.querySelector('.album-viewer-counter');
    if (counter) {
      counter.textContent = (albumState.index + 1) + ' / ' + albumState.photos.length;
    }
  }
function openFullscreenPhoto(index) {
  albumState.index = index;
  const viewer = document.getElementById('img-viewer');
  const img = document.getElementById('img-viewer-img');
  const dl = document.getElementById('img-viewer-download');
  const p = albumState.photos[index];
  if (!viewer || !img || !p) return;

  img.src = p.fileUrl;
  dl.onclick = () => downloadFile(p.fileUrl, p.fileName);

  viewer.classList.add('open');
  albumViewerEl.classList.add('fullscreen');

  ensureFullscreenNav();       // ← стрелки ТОЛЬКО здесь
  updateFullscreenCounter();

  img.onclick = (e) => e.stopPropagation();
  viewer.onclick = (e) => {
  if (e.target === viewer) {
    albumViewerEl.classList.remove('fullscreen');
    viewer.classList.remove('open');
    
    // ✅ УДАЛЯЕМ стрелки
    const nav = document.getElementById('album-fs-nav');
    if (nav) nav.remove();
  }
};
}

function updateFullscreenCounter() {
  const counter = document.getElementById('album-fs-counter');
  if (counter) {
    counter.textContent = (albumState.index + 1) + ' / ' + albumState.photos.length;
  }
}
// ===== Стрелки в fullscreen =====
function ensureFullscreenNav() {
  // Удаляем старые, если есть
  const old = document.getElementById('album-fs-nav');
  if (old) old.remove();

  const nav = document.createElement('div');
  nav.id = 'album-fs-nav';
  nav.innerHTML = `
    <button id="album-fs-prev" style="
      position: fixed; left: 16px; top: 50%; transform: translateY(-50%);
      width: 52px; height: 52px; border-radius: 50%;
      background: rgba(255,255,255,0.15); backdrop-filter: blur(10px);
      border: none; color: #fff; font-size: 28px; line-height: 1;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: all 0.2s; z-index: 10500;
    ">‹</button>
    <button id="album-fs-next" style="
      position: fixed; right: 16px; top: 50%; transform: translateY(-50%);
      width: 52px; height: 52px; border-radius: 50%;
      background: rgba(255,255,255,0.15); backdrop-filter: blur(10px);
      border: none; color: #fff; font-size: 28px; line-height: 1;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: all 0.2s; z-index: 10500;
    ">›</button>
    <div id="album-fs-counter" style="
      position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
      background: rgba(0,0,0,0.6); backdrop-filter: blur(10px);
      color: #fff; padding: 8px 16px; border-radius: 20px;
      font-size: 14px; font-weight: 700; z-index: 10500;
      font-variant-numeric: tabular-nums;
    ">1 / 1</div>
  `;
  document.body.appendChild(nav);

  nav.querySelector('#album-fs-prev').addEventListener('click', (e) => {
    e.stopPropagation();
    navFullscreen(-1);
  });
  nav.querySelector('#album-fs-next').addEventListener('click', (e) => {
    e.stopPropagation();
    navFullscreen(1);
  });
}

// Удалить стрелки
function removeFullscreenNav() {
  document.getElementById('album-fs-nav')?.remove();
}

  function navFullscreen(delta) {
  if (!albumState.photos.length) return;
  let newIndex = albumState.index + delta;
  if (newIndex < 0) newIndex = albumState.photos.length - 1;
  if (newIndex >= albumState.photos.length) newIndex = 0;
  openFullscreenPhoto(newIndex);
}

  function downloadFile(url, name) {
    const a = document.createElement('a');
    a.href = url;
    a.download = name || 'file';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  // ===== ЗАГРУЗКА ФАЙЛОВ НА WORKER С ПРОГРЕССОМ =====
  function uploadWithProgress(file, folder, fileName, onProgress) {
    return new Promise((resolve, reject) => {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', folder);
      fd.append('fileName', fileName);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', WORKER_URL + '/upload');

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(e.loaded, e.total);
        }
      });

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            resolve(data.url);
          } catch (err) {
            reject(new Error('Invalid response'));
          }
        } else {
          reject(new Error('Upload failed: ' + xhr.status));
        }
      };
      xhr.onerror = () => reject(new Error('Network error'));
      xhr.send(fd);
    });
  }

  // ===== ПАКЕТНАЯ ОТПРАВКА =====
  /**
   * Отправляет список файлов как:
   * - 1 файл → обычное сообщение
   * - 2+ фото → альбом
   * - 2+ не-фото → отдельные сообщения (или можно менять логику)
   */
  async function sendFilesAsBatch(files, db, myRole, chatMessagesCollection = 'chat_messages') {
    if (!files || !files.length) return;

    files = files.slice(0, MAX_BATCH);

    const totalBytes = files.reduce((s, f) => s + f.size, 0);
    let uploadedBytes = 0;

    openUploadOverlay();
    setUploadFileList(files);
    setUploadProgress(0, totalBytes);
    setUploadSubtitle(`Загрузка ${files.length} файл(ов)…`);

    const uploadedFiles = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      markUploadFileActive(i);
      setUploadSubtitle(`${i + 1} из ${files.length}: ${file.name}`);

      const safeName = uniqueFileName(file.name);
      const fileSize = file.size;

      try {
        const url = await uploadWithProgress(
          file, STORAGE_FOLDER_CHAT, safeName,
          (loaded, total) => {
            setUploadProgress(uploadedBytes + loaded, totalBytes);
          }
        );

        uploadedBytes += fileSize;
        setUploadProgress(uploadedBytes, totalBytes);
        markUploadFileDone(i);

        uploadedFiles.push({
          fileUrl: url,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          mime: file.type
        });
      } catch (e) {
        console.error('Upload failed for', file.name, e);
        setUploadSubtitle(`❌ Ошибка: ${file.name}`);
      }
    }

    setUploadSubtitle('Сохранение сообщения…');

    // ===== Группируем по типу =====
    const images = uploadedFiles.filter(f => f.mime?.startsWith('image/'));
    const others = uploadedFiles.filter(f => !f.mime?.startsWith('image/'));

    // Все фото одним альбомом
    if (images.length >= 2) {
      await db.collection(chatMessagesCollection).add({
        type: 'album',
        text: '',
        photos: images,
        sender: myRole,
        status: 'sent',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    } else if (images.length === 1) {
      const p = images[0];
      await db.collection(chatMessagesCollection).add({
        type: 'image',
        text: '',
        fileUrl: p.fileUrl,
        fileName: p.fileName,
        fileSize: p.fileSize,
        sender: myRole,
        status: 'sent',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }

    // Остальные файлы — по одному
    for (const f of others) {
      let type = 'file';
      if (f.mime?.startsWith('audio/')) type = 'audio';
      else if (f.mime?.startsWith('video/')) type = 'video';

      await db.collection(chatMessagesCollection).add({
        type,
        text: '',
        fileUrl: f.fileUrl,
        fileName: f.fileName,
        fileSize: f.fileSize,
        sender: myRole,
        status: 'sent',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }

    setUploadSubtitle('✅ Готово!');
    setTimeout(closeUploadOverlay, 500);
  }

  function uniqueFileName(name) {
    const dot = name.lastIndexOf('.');
    const base = dot > 0 ? name.slice(0, dot) : name;
    const ext = dot > 0 ? name.slice(dot) : '';
    return `${base}_${Date.now()}_${Math.random().toString(36).slice(2,6)}${ext}`;
  }
// Очистка стрелок при инициализации
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('#album-fs-nav, .album-fullscreen-nav').forEach(el => el.remove());
});
// ===== ПРЕДПРОСМОТР ФАЙЛОВ =====
let filePreviewEl = null;

function ensureFilePreview() {
  if (filePreviewEl) return;

  filePreviewEl = document.createElement('div');
  filePreviewEl.className = 'file-preview-overlay';
  filePreviewEl.innerHTML = `
    <div class="file-preview-header">
      <div class="file-preview-title">
        <span class="icon"></span>
        <span class="name">File</span>
        <span class="size"></span>
      </div>
      <div class="file-preview-actions">
        <a class="file-preview-download" href="#" download title="Скачать">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </a>
        <button class="file-preview-close" title="Закрыть">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>
    <div class="file-preview-body"></div>
  `;
  document.body.appendChild(filePreviewEl);

  filePreviewEl.querySelector('.file-preview-close').addEventListener('click', closeFilePreview);

  // Клик по фону — закрыть
  filePreviewEl.querySelector('.file-preview-body').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeFilePreview();
  });

  // Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && filePreviewEl.classList.contains('open')) {
      closeFilePreview();
    }
  });
}

function closeFilePreview() {
  if (filePreviewEl) {
    filePreviewEl.classList.remove('open');
    // Очищаем содержимое (важно для PDF — освобождает iframe)
    const body = filePreviewEl.querySelector('.file-preview-body');
    if (body) body.innerHTML = '';
  }
  document.body.style.overflow = '';
}

function getFileExt(name) {
  return (name.split('.').pop() || '').toLowerCase();
}


/**
 * Открыть предпросмотр файла
 * @param {string} url
 * @param {string} fileName
 * @param {number} fileSize
 */
async function openFilePreview(url, fileName, fileSize, mime) {
  ensureFilePreview();

  const ext = getFileExt(fileName);
  const iconHtml = getFileIconSvg(fileName, mime || '');   // ← SVG
  const iconEl = filePreviewEl.querySelector('.file-preview-title .icon');
  const nameEl = filePreviewEl.querySelector('.file-preview-title .name');
  const sizeEl = filePreviewEl.querySelector('.file-preview-title .size');
  const body = filePreviewEl.querySelector('.file-preview-body');
  const dl = filePreviewEl.querySelector('.file-preview-download');

  iconEl.innerHTML = iconHtml;                    // ← innerHTML, не textContent
  nameEl.textContent = fileName;
  sizeEl.textContent = fileSize ? fmtBytes(fileSize) : '';
  dl.href = url;
  dl.download = fileName; 

  // Показываем загрузку
  body.innerHTML = `
    <div class="file-preview-loading">
      <div class="file-preview-spinner"></div>
      <div>Загрузка файла…</div>
    </div>
  `;
  filePreviewEl.classList.add('open');
  document.body.style.overflow = 'hidden';

  // ===== PDF =====
  if (ext === 'pdf') {
    body.innerHTML = `<iframe class="pdf-frame" src="${url}#toolbar=1&navpanes=0&scrollbar=1"></iframe>`;
    return;
  }

  // ===== Изображения (для полноты) =====
  if (['jpg','jpeg','png','gif','webp','svg','bmp'].includes(ext)) {
    body.innerHTML = `<img src="${url}" style="max-width:100%;max-height:100%;object-fit:contain;border-radius:12px;">`;
    return;
  }

  // ===== Текстовые файлы (JSON/JS/TXT/CSV/HTML/CSS/MD) =====
  const textTypes = ['json','js','mjs','ts','tsx','jsx','txt','md','csv','html','htm','css','xml','yml','yaml','log','env','ini','conf'];
  if (!textTypes.includes(ext)) {
    // Неизвестный формат — предлагаем скачать
    body.innerHTML = `
      <div class="file-preview-error" style="color: var(--muted);">
        <div style="font-size: 48px; margin-bottom: 16px;">📄</div>
        <div style="color: #fff; font-size: 16px; font-weight: 600; margin-bottom: 8px;">Предпросмотр недоступен</div>
        <div>Формат <b>.${ext}</b> не поддерживается для встроенного просмотра</div>
        <div style="margin-top: 20px;">
          <a href="${url}" download="${fileName}" style="
            display: inline-block;
            padding: 10px 20px;
            background: linear-gradient(90deg, #ff4da6, #00d1ff);
            color: #fff;
            text-decoration: none;
            border-radius: 10px;
            font-weight: 600;
          ">⬇️ Скачать файл</a>
        </div>
      </div>
    `;
    return;
  }

  // Загружаем содержимое
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const text = await res.text();

    // ===== CSV → таблица =====
    if (ext === 'csv') {
      body.innerHTML = renderCsvTable(text);
      return;
    }

    // ===== JSON / JS / прочее → подсветка =====
    body.innerHTML = `<pre class="file-preview-pre"></pre>`;
    const pre = body.querySelector('.file-preview-pre');

    if (ext === 'json') {
      pre.innerHTML = highlightJson(text);
    } else if (['js','mjs','ts','tsx','jsx'].includes(ext)) {
      pre.innerHTML = highlightJs(text);
    } else {
      // Просто текст с HTML-эскейпом
      pre.textContent = text;
    }
  } catch (e) {
    console.error('File preview error:', e);
    body.innerHTML = `
      <div class="file-preview-error">
        <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
        <div style="font-size: 15px; font-weight: 600; margin-bottom: 6px;">Не удалось загрузить файл</div>
        <div style="color: var(--muted); font-size: 13px;">${escapeHtml(e.message)}</div>
      </div>
    `;
  }
}

// ===== Подсветка JSON =====
function highlightJson(text) {
  // Простая подсветка через regex
  let out = escapeHtml(text);
  out = out.replace(/"([^"\\]|\\.)*"(\s*:)?/g, (match, _, colon) => {
    if (colon) {
      // ключ
      return `<span class="key">${match}</span>`;
    }
    return `<span class="string">${match}</span>`;
  });
  out = out.replace(/\b(true|false)\b/g, '<span class="boolean">$1</span>');
  out = out.replace(/\bnull\b/g, '<span class="null">null</span>');
  out = out.replace(/\b(-?\d+(\.\d+)?([eE][+-]?\d+)?)\b/g, '<span class="number">$1</span>');
  return out;
}

// ===== Подсветка JS =====
function highlightJs(text) {
  let out = escapeHtml(text);
  // Комментарии // ...
  out = out.replace(/(\/\/[^\n]*)/g, '<span class="comment">$1</span>');
  // Комментарии /* ... */
  out = out.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="comment">$1</span>');
  // Строки в кавычках (одиночных и двойных)
  out = out.replace(/(['"`])((?:\\.|(?!\1).)*)\1/g, '<span class="string">$1$2$1</span>');
  // Ключевые слова
  out = out.replace(/\b(function|const|let|var|if|else|for|while|return|new|class|extends|import|export|from|async|await|try|catch|finally|throw|typeof|instanceof|this|null|undefined|true|false)\b/g, '<span class="keyword">$1</span>');
  // Числа
  out = out.replace(/\b(-?\d+(\.\d+)?)\b/g, '<span class="number">$1</span>');
  return out;
}

// ===== CSV → таблица =====
function renderCsvTable(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (!lines.length) return '<div class="file-preview-error">Пустой CSV</div>';

  // Простой парсер CSV (без учёта кавычек с запятыми — можно улучшить)
  const rows = lines.map(line => {
    // Учитываем значения в кавычках
    const result = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i+1] === '"') { cur += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        result.push(cur); cur = '';
      } else {
        cur += ch;
      }
    }
    result.push(cur);
    return result;
  });

  const header = rows[0];
  const body = rows.slice(1);

  let html = '<table class="file-preview-table"><thead><tr>';
  header.forEach(h => html += `<th>${escapeHtml(h)}</th>`);
  html += '</tr></thead><tbody>';
  body.forEach(row => {
    html += '<tr>';
    row.forEach(cell => html += `<td>${escapeHtml(cell)}</td>`);
    html += '</tr>';
  });
  html += '</tbody></table>';
  return html;
}
  // ===== ЭКСПОРТ =====
  window.ChatUploads = {
  sendFilesAsBatch,
  renderAlbum,
  openAlbumViewer,
  closeAlbumViewer,
  openFullscreenPhoto,
  setUploadProgress,
  fmtBytes,
  openFilePreview,
  closeFilePreview,
  getFileIconSvg,          // ← добавь
  getFileIconSvgInline     // ← добавь
};
})();
// Очистка стрелок при инициализации
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('#album-fs-nav, .album-fullscreen-nav').forEach(el => el.remove());
});