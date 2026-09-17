# Simple compilation script for AC-Kahoot
# If you have your original compile-exe.ps1, please replace this file with it.

Write-Host "Compiling AC-Kahoot to .exe..."
npm install -g pkg
pkg server/server.js --target node18-win-x64 --output ac-kahoot.exe
Write-Host "Compilation finished!"
