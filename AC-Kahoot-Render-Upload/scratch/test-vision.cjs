const dotenv = require('dotenv');
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

async function testVision() {
  const dummyBase64 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64').toString('base64');
  const models = ['gemini-3.1-flash-lite', 'gemini-3.5-flash', 'gemini-flash-lite-latest'];
  for (const m of models) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: 'Describe what you see briefly.' },
              { inline_data: { mime_type: 'image/png', data: dummyBase64 } }
            ]
          }]
        })
      });
      console.log(`Vision ${m}: HTTP ${res.status}`);
      if (res.ok) {
        const d = await res.json();
        console.log('Result:', d.candidates?.[0]?.content?.parts?.[0]?.text);
      }
    } catch (e) {
      console.log(`Vision ${m} err:`, e.message);
    }
  }
}

testVision();
