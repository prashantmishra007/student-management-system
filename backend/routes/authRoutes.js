const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Resend } = require('resend');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const { JWT_SECRET } = require('../middleware/authMiddleware');

// Initialize Google OAuth2 Client
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '196669776050-ppalg9hb322gvk6vkvc8imf1gf0iunkp.apps.googleusercontent.com';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// Initialize Resend API client with fallback
const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder_key_2026');

// Temporary in-memory OTP store (email -> { otp, expiresAt })
const otpStore = new Map();

// Register Route
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please fill all required fields' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      name,
      email: email.toLowerCase(),
      password: hashedPassword
    });

    await newUser.save();

    const token = jwt.sign({ userId: newUser._id }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({
      token,
      user: { id: newUser._id, name: newUser.name, email: newUser.email }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during registration', error: error.message });
  }
});

// Login Route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during login', error: error.message });
  }
});

// Google Sign-In / Auto-Register Route
router.post('/google-login', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ message: 'Google credential token is missing.' });
    }

    // Verify Google ID Token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, name } = payload;

    if (!email) {
      return res.status(400).json({ message: 'Unable to retrieve email from Google token.' });
    }

    // Check if user already exists
    let user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Auto-create user account with random secure password
      const randomPassword = Math.random().toString(36).slice(-10) + 'Gg7!';
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(randomPassword, salt);

      user = new User({
        name: name || 'Google User',
        email: email.toLowerCase(),
        password: hashedPassword,
      });
      await user.save();
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error('Google Auth Error:', err);
    res.status(401).json({ message: 'Google authentication failed', error: err.message });
  }
});

// Forgot Password - Send OTP via Resend API
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: 'No account registered with this email' });
    }

    // 6-digit random OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    otpStore.set(email.toLowerCase(), { otp, expiresAt });

    const { data, error } = await resend.emails.send({
      from: 'Student Management Pro <onboarding@resend.dev>',
      to: [email.toLowerCase()],
      subject: 'Password Reset OTP - Student Management System Pro',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #0ea5e9;">Password Reset Request</h2>
          <p>Hi ${user.name},</p>
          <p>Your one-time OTP to reset your password is:</p>
          <div style="font-size: 26px; font-weight: bold; letter-spacing: 5px; padding: 12px 20px; background: #f3f4f6; display: inline-block; border-radius: 6px; margin: 12px 0; color: #0284c7;">
            ${otp}
          </div>
          <p>This code will expire in 10 minutes. If you did not make this request, you can safely ignore this email.</p>
        </div>
      `
    });

    if (error) {
      console.error('Resend API Error:', error);
      return res.status(500).json({ message: 'Failed to send OTP email', error: error.message });
    }

    res.json({ message: 'OTP sent successfully to your email!' });
  } catch (error) {
    console.error('Forgot Password Exception:', error);
    res.status(500).json({ message: 'Failed to send OTP email', error: error.message });
  }
});

// Reset Password - Verify OTP & Update
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const record = otpStore.get(email.toLowerCase());
    if (!record) {
      return res.status(400).json({ message: 'No OTP requested or OTP has expired' });
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(email.toLowerCase());
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    if (record.otp !== otp.trim()) {
      return res.status(400).json({ message: 'Invalid OTP entered' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await User.findOneAndUpdate(
      { email: email.toLowerCase() },
      { password: hashedPassword }
    );

    otpStore.delete(email.toLowerCase());
    res.json({ message: 'Password has been reset successfully!' });
  } catch (error) {
    console.error('Reset Password Exception:', error);
    res.status(500).json({ message: 'Error resetting password', error: error.message });
  }
});

module.exports = router;