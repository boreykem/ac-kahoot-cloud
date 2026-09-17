const fs = require('fs');
const path = require('path');

const serverFile = path.join(__dirname, '..', 'server', 'server.js');
let code = fs.readFileSync(serverFile, 'utf8');

// 1. Remove DB imports and connectDB
code = code.replace(`import express from 'express';\nimport connectDB from './config/db.js';\nimport User from './models/User.js';\nimport Quiz from './models/Quiz.js';\nimport Settings from './models/Settings.js';`, "import express from 'express';");

code = code.replace("const app = express();\nconnectDB();", "const app = express();");

// Define exact strings that were inserted
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

// Wait, since I don't have the original string `registerOld` verbatim (it was a regex match), I can't easily replace back!
// BUT I have the FULL ORIGINAL text of `server/server.js` from my FIRST `view_file` call at 10:01:14 before I modified it!!!
// Wait, I only viewed lines 1 to 800 of `server.js` initially.
// I did NOT view the whole file. It was 2672 lines.
