const dotenv = require('dotenv');
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

const models = [
  'gemini-2.5-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-flash-latest',
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.6-flash',
  'gemini-3.7-flash',
  'gemini-2.5-pro'
];

async function test() {
  for (const m of models) {
    const start = Date.now();
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Generate 2 questions about science in JSON format: [{"question":"...","options":["A","B","C","D"],"correctIndex":0,"explanation":"..."}]' }] }],
          generationConfig: {
            responseMimeType: 'application/json'
          }
        })
      });
      const dur = ((Date.now() - start) / 1000).toFixed(2);
      if (res.ok) {
        const data = await res.json();
        console.log(`✅ ${m}: SUCCESS in ${dur}s ->`, data.candidates?.[0]?.content?.parts?.[0]?.text?.substring(0, 100));
      } else {
        const err = await res.text();
        console.log(`❌ ${m}: HTTP ${res.status} in ${dur}s ->`, err.substring(0, 150));
      }
    } catch (e) {
      console.log(`❌ ${m}: Error ->`, e.message);
    }
  }
}

test();
