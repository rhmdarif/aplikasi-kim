@echo off
setlocal
title KIM - Local Server

set PORT=8080
set HOST=127.0.0.1
set URL=http://%HOST%:%PORT%/index.html

cd /d "%~dp0"

echo.
echo ================================
echo  KIM - Kesenian Irama Minang
echo  Local server running at:
echo    %URL%
echo ================================
echo.
echo  Tekan Ctrl+C untuk menghentikan server.
echo.

REM Buka browser secara otomatis setelah jeda singkat
start "" "%URL%"

REM Jalankan Python's built-in HTTP server
python -m http.server %PORT% --bind %HOST%

endlocal
