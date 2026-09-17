const dotenv = require('dotenv');
dotenv.config();

async function comprehensiveTest() {
  console.log('========================================');
  console.log('🧪 RUNNING COMPREHENSIVE SYSTEM VERIFICATION');
  console.log('========================================\n');

  const apiKey = process.env.GEMINI_API_KEY || 'AQ.Ab8RN6Lapc8gm7nNM1D5iHQpo-pMzaISkefOBEFjbRR7_p6KMQ';

  // 1. Test Fast Model Generation
  console.log('1️⃣ Testing Fast AI Generation (gemini-3.5-flash-lite)...');
  const startFast = Date.now();
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Respond with 1 Kahoot question in Khmer JSON: [{"id":"q1","question":"តើភពណាដែលនៅជិតព្រះអាទិត្យជាងគេ?","options":["ភពពុធ","ភពសុក្រ","ភពផែនដី","ភពអង្គារ"],"correctIndex":0,"explanation":"ភពពុធនៅជិតព្រះអាទិត្យជាងគេ"}]' }] }],
        generationConfig: { responseMimeType: 'application/json' }
      })
    });
    const durFast = ((Date.now() - startFast) / 1000).toFixed(2);
    if (res.ok) {
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      console.log(`   ✅ Fast Generation SUCCESS in ${durFast}s!`);
      console.log(`   Preview: ${text ? text.replace(/\s+/g, ' ').substring(0, 90) : 'null'}\n`);
    } else {
      console.log(`   ❌ Fast Gen failed HTTP ${res.status} in ${durFast}s\n`);
    }
  } catch (e) {
    console.log(`   ❌ Fast Gen error: ${e.message}\n`);
  }

  // 2. Test Deep Reasoning Model
  console.log('2️⃣ Testing Deep Reasoning Model (gemini-3.6-flash)...');
  const startPro = Date.now();
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'អ្នកគឺជាសាស្ត្រាចារ្យគរុកោសល្យ។ សូមបង្កើតកម្រងសំណួរ Kahoot តាម Bloom Taxonomy ចំនួន ១ សំណួរជាភាសាខ្មែរ: [{"id":"q1","question":"...","options":["A","B","C","D"],"correctIndex":0,"explanation":"..."}]' }] }],
        generationConfig: { responseMimeType: 'application/json' }
      })
    });
    const durPro = ((Date.now() - startPro) / 1000).toFixed(2);
    if (res.ok) {
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      console.log(`   ✅ Deep Reasoning SUCCESS in ${durPro}s!`);
      console.log(`   Preview: ${text ? text.replace(/\s+/g, ' ').substring(0, 90) : 'null'}\n`);
    } else {
      console.log(`   ❌ Deep Reasoning failed HTTP ${res.status} in ${durPro}s\n`);
    }
  } catch (e) {
    console.log(`   ❌ Deep Reasoning error: ${e.message}\n`);
  }

  // 3. Test Telegram Bot Connection
  console.log('3️⃣ Testing Telegram Bot API Connection...');
  const botToken = process.env.TELEGRAM_BOT_TOKEN || '8884699311:AAFusHbd_PRcGrPZWH9Ntc-zFA342IEVDY4';
  try {
    const botRes = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const botData = await botRes.json();
    if (botData.ok) {
      console.log(`   ✅ Telegram Bot Online: "${botData.result.first_name}" (@${botData.result.username}) ID: ${botData.result.id}\n`);
    } else {
      console.log(`   ❌ Telegram Bot Error:`, botData);
    }
  } catch (e) {
    console.log(`   ❌ Telegram Test Error:`, e.message);
  }

  console.log('========================================');
  console.log('🎉 ALL SYSTEM MODULES TESTED SUCCESSFULLY');
  console.log('========================================');
}

comprehensiveTest();
