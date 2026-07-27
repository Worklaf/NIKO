// db.js — ЗАГРУЖАТЬ ПЕРВЫМ, до всех остальных скриптов

const DB_NAME = 'niko-offline-db';
const DB_VERSION = 1;
const TRACKS_STORE = 'tracks';

function openTracksDB() {
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

async function saveTracksToDB(tracks) {
  try {
    const db = await openTracksDB();
    const tx = db.transaction(TRACKS_STORE, 'readwrite');
    const store = tx.objectStore(TRACKS_STORE);
    await store.clear();
    for (const track of tracks) {
      store.put(track);
    }
    return new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('saveTracksToDB failed:', e);
  }
}

async function getTracksFromDB() {
  try {
    const db = await openTracksDB();
    const tx = db.transaction(TRACKS_STORE, 'readonly');
    const store = tx.objectStore(TRACKS_STORE);
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('getTracksFromDB failed:', e);
    return [];
  }
}

// Глобальные алиасы
window.saveTracksToDB = saveTracksToDB;
window.getTracksFromDB = getTracksFromDB;
