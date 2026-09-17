const dotenv = require('dotenv');
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || 'AQ.Ab8RN6Lapc8gm7nNM1D5iHQpo-pMzaISkefOBEFjbRR7_p6KMQ';
const proModels = [
  'gemini-3.1-pro-preview',
  'gemini-pro-latest',
  'gemini-2.5-pro',
  'gemini-3.7-flash',
  'gemini-3.6-flash'
];

async function testProModels() {
  console.log('Testing Pro Deep Reasoning Models...');
  for (const m of proModels) {
    const s = Date.now();
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 60000); // 60s timeout
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'អ្នកគឺជាសាស្ត្រាចារ្យគរុកោសល្យ។ សូមបង្កើតកម្រងសំណួរ Kahoot កម្រិតឧត្តមសិក្សា ចំនួន ២ សំណួរជាភាសាខ្មែរ លើប្រធានបទ "គរុកោសល្យសតវត្សរ៍ទី២១":\n[{"id":"q1","question":"...","timeLimit":30,"points":10,"options":["A","B","C","D"],"correctIndex":0,"explanation":"..."}]' }] }],
          generationConfig: {
            temperature: 0.7,
            responseMimeType: "application/json"
          }
        })
      });
      clearTimeout(tid);
      const d = ((Date.now() - s)/1000).toFixed(2);
      if (res.ok) {
        const json = await res.json();
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        console.log(`✅ [${m}] SUCCESS in ${d}s!`);
        console.log('Output preview:', text ? text.substring(0, 180).replace(/\n/g, ' ') : 'null');
      } else {
        const err = await res.text();
        console.log(`❌ [${m}] HTTP ${res.status} in ${d}s: ${err.substring(0, 100)}`);
      }
    } catch(e) {
      clearTimeout(tid);
      console.log(`⏱️ [${m}] err/timeout in ${((Date.now() - s)/1000).toFixed(2)}s: ${e.message}`);
    }
  }
}
testProModels();
