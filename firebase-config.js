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

// Initialize Firebase
if (typeof firebase !== 'undefined') {
  firebase.initializeApp(firebaseConfig);
  
  // Initialize App Check (disabled for localhost due to Storage Access API issues)
  try {
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    const appCheck = firebase.appCheck();
    
    // Check if running on localhost
    const isLocalhost = window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1' ||
                        window.location.protocol === 'file:';
    
    if (isLocalhost) {
      // Skip App Check on localhost to avoid Storage Access API errors
      console.log('✅ Firebase initialized (App Check disabled for localhost)');
    } else {
      // Use reCAPTCHA for production
      appCheck.activate('6Ld4u4wtAAAAAFFcf-Rd7upojt5ANaEhgHLunzXD', false);
      console.log('✅ Firebase initialized with App Check (reCAPTCHA)');
    }
  } catch (e) {
    console.warn('⚠️ App Check activation failed:', e);
  }
} else {
  console.warn('⚠️ Firebase not loaded');
}

// Export db for use in other files
let db = null;
if (typeof firebase !== 'undefined') {
  db = firebase.firestore();
}
