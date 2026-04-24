// ===== AUTH PAGE LOGIC =====
let currentRole = 'patient';

// ===== GOOGLE CLIENT ID =====
// This is fetched from the server so it doesn't need to be hardcoded in the frontend.
// The server reads it from process.env.GOOGLE_CLIENT_ID
let GOOGLE_CLIENT_ID = '';
let googleLibraryReady = false;

// Called by the GSI script's onload attribute once the library finishes loading.
// If the client ID was already fetched, initialize immediately; otherwise
// initGoogleAuth() will call setupGoogleSignIn() when the fetch completes.
window.onGoogleLibraryLoad = function () {
  googleLibraryReady = true;
  if (GOOGLE_CLIENT_ID) {
    setupGoogleSignIn();
  }
};

function setupGoogleSignIn() {
  document.getElementById('g_id_onload').setAttribute('data-client_id', GOOGLE_CLIENT_ID);
  window.google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: handleGoogleCredential,
    auto_select: false,
  });

  const btnLogin = document.getElementById("googleLoginBtnContainer");
  const btnRegister = document.getElementById("googleRegisterBtnContainer");

  if (btnLogin) {
    window.google.accounts.id.renderButton(btnLogin, { theme: "outline", size: "large", width: 350 });
  }
  if (btnRegister) {
    window.google.accounts.id.renderButton(btnRegister, { theme: "outline", size: "large", width: 350 });
  }
}

async function initGoogleAuth() {
  try {
    const res = await fetch(`${API_BASE}/auth/google-config`);
    const data = await res.json();
    GOOGLE_CLIENT_ID = data.clientId || '';

    if (!GOOGLE_CLIENT_ID) {
      // Hide Google button if not configured
      document.querySelectorAll('.btn-google, .google-login-widget').forEach(b => b.style.display = 'none');
      document.querySelectorAll('.auth-divider').forEach(d => d.style.display = 'none');
      return;
    }

    // If the Google library already loaded (onload fired before fetch completed),
    // initialize now. Otherwise onGoogleLibraryLoad() will call setupGoogleSignIn().
    if (googleLibraryReady || window.google) {
      setupGoogleSignIn();
    }
  } catch (e) {
    // If server not reachable, hide Google buttons silently
    document.querySelectorAll('.btn-google, .google-login-widget').forEach(b => b.style.display = 'none');
    document.querySelectorAll('.auth-divider').forEach(d => d.style.display = 'none');
  }
}

// Called when user clicks our custom Google button (if it still existed)
function handleGoogleLogin() {
  if (!GOOGLE_CLIENT_ID) {
    alert('Google Sign-In is not configured. Please set GOOGLE_CLIENT_ID in your .env file.');
    return;
  }
  if (!window.google) {
    alert('Google Sign-In library not loaded. Check your internet connection.');
    return;
  }
}

// Called by Google's library with the credential (ID token)
async function handleGoogleCredential(response) {
  const credential = response.credential;
  if (!credential) return;

  // Show loading on button
  const btn = document.getElementById('googleLoginBtn');
  if (btn) {
    btn.disabled = true;
    document.getElementById('googleLoginText').textContent = 'Signing in...';
  }

  try {
    const data = await api.post('/auth/google', { credential, role: currentRole });
    localStorage.setItem('medirec_token', data.token);
    localStorage.setItem('medirec_user', JSON.stringify(data.user));
    redirectToDashboard(data.user.role);
  } catch (err) {
    // Show error on the visible login card
    const errEl = document.getElementById('loginError');
    if (errEl) {
      errEl.textContent = err.message || 'Google sign-in failed';
      errEl.classList.add('show');
      setTimeout(() => errEl.classList.remove('show'), 5000);
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      document.getElementById('googleLoginText').textContent = 'Sign in with Google';
    }
  }
}

// Redirect if already logged in
(function() {
  const user = getUser();
  const token = localStorage.getItem('medirec_token');
  if (token && user) {
    redirectToDashboard(user.role);
  } else {
    // Show disclaimer on first visit
    if (!sessionStorage.getItem('disclaimer_shown')) {
      document.getElementById('disclaimerModal').classList.remove('hidden');
    }
    // Init Google auth after page load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initGoogleAuth);
    } else {
      initGoogleAuth();
    }
  }
})();

function redirectToDashboard(role) {
  if (role === 'doctor') {
    window.location.href = '/pages/doctor.html';
  } else {
    window.location.href = '/pages/patient.html';
  }
}

function closeDisclaimer() {
  document.getElementById('disclaimerModal').classList.add('hidden');
  sessionStorage.setItem('disclaimer_shown', '1');
}

function switchRole(role) {
  currentRole = role;
  document.getElementById('tabPatient').classList.toggle('active', role === 'patient');
  document.getElementById('tabDoctor').classList.toggle('active', role === 'doctor');

  document.getElementById('loginTitle').textContent = role === 'doctor' ? 'Doctor Login' : 'Patient Login';
  document.getElementById('loginSubtitle').textContent = role === 'doctor' ? 'Access your medical portal' : 'Access your health dashboard';
  document.getElementById('registerTitle').textContent = `Create ${role === 'doctor' ? 'Doctor' : 'Patient'} Account`;
  document.getElementById('registerSubtitle').textContent = `Join MediRec as a ${role === 'doctor' ? 'Doctor' : 'Patient'}`;
  document.getElementById('doctorFields').classList.toggle('hidden', role !== 'doctor');
}

function showRegister() {
  document.getElementById('loginCard').classList.add('hidden');
  document.getElementById('registerCard').classList.remove('hidden');
}

function showLogin() {
  document.getElementById('registerCard').classList.add('hidden');
  document.getElementById('loginCard').classList.remove('hidden');
}

function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  const icon = btn.querySelector('i');
  if (input.type === 'password') {
    input.type = 'text';
    icon.className = 'fas fa-eye-slash';
  } else {
    input.type = 'password';
    icon.className = 'fas fa-eye';
  }
}

function setLoading(btnId, loaderId, loading) {
  const btnText = document.querySelector(`#${btnId} .btn-text`);
  const btnLoader = document.querySelector(`#${btnId} .btn-loader`);
  if (btnText) btnText.classList.toggle('hidden', loading);
  if (btnLoader) btnLoader.classList.toggle('hidden', !loading);
  document.getElementById(btnId).disabled = loading;
}

function showError(elId, msg) {
  const el = document.getElementById(elId);
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 5000);
}

// Login Form
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!email || !password) return showError('loginError', 'Please fill in all fields');

  setLoading('loginBtn', null, true);
  document.getElementById('loginError').classList.remove('show');

  try {
    const data = await api.post('/auth/login', { email, password, role: currentRole });
    localStorage.setItem('medirec_token', data.token);
    localStorage.setItem('medirec_user', JSON.stringify(data.user));
    redirectToDashboard(data.user.role);
  } catch (err) {
    showError('loginError', err.message || 'Login failed. Please check your credentials.');
  } finally {
    setLoading('loginBtn', null, false);
  }
});

// Register Form
document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const age = document.getElementById('regAge').value;
  const gender = document.getElementById('regGender').value;
  const specialization = document.getElementById('regSpecialization').value.trim();
  const password = document.getElementById('regPassword').value;
  const confirm = document.getElementById('regConfirm').value;

  if (!name || !email || !password) return showError('registerError', 'Please fill all required fields');
  if (password.length < 6) return showError('registerError', 'Password must be at least 6 characters');
  if (password !== confirm) return showError('registerError', 'Passwords do not match');

  setLoading('registerBtn', null, true);
  document.getElementById('registerError').classList.remove('show');

  try {
    const payload = { name, email, password, role: currentRole, age: age || undefined, gender: gender || undefined };
    if (currentRole === 'doctor' && specialization) payload.specialization = specialization;

    const data = await api.post('/auth/register', payload);
    localStorage.setItem('medirec_token', data.token);
    localStorage.setItem('medirec_user', JSON.stringify(data.user));
    redirectToDashboard(data.user.role);
  } catch (err) {
    showError('registerError', err.message || 'Registration failed. Try a different email.');
  } finally {
    setLoading('registerBtn', null, false);
  }
});
