const dotenv = require('dotenv');
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || 'AQ.Ab8RN6Lapc8gm7nNM1D5iHQpo-pMzaISkefOBEFjbRR7_p6KMQ';
const models = [
  'gemini-flash-lite-latest',
  'gemini-flash-latest',
  'gemini-pro-latest',
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-3.5-flash',
  'gemini-3.7-flash'
];

async function run() {
  for (const m of models) {
    const s = Date.now();
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Respond with a valid JSON array with 1 quiz question in Khmer about science: [{"id":"q1","question":"...","options":["A","B","C","D"],"correctIndex":0,"explanation":"..."}]' }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      });
      const d = ((Date.now() - s)/1000).toFixed(2);
      if (res.ok) {
        const json = await res.json();
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        console.log(`✅ [${m}] SUCCESS in ${d}s: ${text ? text.replace(/\n/g, ' ').substring(0, 95) : 'empty'}`);
      } else {
        const err = await res.text();
        console.log(`❌ [${m}] HTTP ${res.status} in ${d}s: ${err.substring(0, 100)}`);
      }
    } catch(e) {
      console.log(`❌ [${m}] err:`, e.message);
    }
  }
}
run();
