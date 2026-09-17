import express from 'express';
import connectDB from './config/db.js';
import User from './models/User.js';
import Quiz from './models/Quiz.js';
import Settings from './models/Settings.js';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import crypto from 'crypto';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import multer from 'multer';
import mammoth from 'mammoth';
import { startTunnel } from 'untun';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
// pdf-parse is lazy-loaded inside the route handler to avoid startup DOMMatrix error
import https from 'https';
import { 
  getHardwareFingerprint, 
  generateCryptographicKey, 
  verifyCryptographicKey, 
  loadActiveLicense, 
  saveActiveLicense 
} from './security/licensing.js';

dotenv.config();

function httpsRequest(url, options = {}, postData = null) {
  return new Promise((resolve, reject) => {
    try {
      const parsedUrl = new URL(url);
      const reqOptions = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 443,
        path: parsedUrl.pathname + parsedUrl.search,
        method: options.method || (postData ? 'POST' : 'GET'),
        headers: {
          'Accept': 'application/json',
          ...(postData ? { 'Content-Type': 'application/json' } : {}),
          ...(options.headers || {})
        },
        timeout: options.timeout || 120000
      };

      const req = https.request(reqOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          let json = null;
          try { json = JSON.parse(data); } catch (e) { json = null; }
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            statusText: res.statusMessage,
            json: () => Promise.resolve(json || {}),
            text: () => Promise.resolve(data),
            data: json || data
          });
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('សំណើមានរយៈពេលយូរពេក (Request Timeout - លើសកំណត់)'));
      });

      req.on('error', (err) => {
        reject(err);
      });

      if (postData) {
        req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
      }
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Seed Super Admin in MongoDB
const seedSuperAdmin = async () => {
  try {
    const adminExists = await User.findOne({ email: 'baureykem@gmail.com' });
    if (!adminExists) {
      await User.create({
        id: 'owner_master',
        name: 'លោកគ្រូ បូរី (Platform Owner & Master Admin)',
        email: 'baureykem@gmail.com',
        password: 'admin123',
        role: 'superadmin',
        license: 'founder_unlimited',
        avatar: '👑',
        school: 'AC-Kahoot! HQ (Platform Owner)'
      });
      console.log('✅ Super Admin seeded in MongoDB!');
    }
  } catch (error) {
    console.error('Failed to seed Super Admin:', error);
  }
};
seedSuperAdmin();
connectDB();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

let publicUrl = null;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const QUIZ_FILE = path.join(__dirname, 'quizData.json');
const USERS_FILE = path.join(__dirname, 'userData.json');
const BOT_PRICING_FILE = path.join(__dirname, 'botPricing.json');
const TELEGRAM_STATES_FILE = path.join(__dirname, 'telegramUserStates.json');

function loadTelegramStates() {
  try {
    if (fs.existsSync(TELEGRAM_STATES_FILE)) {
      return JSON.parse(fs.readFileSync(TELEGRAM_STATES_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Error reading telegramUserStates.json', e);
  }
  return {};
}

function saveTelegramStates(states) {
  try {
    fs.writeFileSync(TELEGRAM_STATES_FILE, JSON.stringify(states, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving telegramUserStates.json', e);
  }
}

function loadBotPricing() {
  try {
    if (fs.existsSync(BOT_PRICING_FILE)) {
      return JSON.parse(fs.readFileSync(BOT_PRICING_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Error reading botPricing.json', e);
  }
  return {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '8884699311:AAFusHbd_PRcGrPZWH9Ntc-zFA342IEVDY4',
    botUsername: process.env.TELEGRAM_BOT_USERNAME || 'ac_mart_programer_developer_bot',
    price1Month: '$0.5',
    price1Year: '$2.5',
    priceLifetime: '$15',
    adminName: 'លោកគ្រូ បូរី (Platform Owner)',
    adminTelegram: '@KEMBOREY',
    adminPhone: '0312777761',
    adminChatId: '',
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    customNotes: 'សូមរង់ចាំបន្តិច លោកគ្រូបូរីនឹងផ្ញើសោរ License Key ជូនលោកគ្រូ/អ្នកគ្រូក្នុងពេលឆាប់ៗនេះ!'
  };
}

function saveBotPricing(data) {
  try {
    fs.writeFileSync(BOT_PRICING_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving botPricing.json', e);
  }
}

// Helper to get local network IP for QR code
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// Hardware Machine ID Generator (Device Fingerprint)
function getMachineId() {
  const networkInterfaces = os.networkInterfaces();
  let macStr = '';
  for (const key of Object.keys(networkInterfaces)) {
    for (const net of networkInterfaces[key]) {
      if (net.mac && net.mac !== '00:00:00:00:00:00') {
        macStr += net.mac;
      }
    }
  }
  const rawString = `${os.hostname()}-${os.platform()}-${os.arch()}-${macStr || 'ack-hw-default'}`;
  return crypto.createHash('sha256').update(rawString).digest('hex').substring(0, 12).toUpperCase();
}

// Load Users
function loadUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure master admin exists
        if (!parsed.some(u => u.role === 'superadmin')) {
          parsed.unshift({
            id: 'owner_master',
            name: 'លោកគ្រូ បូរី (Platform Owner & Master Admin)',
            email: 'baureykem@gmail.com',
            password: 'admin123',
            role: 'superadmin',
            license: 'founder_unlimited',
            avatar: '👑',
            school: 'AC-Kahoot! HQ (Platform Owner)',
            createdAt: '2026-01-01T00:00:00.000Z'
          });
          saveUsers(parsed);
        }
        return parsed;
      }
    }
  } catch (e) {
    console.error("Error reading users", e);
  }
  return [
    {
      id: 'owner_master',
      name: 'លោកគ្រូ បូរី (Platform Owner & Master Admin)',
      email: 'baureykem@gmail.com',
      password: 'admin123',
      role: 'superadmin',
      license: 'founder_unlimited',
      avatar: '👑',
      school: 'AC-Kahoot! HQ (Platform Owner)',
      createdAt: '2026-01-01T00:00:00.000Z'
    },
    {
      id: 'teacher_demo',
      name: 'លោកគ្រូ សុខា (Teacher Sokha)',
      email: 'teacher@ac-kahoot.edu',
      password: 'password123',
      role: 'teacher',
      license: 'pro_annual',
      avatar: '👨‍🏫',
      school: 'សាកលវិទ្យាល័យភូមិន្ទភ្នំពេញ (RUPP)',
      createdAt: '2026-02-15T08:30:00.000Z'
    }
  ];
}

// Save Users
function saveUsers(users) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (e) {
    console.error("Error saving users", e);
  }
}

// Load Quizzes
function loadQuizzes() {
  try {
    if (fs.existsSync(QUIZ_FILE)) {
      const data = fs.readFileSync(QUIZ_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("Error reading quiz data", e);
  }
  return [];
}

// Save Quizzes
function saveQuizzes(quizzes) {
  try {
    fs.writeFileSync(QUIZ_FILE, JSON.stringify(quizzes, null, 2), 'utf-8');
  } catch (e) {
    console.error("Error saving quiz data", e);
  }
}

// Auth Endpoints
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, school, avatar, licenseKey } = req.body;
  const cleanName = (name || '').trim();
  const cleanEmail = (email || '').toLowerCase().trim();
  const cleanPassword = (password || '').trim();

  if (!cleanName || !cleanEmail || !cleanPassword) {
    return res.status(400).json({ success: false, message: 'សូមបំពេញព័ត៌មានឱ្យបានគ្រប់គ្រាន់!' });
  }

  if (!/^[^s@]+@[^s@]+.[^s@]+$/.test(cleanEmail)) {
    return res.status(400).json({ success: false, message: 'ទម្រង់អ៊ីមែលមិនត្រឹមត្រូវឡើយ (ឧ. name@domain.com)!' });
  }

  const existing = await User.findOne({ email: cleanEmail });
  if (existing) {
    return res.status(400).json({ success: false, message: 'អ៊ីមែលនេះមានគណនីរួចហើយ!' });
  }

  let userLicense = 'free';
  if (licenseKey && licenseKey.trim()) {
     // TODO: Implement cloud license checking here. For now, just a placeholder.
     if (licenseKey === 'PRO-WEB') userLicense = 'pro_annual';
  }

  const newUser = new User({
    id: `teacher_${Date.now()}`,
    name: cleanName,
    email: cleanEmail,
    password: cleanPassword,
    school: (school || '').trim() || 'គ្រឹះស្ថានអប់រំកម្ពុជា',
    avatar: avatar || '👨‍🏫',
    role: 'teacher',
    license: userLicense,
    aiGenerationsCount: 0
  });

  await newUser.save();
  const safeUser = newUser.toObject();
  delete safeUser.password;
  res.json({ success: true, user: safeUser, message: '🎉 បានចុះឈ្មោះបង្កើតគណនីដោយជោគជ័យ!' });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const cleanEmail = (email || '').toLowerCase().trim();
  const cleanPassword = (password || '').trim();
  
  const user = await User.findOne({ email: cleanEmail, password: cleanPassword });

  if (!user) {
    return res.status(401).json({ success: false, message: 'អ៊ីមែល ឬលេខសម្ងាត់មិនត្រឹមត្រូវឡើយ!' });
  }

  const safeUser = user.toObject();
  delete safeUser.password;
  res.json({ success: true, user: safeUser });
});

// Change Password Endpoint (for logged-in user or master admin)
app.post('/api/auth/change-password', async (req, res) => {
  const { userId, currentPassword, newPassword } = req.body;
  if (!userId || !newPassword) {
    return res.status(400).json({ success: false, message: 'សូមបញ្ចូលលេខសម្ងាត់ថ្មី!' });
  }
  const user = await User.findOne({ id: userId });
  if (!user) {
    return res.status(404).json({ success: false, message: 'រកមិនឃើញគណនីនេះទេ!' });
  }
  if (currentPassword && user.password !== currentPassword.trim()) {
    return res.status(400).json({ success: false, message: 'លេខសម្ងាត់ចាស់មិនត្រឹមត្រូវឡើយ!' });
  }
  user.password = newPassword.trim();
  await user.save();
  res.json({ success: true, message: 'បានប្តូរលេខសម្ងាត់ថ្មីដោយជោគជ័យ!' });
});

// Update Profile & Password Endpoint (for teachers and users)
app.post('/api/auth/update-profile', async (req, res) => {
  const { userId, name, school, avatar, currentPassword, newPassword } = req.body;
  if (!userId) return res.status(400).json({ success: false, message: 'User ID is required' });
  
  const user = await User.findOne({ id: userId });
  if (!user) return res.status(404).json({ success: false, message: 'រកមិនឃើញគណនីនេះទេ!' });

  if (newPassword) {
    if (currentPassword && user.password !== currentPassword.trim()) {
      return res.status(400).json({ success: false, message: 'លេខសម្ងាត់ចាស់មិនត្រឹមត្រូវឡើយ!' });
    }
    user.password = newPassword.trim();
  }

  if (name) user.name = name;
  if (school) user.school = school;
  if (avatar) user.avatar = avatar;

  await user.save();
  const safeUser = user.toObject();
  delete safeUser.password;
  res.json({ success: true, user: safeUser, message: 'បានកែប្រែព័ត៌មាន និងលេខសម្ងាត់ដោយជោគជ័យ!' });
});

// In-memory OTP Store for Password Reset
const resetOtpMap = new Map();

async function sendOtpEmail(targetEmail, otpCode, userName) {
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
      await transporter.sendMail({
        from: `"AC-Kahoot! Security" <${process.env.SMTP_USER}>`,
        to: targetEmail,
        subject: `[AC-Kahoot!] លេខកូដសម្ងាត់ប្តូរលេខសម្ងាត់របស់អ្នក៖ ${otpCode}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 25px; border-radius: 16px; background: #1a0836; color: #ffffff;">
            <h2 style="color: #ffd700; margin-top: 0;">AC-Kahoot! វេទិកាសិក្សា</h2>
            <p>សួស្តី <strong>${userName || 'លោកគ្រូ/អ្នកគ្រូ'}</strong>,</p>
            <p>អ្នកបានស្នើសុំប្តូរលេខសម្ងាត់សម្រាប់គណនី (${targetEmail})។ នេះជាលេខកូដផ្ទៀងផ្ទាត់ ៦ ខ្ទង់របស់អ្នក៖</p>
            <div style="background: #3c1361; padding: 18px; border-radius: 12px; text-align: center; margin: 20px 0; border: 1px solid #a855f7;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #ffd700;">${otpCode}</span>
            </div>
            <p style="font-size: 12px; color: #d8b4fe;">លេខកូដនេះមានសុពលភាពរយៈពេល ១៥ នាទី។ ប្រសិនបើអ្នកមិនបានស្នើសុំទេ សូមកុំចែករំលែកលេខកូដនេះទៅកាន់អ្នកណាឡើយ។</p>
          </div>
        `
      });
      console.log(`[Email] OTP sent successfully to ${targetEmail}`);
      return true;
    } catch (err) {
      console.error("[Email] SMTP send error:", err);
    }
  }

  // Backup log for local development
  console.log(`\n======================================================`);
  console.log(`🔑 [AC-Kahoot! OTP] Password Reset for: ${targetEmail}`);
  console.log(`👉 OTP Code: ${otpCode} (Valid for 15 mins)`);
  console.log(`======================================================\n`);
  return false;
}

// Request Password Reset OTP
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: 'សូមបញ្ចូលអ៊ីមែលរបស់អ្នក!' });
  }

  const users = loadUsers();
  const user = users.find(u => u.email.toLowerCase().trim() === email.toLowerCase().trim());
  if (!user) {
    return res.status(404).json({ success: false, message: 'មិនមានគណនីដែលមានអ៊ីមែលនេះនៅក្នុងប្រព័ន្ធឡើយ!' });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  resetOtpMap.set(email.toLowerCase().trim(), {
    otp,
    expiresAt: Date.now() + 15 * 60 * 1000 // 15 mins
  });

  const sent = await sendOtpEmail(email, otp, user.name);

  res.json({
    success: true,
    message: `បានផ្ញើលេខកូដសម្ងាត់ ៦ ខ្ទង់ទៅកាន់ ${email} រួចរាល់!`,
    backupOtp: sent ? undefined : otp // for offline backup demonstration
  });
});

// Verify OTP & Set New Password
app.post('/api/auth/verify-reset-otp', (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) {
    return res.status(400).json({ success: false, message: 'សូមបំពេញព័ត៌មានឱ្យបានគ្រប់គ្រាន់!' });
  }

  const record = resetOtpMap.get(email.toLowerCase().trim());
  if (!record || record.otp !== otp.trim() || Date.now() > record.expiresAt) {
    return res.status(400).json({ success: false, message: 'លេខកូដ OTP មិនត្រឹមត្រូវ ឬបានផុតកំណត់ (១៥ នាទី)!' });
  }

  const users = loadUsers();
  const user = users.find(u => u.email.toLowerCase().trim() === email.toLowerCase().trim());
  if (!user) {
    return res.status(404).json({ success: false, message: 'រកមិនឃើញគណនីនេះទេ!' });
  }

  user.password = newPassword.trim();
  saveUsers(users);
  resetOtpMap.delete(email.toLowerCase().trim());

  res.json({
    success: true,
    message: '🎉 បានកំណត់លេខសម្ងាត់ថ្មីដោយជោគជ័យ! សូម Login ឥឡូវនេះ។'
  });
});

// Admin Reset Password for any teacher
app.post('/api/admin/users/:id/reset-password', async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;
  if (!newPassword) return res.status(400).json({ success: false, message: 'សូមបញ្ចូលលេខសម្ងាត់ថ្មី!' });
  const user = await User.findOne({ id: id });
  if (!user) return res.status(404).json({ success: false, message: 'រកមិនឃើញគណនីនេះទេ!' });
  
  user.password = newPassword.trim();
  await user.save();
  res.json({ success: true, message: បានកំណត់លេខសម្ងាត់ថ្មីសម្រាប់  រួចរាល់! });
});

// Master Admin Endpoints
app.get('/api/admin/stats', (req, res) => {
  const users = loadUsers();
  const quizzes = loadQuizzes();
  const totalQuestions = quizzes.reduce((acc, q) => acc + (q.questions?.length || 0), 0);
  const activeRooms = rooms.size;
  const proLicenses = users.filter(u => u.license && (u.license.includes('pro') || u.license.includes('founder'))).length;

  res.json({
    success: true,
    stats: {
      totalUsers: users.length,
      totalTeachers: users.filter(u => u.role !== 'superadmin').length,
      totalQuizzes: quizzes.length,
      totalQuestions,
      activeRooms,
      proLicenses,
      serverTime: new Date().toISOString(),
      platformVersion: '2.5.0 Enterprise'
    }
  });
});

app.get('/api/admin/users', async (req, res) => {
  const users = await User.find({}, '-password').lean();
  res.json({ success: true, users });
});

app.post('/api/admin/users/:id/license', async (req, res) => {
  const { id } = req.params;
  const { license } = req.body;
  const user = await User.findOne({ id: id });
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  user.license = license || 'free';
  await user.save();
  res.json({ success: true, user });
});

app.delete('/api/admin/users/:id', async (req, res) => {
  const { id } = req.params;
  const target = await User.findOne({ id: id });
  if (target && target.role === 'superadmin') {
    return res.status(403).json({ success: false, message: 'Cannot delete master admin' });
  }
  await User.deleteOne({ id: id });
  res.json({ success: true });
});

// Network info endpoint for game lobbies and QR codes
app.get('/api/network-info', (req, res) => {
  const ip = getLocalIpAddress();
  const port = process.env.PORT || 3333;
  res.json({
    success: true,
    ip,
    localIp: ip,
    port,
    localUrl: `http://${ip}:${port}`,
    joinUrl: `http://${ip}:${port}/?join=true`,
    publicUrl: publicUrl ? `${publicUrl}/?join=true` : null,
    rawPublicUrl: publicUrl || null
  });
});

// ==========================================
// 📢 BROADCAST ANNOUNCEMENT & CLOUD LIVE SYNC
// ==========================================
const ANNOUNCEMENT_FILE = path.join(__dirname, 'announcement.json');
let cachedAnnouncement = null;
let lastCloudCheckTime = 0;

function loadAnnouncement() {
  if (cachedAnnouncement) return cachedAnnouncement;
  try {
    if (fs.existsSync(ANNOUNCEMENT_FILE)) {
      cachedAnnouncement = JSON.parse(fs.readFileSync(ANNOUNCEMENT_FILE, 'utf-8'));
      return cachedAnnouncement;
    }
  } catch (e) {
    console.error("Error loading announcement", e);
  }
  return {
    enabled: true,
    showForFreeOnly: true,
    textKm: "⚡ បង្កើនប្រសិទ្ធភាពបង្រៀនពេញមួយឆ្នាំជាមួយ AC-Kahoot! Pro – បង្កើតវិញ្ញាសា & សិស្សចូលលេងមិនកំណត់។ តម្លៃត្រឹមតែ $ ១/ឆ្នាំ (ផុតកំណត់ថ្ងៃ ៣១ កញ្ញា) !!!",
    textEn: "⚡ Improve student outcomes this school year with AC-Kahoot! Pro. Unlimited quizzes & players. Special offer $1/year (Ends Sept 31) !!!",
    buttonTextKm: "ទិញឥឡូវនេះ (Buy now)",
    buttonTextEn: "Buy now",
    buttonLink: "https://t.me/KEMBOREY",
    updatedAt: new Date().toISOString()
  };
}

function saveAnnouncement(data) {
  try {
    cachedAnnouncement = data;
    fs.writeFileSync(ANNOUNCEMENT_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error("Error saving announcement", e);
  }
}

async function fetchCloudAnnouncement() {
  const localData = loadAnnouncement();
  const now = Date.now();

  // Check cloud once every 60 seconds when online
  if (now - lastCloudCheckTime < 60000 && cachedAnnouncement) {
    return cachedAnnouncement;
  }
  lastCloudCheckTime = now;

  const cloudUrl = process.env.CLOUD_ANNOUNCEMENT_URL || 'https://raw.githubusercontent.com/BoreyKem/ac-kahoot-updates/main/announcement.json';
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500); // 2.5s safe timeout

    const response = await fetch(cloudUrl, { 
      signal: controller.signal,
      headers: { 'Cache-Control': 'no-cache' }
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const cloudData = await response.json();
      if (cloudData && typeof cloudData === 'object' && cloudData.textKm) {
        cachedAnnouncement = cloudData;
        saveAnnouncement(cloudData);
        return cloudData;
      }
    }
  } catch (err) {
    // Silently fallback to local cached announcement when offline
  }

  return localData;
}

// Public: Get current announcement (with Cloud Live Sync)
app.get('/api/announcement', async (req, res) => {
  const data = await fetchCloudAnnouncement();
  res.json({ success: true, announcement: data });
});

// Super Admin: Update announcement & pricing broadcast
app.post('/api/admin/announcement', (req, res) => {
  const { enabled, showForFreeOnly, textKm, textEn, buttonTextKm, buttonTextEn, buttonLink, adminId } = req.body;
  const users = loadUsers();
  
  if (adminId) {
    const admin = users.find(u => u.id === adminId);
    if (!admin || admin.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'សិទ្ធិអនុញ្ញាតសម្រាប់តែ Master Admin ប៉ុណ្ណោះ!' });
    }
  }

  const current = loadAnnouncement();
  const updated = {
    ...current,
    enabled: enabled !== undefined ? enabled : current.enabled,
    showForFreeOnly: showForFreeOnly !== undefined ? showForFreeOnly : current.showForFreeOnly,
    textKm: textKm || current.textKm,
    textEn: textEn || current.textEn,
    buttonTextKm: buttonTextKm || current.buttonTextKm,
    buttonTextEn: buttonTextEn || current.buttonTextEn,
    buttonLink: buttonLink || current.buttonLink,
    updatedAt: new Date().toISOString()
  };

  saveAnnouncement(updated);
  
  // Real-time broadcast to all connected clients
  try {
    io.emit('server:announcement-updated', { announcement: updated });
  } catch {}

  res.json({ success: true, message: 'បានកែប្រែ និងផ្សាយសារជូនដំណឹងថ្មីដោយជោគជ័យ!', announcement: updated });
});

// ==========================================
// 🔑 LICENSE ACTIVATION KEY SYSTEM
// ==========================================
const LICENSE_FILE = path.join(__dirname, 'licenseKeys.json');

function loadLicenses() {
  try {
    if (fs.existsSync(LICENSE_FILE)) {
      return JSON.parse(fs.readFileSync(LICENSE_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error("Error loading licenses", e);
  }
  return [];
}

function saveLicenses(licenses) {
  try {
    fs.writeFileSync(LICENSE_FILE, JSON.stringify(licenses, null, 2), 'utf-8');
  } catch (e) {
    console.error("Error saving licenses", e);
  }
}

function generateKeyString(prefix = 'PRO') {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const segment = () => Array.from({ length: 4 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
  return `ACK-${prefix.toUpperCase()}-${segment()}-${segment()}-${segment()}`;
}

// ==========================================
// 🔑 HARDWARE ID & OFFLINE CRYPTOGRAPHIC LICENSING
// ==========================================

// Get Current Machine HWID & Active License Status
app.get('/api/license/machine-info', (req, res) => {
  const hwid = getHardwareFingerprint();
  const activeLicense = loadActiveLicense();
  res.json({
    success: true,
    hwid,
    activeLicense,
    hostname: os.hostname(),
    platform: os.platform()
  });
});

// Activate Machine via Cryptographic License Key (Offline HWID)
app.post('/api/license/activate-hwid', (req, res) => {
  const { licenseKey, clientName, email } = req.body;
  if (!licenseKey) {
    return res.status(400).json({ success: false, message: 'សូមបញ្ចូល License Key ឱ្យបានត្រឹមត្រូវ!' });
  }

  const result = saveActiveLicense(licenseKey, clientName || email || 'អតិថិជនកិត្តិយស');
  if (!result.success) {
    return res.status(400).json(result);
  }

  // Also upgrade user if email is provided
  if (email) {
    const users = loadUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
    if (user) {
      user.license = result.license.plan;
      user.boundDeviceId = result.license.hwid;
      user.boundDeviceName = `${os.hostname()} (${os.platform()})`;
      saveUsers(users);
    }
  }

  res.json(result);
});

// Deactivate / Remove License from Current Machine (For testing)
app.post('/api/license/deactivate-hwid', (req, res) => {
  try {
    const paths = [
      path.join(__dirname, '../license.active.json'),
      path.join(process.cwd(), 'license.active.json'),
      path.join(process.env.LOCALAPPDATA || '', 'license.active.json'),
      path.join(process.env.LOCALAPPDATA || '', 'AC-Kahoot', 'license.active.json')
    ];
    let removed = false;
    for (const p of paths) {
      if (fs.existsSync(p)) {
        try { fs.unlinkSync(p); removed = true; } catch {}
      }
    }
    res.json({ success: true, message: '✅ បានដក License ចេញពីម៉ាស៊ីននេះដោយជោគជ័យ (ត្រឡប់ទៅជា Free Edition វិញ)!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin: Get all license keys & active license
app.get('/api/admin/licenses', (req, res) => {
  const licenses = loadLicenses();
  const machineLicense = loadActiveLicense();
  res.json({ licenses, machineLicense, currentEmail: getHardwareFingerprint() });
});

// Admin: Generate new cryptographic or standard license keys
app.post('/api/admin/licenses/generate', (req, res) => {
  const { type = 'pro_lifetime', clientNote = '', count = 1, targetHwid = '' } = req.body;
  const licenses = loadLicenses();
  const createdKeys = [];

  const typeLabels = {
    pro_lifetime: 'Pro Lifetime (ប្រើមួយជីវិត)',
    pro_annual: 'Pro Annual (ប្រចាំឆ្នាំ)',
    pro_monthly: 'Pro Monthly (ប្រចាំខែ)',
    vip_unlimited: 'VIP School (សាលារៀន/ស្ថាប័ន)'
  };

  const planMap = {
    pro_lifetime: 'PRO_LIFETIME',
    pro_annual: 'PRO_ANNUAL',
    pro_monthly: 'PRO_MONTHLY',
    vip_unlimited: 'VIP_SCHOOL'
  };

  const daysMap = {
    pro_lifetime: 0,
    pro_annual: 365,
    pro_monthly: 30,
    vip_unlimited: 0
  };

  const effectiveHwid = (targetHwid || '').trim() || getHardwareFingerprint();

  for (let i = 0; i < Math.min(count, 50); i++) {
    const keyStr = generateCryptographicKey(effectiveHwid, planMap[type] || 'PRO_LIFETIME', daysMap[type] || 0);
    const newKey = {
      id: `lic_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      key: keyStr,
      targetHwid: effectiveHwid,
      type,
      typeName: typeLabels[type] || 'Pro License',
      clientNote: clientNote || 'Cryptographic License',
      used: false,
      usedBy: null,
      usedAt: null,
      createdAt: new Date().toISOString()
    };
    licenses.unshift(newKey);
    createdKeys.push(newKey);
  }

  saveLicenses(licenses);
  res.json({ success: true, keys: createdKeys });
});

// Admin: Delete/Revoke license key
app.delete('/api/admin/licenses/:id', (req, res) => {
  const { id } = req.params;
  let licenses = loadLicenses();
  licenses = licenses.filter(l => l.id !== id && l.key !== id);
  saveLicenses(licenses);
  res.json({ success: true });
});

// Teacher: Activate License Key
app.post('/api/license/activate', async (req, res) => {
  const { email, licenseKey } = req.body;
  if (!email || !licenseKey) {
    return res.status(400).json({ success: false, message: 'សូមបញ្ចូលអ៊ីមែល និង License Key ឱ្យបានត្រឹមត្រូវ!' });
  }

  const cleanKey = licenseKey.trim().toUpperCase();
  const cleanEmail = email.trim().toLowerCase();

  try {
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(404).json({ success: false, message: 'រកមិនឃើញគណនីរបស់អ្នកឡើយ!' });
    }

    // First verify against cryptographic signature
    const cryptoVerify = verifyCryptographicKey(cleanKey, getHardwareFingerprint());
    if (cryptoVerify.valid) {
      user.license = cryptoVerify.planType;
      await user.save();
      const userObj = user.toObject();
      delete userObj.password;
      return res.json({
        success: true,
        message: '🎉 អបអរសាទរ! គណនីរបស់អ្នកត្រូវបាន Upgrade ដោយជោគជ័យ!',
        user: userObj
      });
    }

    // Fallback to static licenseKeys.json
    const licenses = loadLicenses();
    const foundKey = licenses.find(l => l.key.toUpperCase() === cleanKey);

    if (!foundKey) {
      return res.status(400).json({ success: false, message: 'លេខកូដ License Key នេះមិនត្រឹមត្រូវឡើយ!' });
    }

    if (foundKey.used) {
      return res.status(400).json({ success: false, message: 'លេខកូដ License នេះត្រូវបានបើកប្រើប្រាស់រួចហើយ!' });
    }

    user.license = foundKey.type;
    await user.save();

    foundKey.used = true;
    foundKey.usedBy = cleanEmail;
    foundKey.usedAt = new Date().toISOString();
    saveLicenses(licenses);

    const userObj = user.toObject();
    delete userObj.password;
    res.json({
      success: true,
      message: '🎉 អបអរសាទរ! គណនីរបស់អ្នកត្រូវបាន Upgrade ដោយជោគជ័យ!',
      user: userObj
    });
  } catch (error) {
    console.error('License Activation Error:', error);
    res.status(500).json({ success: false, message: 'មានបញ្ហាក្នុងការភ្ជាប់ទៅ Database!' });
  }
});

// Admin: Reset / Unlock teacher's Device Binding (Transfer PC)
app.post('/api/admin/users/:id/reset-device', async (req, res) => {
  const { id } = req.params;
  const user = await User.findOne({ id: id });
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  
  user.boundDeviceId = null;
  user.boundDeviceName = null;
  await user.save();
  res.json({ success: true, message: បានដោះសោ Device ID សម្រាប់  ដោយជោគជ័យ! });
});

// REST API Endpoints
app.get('/api/quizzes', (req, res) => {
  res.json(loadQuizzes());
});

app.post('/api/quizzes', (req, res) => {
  const newQuiz = req.body;
  const quizzes = loadQuizzes();
  const existingIdx = quizzes.findIndex(q => q.id === newQuiz.id);

  // Free Tier Quiz Limit: Max 10 Quizzes
  if (existingIdx === -1 && newQuiz.authorEmail && newQuiz.authorEmail !== 'official') {
    const users = loadUsers();
    const user = users.find(u => u.email.toLowerCase() === newQuiz.authorEmail.toLowerCase());
    const machineLicense = loadActiveLicense();
    const isPro = (machineLicense && machineLicense.valid) || (user && user.license && user.license !== 'free');
    if (!isPro) {
      const userQuizzes = quizzes.filter(q => q.authorEmail?.toLowerCase() === user?.email?.toLowerCase());
      if (userQuizzes.length >= 10) {
        return res.status(403).json({ 
          success: false, 
          message: 'គណនី Free Trial អាចបង្កើតវិញ្ញាសាផ្ទាល់ខ្លួនបានត្រឹម ១០ វិញ្ញាសាប៉ុណ្ណោះ។ សូម Upgrade ទៅកាន់ Pro ដើម្បីបង្កើតវិញ្ញាសាមិនកំណត់!' 
        });
      }
    }
  }

  if (existingIdx >= 0) {
    quizzes[existingIdx] = newQuiz;
  } else {
    quizzes.unshift(newQuiz);
  }
  saveQuizzes(quizzes);
  res.json({ success: true, quiz: newQuiz });
});

app.delete('/api/quizzes/:id', (req, res) => {
  const { id } = req.params;
  let quizzes = loadQuizzes();
  quizzes = quizzes.filter(q => q.id !== id);
  saveQuizzes(quizzes);
  res.json({ success: true });
});

app.get('/api/device-info', (req, res) => {
  res.json({
    success: true,
    deviceId: getMachineId(),
    hostname: os.hostname(),
    platform: os.platform()
  });
});

// Helper to shuffle options and track correct answer index randomly
function shuffleQuestionOptions(q) {
  if (!q) return q;
  const qType = q.type || ((q.options || []).length === 2 ? 'true_false' : 'multiple_choice');

  // If multiple_choice, clean labels and shuffle options while tracking correctIndex
  if (qType === 'multiple_choice' && Array.isArray(q.options) && q.options.length > 1) {
    const rawOptions = (q.options || []).map(opt => 
      opt.replace(/\s*\((?:ចម្លើយ)?ត្រឹមត្រូវ\)/gi, '')
         .replace(/\s*\(correct(?:\s*answer)?\)/gi, '')
         .trim()
    );
    const correctText = rawOptions[q.correctIndex || 0];

    // Fisher-Yates shuffle
    const shuffled = [...rawOptions];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const newCorrectIndex = shuffled.indexOf(correctText);
    return {
      ...q,
      options: shuffled,
      correctIndex: newCorrectIndex >= 0 ? newCorrectIndex : 0,
      points: q.points ?? 10
    };
  }

  // If matching, shuffle the pairs order
  if (qType === 'matching' && Array.isArray(q.pairs) && q.pairs.length > 1) {
    const shuffledPairs = [...q.pairs];
    for (let i = shuffledPairs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledPairs[i], shuffledPairs[j]] = [shuffledPairs[j], shuffledPairs[i]];
    }
    return {
      ...q,
      pairs: shuffledPairs,
      points: q.points ?? 10
    };
  }

  return {
    ...q,
    points: q.points ?? 10
  };
}

// ================================================================
// FILE UPLOAD: Lesson material extraction for AI quiz generation
// ================================================================
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB max
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif'
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('ប្រភេទឯកសារមិនត្រូវបានអនុញ្ញាត។ សូម Upload PDF, DOCX, TXT ឬរូបភាព'));
    }
  }
});

// Extract text from uploaded lesson file
app.post('/api/extract-lesson', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'គ្មានឯកសារ' });

  const { mimetype, buffer, originalname } = req.file;
  const apiKey = req.body.apiKey || process.env.GEMINI_API_KEY;

  try {
    let extractedText = '';

    // --- PDF ---
    if (mimetype === 'application/pdf') {
      // Lazy-load pdf-parse with DOMMatrix polyfill (required by pdf.js internals in Node)
      if (typeof globalThis.DOMMatrix === 'undefined') {
        globalThis.DOMMatrix = class DOMMatrix {
          constructor(init) { this.a=1;this.b=0;this.c=0;this.d=1;this.e=0;this.f=0; }
          static fromMatrix(m) { return new DOMMatrix(); }
        };
      }
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(buffer);
      extractedText = data.text.trim();
      if (!extractedText) throw new Error('PDF is empty or image-only — falling through to vision');
    }

    // --- DOCX ---
    else if (
      mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimetype === 'application/msword'
    ) {
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value.trim();
    }

    // --- Plain Text ---
    else if (mimetype === 'text/plain') {
      extractedText = buffer.toString('utf-8').trim();
    }

    // --- Image (use Gemini Vision) ---
    else if (mimetype.startsWith('image/')) {
      if (!apiKey) return res.status(400).json({ success: false, message: 'ត្រូវការ Gemini API Key ដើម្បីអានរូបភាព' });

      const base64 = buffer.toString('base64');
      const visionRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: 'សូមចម្លងអត្ថបទទាំងអស់ដែលមាននៅក្នុងរូបភាពនេះ (OCR) ។ ប្រសិនបើមានតារាង ឬបញ្ជី សូមរក្សាទំរង់ដដែល។ ឆ្លើយតែជាអត្ថបទ ដោយមិនបន្ថែមការពន្យល់ណាមួយ។' },
              { inlineData: { mimeType: mimetype, data: base64 } }
            ]
          }],
          generationConfig: { temperature: 0 }
        })
      });
      const visionData = await visionRes.json();
      extractedText = visionData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    }

    // --- Image-only PDF fallback: send as base64 to Gemini Vision ---
    if (!extractedText && mimetype === 'application/pdf' && apiKey) {
      const base64 = buffer.toString('base64');
      const visionRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: 'សូមចម្លងអត្ថបទទាំងអស់ក្នុង PDF Document នេះ (ទំព័រទាំងអស់)។ ប្រសិនបើជា Slide/Presentation សូម Summarize ខ្លឹមសារសំខាន់ក្នុងរូបភាពនីមួយៗ ។ ឆ្លើយតែជាអត្ថបទ។' },
              { inlineData: { mimeType: 'application/pdf', data: base64 } }
            ]
          }],
          generationConfig: { temperature: 0 }
        })
      });
      const visionData = await visionRes.json();
      extractedText = visionData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    }

    if (!extractedText) {
      return res.status(422).json({ success: false, message: 'មិនអាចអានអត្ថបទពីឯកសារនេះបានទេ។ សូមប្រើ PDF ដែលមានអត្ថបទ ឬ DOCX/TXT។' });
    }

    // Truncate to ~8000 chars to stay within Gemini context
    const truncated = extractedText.length > 8000
      ? extractedText.slice(0, 8000) + '\n[...ខ្លឹមសារត្រូវបានកាត់ទុក]'
      : extractedText;

    return res.json({
      success: true,
      text: truncated,
      filename: originalname,
      chars: truncated.length
    });

  } catch (err) {
    console.error('[extract-lesson]', err.message);
    return res.status(500).json({ success: false, message: err.message || 'ការអានឯកសារបរាជ័យ' });
  }
});

const DEFAULT_TRIAL_GEMINI_KEY = process.env.GEMINI_API_KEY || 'AQ.Ab8RN6Lapc8gm7nNM1D5iHQpo-pMzaISkefOBEFjbRR7_p6KMQ';

// Gemini AI Quiz Generator API
app.post('/api/generate-quiz', async (req, res) => {
  const { topic, lessonText, level = 'university', count = 5, apiKey, modelTier = 'pro', testType = 'post-test', userEmail } = req.body;

  const users = loadUsers();
  const user = userEmail ? users.find(u => u.email.toLowerCase() === userEmail.toLowerCase().trim()) : null;
  const machineLicense = loadActiveLicense();
  const isPro = (machineLicense && machineLicense.valid) || (user && user.license && user.license !== 'free');

  let activeApiKey = (apiKey || '').trim();
  let isTrialUsage = false;
  let remainingTrialCount = 10;

  const defaultSystemKey = currentBotPricing.geminiApiKey || process.env.GEMINI_API_KEY || DEFAULT_TRIAL_GEMINI_KEY;

  if (!activeApiKey) {
    if (isPro) {
      activeApiKey = defaultSystemKey;
    } else {
      // Free / Trial Account: Check 10 AI generation limit
      const currentUsage = user ? (user.aiGenerationsCount || 0) : 0;
      if (currentUsage >= 10) {
        return res.status(403).json({
          success: false,
          quotaExceeded: true,
          message: '🎉 លោកគ្រូ/អ្នកគ្រូ បានសាកល្បងបង្កើតកម្រងសំណួរ AI ឥតគិតថ្លៃគ្រប់ ១០ លើកហើយ! ដើម្បីបន្តប្រើប្រាស់ សូម Upgrade ទៅកាន់គម្រោង Pro ឬបញ្ចូល Gemini API Key ផ្ទាល់ខ្លួនរបស់អ្នក។'
        });
      }
      activeApiKey = defaultSystemKey;
      isTrialUsage = true;
      remainingTrialCount = Math.max(0, 10 - (currentUsage + 1));
    }
  }

  // Determine context source: uploaded file text or typed topic
  const contextSource = lessonText ? 'file' : 'topic';
  const contextLabel = lessonText
    ? `ខ្លឹមសារមេរៀនដូចខាងក្រោម:\n\n${lessonText}`
    : `ប្រធានបទ: "${topic}"`;
  const topicForTitle = topic || 'Lesson File';

  // Level contextual hints in Khmer & English
  const levelDescriptions = {
    primary: "បឋមសិក្សា (Primary School - សំណួរបែបកុមារ សាមញ្ញ ប្រើពាក្យងាយ ភាសាទន់ភ្លន់)",
    secondary: "មធ្យមសិក្សា / អនុវិទ្យាល័យ (Secondary School - សំណួរពង្រឹងចំណេះដឹងទូទៅ វិទ្យាសាស្ត្រ មេរៀនគ្រឹះ)",
    highschool: "វិទ្យាល័យ (High School - ស្របតាមកម្មវិធីប្រឡងបាក់ឌុប MoEYS, គណិត រូប គីមី ជីវៈ អក្សរសាស្ត្រខ្មែរ)",
    university: "សាកលវិទ្យាល័យ / ឧត្តមសិក្សា (Higher Education - សំណួរវិភាគស៊ីជម្រៅ Case Study, ចិត្តវិទ្យា, គរុកោសល្យ, វិទ្យាសាស្ត្រ)"
  };

  const selectedLevelDesc = levelDescriptions[level] || levelDescriptions.university;

  // If Gemini API Key is provided, call Google Gemini REST API with Bloom's Taxonomy 2-6-2 Scale
  if (activeApiKey) {
    const isProTier = modelTier === 'pro';
    const candidateModels = [
      'gemini-3.1-flash-lite',
      'gemini-3.5-flash-lite',
      'gemini-3.5-flash',
      'gemini-3.6-flash',
      'gemini-flash-latest',
      'gemini-flash-lite-latest'
    ];

    const isPreTest = testType === 'pre-test';
    const bloomScaleLabel = isPreTest ? '(Pre-Test Scale 6-3-1)' : '(Post-Test Scale 2-6-2)';
    
    // Auto-adjust points based on Gamification Needs
    const defaultPoints = (level === 'primary' || level === 'secondary') ? 1000 : 10;

    const bloomInstructions = isPreTest
      ? `១. សមាមាត្រកម្រិតលំបាក (Difficulty Scale 6-3-1 សម្រាប់ Pre-Test)៖
   - ៦០% កម្រិតងាយ (Remember & Understand)៖ ចងចាំនិយមន័យ មូលដ្ឋានគ្រឹះ គោលគំនិតស្នូល។
   - ៣០% កម្រិតមធ្យម (Apply & Analyze)៖ ការអនុវត្តចំណេះដឹង លំហាត់សាមញ្ញ។
   - ១០% កម្រិតស៊ីជម្រៅ (Evaluate & Create)៖ ការត្រិះរិះពិចារណា (Critical Thinking)។`
      : `១. សមាមាត្រកម្រិតលំបាក (Difficulty Scale 2-6-2 សម្រាប់ Post-Test)៖
   - ២០% កម្រិតងាយ (Remember & Understand)៖ ចងចាំនិយមន័យ មូលដ្ឋានគ្រឹះ គោលគំនិតស្នូល។
   - ៦០% កម្រិតមធ្យម (Apply & Analyze)៖ សំណួរ Case Study, ការអនុវត្តលើស្ថានភាពជាក់ស្តែង, ការវិភាគប្រៀបធៀប។
   - ២០% កម្រិតស៊ីជម្រៅ (Evaluate & Create)៖ ការវាយតម្លៃ, ត្រិះរិះពិចារណា (Critical Thinking), ការដោះស្រាយបញ្ហាស្មុគស្មាញ។`;

    const promptText = `អ្នកគឺជាសាស្ត្រាចារ្យ និងអ្នកជំនាញកម្រិតកំពូលខាងគរុកោសល្យ និងការវាស់ស្ទង់ការអប់រំ។
សូមបង្កើតកម្រងសំណួរអន្តរកម្មស្ទីល Kahoot ចំនួន ${count} សំណួរ ជាភាសាខ្មែរត្រឹមត្រូវក្បោះក្បាយ ១០០% ដោយផ្អែកលើ${contextLabel}
សម្រាប់កម្រិត៖ "${selectedLevelDesc}"
${lessonText ? '⚠️ សំណួរ ចម្លើយ និងការពន្យល់ ត្រូវបង្កើតទៅតាមខ្លឹមសារឯកសារដែលបានផ្ទុកឡើងទាំងស្រុង មិនត្រូវប្រើចំណេះដឹងខាងក្រៅ ឬ Hallucinate ឡើយ។' : ''}

🧠 វិធានគរុកោសល្យ និងកម្រិតលំបាកតាមទ្រឹស្តី BLOOM'S TAXONOMY ${bloomScaleLabel}៖
${bloomInstructions}
២. ខ្លឹមសារសំណួរ និងជម្រើស៖
   - សរសេរខ្លឹមសារសំណួរផ្ទាល់តែម្តង (ហាមដាក់ [សំណួរទី ១] ឬស្លាកវង់ក្រចក [ ] ឡើយ)។
   - ដាច់ខាតកុំដាក់ពាក្យសម្គាល់ដូចជា "(ចម្លើយត្រឹមត្រូវ)", "(ត្រឹមត្រូវ)" ក្នុងជម្រើសចម្លើយ។
   - ជម្រើសខុសទាំង ៣ ត្រូវតែជាជម្រើសសមហេតុផល (Plausible Distractors) មិនមែនជាជម្រើសកំប្លែង ឬងាយទាយឡើយ។
   - ការពន្យល់ (explanation) ត្រូវតែជាការពន្យល់បែបវិទ្យាសាស្ត្រ និងហេតុផលពិតប្រាកដនៃខ្លឹមសារមេរៀន (ហាមប្រើពាក្យ Template ដូចជា "ក្នុងកម្រិតឧត្តមសិក្សា...")។

តម្រូវការទម្រង់ឆ្លើយតប (JSON តែមួយគត់ គ្មាន markdown syntax ក្រៅពី JSON Array):
[
  {
    "id": "q1",
    "question": "ខ្លឹមសារសំណួរជាភាសាខ្មែរ",
    "timeLimit": 20,
    "points": ${defaultPoints},
    "options": [
      "ជម្រើសទី ១",
      "ជម្រើសទី ២",
      "ជម្រើសទី ៣",
      "ជម្រើសទី ៤"
    ],
    "correctIndex": 0,
    "explanation": "ការពន្យល់បែបវិទ្យាសាស្ត្រ និងគរុកោសល្យច្បាស់លាស់អំពីមូលហេតុដែលចម្លើយនេះត្រឹមត្រូវ"
  }
]`;

    let lastErrorMessage = '';
    // Generous thinking & busy-line timeout for Pro tier (up to 180 seconds / 3 minutes)
    const dynamicTimeout = isProTier
      ? Math.min(180000, Math.max(90000, count * 5000))
      : Math.min(60000, Math.max(30000, count * 3000));

    for (const modelName of candidateModels) {
      let attempts = 0;
      const maxAttempts = 2; // Allow retry if Google lines are busy (503/429)

      while (attempts < maxAttempts) {
        attempts++;
        try {
          const response = await httpsRequest(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(activeApiKey)}`, {
            method: 'POST',
            timeout: dynamicTimeout
          }, {
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: {
              temperature: isProTier ? 0.6 : 0.7,
              topK: 40,
              topP: 0.95,
              responseMimeType: "application/json"
            }
          });

          if (response.ok) {
            const data = response.data;
            if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
              let rawText = data.candidates[0].content.parts[0].text.trim();
              rawText = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');
              const parsedQuestions = JSON.parse(rawText);
              const randomizedQuestions = parsedQuestions.map(q => shuffleQuestionOptions(q));
              
              if (isTrialUsage && user) {
                user.aiGenerationsCount = (user.aiGenerationsCount || 0) + 1;
                saveUsers(users);
              }

              return res.json({
                success: true,
                questions: randomizedQuestions,
                source: `Gemini AI (${modelName})`,
                aiGenerationsCount: user ? user.aiGenerationsCount : undefined,
                remainingTrialCount: isTrialUsage ? remainingTrialCount : undefined
              });
            }
          } else {
            const errorData = await response.json().catch(() => null);
            lastErrorMessage = errorData?.error?.message || `HTTP ${response.status} ${response.statusText}`;
            console.warn(`Attempt ${attempts} with ${modelName} returned HTTP ${response.status}:`, lastErrorMessage);
            
            // If server is busy (503 / 429), wait 2.5s and retry once
            if ((response.status === 503 || response.status === 429) && attempts < maxAttempts) {
              console.log(`[Gemini Busy Line] Waiting 2.5s before retrying ${modelName}...`);
              await new Promise(r => setTimeout(r, 2500));
              continue;
            }
            break; // Move to next model if not a recoverable busy status
          }
        } catch (err) {
          lastErrorMessage = err.message;
          console.warn(`Attempt ${attempts} with ${modelName} error:`, err.message);
          break;
        }
      }
    }

    // If API key was provided or configured, DO NOT silently fall back to mock templates!
    return res.status(502).json({
      success: false,
      message: `❌ មិនអាចភ្ជាប់ទៅកាន់ Google Gemini AI បានទេ! (${lastErrorMessage || 'Service unavailable'})។ សូមពិនិត្យមើល API Key ឬការតភ្ជាប់អ៊ីនធឺណិត។`
    });
  }

  // If no API Key at all and context is file
  if (contextSource === 'file') {
    return res.status(400).json({
      success: false,
      message: "សូមបញ្ចូល Gemini API Key ដើម្បីអាន និងបង្កើតសំណួរពីឯកសារមេរៀន!"
    });
  }

  return res.status(400).json({
    success: false,
    message: "សូមបញ្ចូល Gemini API Key ដើម្បីដំណើរការបង្កើតសំណួរ AI!"
  });
});

// Endpoint to Test & Validate a Gemini API Key instantly
app.post('/api/validate-gemini-key', async (req, res) => {
  const apiKey = (req.body.apiKey || '').trim();
  if (!apiKey) return res.status(400).json({ success: false, message: 'សូមបញ្ចូល API Key ជាមុនសិន!' });

  try {
    // 1. Direct validation via official models endpoint
    const response = await httpsRequest(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`, {
      method: 'GET',
      timeout: 15000
    });

    if (response.ok && response.data?.models) {
      const modelsCount = Array.isArray(response.data.models) ? response.data.models.length : 0;
      return res.json({ 
        success: true, 
        message: `✅ API Key ត្រឹមត្រូវ និងដំណើរការល្អ ១០០%! (ភ្ជាប់ Google AI Studio បានដោយជោគជ័យ - គាំទ្រ ${modelsCount} ម៉ូឌែល)` 
      });
    } else {
      const errMessage = response.data?.error?.message || response.statusText || 'API Key មិនត្រឹមត្រូវ';
      return res.status(400).json({
        success: false,
        message: `❌ Google API បដិសេធ៖ ${errMessage}`
      });
    }
  } catch (e) {
    // Fallback attempt via generateContent
    try {
      const candidateModels = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-3.5-flash-lite'];
      for (const m of candidateModels) {
        try {
          const genRes = await httpsRequest(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${encodeURIComponent(apiKey)}`, {
            method: 'POST',
            timeout: 10000
          }, { contents: [{ parts: [{ text: 'OK' }] }] });

          if (genRes.ok) {
            return res.json({ success: true, message: `✅ API Key ត្រឹមត្រូវ និងដំណើរការល្អ! (${m})` });
          }
        } catch (innerErr) {}
      }
    } catch (fallbackErr) {}

    return res.status(500).json({ 
      success: false, 
      message: `❌ បរាជ័យក្នុងការតភ្ជាប់៖ ${e.message || 'សូមពិនិត្យមើលប្រព័ន្ធអ៊ីនធឺណិត'}` 
    });
  }
});

// ==========================================
// REAL-TIME SOCKET.IO GAME STATE ENGINE
// ==========================================

// Active Rooms State
// pin -> { hostSocketId, quiz, level, currentQIndex, state: 'LOBBY'|'QUESTION'|'RESULT'|'LEADERBOARD'|'PODIUM', players: { [socketId]: { id, nickname, avatar, score, streak, answers: {} } } }
const rooms = new Map();

function generatePin() {
  let pin;
  do {
    pin = Math.floor(100000 + Math.random() * 900000).toString();
  } while (rooms.has(pin));
  return pin;
}

io.on('connection', (socket) => {
  // HOST: Create Game Room
  socket.on('host:create-room', ({ quiz, level, hostLicense }) => {
    const pin = generatePin();
    rooms.set(pin, {
      pin,
      hostSocketId: socket.id,
      hostLicense: hostLicense || 'free',
      quiz,
      level: level || quiz.level || 'university',
      currentQIndex: -1,
      state: 'LOBBY',
      questionStartTime: null,
      players: new Map(),
      answersCount: [0, 0, 0, 0]
    });

    socket.join(`room:${pin}`);
    socket.emit('host:room-created', {
      pin,
      level: level || quiz.level || 'university',
      quizTitle: quiz.title,
      totalQuestions: quiz.questions.length,
      joinUrl: `http://${getLocalIpAddress()}:${process.env.PORT || 3333}/?pin=${pin}`,
      publicJoinUrl: publicUrl ? `${publicUrl}/?pin=${pin}` : null
    });
    console.log(`[Host] Room created: ${pin} (${quiz.title})`);
  });

  // PLAYER: Join Room
  socket.on('player:join', ({ pin, nickname, avatar }) => {
    const cleanPin = (pin || '').trim();
    const room = rooms.get(cleanPin);

    if (!room) {
      return socket.emit('player:error', { message: 'រកមិនឃើញលេខកូដ Game PIN នេះទេ! សូមពិនិត្យម្តងទៀត។' });
    }

    if (room.state !== 'LOBBY') {
      return socket.emit('player:error', { message: 'ការប្រកួតបានចាប់ផ្តើមរួចហើយ មិនអាចចូលបានទេ!' });
    }

    // Free Tier Room Capacity: Max 5 Players
    if (room.hostLicense === 'free' && room.players.size >= 5) {
      return socket.emit('player:error', { 
        message: 'បន្ទប់នេះបានពេញហើយ (គណនី Free កំណត់ត្រឹម ៥ នាក់)។ សូមទាក់ទងលោកគ្រូដើម្បី Upgrade ទៅកាន់ Pro!' 
      });
    }

    // Check duplicate nickname
    for (const [, p] of room.players) {
      if (p.nickname.toLowerCase() === nickname.trim().toLowerCase()) {
        return socket.emit('player:error', { message: 'ឈ្មោះនេះមានអ្នកប្រើរួចហើយ សូមប្តូរឈ្មោះផ្សេង!' });
      }
    }

    const player = {
      socketId: socket.id,
      nickname: nickname.trim(),
      avatar: avatar || '🐱',
      score: 0,
      streak: 0,
      lastAnswerCorrect: false,
      lastPointsEarned: 0,
      answeredCurrent: false
    };

    room.players.set(socket.id, player);
    socket.join(`room:${cleanPin}`);
    socket.data.pin = cleanPin;

    socket.emit('player:joined', {
      pin: cleanPin,
      nickname: player.nickname,
      avatar: player.avatar,
      quizTitle: room.quiz.title,
      level: room.level
    });

    // Notify Host with updated player list (directly to host to save bandwidth)
    const playerList = Array.from(room.players.values()).map(p => ({
      socketId: p.socketId,
      nickname: p.nickname,
      avatar: p.avatar,
      score: p.score
    }));

    io.to(room.hostSocketId).emit('room:players-updated', {
      playersCount: room.players.size,
      players: playerList
    });
  });

  // HOST: Kick Inappropriate Player
  socket.on('host:kick-player', ({ pin, socketId }) => {
    const cleanPin = (pin || '').toString().trim();
    let room = rooms.get(cleanPin);
    if (!room) {
      for (const [, r] of rooms) {
        if (r.hostSocketId === socket.id) { room = r; break; }
      }
    }
    if (room && room.hostSocketId === socket.id && room.players.has(socketId)) {
      const kicked = room.players.get(socketId);
      room.players.delete(socketId);
      io.to(socketId).emit('player:kicked', { message: 'អ្នកត្រូវបាន host ដកចេញពីបន្ទប់។' });

      const playerList = Array.from(room.players.values()).map(p => ({
        socketId: p.socketId,
        nickname: p.nickname,
        avatar: p.avatar,
        score: p.score
      }));

      io.to(room.hostSocketId).emit('room:players-updated', {
        playersCount: room.players.size,
        players: playerList
      });
    }
  });

  // HOST: Start Next Question
  socket.on('host:next-question', ({ pin }) => {
    const cleanPin = (pin || '').toString().trim();
    let room = rooms.get(cleanPin);
    if (!room) {
      for (const [, r] of rooms) {
        if (r.hostSocketId === socket.id) { room = r; break; }
      }
    }
    if (!room || room.hostSocketId !== socket.id) return;

    room.currentQIndex++;
    if (room.currentQIndex >= room.quiz.questions.length) {
      // Quiz Finished -> Show Final Podium
      room.state = 'PODIUM';
      const sorted = Array.from(room.players.values()).sort((a, b) => b.score - a.score);
      io.to(`room:${room.pin}`).emit('game:podium', {
        podium: sorted.slice(0, 3),
        allPlayers: sorted
      });
      return;
    }

    const currentQ = room.quiz.questions[room.currentQIndex];
    if (!currentQ) return;
    room.state = 'QUESTION';
    room.questionStartTime = Date.now();
    room.answersCount = [0, 0, 0, 0];
    room.answeredCount = 0;

    // Reset player answer states for this question
    for (const [, p] of room.players) {
      p.answeredCurrent = false;
      p.lastAnswerCorrect = false;
      p.lastPointsEarned = 0;
    }

    // Host receives full question + options
    io.to(room.hostSocketId).emit('host:question-started', {
      questionIndex: room.currentQIndex,
      totalQuestions: room.quiz.questions.length,
      question: currentQ,
      playersCount: room.players.size
    });

    const qType = currentQ.type || ((currentQ.options || []).length === 2 ? 'true_false' : 'multiple_choice');

    // Players receive question payload (broadcast once to entire room)
    const playerPayload = {
      questionIndex: room.currentQIndex,
      totalQuestions: room.quiz.questions.length,
      question: currentQ.question || '',
      image: currentQ.image || null,
      timeLimit: currentQ.timeLimit || 20,
      type: qType,
      mode: currentQ.mode || 'standard'
    };

    if (qType === 'fill_blank') {
      // Do not reveal accepted answers to student payload
      playerPayload.acceptedAnswersCount = (currentQ.acceptedAnswers || []).length;
    } else if (qType === 'matching') {
      const pairs = currentQ.pairs || [];
      playerPayload.leftItems = pairs.map(p => p.left);
      
      // Guaranteed Derangement: Ensure NO right item ever appears in the same row as its matching left item
      const originalRight = pairs.map(p => p.right);
      let rightItems = [...originalRight];
      const n = rightItems.length;

      if (n > 1) {
        let isDeranged = false;
        for (let attempt = 0; attempt < 100; attempt++) {
          for (let i = n - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [rightItems[i], rightItems[j]] = [rightItems[j], rightItems[i]];
          }
          if (!rightItems.some((item, idx) => item === originalRight[idx])) {
            isDeranged = true;
            break;
          }
        }

        // Deterministic cyclical shift if random didn't achieve derangement
        if (!isDeranged) {
          const shift = Math.floor(Math.random() * (n - 1)) + 1;
          rightItems = originalRight.map((_, i) => originalRight[(i + shift) % n]);
        }
      }

      playerPayload.shuffledRightItems = rightItems;
      playerPayload.pairsCount = pairs.length;
    } else {
      playerPayload.options = currentQ.options || [];
      playerPayload.optionsCount = (currentQ.options || []).length;
    }

    io.to(`room:${room.pin}`).emit('player:question-started', playerPayload);
  });

  // PLAYER: Submit Answer
  socket.on('player:submit-answer', ({ pin, choiceIndex, answerText, matches }) => {
    const cleanPin = (pin || socket.data.pin || '').toString().trim();
    const room = rooms.get(cleanPin);
    if (!room || room.state !== 'QUESTION') return;

    const player = room.players.get(socket.id);
    if (!player || player.answeredCurrent) return;

    player.answeredCurrent = true;
    const currentQ = room.quiz && room.quiz.questions ? room.quiz.questions[room.currentQIndex] : null;
    if (!currentQ) return;

    const qType = currentQ.type || ((currentQ.options || []).length === 2 ? 'true_false' : 'multiple_choice');
    let isCorrect = false;
    let correctnessRatio = 0; // for partial or full scoring

    if (qType === 'fill_blank') {
      const userText = (answerText || '').toString().trim().toLowerCase().replace(/\s+/g, ' ');
      const accepted = (currentQ.acceptedAnswers || []).map(a => a.toString().trim().toLowerCase().replace(/\s+/g, ' '));
      isCorrect = userText.length > 0 && accepted.some(a => a === userText);
      correctnessRatio = isCorrect ? 1 : 0;
      player.submittedAnswer = answerText || '';
    } else if (qType === 'matching') {
      const pairs = currentQ.pairs || [];
      let matchCount = 0;
      if (matches && typeof matches === 'object') {
        for (const pair of pairs) {
          const userRight = (matches[pair.left] || '').toString().trim().toLowerCase();
          const targetRight = (pair.right || '').toString().trim().toLowerCase();
          if (userRight && userRight === targetRight) {
            matchCount++;
          }
        }
      }
      correctnessRatio = pairs.length > 0 ? matchCount / pairs.length : 0;
      isCorrect = pairs.length > 0 && matchCount === pairs.length;
      player.submittedMatches = matches || {};
    } else {
      isCorrect = choiceIndex === currentQ.correctIndex;
      correctnessRatio = isCorrect ? 1 : 0;
      // Track answer distribution
      if (choiceIndex >= 0 && choiceIndex < (currentQ.options || []).length) {
        room.answersCount[choiceIndex] = (room.answersCount[choiceIndex] || 0) + 1;
      }
    }

    let pointsEarned = 0;
    if (correctnessRatio > 0) {
      const basePoints = currentQ.points ?? 10;

      if (basePoints <= 10) {
        // Direct clean scoring for 1, 5, 10 points
        pointsEarned = Math.round(basePoints * correctnessRatio);
      } else {
        const timeLimit = (currentQ.timeLimit || 20) * 1000;
        const elapsed = Date.now() - room.questionStartTime;
        const timeFactor = Math.max(0.5, 1 - (elapsed / timeLimit) * 0.5);
        
        // In university thinking mode, don't penalize time
        const finalPoints = (room.level === 'university' && currentQ.mode === 'thinking')
          ? basePoints
          : Math.round(basePoints * timeFactor);

        const streakBonus = Math.min(player.streak, 3) * Math.round(basePoints * 0.05);
        pointsEarned = Math.round((finalPoints + streakBonus) * correctnessRatio);
      }

      if (isCorrect) {
        player.streak++;
      } else {
        player.streak = 0;
      }
      player.score += pointsEarned;
      player.lastAnswerCorrect = isCorrect;
      player.lastPointsEarned = pointsEarned;
    } else {
      player.streak = 0;
      player.lastAnswerCorrect = false;
      player.lastPointsEarned = 0;
    }

    // Count how many answered in O(1)
    room.answeredCount = (room.answeredCount || 0) + 1;
    const totalAnswered = room.answeredCount;

    // Notify Host about live answer count
    io.to(room.hostSocketId).emit('host:player-answered', {
      totalAnswered,
      playersCount: room.players.size,
      answersDistribution: room.answersCount,
      allAnswered: totalAnswered >= room.players.size && room.players.size > 0
    });
  });

  // HOST: Time Up or Force Show Results
  socket.on('host:show-results', ({ pin }) => {
    const cleanPin = (pin || '').toString().trim();
    let room = rooms.get(cleanPin);
    if (!room) {
      for (const [, r] of rooms) {
        if (r.hostSocketId === socket.id) { room = r; break; }
      }
    }
    if (room && (room.state === 'QUESTION' || room.state === 'RESULT')) {
      room.hostSocketId = socket.id;
      revealResults(room, room.pin);
    }
  });

  // HOST: Peer Discussion / Re-poll (For Higher Ed)
  socket.on('host:peer-discuss', ({ pin, duration = 45 }) => {
    const cleanPin = (pin || '').toString().trim();
    let room = rooms.get(cleanPin);
    if (!room) {
      for (const [, r] of rooms) {
        if (r.hostSocketId === socket.id) { room = r; break; }
      }
    }
    if (room) {
      room.hostSocketId = socket.id;
      io.to(`room:${room.pin}`).emit('game:peer-discussion-started', {
        duration,
        message: '👥 សូមនិស្សិតពិភាក្សាគ្នាជាមួយមិត្តរួមថ្នាក់ រួចត្រៀមបោះឆ្នោតឡើងវិញ!'
      });
    }
  });

  // HOST: Show Leaderboard
  socket.on('host:show-leaderboard', ({ pin }) => {
    const cleanPin = (pin || '').toString().trim();
    let room = rooms.get(cleanPin);
    if (!room) {
      for (const [, r] of rooms) {
        if (r.hostSocketId === socket.id) { room = r; break; }
      }
    }
    if (room) {
      room.hostSocketId = socket.id;
      room.state = 'LEADERBOARD';
      const sorted = Array.from(room.players.values()).sort((a, b) => b.score - a.score);

      io.to(`room:${room.pin}`).emit('game:leaderboard', {
        leaderboard: sorted.slice(0, 5),
        currentQIndex: room.currentQIndex,
        totalQuestions: room.quiz.questions.length
      });
    }
  });

  // HOST: Shuffle Quiz Questions & Options Before Starting
  socket.on('host:shuffle-quiz', ({ pin }) => {
    const cleanPin = (pin || '').toString().trim();
    let room = rooms.get(cleanPin);
    if (!room) {
      for (const [, r] of rooms) {
        if (r.hostSocketId === socket.id) { room = r; break; }
      }
    }
    if (room && room.state === 'LOBBY') {
      // Shuffle question order
      for (let i = room.quiz.questions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [room.quiz.questions[i], room.quiz.questions[j]] = [room.quiz.questions[j], room.quiz.questions[i]];
      }
      // Shuffle each question's options
      room.quiz.questions = room.quiz.questions.map(q => shuffleQuestionOptions(q));
      io.to(room.hostSocketId).emit('host:quiz-shuffled', {
        message: 'វិញ្ញាសា និងជម្រើសចម្លើយត្រូវបានច្របល់ដោយចៃដន្យរួចរាល់!'
      });
    }
  });

  // Disconnection cleanup
  socket.on('disconnect', () => {
    // If host disconnects
    for (const [pin, room] of rooms.entries()) {
      if (room.hostSocketId === socket.id) {
        io.to(`room:${pin}`).emit('game:host-disconnected', { message: 'Host បានចាកចេញពីបន្ទប់។' });
        rooms.delete(pin);
        console.log(`[Host] Room closed: ${pin}`);
        break;
      }
      if (room.players.has(socket.id)) {
        room.players.delete(socket.id);
        const playerList = Array.from(room.players.values()).map(p => ({
          socketId: p.socketId,
          nickname: p.nickname,
          avatar: p.avatar,
          score: p.score
        }));
        io.to(room.hostSocketId).emit('room:players-updated', {
          playersCount: room.players.size,
          players: playerList
        });
        break;
      }
    }
  });
});

function revealResults(room, pin) {
  if (!room || room.state === 'RESULT') return; // Prevent double reveal
  room.state = 'RESULT';
  const currentQ = room.quiz && room.quiz.questions ? room.quiz.questions[room.currentQIndex] : null;
  if (!currentQ) return;
  const isLastQuestion = room.currentQIndex >= room.quiz.questions.length - 1;
  const qType = currentQ.type || ((currentQ.options || []).length === 2 ? 'true_false' : 'multiple_choice');

  // Send Host full stats
  io.to(room.hostSocketId).emit('host:results-shown', {
    type: qType,
    correctIndex: currentQ.correctIndex,
    acceptedAnswers: currentQ.acceptedAnswers || [],
    pairs: currentQ.pairs || [],
    explanation: currentQ.explanation,
    answersDistribution: room.answersCount,
    isLastQuestion,
    currentQIndex: room.currentQIndex,
    totalQuestions: room.quiz.questions.length
  });

  // Send Each Player their personalized outcome
  for (const [sId, p] of room.players) {
    if (!p.answeredCurrent) {
      p.streak = 0; // Streak breaks if player timed out without answering
    }
    io.to(sId).emit('player:answer-result', {
      type: qType,
      isCorrect: p.lastAnswerCorrect,
      pointsEarned: p.lastPointsEarned,
      totalScore: p.score,
      streak: p.streak,
      correctIndex: currentQ.correctIndex,
      acceptedAnswers: currentQ.acceptedAnswers || [],
      pairs: currentQ.pairs || [],
      isLastQuestion
    });
  }
}

// Vite integration for production / unified server
const PORT = parseInt(process.env.PORT, 10) || 3333;

async function startServer() {
  let clientDistPath = path.join(__dirname, 'dist');
  if (!fs.existsSync(clientDistPath)) {
    clientDistPath = path.join(__dirname, '../dist');
  }
  if (!fs.existsSync(clientDistPath)) {
    clientDistPath = path.join(process.cwd(), 'dist');
  }

  if (fs.existsSync(clientDistPath)) {
    app.use(express.static(clientDistPath, {
      setHeaders: (res, path) => {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
    }));
    app.get('*', (req, res) => {
      res.sendFile(path.join(clientDistPath, 'index.html'), {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    });
  }

  const { exec } = require('child_process');

  const tryListen = (portToTry) => {
    const currentPort = parseInt(portToTry, 10) || 3333;
    httpServer.listen(currentPort, '0.0.0.0', async () => {
      const ip = getLocalIpAddress();
      console.log(`\n========================================`);
      console.log(`✅ Server is running!`);
      console.log(`🌐 Local Network: http://${ip}:${currentPort}`);
      console.log(`========================================\n`);

      // Automatically launch the browser if not started by native wrapper
      if (process.env.LAUNCHED_BY_WRAPPER !== '1') {
        const url = `http://localhost:${currentPort}`;
        if (process.platform === 'win32') {
          exec(`start "" "${url}"`);
        }
      }

      // Pre-install bundled cloudflared executable into untun temp directory
      try {
        const untunTempDir = path.join(os.tmpdir(), 'node-untun');
        if (!fs.existsSync(untunTempDir)) {
          fs.mkdirSync(untunTempDir, { recursive: true });
        }
        const targetBinName = process.platform === 'win32' ? 'cloudflared.2026.7.2.exe' : 'cloudflared.2026.7.2';
        const targetBinPath = path.join(untunTempDir, targetBinName);

        if (!fs.existsSync(targetBinPath) || fs.statSync(targetBinPath).size < 10000000) {
          const possibleSources = [
            path.join(__dirname, 'bin', 'cloudflared.exe'),
            path.join(__dirname, 'bin', targetBinName),
            path.join(process.cwd(), 'bin', 'cloudflared.exe'),
            path.join(process.cwd(), 'bin', targetBinName),
            path.join(__dirname, 'runtime', 'cloudflared.exe'),
            path.join(process.cwd(), 'runtime', 'cloudflared.exe'),
            path.join(__dirname, 'cloudflared.exe')
          ];
          for (const src of possibleSources) {
            if (fs.existsSync(src) && fs.statSync(src).size > 10000000) {
              console.log(`[Tunnel] Pre-installing bundled cloudflared to ${targetBinPath}...`);
              fs.copyFileSync(src, targetBinPath);
              break;
            }
          }
        }
      } catch (copyErr) {
        console.warn('[Tunnel] Note on bundled binary copy:', copyErr.message);
      }

      // Start Cloudflare Tunnel (untun) for 4G Access
      try {
        const tunnel = await startTunnel({ port: currentPort });
        publicUrl = await tunnel.getURL();
        console.log(`🚀 Public 4G URL (Cloudflare Tunnel): ${publicUrl}`);
        console.log(`(Students can connect to this from anywhere using 4G without IP verification)`);
        console.log(`========================================\n`);

        // Broadcast to all active sockets/rooms that 4G public URL is ready
        io.emit('server:public-url-updated', {
          publicUrl,
          rawPublicUrl: publicUrl
        });
      } catch (err) {
        console.error('⚠️ Could not start public tunnel:', err.message);
      }
    }).on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        const nextPort = currentPort + 1;
        console.warn(`⚠️ Port ${currentPort} is in use, trying ${nextPort}...`);
        tryListen(nextPort);
      } else {
        console.error('⚠️ Server error:', err);
      }
    });
  };

  tryListen(PORT);
}

// ==========================================
// TELEGRAM BOT AUTO-RESPONDER & NOTIFICATION SERVICE
// ==========================================
let currentBotPricing = loadBotPricing();
let telegramUserStates = loadTelegramStates();

async function sendTelegramMessage(chatId, text, parseMode = 'HTML', replyMarkup = null) {
  const token = currentBotPricing.botToken || process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !chatId) return false;
  try {
    const payload = {
      chat_id: chatId,
      text,
      parse_mode: parseMode
    };
    if (replyMarkup) {
      payload.reply_markup = replyMarkup;
    }
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.warn(`[Telegram] sendMessage failed (${res.status}):`, errText);
    }
    return res.ok;
  } catch (err) {
    console.error('[Telegram] Failed to send message:', err.message);
    return false;
  }
}

async function sendTelegramPhoto(chatId, photo, caption = '', parseMode = 'HTML', replyMarkup = null) {
  const token = currentBotPricing.botToken || process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !photo || !chatId) return false;
  try {
    // Telegram caption max length is 1024 characters
    const safeCaption = caption ? caption.slice(0, 1020) : '';

    if (photo.startsWith('data:image/')) {
      const matches = photo.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
      if (matches) {
        const ext = matches[1] || 'png';
        const buffer = Buffer.from(matches[2], 'base64');
        const formData = new FormData();
        formData.append('chat_id', chatId.toString());
        if (safeCaption) formData.append('caption', safeCaption);
        formData.append('parse_mode', parseMode);
        if (replyMarkup) {
          formData.append('reply_markup', JSON.stringify(replyMarkup));
        }
        const blob = new Blob([buffer], { type: `image/${ext}` });
        formData.append('photo', blob, `khqr.${ext}`);

        const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
          method: 'POST',
          body: formData
        });
        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          console.warn(`[Telegram] sendPhoto failed (${res.status}):`, errText);
        }
        return res.ok;
      }
    } else {
      // Works for both https:// URLs and Telegram file_id strings
      const payload = {
        chat_id: chatId,
        photo: photo,
        caption: safeCaption,
        parse_mode: parseMode
      };
      if (replyMarkup) payload.reply_markup = replyMarkup;

      const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        console.warn('[Telegram] sendPhoto failed:', errBody);
      }
      return res.ok;
    }
  } catch (err) {
    console.error('[Telegram] sendPhoto error:', err.message);
  }
  return false;
}

// Public Bot Config Endpoint for Frontend Modals
app.get('/api/bot/config', (req, res) => {
  currentBotPricing = loadBotPricing();
  res.json({
    success: true,
    botUsername: currentBotPricing.botUsername || 'ac_mart_programer_developer_bot',
    adminTelegram: currentBotPricing.adminTelegram || '@KEMBOREY',
    adminPhone: currentBotPricing.adminPhone || '',
    adminName: currentBotPricing.adminName || 'លោកគ្រូ បូរី (Platform Owner)',
    prices: {
      price1Month: currentBotPricing.price1Month || '$0.5',
      price1Year: currentBotPricing.price1Year || '$2.5',
      priceLifetime: currentBotPricing.priceLifetime || '$15'
    },
    bankName: currentBotPricing.bankName || 'ABA Bank / Bakong KHQR',
    bankAccountName: currentBotPricing.bankAccountName || 'KEM BOREY',
    bankAccountNumber: currentBotPricing.bankAccountNumber || '',
    khqrImage: currentBotPricing.khqrImage || '',
    customNotes: currentBotPricing.customNotes || ''
  });
});

// Admin Get Bot & Pricing Config
app.get('/api/admin/bot-pricing', (req, res) => {
  currentBotPricing = loadBotPricing();
  res.json({ success: true, pricing: currentBotPricing });
});

// Admin Save Bot & Pricing Config
app.post('/api/admin/bot-pricing', (req, res) => {
  const { 
    botToken, 
    botUsername, 
    price1Month, 
    price1Year, 
    priceLifetime, 
    adminName, 
    adminTelegram, 
    adminPhone, 
    adminChatId,
    geminiApiKey,
    customNotes,
    khqrImage,
    bankName,
    bankAccountName,
    bankAccountNumber,
    khqrDeepLink
  } = req.body;
  
  const updated = {
    botToken: (botToken !== undefined ? botToken : (currentBotPricing.botToken || '')).trim(),
    botUsername: (botUsername || currentBotPricing.botUsername || 'ac_mart_programer_developer_bot').replace(/^@/, '').trim(),
    price1Month: (price1Month || currentBotPricing.price1Month || '$0.5').trim(),
    price1Year: (price1Year || currentBotPricing.price1Year || '$2.5').trim(),
    priceLifetime: (priceLifetime || currentBotPricing.priceLifetime || '$15').trim(),
    adminName: (adminName || currentBotPricing.adminName || 'លោកគ្រូ បូរី (Platform Owner)').trim(),
    adminTelegram: (adminTelegram || currentBotPricing.adminTelegram || '@KEMBOREY').trim(),
    adminPhone: (adminPhone || currentBotPricing.adminPhone || '').trim(),
    adminChatId: (adminChatId !== undefined ? adminChatId : (currentBotPricing.adminChatId || '')).toString().trim(),
    geminiApiKey: (geminiApiKey !== undefined ? geminiApiKey : (currentBotPricing.geminiApiKey || process.env.GEMINI_API_KEY || '')).trim(),
    customNotes: (customNotes !== undefined ? customNotes : (currentBotPricing.customNotes || '')).trim(),
    khqrImage: khqrImage !== undefined ? khqrImage : (currentBotPricing.khqrImage || ''),
    bankName: (bankName || currentBotPricing.bankName || 'ABA Bank / Bakong KHQR').trim(),
    bankAccountName: (bankAccountName || currentBotPricing.bankAccountName || 'KEM BOREY').trim(),
    bankAccountNumber: (bankAccountNumber || currentBotPricing.bankAccountNumber || '').trim(),
    khqrDeepLink: (khqrDeepLink || currentBotPricing.khqrDeepLink || '').trim(),
    updatedAt: new Date().toISOString()
  };

  saveBotPricing(updated);
  currentBotPricing = updated;

  res.json({ success: true, message: '🎉 បានរក្សាទុកការកំណត់ Telegram Bot, តម្លៃ និង KHQR ថ្មីដោយជោគជ័យ!', pricing: updated });
});

// Admin Test Bot Connection (Verify Token with getMe)
app.post('/api/admin/bot/test-connection', async (req, res) => {
  const token = (req.body.botToken || currentBotPricing.botToken || process.env.TELEGRAM_BOT_TOKEN || '').trim();
  if (!token) {
    return res.status(400).json({ success: false, message: 'សូមបញ្ចូល Telegram Bot Token ជាមុនសិន!' });
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = await response.json();
    if (data.ok && data.result) {
      return res.json({
        success: true,
        message: `✅ ការតភ្ជាប់ជោគជ័យ! Bot Name: "${data.result.first_name}" (@${data.result.username})`,
        bot: data.result
      });
    } else {
      return res.status(400).json({
        success: false,
        message: `❌ Token មិនត្រឹមត្រូវ ឬត្រូវបានបិទ៖ ${data.description || 'Invalid Bot Token'}`
      });
    }
  } catch (err) {
    return res.status(500).json({ success: false, message: `❌ មិនអាចភ្ជាប់ទៅកាន់ Telegram Server បានទេ៖ ${err.message}` });
  }
});

// Admin Send Test Notification to Admin Telegram
app.post('/api/admin/bot/send-test', async (req, res) => {
  const chatId = req.body.adminChatId || currentBotPricing.adminChatId;
  if (!chatId) {
    return res.status(400).json({
      success: false,
      message: '⚠️ មិនទាន់មាន Admin Chat ID ឡើយ! សូមផ្ញើពាក្យ /admin ទៅកាន់ Bot របស់អ្នកលើ Telegram ជាមុនសិន ឬបញ្ចូល Chat ID ផ្ទាល់។'
    });
  }

  const testMsg = `🔔 <b>តេស្តប្រព័ន្ធជូនដំណឹង AC-Kahoot!</b>\n\n` +
    `សួស្តីលោកគ្រូ បូរី! 👋\n` +
    `ប្រព័ន្ធ Telegram Bot ត្រូវបានភ្ជាប់ជាមួយ Admin Chat ID <code>${chatId}</code> ដោយជោគជ័យ។\n` +
    `រាល់ពេលអតិថិជនស្កេនបង់ប្រាក់ KHQR និងផ្ញើវិក្កយបត្រ ព័ត៌មាននឹងលោតមកកាន់ទីនេះភ្លាមៗ! 🚀\n\n` +
    `🕒 <i>${new Date().toLocaleString('km-KH', { timeZone: 'Asia/Phnom_Penh' })}</i>`;

  const sent = await sendTelegramMessage(chatId, testMsg, 'HTML');
  if (sent) {
    return res.json({ success: true, message: `✅ បានផ្ញើសារសាកល្បងទៅកាន់ Telegram Admin (Chat ID: ${chatId}) រួចរាល់!` });
  } else {
    return res.status(500).json({
      success: false,
      message: '❌ មិនអាចផ្ញើសារបានទេ។ សូមប្រាកដថា Admin បានចុច "Start" ក្នុង Bot រួចហើយ និង Chat ID ត្រឹមត្រូវ។'
    });
  }
});

// Endpoint to send inquiry or notify admin
app.post('/api/telegram/notify-inquiry', async (req, res) => {
  const { hwid } = req.body;
  if (!hwid) return res.status(400).json({ success: false, message: 'HWID is required' });
  
  const username = currentBotPricing.botUsername || 'ac_mart_programer_developer_bot';
  res.json({
    success: true,
    botUrl: `https://t.me/${username}?start=EMAIL_${(hwid || '').replace(/[^a-zA-Z0-9_-]/g, '')}`
  });
});

app.post('/api/payment/notify', async (req, res) => {
  const { email, planKey, planName, planPrice } = req.body;
  if (!email || !planKey) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  const adminChatId = currentBotPricing.adminChatId;
  if (!adminChatId) {
    return res.status(400).json({ success: false, message: 'Admin Telegram Chat ID not configured.' });
  }

  try {
    const message = `🎫 <b>New Payment / Upgrade Ticket</b>\n\n` +
                    `📧 <b>User Email:</b> <code>${email}</code>\n` +
                    `🏷 <b>Plan:</b> ${planName} (${planKey})\n` +
                    `💰 <b>Price:</b> ${planPrice}\n\n` +
                    `<i>A user has submitted a payment request via the Web UI. Please verify their payment and manually grant them the license in the Master Admin panel.</i>`;

    const inlineKeyboard = [[{ text: '✅ Open Web Dashboard', url: 'https://ac-kahoot-cloud.onrender.com' }]];
    
    await sendTelegramMessage(adminChatId, message, 'HTML', { inline_keyboard: inlineKeyboard });
    res.json({ success: true, message: 'Ticket sent to admin.' });
  } catch (err) {
    console.error('Error sending payment notification:', err);
    res.status(500).json({ success: false, message: 'Failed to notify admin.' });
  }
});

async function answerCallbackQuery(callbackQueryId, text = '') {
  const token = currentBotPricing.botToken || process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callbackQueryId, text })
    });
  } catch {}
}

async function editTelegramMessageReplyMarkup(chatId, messageId, replyMarkup) {
  const token = currentBotPricing.botToken || process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/editMessageReplyMarkup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, message_id: messageId, reply_markup: replyMarkup })
    });
  } catch {}
}

let lastTelegramUpdateId = 0;
let lastCloudBotCheckTime = 0;
let isRenderCloudBotActive = false;

async function checkCloudBotStatus() {
  if (Date.now() - lastCloudBotCheckTime < 30000) return isRenderCloudBotActive;
  lastCloudBotCheckTime = Date.now();
  try {
    const res = await fetch('https://kem-borey.onrender.com/health', { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const data = await res.json();
      isRenderCloudBotActive = (data && data.status === 'online');
      return isRenderCloudBotActive;
    }
  } catch (e) {}
  isRenderCloudBotActive = false;
  return false;
}

async function pollTelegramBot() {
  const token = currentBotPricing.botToken || process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    setTimeout(pollTelegramBot, 4000);
    return;
  }

  // If 24/7 Render Cloud Bot is active, let Cloud handle Telegram to avoid duplicate replies
  const cloudActive = await checkCloudBotStatus();
  if (cloudActive) {
    setTimeout(pollTelegramBot, 30000);
    return;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates?offset=${lastTelegramUpdateId + 1}&timeout=10`);
    if (res.ok) {
      const data = await res.json();
      if (data.ok && Array.isArray(data.result)) {
        for (const update of data.result) {
          lastTelegramUpdateId = update.update_id;
          currentBotPricing = loadBotPricing();
          telegramUserStates = loadTelegramStates();
          const adminUser = (currentBotPricing.adminTelegram || 'KEMBOREY').replace(/^@/, '').trim();

          // ----------------------------------------------------
          // CASE 1: USER SENDS /start, PHOTO (SLIP), OR TEXT MESSAGE (STEP 1: CHOOSE PLAN)
          // ----------------------------------------------------
          const msg = update.message;
          if (msg && msg.chat) {
            const chatId = msg.chat.id;
            const text = (msg.text || msg.caption || '').trim();
            const senderName = msg.from?.first_name || 'លោកគ្រូ/អ្នកគ្រូ';

            // Smart HWID detection from text
            const hwidMatch = text.match(/(?:EMAIL_|ACK-HWID-|ACK-)([A-Z0-9_-]+)/i);
            const extractedHwid = hwidMatch ? hwidMatch[0].replace(/^HWID_/i, '').trim() : '';

            // Auto-bind Admin Chat ID if sender is admin or sends /admin
            const fromUsername = (msg.from?.username || '').toLowerCase();
            const isMatchUsername = adminUser && fromUsername && fromUsername === adminUser.toLowerCase();
            if (isMatchUsername) {
              if (currentBotPricing.adminChatId !== chatId.toString()) {
                currentBotPricing.adminChatId = chatId.toString();
                saveBotPricing(currentBotPricing);
                console.log(`[Telegram] Auto-registered Admin Chat ID: ${chatId} (@${fromUsername})`);
              }
            }

            if (text.startsWith('/start') || text.toLowerCase() === 'menu' || text.toLowerCase() === 'price') {
              const parts = text.split(' ');
              const param = parts[1] || '';
              let hwid = param.replace(/^EMAIL_/i, '').trim();
              if (hwid.toUpperCase() === 'BUY_LICENSE') hwid = '';
              if (!hwid && extractedHwid) hwid = extractedHwid;

              telegramUserStates[chatId] = {
                hwid: hwid || (telegramUserStates[chatId]?.hwid || ''),
                plan: telegramUserStates[chatId]?.plan || '',
                name: senderName,
                username: msg.from?.username || '',
                updatedAt: new Date().toISOString()
              };
              saveTelegramStates(telegramUserStates);

              let reply = `🎯 <b>សូមស្វាគមន៍មកកាន់ AC-Kahoot! Official Bot</b>\n\n`;
              reply += `សួស្តី <b>${senderName}</b>! 🙏\n\n`;
              if (telegramUserStates[chatId].email) {
                reply += `💻 <b>អ៊ីមែល (Email) របស់អ្នក៖</b>\n<code>${telegramUserStates[chatId].email}</code>\n\n`;
                reply += `✅ យើងខ្ញុំបានកត់ត្រាអុីមែល របស់អ្នករួចរាល់ហើយ!\n\n`;
              } else {
                reply += `ដើម្បីទទួលបាន License Key សូមផ្ញើលេខ <b>Hardware Machine ID</b> របស់អ្នកមកកាន់ទីនេះ។\n\n`;
              }
              reply += `🌟 <b>សូមចុចជ្រើសរើសគម្រោងដែលលោកគ្រូ/អ្នកគ្រូចង់ទិញខាងក្រោម៖</b>\n`;
              if (currentBotPricing.price1Month) reply += `• <b>Pro ប្រចាំខែ (1 Month)៖</b> ${currentBotPricing.price1Month}\n`;
              if (currentBotPricing.price1Year) reply += `• <b>Pro ប្រចាំឆ្នាំ (1 Year)៖</b> ${currentBotPricing.price1Year}\n`;
              if (currentBotPricing.priceLifetime) reply += `• <b>Pro ពេញមួយជីវិត (Lifetime)៖</b> ${currentBotPricing.priceLifetime}\n\n`;

              reply += `👉 <i>សូមចុចលើប៊ូតុងគម្រោងខាងក្រោម ដើម្បីទទួល QR Code បង់ប្រាក់៖</i>`;

              const currentEmail = telegramUserStates[chatId].email || '';
              const inlineKeyboard = [];
              if (currentBotPricing.price1Month) {
                inlineKeyboard.push([
                  { text: `🗓️ Pro ១ ខែ (${currentBotPricing.price1Month})`, callback_data: `plan:1m:${currentEmail}` }
                ]);
              }
              if (currentBotPricing.price1Year) {
                inlineKeyboard.push([
                  { text: `⭐ Pro ១ ឆ្នាំ (${currentBotPricing.price1Year})`, callback_data: `plan:1y:${currentEmail}` }
                ]);
              }
              if (currentBotPricing.priceLifetime) {
                inlineKeyboard.push([
                  { text: `👑 Pro ពេញមួយជីវិត (${currentBotPricing.priceLifetime})`, callback_data: `plan:lifetime:${currentEmail}` }
                ]);
              }
              inlineKeyboard.push([
                { text: `💬 ឆាតទាក់ទងលោកគ្រូ បូរី (@${adminUser}) ផ្ទាល់`, url: `https://t.me/${adminUser}` }
              ]);

              await sendTelegramMessage(chatId, reply, 'HTML', { inline_keyboard: inlineKeyboard });
            } else if (text.startsWith('/admin')) {
              currentBotPricing.adminChatId = chatId.toString();
              saveBotPricing(currentBotPricing);
              console.log(`[Telegram] Explicitly connected Admin Chat ID: ${chatId} (@${fromUsername || 'N/A'})`);
              await sendTelegramMessage(chatId, `✅ <b>ជោគជ័យ!</b> Bot បានកត់ត្រា និងភ្ជាប់ Admin Chat ID (<code>${chatId}</code>) រួចរាល់។ លោកគ្រូនឹងទទួលបានវិក្កយបត្របង់ប្រាក់នៅទីនេះដោយស្វ័យប្រវត្តិ។`, 'HTML');
            } else if (msg.photo || msg.document) {
              const state = telegramUserStates[chatId] || {};
              if (extractedHwid && !state.hwid) {
                state.email = extractedEmail;
                telegramUserStates[chatId] = state;
                saveTelegramStates(telegramUserStates);
              }

              if (!state.hwid) {
                 await sendTelegramMessage(chatId, `⚠️ <b>សូមអភ័យទោស!</b> យើងខ្ញុំមិនទាន់ស្គាល់ Hardware ID របស់អ្នកទេ។\nសូមចូលទៅកាន់កម្មវិធី រួចចុចប៉ូតុង <b>"ទិញឥឡូវនេះ (Buy Now)"</b> ម្តងទៀត ឬវាយផ្ញើលេខ HWID (ឧទាហរណ៍៖ <code>ACK-HWID-XXXX-YYYY-ZZZZ</code>) មកកាន់ទីនេះសិន។`, 'HTML');
              } else {
                const effectivePlan = state.plan || 'lifetime';
                let slipReply = `✅ <b>យើងខ្ញុំបានទទួលរូបភាពវិក្កយបត្រ (Payment Slip) របស់អ្នករួចរាល់ហើយ!</b> 🙏\n\n`;
                slipReply += `👤 <b>គណនីផ្ញើ៖</b> ${senderName} (@${msg.from?.username || 'N/A'})\n`;
                slipReply += `💻 <b>Email៖</b> <code>${state.hwid}</code>\n`;
                slipReply += `🕒 <b>កាលបរិច្ឆេទ៖</b> ${new Date().toLocaleString('km-KH', { timeZone: 'Asia/Phnom_Penh' })}\n\n`;
                slipReply += `⏳ លោកគ្រូ បូរី (Admin) នឹងពិនិត្យ និងចេញ <b>License Key</b> ជូនលោកគ្រូ/អ្នកគ្រូតាមរយៈ Bot នេះក្នុងពេលឆាប់ៗនេះ។\n\n`;
                slipReply += `💡 <i>(ប្រសិនបើយឺតយ៉ាវ លោកគ្រូ/អ្នកគ្រូអាចឆាតទៅកាន់ @${adminUser} បន្ថែមបានផងដែរ)</i>`;
  
                await sendTelegramMessage(chatId, slipReply, 'HTML');
                
                // Forward to Admin with inline buttons
                if (currentBotPricing.adminChatId) {
                  let adminNotice = `🚨 <b>មានវិក្កយបត្របង់ប្រាក់ថ្មី!</b>\n\n`;
                  adminNotice += `👤 <b>អតិថិជន៖</b> ${senderName} (@${msg.from?.username || 'N/A'})\n`;
                  adminNotice += `💻 <b>Email៖</b> <code>${state.hwid}</code>\n`;
                  
                  let planTitle = effectivePlan === '1m' ? 'Pro ប្រចាំខែ (1 Month)' : effectivePlan === '1y' ? 'Pro ប្រចាំឆ្នាំ (1 Year)' : 'Pro ពេញមួយជីវិត (Lifetime)';
                  adminNotice += `🌟 <b>គម្រោង៖</b> <b>${planTitle}</b>\n\n`;
                  adminNotice += `👉 <i>សូមចុចប៊ូតុងខាងក្រោម ដើម្បីអនុម័ត និងផ្ញើ Key ស្វ័យប្រវត្តិ៖</i>`;
                  
                  const adminKeyboard = [
                    [{ text: `✅ ទទួលស្គាល់ការបង់ប្រាក់ & ផ្ញើ Key`, callback_data: `approve:${chatId}:${effectivePlan}` }],
                    [{ text: `❌ បដិសេធ (វិក្កយបត្រក្លែងក្លាយ)`, callback_data: `reject:${chatId}` }]
                  ];
                  
                  // Forward the photo
                  let photoId = '';
                  if (msg.photo && msg.photo.length > 0) photoId = msg.photo[msg.photo.length - 1].file_id;
                  if (msg.document) photoId = msg.document.file_id;
                  
                  let sentOk = false;
                  if (photoId) {
                    sentOk = await sendTelegramPhoto(currentBotPricing.adminChatId, photoId, adminNotice, 'HTML', { inline_keyboard: adminKeyboard });
                  }
                  if (!sentOk) {
                    await sendTelegramMessage(currentBotPricing.adminChatId, adminNotice, 'HTML', { inline_keyboard: adminKeyboard });
                  }
                }
              }
            } else if (text) {
              // User sent regular text (could be HWID or query)
              if (extractedHwid) {
                telegramUserStates[chatId] = telegramUserStates[chatId] || {};
                telegramUserStates[chatId].email = extractedHwid;
                telegramUserStates[chatId].name = senderName;
                telegramUserStates[chatId].username = msg.from?.username || '';
                saveTelegramStates(telegramUserStates);
              }

              let textReply = `🎯 <b>សូមស្វាគមន៍មកកាន់ AC-Kahoot! Official Bot</b>\n\n`;
              textReply += `សួស្តី <b>${senderName}</b>! 🙏\n`;
              if (extractedHwid || telegramUserStates[chatId]?.hwid) {
                textReply += `💻 <b>Email៖</b> <code>${telegramUserStates[chatId]?.hwid || extractedHwid}</code>\n\n`;
              }
              textReply += `ដើម្បីបញ្ជាទិញ License Key ឬទទួលបានព័ត៌មានគម្រោងតម្លៃ សូមចុចជ្រើសរើសគម្រោងខាងក្រោម៖\n`;

              const curHwid = telegramUserStates[chatId]?.hwid || extractedHwid || '';
              const inlineKeyboard = [];
              if (currentBotPricing.price1Month) {
                inlineKeyboard.push([
                  { text: `🗓️ Pro ១ ខែ (${currentBotPricing.price1Month})`, callback_data: `plan:1m:${curHwid}` }
                ]);
              }
              if (currentBotPricing.price1Year) {
                inlineKeyboard.push([
                  { text: `⭐ Pro ១ ឆ្នាំ (${currentBotPricing.price1Year})`, callback_data: `plan:1y:${curHwid}` }
                ]);
              }
              if (currentBotPricing.priceLifetime) {
                inlineKeyboard.push([
                  { text: `👑 Pro ពេញមួយជីវិត (${currentBotPricing.priceLifetime})`, callback_data: `plan:lifetime:${curHwid}` }
                ]);
              }
              inlineKeyboard.push([
                { text: `💬 ឆាតទាក់ទងលោកគ្រូ បូរី (@${adminUser}) ផ្ទាល់`, url: `https://t.me/${adminUser}` }
              ]);

              await sendTelegramMessage(chatId, textReply, 'HTML', { inline_keyboard: inlineKeyboard });
            }
          }

          // ----------------------------------------------------
          // CASE 2: USER CLICKS A PLAN INLINE BUTTON (STEP 2: SHOW KHQR & INSTRUCTIONS)
          // ----------------------------------------------------
          const cq = update.callback_query;
          if (cq && cq.data && cq.message && cq.message.chat) {
            const chatId = cq.message.chat.id;
            const dataParts = cq.data.split(':');
            const action = dataParts[0]; // 'plan', 'show_menu', 'approve', 'reject'
            const planKey = dataParts[1]; // '1m', '1y', 'lifetime'
            const hwid = dataParts[2] || '';

            await answerCallbackQuery(cq.id, 'កំពុងបង្ហាញព័ត៌មានបង់ប្រាក់...');

            if (action === 'plan') {
              telegramUserStates[chatId] = telegramUserStates[chatId] || { hwid: '' };
              telegramUserStates[chatId].plan = planKey;
              if (hwid && hwid.toUpperCase() !== 'BUY_LICENSE') telegramUserStates[chatId].email = hwid;
              saveTelegramStates(telegramUserStates);
              
              let planTitle = 'Pro ពេញមួយជីវិត (Lifetime)';
              let planPrice = currentBotPricing.priceLifetime || '$15';

              if (planKey === '1m') {
                planTitle = 'Pro ប្រចាំខែ (1 Month)';
                planPrice = currentBotPricing.price1Month || '$0.5';
              } else if (planKey === '1y') {
                planTitle = 'Pro ប្រចាំឆ្នាំ (1 Year)';
                planPrice = currentBotPricing.price1Year || '$2.5';
              }

              let reply = `🎉 <b>ព័ត៌មានបញ្ជាទិញ AC-Kahoot! Pro</b>\n\n`;
              reply += `🌟 <b>គម្រោងដែលបានជ្រើសរើស៖</b> ${planTitle}\n`;
              reply += `💵 <b>ចំនួនទឹកប្រាក់ត្រូវបង់៖</b> <b>${planPrice}</b>\n`;
              if (telegramUserStates[chatId].email) {
                reply += `💻 <b>Hardware Machine ID (HWID)៖</b>\n<code>${telegramUserStates[chatId].email}</code>\n\n`;
              } else {
                reply += `\n`;
              }

              // Banking details
              if (currentBotPricing.bankName || currentBotPricing.bankAccountNumber || currentBotPricing.bankAccountName) {
                reply += `🏦 <b>ព័ត៌មានស្កេនបង់ប្រាក់ KHQR / ធនាគារ៖</b>\n`;
                if (currentBotPricing.bankName) reply += `• <b>ធនាគារ៖</b> ${currentBotPricing.bankName}\n`;
                if (currentBotPricing.bankAccountName) reply += `• <b>ឈ្មោះគណនី៖</b> <code>${currentBotPricing.bankAccountName}</code>\n`;
                if (currentBotPricing.bankAccountNumber) reply += `• <b>លេខកុង៖</b> <code>${currentBotPricing.bankAccountNumber}</code>\n\n`;
              }

              if (currentBotPricing.customNotes) {
                reply += `\n💬 <i>${currentBotPricing.customNotes}</i>`;
              }

              const targetHwid = telegramUserStates[chatId].email || '';
              const inlineKeyboard = [
                [
                  { text: `🔄 ជ្រើសរើសគម្រោងផ្សេងទៀត (Choose Another Plan)`, callback_data: `show_menu:${targetHwid}` }
                ],
                [
                  { text: `💬 ឆាតទាក់ទងលោកគ្រូ បូរី ផ្ទាល់`, url: `https://t.me/${adminUser}` }
                ]
              ];

              let sentWithPhoto = false;
              if (currentBotPricing.khqrImage) {
                sentWithPhoto = await sendTelegramPhoto(chatId, currentBotPricing.khqrImage, reply, 'HTML', { inline_keyboard: inlineKeyboard });
              }

              if (!sentWithPhoto) {
                await sendTelegramMessage(chatId, reply, 'HTML', { inline_keyboard: inlineKeyboard });
              }
            } else if (action === 'show_menu') {
              // Return to step 1 menu
              const activeEmail = hwid || telegramUserStates[chatId]?.hwid || '';
              let reply = `🌟 <b>សូមចុចជ្រើសរើសគម្រោងដែលលោកគ្រូ/អ្នកគ្រូចង់ទិញ៖</b>\n\n`;
              if (activeEmail) reply += `💻 <b>Email៖</b> <code>${activeEmail}</code>\n\n`;
              if (currentBotPricing.price1Month) reply += `• <b>Pro ប្រចាំខែ (1 Month)៖</b> ${currentBotPricing.price1Month}\n`;
              if (currentBotPricing.price1Year) reply += `• <b>Pro ប្រចាំឆ្នាំ (1 Year)៖</b> ${currentBotPricing.price1Year}\n`;
              if (currentBotPricing.priceLifetime) reply += `• <b>Pro ពេញមួយជីវិត (Lifetime)៖</b> ${currentBotPricing.priceLifetime}\n\n`;

              const inlineKeyboard = [];
              if (currentBotPricing.price1Month) {
                inlineKeyboard.push([
                  { text: `🗓️ Pro ១ ខែ (${currentBotPricing.price1Month})`, callback_data: `plan:1m:${activeEmail}` }
                ]);
              }
              if (currentBotPricing.price1Year) {
                inlineKeyboard.push([
                  { text: `⭐ Pro ១ ឆ្នាំ (${currentBotPricing.price1Year})`, callback_data: `plan:1y:${activeEmail}` }
                ]);
              }
              if (currentBotPricing.priceLifetime) {
                inlineKeyboard.push([
                  { text: `👑 Pro ពេញមួយជីវិត (${currentBotPricing.priceLifetime})`, callback_data: `plan:lifetime:${activeEmail}` }
                ]);
              }
              inlineKeyboard.push([
                { text: `💬 ឆាតទាក់ទងលោកគ្រូ បូរី (@${adminUser}) ផ្ទាល់`, url: `https://t.me/${adminUser}` }
              ]);

              await sendTelegramMessage(chatId, reply, 'HTML', { inline_keyboard: inlineKeyboard });
            } else if (action === 'reject') {
              const customerChatId = dataParts[1];
              await answerCallbackQuery(cq.id, 'បានបដិសេធ!');
              
              await editTelegramMessageReplyMarkup(chatId, cq.message.message_id, { inline_keyboard: [] });
              await sendTelegramMessage(chatId, `❌ អ្នកបានបដិសេធវិក្កយបត្រខាងលើរួចរាល់។`, 'HTML');
              await sendTelegramMessage(customerChatId, `❌ <b>សូមអភ័យទោស!</b>\nវិក្កយបត្របង់ប្រាក់របស់អ្នកត្រូវបានបដិសេធ។ សូមទាក់ទងមកកាន់ @${adminUser} ដើម្បីបញ្ជាក់បន្ថែម។`, 'HTML');
            } else if (action === 'approve') {
              const customerChatId = dataParts[1];
              const specifiedPlan = dataParts[2] || '';
              
              const msgText = cq.message.text || cq.message.caption || '';
              const hwidMatch = msgText.match(/Email៖\s*([a-zA-Z0-9_-]+)/);
              const planMatch = msgText.match(/គម្រោង៖\s*Pro\s*(ប្រចាំខែ|ប្រចាំឆ្នាំ|ពេញមួយជីវិត)/);
              
              let customerEmail = hwidMatch ? hwidMatch[1] : (telegramUserStates[customerChatId]?.hwid || '');
              let plan = specifiedPlan || telegramUserStates[customerChatId]?.plan || 'lifetime';
              if (!specifiedPlan && planMatch) {
                 if (planMatch[1].includes('ប្រចាំខែ')) plan = '1m';
                 else if (planMatch[1].includes('ប្រចាំឆ្នាំ')) plan = '1y';
              }

              if (!customerEmail) {
                customerEmail = getHardwareFingerprint();
              }

              await answerCallbackQuery(cq.id, 'កំពុងបង្កើត Key និងផ្ញើ...');
              await editTelegramMessageReplyMarkup(chatId, cq.message.message_id, { inline_keyboard: [] });
              
              const typeMap = { '1m': 'pro_monthly', '1y': 'pro_annual', 'lifetime': 'pro_lifetime' };
              const daysMap = { pro_lifetime: 0, pro_annual: 365, pro_monthly: 30 };
              const planEnumMap = { pro_lifetime: 'PRO_LIFETIME', pro_annual: 'PRO_ANNUAL', pro_monthly: 'PRO_MONTHLY' };
              
              const type = typeMap[plan] || 'pro_lifetime';
              const keyStr = generateCryptographicKey(customerEmail, planEnumMap[type], daysMap[type]);
              
              const typeLabels = { pro_lifetime: 'Pro Lifetime (ប្រើមួយជីវិត)', pro_annual: 'Pro Annual (ប្រចាំឆ្នាំ)', pro_monthly: 'Pro Monthly (ប្រចាំខែ)' };

              const newKey = {
                id: `lic_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                key: keyStr,
                targetHwid: customerEmail,
                type,
                typeName: typeLabels[type] || 'Pro License',
                clientNote: 'Generated via 1-Click Telegram Bot Approval',
                used: false,
                usedBy: null,
                usedAt: null,
                createdAt: new Date().toISOString()
              };
              
              const licenses = loadLicenses();
              licenses.unshift(newKey);
              saveLicenses(licenses);
              
              await sendTelegramMessage(chatId, `✅ <b>បង្កើត និងផ្ញើ Key រួចរាល់!</b>\n<code>${keyStr}</code>\nHWID: <code>${customerEmail}</code>\nKey នេះត្រូវបានរក្សាទុកក្នុងប្រព័ន្ធដោយជោគជ័យ។`, 'HTML');
              
              let successMsg = `🎉 <b>ការបញ្ជាទិញទទួលបានជោគជ័យ!</b>\n\n`;
              successMsg += `អរគុណច្រើនដែលបានគាំទ្រប្រព័ន្ធគ្រប់គ្រងវិញ្ញាសា AC-Kahoot! 🙏\n`;
              successMsg += `នេះជា <b>License Key</b> របស់អ្នកសម្រាប់គម្រោង <b>${typeLabels[type]}</b>៖\n\n`;
              successMsg += `🔑 <code>${keyStr}</code>\n\n`;
              successMsg += `👉 <i>សូម Copy លេខកូដនេះ ទៅកាន់កម្មវិធី AC-Kahoot! ត្រង់ផ្ទាំងបញ្ចូល Key រួចចុច "បញ្ជាក់ Activation"។</i>`;
              
              await sendTelegramMessage(customerChatId, successMsg, 'HTML');
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn('[Telegram Poller] Polling cycle info:', err.message);
  }

  setTimeout(pollTelegramBot, 3500);
}

// Start polling
setTimeout(pollTelegramBot, 3000);

startServer();







