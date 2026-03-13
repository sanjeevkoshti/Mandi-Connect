const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

// In-memory OTP storage
const otpStore = new Map();
const rateLimiter = new Map();

// Gmail SMTP configuration
const SMTP_EMAIL = process.env.SMTP_EMAIL || '';
const SMTP_PASSWORD = process.env.SMTP_PASSWORD || '';

// Create transporter
function createTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: SMTP_EMAIL,
      pass: SMTP_PASSWORD
    }
  });
}

// Rate limit: max 5 OTPs per email per 10 minutes
function checkRateLimit(email) {
  const now = Date.now();
  const key = email.toLowerCase();
  const record = rateLimiter.get(key);
  if (!record) {
    rateLimiter.set(key, { count: 1, firstRequest: now });
    return true;
  }
  if (now - record.firstRequest > 10 * 60 * 1000) {
    rateLimiter.set(key, { count: 1, firstRequest: now });
    return true;
  }
  if (record.count >= 5) return false;
  record.count++;
  return true;
}

// ========== SEND OTP ==========
router.post('/send', async (req, res) => {
  try {
    const { email, checkRegistration } = req.body; // checkRegistration: 'login' or 'register'
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email address is required' });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, error: 'Please enter a valid email address' });
    }

    const emailKey = email.toLowerCase().trim();

    // Check registration status if requested
    if (checkRegistration) {
      const { data: user, error } = await require('../supabase')
        .from('profiles')
        .select('email')
        .eq('email', emailKey)
        .single();
      
      if (checkRegistration === 'login' && (!user || error)) {
        return res.status(404).json({ success: false, error: 'This email is not registered. Please register first.' });
      }
      if (checkRegistration === 'register' && user) {
        return res.status(400).json({ success: false, error: 'This email is already registered. Please login.' });
      }
    }

    // Rate limit
    if (!checkRateLimit(emailKey)) {
      return res.status(429).json({ success: false, error: 'Too many OTP requests. Please wait 10 minutes.' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP with 5-minute expiry
    otpStore.set(emailKey, {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000,
      attempts: 0
    });

    console.log(`[OTP] Generated for ${emailKey}: ${otp}`);

    // Check SMTP credentials
    if (!SMTP_EMAIL || !SMTP_PASSWORD) {
      console.warn('[OTP] ⚠️ SMTP_EMAIL or SMTP_PASSWORD not set in .env. Running in DEV mode (OTP logged to console ONLY).');
      return res.json({ 
        success: true, 
        message: `[DEV MODE] OTP logged to server terminal for testing.` 
      });
    }

    // Send email
    try {
      const transporter = createTransporter();

      const mailOptions = {
        from: `"MandiConnect" <${SMTP_EMAIL}>`,
        to: emailKey,
        subject: '🌾 MandiConnect - OTP Verification',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 30px; border: 1px solid #e0e0e0; border-radius: 12px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <span style="font-size: 3rem;">🌾</span>
              <h2 style="color: #0f3d2e; margin: 8px 0;">MandiConnect</h2>
              <p style="color: #666; font-size: 14px;">Farm-to-Retail Marketplace</p>
            </div>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 16px; color: #333;">Your OTP for MandiConnect registration is:</p>
            <div style="background: #f0faf4; border: 2px dashed #28a745; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0;">
              <span style="font-size: 2.5rem; font-weight: 700; letter-spacing: 10px; color: #0f3d2e;">${otp}</span>
            </div>
            <p style="font-size: 14px; color: #666;">⏱️ This OTP will expire in <strong>5 minutes</strong>.</p>
            <p style="font-size: 13px; color: #999;">If you did not request this OTP, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="text-align: center; font-size: 12px; color: #aaa;">© 2026 MandiConnect · Built for Rural India 🇮🇳</p>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);
      console.log(`[OTP] ✅ Email sent to ${emailKey}`);

      return res.json({
        success: true,
        message: `OTP sent to ${emailKey}`
      });

    } catch (emailErr) {
      console.error('[OTP] Email send error:', emailErr.message);
      
      // Fallback for development if email fails
      console.warn(`[OTP] ⚠️ FALLBACK: Could not send real email. Your OTP for ${emailKey} is: ${otp}`);
      
      return res.status(500).json({
        success: false,
        error: `Failed to send email. Check SMTP settings. (DEV: OTP is logged in terminal)`
      });
    }

  } catch (err) {
    console.error('[OTP] Error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ========== VERIFY OTP ==========
router.post('/verify', (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, error: 'Email and OTP are required' });
    }

    const emailKey = email.toLowerCase().trim();
    const stored = otpStore.get(emailKey);

    if (!stored) {
      return res.status(400).json({ success: false, error: 'OTP expired or not sent. Please request a new OTP.' });
    }

    // Check 5-minute expiry
    if (Date.now() > stored.expiresAt) {
      otpStore.delete(emailKey);
      return res.status(400).json({ success: false, error: 'OTP expired. Please request a new one.' });
    }

    // Max 3 wrong attempts
    if (stored.attempts >= 3) {
      otpStore.delete(emailKey);
      return res.status(400).json({ success: false, error: 'Too many wrong attempts. Request a new OTP.' });
    }

    stored.attempts++;

    if (stored.otp === otp.trim()) {
      otpStore.delete(emailKey);
      console.log(`[OTP] ✅ Verified for ${emailKey}`);
      return res.json({ success: true, verified: true, message: 'Email verified successfully' });
    } else {
      console.log(`[OTP] ❌ Wrong OTP for ${emailKey}: got ${otp}, expected ${stored.otp}`);
      return res.status(400).json({ success: false, error: 'Invalid OTP. Please try again.' });
    }

  } catch (err) {
    console.error('[OTP] Verify error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
