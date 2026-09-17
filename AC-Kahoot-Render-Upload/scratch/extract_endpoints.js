const fs = require('fs');
const path = require('path');
const serverPath = path.join(__dirname, 'server', 'server.js');
const code = fs.readFileSync(serverPath, 'utf8');

const regex = /app\.(get|post|put|delete)\('([^']+)'/g;
let match;
const endpoints = [];
while ((match = regex.exec(code)) !== null) {
  endpoints.push(`${match[1].toUpperCase()} ${match[2]}`);
}

fs.writeFileSync(path.join(__dirname, 'scratch', 'endpoints.txt'), endpoints.join('\n'), 'utf8');
