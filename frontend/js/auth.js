// Mandi-Connect Auth Module - Email OTP Authentication
// Calls backend API for Email OTP via Nodemailer + Gmail SMTP

const OTP_API = 'http://10.21.61.191:3002/api/otp';
const AUTH_API = 'http://10.21.61.191:3002/api/auth';

// Users DB in LocalStorage
if (!localStorage.getItem('mc_users')) {
  localStorage.setItem('mc_users', JSON.stringify([]));
}

window.getLocalUsers = function() {
  return JSON.parse(localStorage.getItem('mc_users')) || [];
}

window.saveLocalUser = function(user) {
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
window.saveLocalSession = function(profile) {
  localStorage.setItem('mc_profile', JSON.stringify(profile));
}

window.getLocalProfile = function() {
  try { return JSON.parse(localStorage.getItem('mc_profile')); } catch { return null; }
}

window.clearLocalSession = function() {
  localStorage.removeItem('mc_profile');
}

// Guard: redirect to login if not authenticated
window.requireAuth = function(role = null) {
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
window.apiSendOTP = async function(email, checkRegistration = null) {
  const res = await fetch(`${OTP_API}/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, checkRegistration })
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
window.apiVerifyOTP = async function(email, otp) {
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

/**
 * Register user in Supabase via backend
 */
window.apiRegister = async function(userData) {
  const res = await fetch(`${AUTH_API}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Registration failed');
  return data;
}

/**
 * Login user via backend (checks email and password)
 */
window.apiLogin = async function(email, password) {
  const res = await fetch(`${AUTH_API}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Login failed');
  return data;
}

/**
 * Forgot Password: Request reset link
 */
window.apiForgotPassword = async function(email) {
  const res = await fetch(`${AUTH_API}/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to send reset link');
  return data;
}

/**
 * Reset Password: Set new password
 */
window.apiResetPassword = async function(token, email, newPassword) {
  const res = await fetch(`${AUTH_API}/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, email, newPassword })
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update password');
  return data;
}

// Logout
window.logoutUser = async function() {
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
