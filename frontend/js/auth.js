// Mandi-Connect Auth Module - Email OTP Authentication
// Calls backend API for Email OTP via Nodemailer + Gmail SMTP

const OTP_API = 'http://localhost:3002/api/otp';

// Users DB in LocalStorage
if (!localStorage.getItem('mc_users')) {
  localStorage.setItem('mc_users', JSON.stringify([]));
}

function getLocalUsers() {
  return JSON.parse(localStorage.getItem('mc_users')) || [];
}

function saveLocalUser(user) {
  const users = getLocalUsers();
  const existingIndex = users.findIndex(u => u.email === user.email);
  if (existingIndex !== -1) {
    users[existingIndex] = user;
  } else {
    users.push(user);
  }
  localStorage.setItem('mc_users', JSON.stringify(users));
}

// Session helpers
function saveLocalSession(profile) {
  localStorage.setItem('mc_profile', JSON.stringify(profile));
}

function getLocalProfile() {
  try { return JSON.parse(localStorage.getItem('mc_profile')); } catch { return null; }
}

function clearLocalSession() {
  localStorage.removeItem('mc_profile');
}

// Guard: redirect to login if not authenticated
function requireAuth(role = null) {
  const profile = getLocalProfile();
  if (!profile) {
    window.location.href = '/login.html';
    return null;
  }
  if (role && profile.role !== role) {
    window.location.href = profile.role === 'farmer' ? '/farmer-dashboard.html' : '/marketplace.html';
    return null;
  }
  return profile;
}

// =============================================
//  EMAIL OTP FUNCTIONS
// =============================================

/**
 * Send OTP to email via backend (Nodemailer + Gmail SMTP)
 */
async function apiSendOTP(email) {
  const res = await fetch(`${OTP_API}/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });

  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to send OTP');
  }

  return { success: true, message: data.message };
}

/**
 * Verify OTP via backend
 */
async function apiVerifyOTP(email, otp) {
  const res = await fetch(`${OTP_API}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp })
  });

  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Invalid OTP. Please try again.');
  }

  return { success: true, verified: data.verified, message: data.message };
}

// Logout
async function logoutUser() {
  clearLocalSession();
  window.location.href = '/login.html';
}

// Render user info in navbar
function renderNavUser() {
  const profile = getLocalProfile();
  const el = document.getElementById('nav-user-info');
  if (el && profile) {
    el.textContent = `👤 ${profile.full_name}`;
  }
  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      logoutUser();
    });
  }
}
