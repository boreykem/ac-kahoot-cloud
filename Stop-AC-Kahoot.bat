@echo off
chcp 65001 >nul
title 🛑 Stop AC-Kahoot! Server
cls
echo ================================================================
echo   🛑 កំពុងបិទដំណើរការ AC-Kahoot! Server...
echo ================================================================
taskkill /F /IM node.exe >nul 2>&1
echo.
echo ✓ បានបិទ Server ដោយជោគជ័យ!
echo.
timeout /t 2 >nul
