// Initialize Firebase
if (typeof firebase !== 'undefined') {
  firebase.initializeApp(firebaseConfig);

  // Пытаемся запустить App Check
  try {
    const isLocalhost = window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1' ||
                        window.location.protocol === 'file:';

    if (isLocalhost) {
      self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
      console.log('✅ App Check: Debug Mode');
    } else {
      // Для v8 отключаем debug token явным образом
      self.FIREBASE_APPCHECK_DEBUG_TOKEN = false;
      
      const appCheck = firebase.appCheck();
      // Активация ключа reCAPTCHA (без второго аргумента true/false)
      appCheck.activate('6Ld4u4wtAAAAAFFcf-Rd7upojt5ANaEhgHLunzXD');
      
      console.log('✅ Firebase App Check activated');
    }
  } catch (e) {
    // Важно: если App Check упал, мы ловим ошибку и даем сайту работать дальше!
    console.error('⚠️ App Check failed to initialize:', e);
  }
} else {
  console.warn('⚠️ Firebase SDK not loaded');
}
