// ========================================
// SHARED MODALS — JavaScript
// ========================================

// ===== PIN VARIABLES =====
let enteredPin = '';
let accessHashes = {};
let googleLoginInProgress = false;
let modalsInitialized = false;

// ===== ЗАГРУЗКА ХЕШЕЙ =====
async function loadAccessHashes() {
  if (!db) {
    console.warn('⚠️ Firestore not initialized');
    return;
  }
  
  try {
    const doc = await db.collection('config').doc('access').get();
    if (doc.exists) {
      accessHashes = doc.data();
    } else {
      accessHashes = {};
    }
  } catch (e) {
    console.error('Failed to load access hashes:', e);
    accessHashes = {};
  }
}

// ===== HELPER FUNCTIONS =====
function getRole() {
  return localStorage.getItem('siteRole') || 'guest';
}

function setRole(role) {
  localStorage.setItem('siteRole', role);
}

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

function updatePinDisplay() {
  const display = document.getElementById('pin-display');
  if (!display) return;
  
  display.classList.remove('filled', 'error');
  
  if (enteredPin.length === 0) {
    display.textContent = '••••';
  } else {
    display.textContent = '•'.repeat(Math.min(enteredPin.length, 4)) + '•'.repeat(Math.max(0, 4 - enteredPin.length));
    display.classList.add('filled');
  }
}

function flashPinError() {
  const display = document.getElementById('pin-display');
  if (display) {
    display.classList.add('error');
    setTimeout(() => display.classList.remove('error'), 450);
  }
  const modal = document.getElementById('login-modal');
  if (modal) {
    modal.style.animation = 'none';
    modal.offsetHeight;
    modal.style.animation = 'flashRed 0.5s ease';
  }
}

// ===== OPEN FUNCTIONS =====
function openLoginModal() {
  const modal = document.getElementById('login-modal');
  if (!modal) return;
  
  if (typeof applyTranslations === 'function') {
    applyTranslations();
  }
  
  modal.classList.add('open');
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  
  enteredPin = '';
  updatePinDisplay();
  
  showEmailForm('login');
}

function closeLoginModal() {
  const modal = document.getElementById('login-modal');
  if (!modal) return;
  
  modal.classList.remove('open');
  modal.style.display = 'none';
  document.body.style.overflow = '';
  
  enteredPin = '';
  updatePinDisplay();
  
  googleLoginInProgress = false;
  
  const googleBtn = document.getElementById('google-login-btn');
  if (googleBtn) {
    googleBtn.textContent = 'Google';
    googleBtn.disabled = false;
    googleBtn.style.opacity = '1';
  }
}

// ===== DOWNLOAD RESTRICTION =====
function openDownloadRestriction() {
  // Ищем модалку сначала в #modals-container
  let modal = document.querySelector('#modals-container #download-restriction-modal');
  
  // Если не нашли — ищем в body (fallback)
  if (!modal) {
    modal = document.getElementById('download-restriction-modal');
  }
  
  if (!modal) return;
  
  if (typeof applyTranslations === 'function') {
    applyTranslations();
  }
  
  modal.classList.add('open');
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeDownloadRestriction() {
  let modal = document.querySelector('#modals-container #download-restriction-modal');
  if (!modal) modal = document.getElementById('download-restriction-modal');
  if (!modal) return;
  
  modal.classList.remove('open');
  modal.style.display = 'none';
  document.body.style.overflow = '';
}

// ===== PLAYLIST RESTRICTION =====
function openPlaylistRestriction() {
  const modal = document.getElementById('playlist-restriction-modal');
  if (!modal) return;
  
  if (typeof applyTranslations === 'function') {
    applyTranslations();
  }
  
  modal.classList.add('open');
  modal.style.display = '';
  document.body.style.overflow = 'hidden';
}

function closePlaylistRestriction() {
  const modal = document.getElementById('playlist-restriction-modal');
  if (!modal) return;
  
  modal.classList.remove('open');
  modal.style.display = '';
  document.body.style.overflow = '';
}

// ===== FEEDBACK RESTRICTION =====
function openFeedbackRestriction() {
  const modal = document.getElementById('feedback-restriction-modal');
  if (!modal) return;
  
  if (typeof applyTranslations === 'function') {
    applyTranslations();
  }
  
  modal.classList.add('open');
  modal.style.display = '';
  document.body.style.overflow = 'hidden';
}

function closeFeedbackRestriction() {
  const modal = document.getElementById('feedback-restriction-modal');
  if (!modal) return;
  
  modal.classList.remove('open');
  modal.style.display = '';
  document.body.style.overflow = '';
}

// ===== EMAIL AUTH FUNCTIONS =====
function showEmailForm(formType) {
  const loginForm = document.getElementById('email-login-form');
  const registerForm = document.getElementById('email-register-form');
  const forgotForm = document.getElementById('email-forgot-form');
  const title = document.getElementById('email-auth-title');
  const subtitle = document.getElementById('email-auth-subtitle');
  
  if (loginForm) loginForm.style.display = 'none';
  if (registerForm) registerForm.style.display = 'none';
  if (forgotForm) forgotForm.style.display = 'none';
  
  if (formType === 'login' && loginForm) {
    loginForm.style.display = 'block';
    if (title) title.textContent = t('login') || 'Login';
    if (subtitle) subtitle.textContent = t('emailSubtitle') || 'Secure Email Access';
  } else if (formType === 'register' && registerForm) {
    registerForm.style.display = 'block';
    if (title) title.textContent = t('createAccount') || 'Create Account';
    if (subtitle) subtitle.textContent = 'Join N1K∅';
  } else if (formType === 'forgot' && forgotForm) {
    forgotForm.style.display = 'block';
    if (title) title.textContent = t('forgotPassword') || 'Reset Password';
    if (subtitle) subtitle.textContent = "We'll send you a link";
  }
  
  updateEmailAuthModalTranslations();
}

function updateEmailAuthModalTranslations() {
  const setText = (id, key, fallback) => {
    const el = document.getElementById(id);
    if (el) {
      const span = el.querySelector('span');
      const text = t(key) || fallback;
      if (span) span.textContent = text;
      else el.textContent = text;
    }
  };
  
  const setPlaceholder = (id, key, fallback) => {
    const el = document.getElementById(id);
    if (el) el.placeholder = t(key) || fallback;
  };
  
  setPlaceholder('auth-email', 'email', 'your@email.com');
  setPlaceholder('auth-password', 'password', '••••••••');
  setPlaceholder('reg-email', 'email', 'your@email.com');
  setPlaceholder('reg-password', 'passwordMin', 'Min. 6 characters');
  setPlaceholder('reg-password-confirm', 'confirmPassword', 'Repeat password');
  setPlaceholder('forgot-email', 'email', 'your@email.com');
  
  setText('auth-submit-btn', 'login', 'Zaloguj się');
  setText('auth-toggle-register', 'create', 'Utwórz konto');
  setText('auth-forgot-btn', 'forgotPassword', 'Zapomniałeś hasła?');
  setText('reg-submit-btn', 'createAccount', 'Utwórz konto');
  setText('reg-toggle-login', 'backToLogin', 'Back to Login');
  setText('forgot-submit-btn', 'sendResetEmail', 'Send Reset Email');
  setText('forgot-toggle-login', 'backToLogin', 'Back to Login');
  setText('email-auth-cancel', 'cancel', 'Cancel');
}

// ===== GOOGLE LOGIN HANDLER =====
function setupGoogleLogin() {
  const googleBtn = document.getElementById('google-login-btn');
  
  if (!googleBtn) return;
  
  const newBtn = googleBtn.cloneNode(true);
  googleBtn.parentNode.replaceChild(newBtn, googleBtn);
  
  newBtn.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    if (googleLoginInProgress) return;
    
    if (typeof firebase === 'undefined' || !firebase.auth) {
      alert('Firebase not loaded. Please refresh the page.');
      return;
    }
    
    googleLoginInProgress = true;
    const btn = this;
    const originalText = btn.textContent;
    btn.textContent = '⏳ Connecting...';
    btn.disabled = true;
    
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      
      firebase.auth().signInWithPopup(provider)
        .then(async (result) => {
          await handleGoogleUser(result.user);
        })
        .catch((error) => {
          console.error('Google login error:', error);
          if (error.code === 'auth/popup-blocked') {
            alert('⚠️ Popup was blocked. Please allow popups for this site.');
          } else if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
            alert('Login failed: ' + error.message);
          }
        })
        .finally(() => {
          googleLoginInProgress = false;
          btn.textContent = originalText;
          btn.disabled = false;
        });
    } catch (error) {
      console.error('Error:', error);
      googleLoginInProgress = false;
      btn.textContent = originalText;
      btn.disabled = false;
      alert('Error: ' + error.message);
    }
  });
}

// ===== HANDLE GOOGLE USER =====
async function handleGoogleUser(user) {
  if (!user) return;
  
  try {
    await db.collection('users').doc(user.uid).set({
      email: user.email,
      displayName: user.displayName || user.email?.split('@')[0] || 'User',
      photoURL: user.photoURL || null,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastLoginAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    localStorage.setItem('siteRole', 'user');
    localStorage.setItem('firebaseUid', user.uid);
    localStorage.setItem('userEmail', user.email || '');
    localStorage.setItem('userDisplayName', user.displayName || user.email?.split('@')[0] || 'User');
    localStorage.setItem('userCreatedAt', user.metadata.creationTime || new Date().toISOString());
    
    closeLoginModal();
    location.reload();
  } catch (error) {
    console.error('Error saving user:', error);
    alert('Error saving user data: ' + error.message);
  }
}

// ===== INIT MODALS =====
function initModals() {
  if (modalsInitialized) {
    return;
  }
  modalsInitialized = true;
  
  loadAccessHashes();
  
  if (typeof applyTranslations === 'function') {
    applyTranslations();
  }
  
  // --- Login Modal ---
  document.getElementById('login-close-x')?.addEventListener('click', closeLoginModal);
  
  document.getElementById('login-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'login-modal') {
      closeLoginModal();
    }
  });
  
  // --- Email Auth Modal ---
  document.getElementById('email-auth-close-x')?.addEventListener('click', () => {
    const modal = document.getElementById('email-auth-modal');
    if (modal) {
      modal.classList.remove('open');
      modal.style.display = 'none';
    }
  });
  
  document.getElementById('email-auth-cancel')?.addEventListener('click', () => {
    const modal = document.getElementById('email-auth-modal');
    if (modal) {
      modal.classList.remove('open');
      modal.style.display = 'none';
    }
  });
  
  // --- Email Login Form ---
  document.getElementById('auth-toggle-register')?.addEventListener('click', () => {
    showEmailForm('register');
  });
  
  document.getElementById('auth-forgot-btn')?.addEventListener('click', () => {
    showEmailForm('forgot');
  });
  
  // --- Email Register Form ---
  document.getElementById('reg-toggle-login')?.addEventListener('click', () => {
    showEmailForm('login');
  });
  
  // --- Email Forgot Form ---
  document.getElementById('forgot-toggle-login')?.addEventListener('click', () => {
    showEmailForm('login');
  });
  
  // --- Playlist Restriction Modal ---
  document.getElementById('playlist-restriction-close-x')?.addEventListener('click', closePlaylistRestriction);
  document.getElementById('playlist-restriction-close-btn')?.addEventListener('click', closePlaylistRestriction);
  
  document.getElementById('playlist-restriction-login-btn')?.addEventListener('click', () => {
    closePlaylistRestriction();
    openLoginModal();
  });
  
  document.getElementById('playlist-restriction-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'playlist-restriction-modal') {
      closePlaylistRestriction();
    }
  });
  
  // --- Download Restriction Modal ---
  document.getElementById('download-restriction-close-x')?.addEventListener('click', closeDownloadRestriction);
  document.getElementById('download-restriction-close-btn')?.addEventListener('click', closeDownloadRestriction);
  
  document.getElementById('download-restriction-login-btn')?.addEventListener('click', () => {
    closeDownloadRestriction();
    openLoginModal();
  });
  
  document.getElementById('download-restriction-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'download-restriction-modal') {
      closeDownloadRestriction();
    }
  });
  
  // --- Feedback Restriction Modal ---
  document.getElementById('feedback-restriction-close-x')?.addEventListener('click', closeFeedbackRestriction);
  document.getElementById('feedback-restriction-close-btn')?.addEventListener('click', closeFeedbackRestriction);
  
  document.getElementById('feedback-restriction-login-btn')?.addEventListener('click', () => {
    closeFeedbackRestriction();
    openLoginModal();
  });
  
  document.getElementById('feedback-restriction-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'feedback-restriction-modal') {
      closeFeedbackRestriction();
    }
  });
  
  // --- Keyboard: Escape to close ---
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeDownloadRestriction();
      closePlaylistRestriction();
      closeFeedbackRestriction();
    }
  });

  // --- PIN Logic ---
  const pinBtns = document.querySelectorAll('.pin-btn');
  
  pinBtns.forEach(btn => {
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
  });
  
  document.querySelectorAll('.pin-btn').forEach(btn => {
    btn.addEventListener('click', async function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      const digit = this.dataset.digit;
      const action = this.dataset.action;
      
      if (digit !== undefined) {
        enteredPin += String(digit);
        updatePinDisplay();
      } else if (action === 'clear') {
        enteredPin = '';
        updatePinDisplay();
      } else if (action === 'confirm') {
        if (enteredPin.length === 0) return;
        
        const hash = await sha256(enteredPin);
        const role = hash === accessHashes?.adminHash ? 'admin' :
                     hash === accessHashes?.partnerHash ? 'partner' : null;
        
        if (role) {
          setRole(role);
          enteredPin = '';
          updatePinDisplay();
          closeLoginModal();
          
          if (role === 'partner' && db) {
            try {
              await db.collection('profiles').doc('partner').set({
                lastLoginAt: firebase.firestore.FieldValue.serverTimestamp()
              }, { merge: true });
            } catch (e) {
              console.error('Failed to update partner last login:', e);
            }
          }
          
          location.reload();
        } else {
          flashPinError();
          enteredPin = '';
          updatePinDisplay();
        }
      }
    });
  });

  // --- EMAIL LOGIN ---
  document.getElementById('email-login-btn')?.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    closeLoginModal();
    
    const emailModal = document.getElementById('email-auth-modal');
    if (emailModal) {
      emailModal.style.display = 'flex';
      emailModal.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
    
    showEmailForm('login');
  });

  setupGoogleLogin();
}
// ===== ЭКСПОРТ В WINDOW =====
window.initModals = initModals;
window.openLoginModal = openLoginModal;
window.closeLoginModal = closeLoginModal;
window.openDownloadRestriction = openDownloadRestriction;
window.closeDownloadRestriction = closeDownloadRestriction;
window.openPlaylistRestriction = openPlaylistRestriction;
window.closePlaylistRestriction = closePlaylistRestriction;
window.openFeedbackRestriction = openFeedbackRestriction;
window.closeFeedbackRestriction = closeFeedbackRestriction;

// ===== ГАРАНТИРОВАННАЯ ИНИЦИАЛИЗАЦИЯ =====
// Сбрасываем флаг, если DOM ещё не готов
(function scheduleInit() {
  function tryInit() {
    // Проверяем, что модалки есть в DOM
    const hasModals = document.getElementById('download-restriction-modal') ||
                      document.getElementById('login-modal');
    
    if (!hasModals) {
      // Модалок ещё нет — ждём следующего кадра
      console.log('⏳ initModals: модалок нет в DOM, ждём...');
      setTimeout(tryInit, 100);
      return;
    }
    
    // Модалки есть — сбрасываем флаг и инициализируем
    modalsInitialized = false;
    initModals();
    console.log('✅ initModals выполнена');
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryInit);
  } else {
    tryInit();
  }
})();
