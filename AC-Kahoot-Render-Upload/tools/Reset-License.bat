@echo off
title AC-Kahoot! License Reset Tool
color 0B
echo ===================================================
echo     AC-Kahoot! License Reset Tool (For Testing)
echo ===================================================
echo.
echo Closing running AC-Kahoot processes...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM AC-Kahoot.exe >nul 2>&1
timeout /t 1 /nobreak >nul

echo.
echo Deleting active license files...
del /F /Q "%LOCALAPPDATA%\license.active.json" >nul 2>&1
del /F /Q "%LOCALAPPDATA%\AC-Kahoot\license.active.json" >nul 2>&1
del /F /Q "%~dp0..\server\license.active.json" >nul 2>&1
del /F /Q "%~dp0..\license.active.json" >nul 2>&1

echo.
echo ===================================================
echo [OK] License successfully removed from this PC!
echo      Your AC-Kahoot is now back to Free Edition.
echo ===================================================
echo.
echo Starting AC-Kahoot...
start "" "%LOCALAPPDATA%\AC-Kahoot\AC-Kahoot.exe"
echo.
pause
