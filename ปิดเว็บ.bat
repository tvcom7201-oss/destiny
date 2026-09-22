@echo off
chcp 65001 >nul
cd /d "%~dp0"
title TEPSA 007 - Stop Server
color 0C
cls

echo ===================================================
echo         TEPSA 007 - Stop Web Server
echo ===================================================
echo.
echo Stopping server on port 8007...

powershell -NoProfile -Command "try { $conns = Get-NetTCPConnection -LocalPort 8007 -ErrorAction Stop; foreach ($c in $conns) { Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue }; Write-Host '[OK] ปิดเซิร์ฟเวอร์เรียบร้อยแล้ว' -ForegroundColor Green } catch { Write-Host '[INFO] เซิร์ฟเวอร์ไม่ได้เปิดอยู่' -ForegroundColor Yellow }"

echo.
echo Done.
ping 127.0.0.1 -n 2 >nul
exit
