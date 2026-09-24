const JavaScriptObfuscator = require('javascript-obfuscator');
const fs = require('fs');
const path = require('path');

const targetFile = process.argv[2] || path.join(__dirname, '../dist-server/index.js');

if (!fs.existsSync(targetFile)) {
  console.error(`Target file ${targetFile} does not exist!`);
  process.exit(1);
}

console.log(`🔒 Obfuscating ${targetFile} with Military-Grade Protection...`);
const code = fs.readFileSync(targetFile, 'utf-8');

try {
  const obfuscationResult = JavaScriptObfuscator.obfuscate(code, {
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.5,
    deadCodeInjection: false, // keep fast startup
    debugProtection: false,
    disableConsoleOutput: false,
    identifierNamesGenerator: 'hexadecimal',
    numbersToExpressions: true,
    renameGlobals: false,
    selfDefending: false,
    simplify: true,
    splitStrings: true,
    splitStringsChunkLength: 8,
    stringArray: true,
    stringArrayCallsTransform: true,
    stringArrayEncoding: ['base64'],
    stringArrayThreshold: 0.8,
    transformObjectKeys: true,
    unicodeEscapeSequence: false
  });

  fs.writeFileSync(targetFile, obfuscationResult.getObfuscatedCode(), 'utf-8');
  console.log(`✅ Code successfully obfuscated! File size: ${(fs.statSync(targetFile).size / 1024).toFixed(1)} KB`);
} catch (err) {
  console.error('⚠️ Obfuscation error:', err.message);
  process.exit(1);
}
