@echo off
chcp 65001 >nul
title 🎯 AC-Kahoot! Interactive Learning Platform
cls
color 0B

echo ================================================================
echo   🎯  AC-Kahoot! - វេទិកាសិក្សាអន្តរកម្មកម្ពុជា
echo   ✨  Platform Owner: លោកគ្រូ បូរី (Teacher Borey)
echo ================================================================
echo.
echo  [1/2] កំពុងចាប់ផ្តើមប្រព័ន្ធ Server...
echo.

:: Launch the browser automatically after 1.5 seconds in background
start /min cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:3000"

echo  [2/2] កំពុងបើកកម្មវិធីរុករក (Web Browser)...
echo.
echo ================================================================
echo   👉 កម្មវិធីដំណើរការនៅ: http://localhost:3000
echo   👉 សម្រាប់សិស្ស Scan លេងលើទូរស័ព្ទក្នុងថ្នាក់រៀន!
echo   (កុំបិទផ្ទាំងខ្មៅនេះនៅពេលកំពុងបង្រៀន)
echo ================================================================
echo.

node server/server.js
pause
