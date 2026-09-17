import express from 'express';
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
  const rawString = \`\${os.hostname()}-\${os.platform()}-\${os.arch()}-\${macStr || 'ack-hw-default'}\`;
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
app.post('/api/auth/register', (req, res) => {
  const { name, email, password, school, avatar, licenseKey } = req.body;
  const cleanName = (name || '').trim();
  const cleanEmail = (email || '').toLowerCase().trim();
  const cleanPassword = (password || '').trim();

  if (!cleanName || !cleanEmail || !cleanPassword) {
    return res.status(400).json({ success: false, message: 'សូមបំពេញព័ត៌មានឱ្យបានគ្រប់គ្រាន់!' });
  }

  // Basic email format check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return res.status(400).json({ success: false, message: 'ទម្រង់អ៊ីមែលមិនត្រឹមត្រូវឡើយ (ឧ. name@domain.com)!' });
  }

  const users = loadUsers();
  if (users.find(u => u.email.toLowerCase().trim() === cleanEmail)) {
    return res.status(400).json({ success: false, message: 'អ៊ីមែលនេះមានគណនីរួចហើយ!' });
  }

  // Check active machine license or provided license key
  const machineLicense = loadActiveLicense();
  let userLicense = (machineLicense && machineLicense.valid) ? machineLicense.plan : 'free';

  if (licenseKey && licenseKey.trim()) {
    const actResult = saveActiveLicense(licenseKey.trim(), cleanName);
    if (actResult.success) {
      userLicense = actResult.license.plan;
    }
  }

  const currentHwid = getHardwareFingerprint();

  const newUser = {
    id: \`teacher_\${Date.now()}\`,
    name: cleanName,
    email: cleanEmail,
    password: cleanPassword,
    school: (school || '').trim() || 'គ្រឹះស្ថានអប់រំកម្ពុជា',
    avatar: avatar || '👨‍🏫',
    role: 'teacher',
    license: userLicense,
    boundDeviceId: currentHwid,
    boundDeviceName: \`\${os.hostname()} (\${os.platform()})\`,
    aiGenerationsCount: 0,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  saveUsers(users);

  const { password: _, ...safeUser } = newUser;
  res.json({ success: true, user: safeUser, message: '🎉 បានចុះឈ្មោះបង្កើតគណនីដោយជោគជ័យ!' });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const users = loadUsers();
  const user = users.find(u => 
    u.email.toLowerCase() === (email || '').toLowerCase().trim() && 
    u.password === (password || '').trim()
  );

  if (!user) {
    return res.status(401).json({ success: false, message: 'អ៊ីមែល ឬលេខសម្ងាត់មិនត្រឹមត្រូវឡើយ!' });
  }

  // Hardware Device ID Verification (Anti-Account Sharing Lock)
  const currentDeviceId = getMachineId();
  if (user.role !== 'superadmin' && user.boundDeviceId && user.boundDeviceId !== currentDeviceId) {
    return res.status(403).json({
      success: false,
      message: \`🔒 គណនី Pro នេះត្រូវបានចាក់សោភ្ជាប់ជាមួយកុំព្យូទ័រផ្សេង (\${user.boundDeviceName || user.boundDeviceId}) រួចហើយ! មិនអាចយកមកប្រើលើកុំព្យូទ័រនេះឡើយ។ សូមទាក់ទងលោកគ្រូម្ចាស់កម្មវិធីដើម្បីផ្ទេរម៉ាស៊ីន (Transfer License)។\`
    });
  }

  const { password: _, ...safeUser } = user;
  res.json({ success: true, user: safeUser });
});

// Change Password Endpoint (for logged-in user or master admin)
app.post('/api/auth/change-password', (req, res) => {
  const { userId, currentPassword, newPassword } = req.body;
  if (!userId || !newPassword) {
    return res.status(400).json({ success: false, message: 'សូមបញ្ចូលលេខសម្ងាត់ថ្មី!' });
  }
  const users = loadUsers();
  const user = users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ success: false, message: 'រកមិនឃើញគណនីនេះទេ!' });
  }
  if (currentPassword && user.password !== currentPassword.trim()) {
    return res.status(400).json({ success: false, message: 'លេខសម្ងាត់ចាស់មិនត្រឹមត្រូវឡើយ!' });
  }
  user.password = newPassword.trim();
  saveUsers(users);
  res.json({ success: true, message: 'បានប្តូរលេខសម្ងាត់ថ្មីដោយជោគជ័យ!' });
});

// Update Profile & Password Endpoint (for teachers and users)
app.post('/api/auth/update-profile', (req, res) => {
  const { userId, name, school, avatar, currentPassword, newPassword } = req.body;
  if (!userId) return res.status(400).json({ success: false, message: 'User ID is required' });
  const users = loadUsers();
  const user = users.find(u => u.id === userId);
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

  saveUsers(users);
  const { password: _, ...safeUser } = user;
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
        from: \`"AC-Kahoot! Security" <\${process.env.SMTP_USER}>\`,
        to: targetEmail,
        subject: \`[AC-Kahoot!] លេខកូដសម្ងាត់ប្តូរលេខសម្ងាត់របស់អ្នក៖ \${otpCode}\`,
        html: \`
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 25px; border-radius: 16px; background: #1a0836; color: #ffffff;">
            <h2 style="color: #ffd700; margin-top: 0;">AC-Kahoot! វេទិកាសិក្សា</h2>
            <p>សួស្តី <strong>\${userName || 'លោកគ្រូ/អ្នកគ្រូ'}</strong>,</p>
            <p>អ្នកបានស្នើសុំប្តូរលេខសម្ងាត់សម្រាប់គណនី (\${targetEmail})។ នេះជាលេខកូដផ្ទៀងផ្ទាត់ ៦ ខ្ទង់របស់អ្នក៖</p>
            <div style="background: #3c1361; padding: 18px; border-radius: 12px; text-align: center; margin: 20px 0; border: 1px solid #a855f7;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #ffd700;">\${otpCode}</span>
            </div>
            <p style="font-size: 12px; color: #d8b4fe;">លេខកូដនេះមានសុពលភាពរយៈពេល ១៥ នាទី។ ប្រសិនបើអ្នកមិនបានស្នើសុំទេ សូមកុំចែករំលែកលេខកូដនេះទៅកាន់អ្នកណាឡើយ។</p>
          </div>
        \`
      });
      console.log(\`[Email] OTP sent successfully to \${targetEmail}\`);
      return true;
    } catch (err) {
      console.error("[Email] SMTP send error:", err);
    }
  }

  // Backup log for local development
  console.log(\`\\n======================================================\`);
  console.log(\`🔑 [AC-Kahoot! OTP] Password Reset for: \${targetEmail}\`);
  console.log(\`👉 OTP Code: \${otpCode} (Valid for 15 mins)\`);
  console.log(\`======================================================\\n\`);
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
    message: \`បានផ្ញើលេខកូដសម្ងាត់ ៦ ខ្ទង់ទៅកាន់ \${email} រួចរាល់!\`,
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
app.post('/api/admin/users/:id/reset-password', (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;
  if (!newPassword) {
    return res.status(400).json({ success: false, message: 'សូមបញ្ចូលលេខសម្ងាត់ថ្មី!' });
  }
  const users = loadUsers();
  const user = users.find(u => u.id === id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'រកមិនឃើញគណនីនេះទេ!' });
  }
  user.password = newPassword.trim();
  saveUsers(users);
  res.json({ success: true, message: \`បានកំណត់លេខសម្ងាត់ថ្មីសម្រាប់ \${user.name} រួចរាល់!\` });
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

app.get('/api/admin/users', (req, res) => {
  const users = loadUsers().map(({ password, ...u }) => u);
  res.json({ success: true, users });
});

app.post('/api/admin/users/:id/license', (req, res) => {
  const { id } = req.params;
  const { license } = req.body;
  const users = loadUsers();
  const user = users.find(u => u.id === id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  user.license = license || 'free';
  saveUsers(users);
  res.json({ success: true, user });
});

app.delete('/api/admin/users/:id', (req, res) => {
  const { id } = req.params;
  let users = loadUsers();
  const target = users.find(u => u.id === id);
  if (target && target.role === 'superadmin') {
    return res.status(403).json({ success: false, message: 'Cannot delete master admin' });
  }
  users = users.filter(u => u.id !== id);
  saveUsers(users);
  res.json({ success: true });
});

// Network info endpoint for game lobbies and QR codes
