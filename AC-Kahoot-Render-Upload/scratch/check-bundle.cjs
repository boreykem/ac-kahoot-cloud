const fs = require('fs');
const content = fs.readFileSync('C:/Users/dell/AppData/Local/AC-Kahoot/server.bundle.js', 'utf8');
console.log('File size:', content.length);
console.log('Includes pollTelegramBot:', content.includes('pollTelegramBot'));
console.log('Includes /api/admin/bot-pricing:', content.includes('/api/admin/bot-pricing'));
console.log('Includes sendTelegramPhoto:', content.includes('sendTelegramPhoto'));
