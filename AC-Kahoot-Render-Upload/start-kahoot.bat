@echo off
echo ======================================================================
echo   🎯 AC-Kahoot! - វេទិកាសំណួរ & សិក្សាល្បែងអន្តរកម្មកម្ពុជា
echo   ⚡ Powered by Font Kantumruy Pro & Gemini AI
echo ======================================================================
echo.
echo កំពុងចាប់ផ្តើម Server... សូមរង់ចាំបន្តិច!
echo.

start "AC-Kahoot Server" node server/server.js

timeout /t 2 >nul
echo ជោគជ័យ! កំពុងបើកកម្មវិធីរុករក...
start http://localhost:3333
