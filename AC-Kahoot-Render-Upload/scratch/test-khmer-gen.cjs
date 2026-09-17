const dotenv = require('dotenv');
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

const promptText = `អ្នកគឺជាសាស្ត្រាចារ្យ និងអ្នកជំនាញកម្រិតកំពូលខាងគរុកោសល្យ និងការវាស់ស្ទង់ការអប់រំ។
សូមបង្កើតកម្រងសំណួរអន្តរកម្មស្ទីល Kahoot ចំនួន 5 សំណួរ ជាភាសាខ្មែរត្រឹមត្រូវក្បោះក្បាយ ១០០% ដោយផ្អែកលើប្រធានបទ: "ប្រវត្តិសាស្ត្រកម្ពុជាសម័យអង្គរ"
សម្រាប់កម្រិត៖ "មធ្យមសិក្សា / អនុវិទ្យាល័យ"

តម្រូវការទម្រង់ឆ្លើយតប (JSON Array តែមួយគត់ គ្មាន markdown syntax ក្រៅពី JSON Array):
[
  {
    "id": "q1",
    "question": "ខ្លឹមសារសំណួរជាភាសាខ្មែរ",
    "timeLimit": 20,
    "points": 1000,
    "options": [
      "ជម្រើសទី ១",
      "ជម្រើសទី ២",
      "ជម្រើសទី ៣",
      "ជម្រើសទី ៤"
    ],
    "correctIndex": 0,
    "explanation": "ការពន្យល់ច្បាស់លាស់"
  }
]`;

async function test() {
  const models = ['gemini-3.1-flash-lite', 'gemini-3.5-flash', 'gemini-flash-lite-latest'];
  for (const m of models) {
    const start = Date.now();
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            responseMimeType: 'application/json'
          }
        })
      });
      const dur = ((Date.now() - start) / 1000).toFixed(2);
      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        const parsed = JSON.parse(text);
        console.log(`✅ ${m} generated ${parsed.length} questions in ${dur}s:`);
        parsed.forEach((q, idx) => {
          console.log(`  Q${idx+1}: ${q.question} (Answer: ${q.options[q.correctIndex]})`);
        });
        break;
      } else {
        console.log(`❌ ${m} failed in ${dur}s: ${res.status}`);
      }
    } catch (e) {
      console.log(`❌ ${m} error:`, e.message);
    }
  }
}

test();
