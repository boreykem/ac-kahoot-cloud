const dotenv = require('dotenv');
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || 'AQ.Ab8RN6Lapc8gm7nNM1D5iHQpo-pMzaISkefOBEFjbRR7_p6KMQ';
const models = [
  'gemini-flash-lite-latest',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.6-flash',
  'gemini-3.7-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.5-pro'
];

async function run() {
  for (const m of models) {
    const s = Date.now();
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 6000);
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Respond with 1 JSON object: {"id":"q1","question":"តើភពណាធំជាងគេ?","options":["ព្រហស្បតិ៍","ផែនដី","ពុធ","អង្គារ"],"correctIndex":0,"explanation":"..."}' }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      });
      clearTimeout(tid);
      const d = ((Date.now() - s)/1000).toFixed(2);
      if (res.ok) {
        const json = await res.json();
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        console.log(`✅ [${m}] in ${d}s: ${text ? text.replace(/\s+/g, ' ').substring(0, 70) : 'empty'}`);
      } else {
        console.log(`❌ [${m}] HTTP ${res.status} in ${d}s`);
      }
    } catch(e) {
      clearTimeout(tid);
      console.log(`⏱️ [${m}] timeout/err: ${e.message}`);
    }
  }
}
run();
