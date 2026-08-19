// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBzCiSmy714eAS_sDQffBHHhN3HkPniIKk",
  authDomain: "niko-music-1d585.firebaseapp.com",
  projectId: "niko-music-1d585",
  storageBucket: "niko-music-1d585.firebasestorage.app",
  messagingSenderId: "223346886059",
  appId: "1:223346886059:web:e6e76ad23663de701b7eee",
  measurementId: "G-L9ZY3FYN1R"
};

// Глобальная переменная Firestore
let db = null;

if (typeof firebase !== 'undefined') {
  // 1. Инициализация Firebase App
  firebase.initializeApp(firebaseConfig);

  // 2. Инициализация Firestore с защитой от сбоев мобильного интернета
  db = firebase.firestore();
  try {
    db.settings({
      experimentalForceLongPolling: true, // Помогает загружать данные на мобильных 4G/5G сетях
    });
  } catch (e) {
    console.warn('⚠️ Firestore settings already applied or not supported:', e);
  }

  // 3. Безопасный запуск App Check (не блокирует загрузку треков)
  setTimeout(() => {
    try {
      const isLocalhost = window.location.hostname === 'localhost' || 
                          window.location.hostname === '127.0.0.1' ||
                          window.location.protocol === 'file:';

      if (isLocalhost) {
        self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
        console.log('✅ App Check: Debug mode enabled for localhost');
      } else {
        self.FIREBASE_APPCHECK_DEBUG_TOKEN = false;
        
        const appCheck = firebase.appCheck();
        // Активация reCAPTCHA v3 (без доп. аргументов, вызывавших синтаксическую ошибку)
        appCheck.activate('6Ld4u4wtAAAAAFFcf-Rd7upojt5ANaEhgHLunzXD');
        console.log('✅ App Check activated in production mode');
      }
    } catch (e) {
      console.error('⚠️ App Check non-critical error:', e);
    }
  }, 0);

} else {
  console.error('❌ Firebase SDK not loaded! Check script tags in HTML.');
}
