const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const { JWT_SECRET } = require('../middleware/authMiddleware');

// Temporary in-memory OTP store (email -> { otp, expiresAt })
const otpStore = new Map();

// Cloud-compatible SMTP configuration (Port 587 with TLS & extended timeouts)
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // Port 587 uses STARTTLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  },
  connectionTimeout: 25000,
  greetingTimeout: 25000,
  socketTimeout: 25000
});

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

// Forgot Password - Send OTP
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
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes validity

    otpStore.set(email.toLowerCase(), { otp, expiresAt });

    const mailOptions = {
      from: `"Student Management Pro" <${process.env.EMAIL_USER}>`,
      to: email.toLowerCase(),
      subject: 'Password Reset OTP - Student Management System Pro',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #0ea5e9;">Password Reset Request</h2>
          <p>Hi ${user.name},</p>
          <p>Your one-time password (OTP) to reset your account password is:</p>
          <div style="font-size: 24px; font-weight: bold; letter-spacing: 4px; padding: 12px; background: #f3f4f6; display: inline-block; border-radius: 6px; margin: 10px 0;">
            ${otp}
          </div>
          <p>This code is valid for 10 minutes. If you did not request this, please ignore this email.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: 'OTP sent successfully to your email!' });
  } catch (error) {
    console.error('Nodemailer Send Error:', error);
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
    console.error('Reset Password Error:', error);
    res.status(500).json({ message: 'Error resetting password', error: error.message });
  }
});

module.exports = router;