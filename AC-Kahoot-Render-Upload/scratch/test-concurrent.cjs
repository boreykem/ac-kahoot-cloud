const dotenv = require('dotenv');
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

const models = [
  'gemini-flash-lite-latest',
  'gemini-flash-latest',
  'gemini-pro-latest',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.6-flash',
  'gemini-3.7-flash',
  'gemini-3.8-flash',
  'gemini-3.1-flash-lite',
  'gemini-3.1-pro-preview',
  'gemini-2.5-pro'
];

async function testOne(m) {
  const start = Date.now();
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 12000);
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Respond with valid JSON: [{"q":"1+1?","a":2}]' }] }],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      })
    });
    clearTimeout(to);
    const dur = ((Date.now() - start) / 1000).toFixed(2);
    if (res.ok) {
      const data = await res.json();
      console.log(`✅ ${m}: SUCCESS in ${dur}s ->`, data.candidates?.[0]?.content?.parts?.[0]?.text?.replace(/\n/g, ' '));
    } else {
      const err = await res.text();
      console.log(`❌ ${m}: HTTP ${res.status} in ${dur}s ->`, err.substring(0, 100).replace(/\n/g, ' '));
    }
  } catch (e) {
    const dur = ((Date.now() - start) / 1000).toFixed(2);
    console.log(`❌ ${m}: ${e.name === 'AbortError' ? 'TIMEOUT (12s)' : e.message} in ${dur}s`);
  }
}

async function run() {
  console.log('Testing models concurrently...');
  await Promise.all(models.map(testOne));
  console.log('Done!');
}

run();
