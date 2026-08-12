// Import Firebase Modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Firebase Configuration (Use your project credentials)
const firebaseConfig = {
  apiKey: "AIzaSyDWz4W3OfUjXwlkO6dkPud5m4M0GZ1I4xs",
  authDomain: "groupix-af7e2.firebaseapp.com",
  projectId: "groupix-af7e2",
  storageBucket: "groupix-af7e2.firebasestorage.app",
  messagingSenderId: "246822951290",
  appId: "1:246822951290:web:14c1a8047138dc34cc5ec3",
  measurementId: "G-RMTZ2BNKVJ"
};

// Initialize Firebase App, Auth, & Firestore
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- THEME SWITCHER LOGIC ---
const themeToggleBtn = document.getElementById('themeToggleBtn');
const themeIcon = document.getElementById('themeIcon');
const htmlElem = document.documentElement;

const currentTheme = localStorage.getItem('theme') || 'light';
htmlElem.setAttribute('data-theme', currentTheme);
updateThemeIcon(currentTheme);

themeToggleBtn.addEventListener('click', () => {
  const newTheme = htmlElem.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
  htmlElem.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  updateThemeIcon(newTheme);
});

function updateThemeIcon(theme) {
  if (theme === 'dark') {
    themeIcon.className = 'fa-solid fa-sun';
  } else {
    themeIcon.className = 'fa-solid fa-moon';
  }
}

// --- CARD TOGGLING LOGIC ---
const signupCard = document.getElementById('signupCard');
const loginCard = document.getElementById('loginCard');
const resetCard = document.getElementById('resetCard');

document.getElementById('showLoginBtn').addEventListener('click', (e) => {
  e.preventDefault();
  signupCard.classList.add('hidden');
  resetCard.classList.add('hidden');
  loginCard.classList.remove('hidden');
});

document.getElementById('showSignupBtn').addEventListener('click', (e) => {
  e.preventDefault();
  loginCard.classList.add('hidden');
  resetCard.classList.add('hidden');
  signupCard.classList.remove('hidden');
});

document.getElementById('showResetBtn').addEventListener('click', (e) => {
  e.preventDefault();
  loginCard.classList.add('hidden');
  signupCard.classList.add('hidden');
  resetCard.classList.remove('hidden');
});

document.getElementById('backToLoginBtn').addEventListener('click', (e) => {
  e.preventDefault();
  resetCard.classList.add('hidden');
  signupCard.classList.add('hidden');
  loginCard.classList.remove('hidden');
});

// Password Toggle Visibility
document.querySelectorAll('.toggle-password').forEach(icon => {
  icon.addEventListener('click', () => {
    const targetId = icon.getAttribute('data-target');
    const input = document.getElementById(targetId);
    if (input.type === 'password') {
      input.type = 'text';
      icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
      input.type = 'password';
      icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
  });
});

// --- FIREBASE AUTHENTICATION FUNCTIONS ---

// 1. SIGN UP ADMIN
document.getElementById('signupForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const fullName = document.getElementById('signupFullName').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;
  const confirmPassword = document.getElementById('signupConfirmPassword').value;

  if (password !== confirmPassword) {
    alert("Error: Passwords do not match!");
    return;
  }

  try {
    // Create Auth User
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update Profile Name in Firebase Auth
    await updateProfile(user, { displayName: fullName });

    // Save Admin details in Firestore DB
    await setDoc(doc(db, "admins", user.uid), {
      uid: user.uid,
      fullName: fullName,
      email: email,
      createdAt: new Date()
    });

    alert("Admin account created successfully!");
    window.location.href = "dashboard.html"; // Redirect to Dashboard

  } catch (error) {
    alert("Sign Up Error: " + error.message);
  }
});

// 2. LOGIN ADMIN
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    window.location.href = "dashboard.html";
  } catch (error) {
    alert("Login Error: " + error.message);
  }
});

// 3. RESET PASSWORD LINK THROUGH EMAIL
document.getElementById('resetForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('resetEmail').value.trim();

  try {
    await sendPasswordResetEmail(auth, email);
    alert("Password reset link sent to your email. Please check your inbox!");
    resetCard.classList.add('hidden');
    loginCard.classList.remove('hidden');
  } catch (error) {
    alert("Error: " + error.message);
  }
});

// 4. CHECK AUTH STATE (Keep Logged In)
onAuthStateChanged(auth, (user) => {
  if (user) {
    // If user is already logged in and currently on the auth page, redirect them to the dashboard
    if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
      window.location.href = "dashboard.html";
    }
  }
});


// Automatically switch to Login form if mode=login is present or on page load
function checkAuthViewMode() {
  const urlParams = new URLSearchParams(window.location.search);
  const mode = urlParams.get('mode');

  const loginForm = document.getElementById('loginForm') || document.querySelector('.login-box') || document.getElementById('loginContainer');
  const registerForm = document.getElementById('registerForm') || document.querySelector('.register-box') || document.getElementById('registerContainer');

  if (mode === 'login' || !mode) {
    if (loginForm && registerForm) {
      loginForm.classList.remove('hidden');
      registerForm.classList.add('hidden');
      loginForm.style.display = 'block';
      registerForm.style.display = 'none';
    }
  }
}

// Run check when page loads
document.addEventListener('DOMContentLoaded', checkAuthViewMode);



let deferredPrompt;
const pwaBanner = document.getElementById('pwaInstallBanner');
const pwaInstallBtn = document.getElementById('pwaInstallBtn');
const pwaDismissBtn = document.getElementById('pwaDismissBtn');

// 1. Capture the PWA install event when launched
window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent immediate automatic prompt display
  e.preventDefault();
  deferredPrompt = e;

  // Always reveal the download banner whenever arriving at the login page
  if (pwaBanner) {
    pwaBanner.classList.remove('hidden');
  }
});

// 2. Handle "Download App" button click
if (pwaInstallBtn) {
  pwaInstallBtn.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('User installed the PWA');
      }
      deferredPrompt = null;
    }
    pwaBanner.classList.add('hidden');
  });
}

// 3. Handle "Continue in Browser" click (Dismisses for this session only)
if (pwaDismissBtn) {
  pwaDismissBtn.addEventListener('click', () => {
    pwaBanner.classList.add('hidden');
  });
}

// 4. Hide automatically if app is already running as an installed PWA
window.addEventListener('DOMContentLoaded', () => {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  if (isStandalone && pwaBanner) {
    pwaBanner.classList.add('hidden');
  }
});
