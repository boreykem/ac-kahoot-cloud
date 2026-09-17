const fs = require('fs');
const path = require('path');

const serverFile = path.join(__dirname, '..', 'server', 'server.js');
let code = fs.readFileSync(serverFile, 'utf8');

const originalTop = fs.readFileSync(path.join(__dirname, 'original_top.js'), 'utf8');

// Find the split point in the current code
const splitPoint = "// Network info endpoint for game lobbies and QR codes";
if (code.includes(splitPoint)) {
  const bottomPart = code.substring(code.indexOf(splitPoint));
  const restoredCode = originalTop + '\n' + bottomPart;
  fs.writeFileSync(serverFile, restoredCode, 'utf8');
  console.log('Restored top part successfully');
} else {
  console.log('Split point not found!');
}
