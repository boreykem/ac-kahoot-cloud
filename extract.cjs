const fs = require('fs');
const txt = fs.readFileSync('build-release.ps1', 'utf8');

const m1 = txt.match(/\$CSharpSource = @"([\s\S]*?)"@/);
if (m1) {
    fs.writeFileSync('tools/Launcher.cs', m1[1].trim());
    console.log('Launcher.cs written');
}

const m2 = txt.match(/\$SetupCSharpSource = @"([\s\S]*?)"@/);
if (m2) {
    fs.writeFileSync('tools/Setup.cs', m2[1].trim());
    console.log('Setup.cs written');
}
