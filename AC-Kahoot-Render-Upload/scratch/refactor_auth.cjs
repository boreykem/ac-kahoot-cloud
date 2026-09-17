const fs = require('fs');
const path = require('path');

const serverFile = path.join(__dirname, '..', 'server', 'server.js');
let code = fs.readFileSync(serverFile, 'utf8');

// 1. Add DB imports and connectDB
if (!code.includes('import connectDB')) {
  code = code.replace("import express from 'express';", 
`import express from 'express';
import connectDB from './config/db.js';
import User from './models/User.js';
import Quiz from './models/Quiz.js';
import Settings from './models/Settings.js';`);
}

if (!code.includes('connectDB();')) {
  code = code.replace("const app = express();", "const app = express();\nconnectDB();");
}

// 2. Remove loadUsers and saveUsers functions, or just leave them but they won't be used
// Actually, let's leave them for now so we don't break anything unexpectedly, and just refactor the routes.

// 3. Refactor Auth Register
const registerOld = /app\.post\('\/api\/auth\/register',\s*\(req,\s*res\)\s*=>\s*\{[\s\S]*?res\.json\(\{ success: true, user: safeUser, message: '🎉 បានចុះឈ្មោះបង្កើតគណនីដោយជោគជ័យ!' \}\);\s*\}\);/;
const registerNew = `app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, school, avatar, licenseKey } = req.body;
  const cleanName = (name || '').trim();
  const cleanEmail = (email || '').toLowerCase().trim();
  const cleanPassword = (password || '').trim();

  if (!cleanName || !cleanEmail || !cleanPassword) {
    return res.status(400).json({ success: false, message: 'សូមបំពេញព័ត៌មានឱ្យបានគ្រប់គ្រាន់!' });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
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
    id: \`teacher_\${Date.now()}\`,
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
});`;
code = code.replace(registerOld, registerNew);

// 4. Refactor Auth Login
const loginOld = /app\.post\('\/api\/auth\/login',\s*\(req,\s*res\)\s*=>\s*\{[\s\S]*?res\.json\(\{ success: true, user: safeUser \}\);\s*\}\);/;
const loginNew = `app.post('/api/auth/login', async (req, res) => {
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
});`;
code = code.replace(loginOld, loginNew);

// 5. Refactor Change Password
const cpOld = /app\.post\('\/api\/auth\/change-password',\s*\(req,\s*res\)\s*=>\s*\{[\s\S]*?res\.json\(\{ success: true, message: 'បានប្តូរលេខសម្ងាត់ថ្មីដោយជោគជ័យ!' \}\);\s*\}\);/;
const cpNew = `app.post('/api/auth/change-password', async (req, res) => {
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
});`;
code = code.replace(cpOld, cpNew);

// 6. Refactor Update Profile
const upOld = /app\.post\('\/api\/auth\/update-profile',\s*\(req,\s*res\)\s*=>\s*\{[\s\S]*?res\.json\(\{ success: true, user: safeUser, message: 'បានកែប្រែព័ត៌មាន និងលេខសម្ងាត់ដោយជោគជ័យ!' \}\);\s*\}\);/;
const upNew = `app.post('/api/auth/update-profile', async (req, res) => {
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
});`;
code = code.replace(upOld, upNew);

// 7. Refactor Admin Delete User
const delUserOld = /app\.delete\('\/api\/admin\/users\/:id',\s*\(req,\s*res\)\s*=>\s*\{[\s\S]*?res\.json\(\{ success: true \}\);\s*\}\);/;
const delUserNew = `app.delete('/api/admin/users/:id', async (req, res) => {
  const { id } = req.params;
  const target = await User.findOne({ id: id });
  if (target && target.role === 'superadmin') {
    return res.status(403).json({ success: false, message: 'Cannot delete master admin' });
  }
  await User.deleteOne({ id: id });
  res.json({ success: true });
});`;
code = code.replace(delUserOld, delUserNew);

// 8. Refactor Admin Get Users
const getUsersOld = /app\.get\('\/api\/admin\/users',\s*\(req,\s*res\)\s*=>\s*\{[\s\S]*?res\.json\(\{ success: true, users \}\);\s*\}\);/;
const getUsersNew = `app.get('/api/admin/users', async (req, res) => {
  const users = await User.find({}, '-password').lean();
  res.json({ success: true, users });
});`;
code = code.replace(getUsersOld, getUsersNew);

fs.writeFileSync(serverFile, code, 'utf8');
console.log('Refactored Auth/User routes');
