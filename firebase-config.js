// Initialize Firebase
if (typeof firebase !== 'undefined') {
  firebase.initializeApp(firebaseConfig);

  try {
    const isLocalhost = window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1' ||
                        window.location.protocol === 'file:';

    if (isLocalhost) {
      // Отладочный токен включаем ТОЛЬКО для localhost
      self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
      console.log('✅ Firebase initialized (App Check Debug Mode for localhost)');
    } else {
      // Для Vercel / Production включаем стандартную проверку
      self.FIREBASE_APPCHECK_DEBUG_TOKEN = false;
      
      const appCheck = firebase.appCheck();
      // Включаем автоматическую перезагрузку токенов (isTokenAutoRefreshEnabled = true)
      appCheck.activate('6Ld4u4wtAAAAAFFcf-Rd7upojt5ANaEhgHLunzXD', true);
      
      console.log('✅ Firebase initialized with App Check (reCAPTCHA)');
    }
  } catch (e) {
    console.warn('⚠️ App Check activation failed:', e);
  }
} else {
  console.warn('⚠️ Firebase not loaded');
}
