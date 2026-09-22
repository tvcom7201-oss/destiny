@echo off
chcp 65001 >nul
cd /d "%~dp0"
title TEPSA 007 - Web Server
color 0B
cls

echo ===================================================
echo         TEPSA 007 - Web Server
echo ===================================================
echo.
echo [1] Opening browser at http://localhost:8007 ...
echo [2] Web server is running on port 8007.
echo     (Close this window or run "ปิดเว็บ.bat" to stop)
echo.

start http://localhost:8007
python -m http.server 8007

if errorlevel 1 (
    echo.
    echo Python server failed, opening index.html directly...
    start index.html
    pause
)
