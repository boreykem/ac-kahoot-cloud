@echo off
:: Request Admin Privileges
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Requesting Administrator privileges...
    powershell -Command "Start-Process '%~dpnx0' -Verb RunAs"
    exit /b
)

echo ========================================================
echo   Opening Windows Firewall for AC-Kahoot (Port 3333)
echo ========================================================
echo.
netsh advfirewall firewall add rule name="AC-Kahoot Server" dir=in action=allow protocol=TCP localport=3333
echo.
echo Success! You can close this window now.
pause

