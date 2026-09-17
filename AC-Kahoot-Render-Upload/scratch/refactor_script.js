const fs = require('fs');
const path = require('path');

const serverFile = path.join(__dirname, 'server', 'server.js');
let code = fs.readFileSync(serverFile, 'utf8');

// Add DB import at the top
if (!code.includes('import connectDB')) {
  code = code.replace("import express from 'express';", "import express from 'express';\nimport connectDB from './config/db.js';\nimport User from './models/User.js';\nimport Quiz from './models/Quiz.js';\nimport Settings from './models/Settings.js';");
}

// Connect to DB after express app initialization
if (!code.includes('connectDB()')) {
  code = code.replace("const app = express();", "const app = express();\nconnectDB();");
}

// Fix endpoints: app.get/post/delete/put(..., (req, res) => { ... })
// -> app.get/post/delete/put(..., async (req, res) => { ... })
code = code.replace(/app\.(get|post|delete|put)\('([^']+)',\s*(?!async)(?:function\s*)?\((req,\s*res)\)\s*=>\s*\{/g, "app.$1('$2', async ($3) => {");
code = code.replace(/app\.(get|post|delete|put)\('([^']+)',\s*(?!async)(?:function\s*)?\((req,\s*res)\)\s*\{/g, "app.$1('$2', async ($3) => {");

// We also need to fix occurrences like:
// const users = loadUsers(); -> const users = await User.find();
code = code.replace(/const users = loadUsers\(\);/g, "const users = await User.find();");
code = code.replace(/let users = loadUsers\(\);/g, "let users = await User.find();");

// saveUsers(users);
// Because we are modifying the users array directly in the old code, with Mongoose we should probably do:
// await Promise.all(users.map(u => u.save())); or similar if it's documents.
// But wait, the old code mutates the array and calls saveUsers(users).
// If `users` is an array of Mongoose documents, we can't just `users.push(newUser); saveUsers(users)`.
// We need to do `await User.create(newUser)` or `await user.save()`.

fs.writeFileSync(path.join(__dirname, 'scratch', 'refactor_server.js'), code, 'utf8');
console.log('Done refactoring first pass');
