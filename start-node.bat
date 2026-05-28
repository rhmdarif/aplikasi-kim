@echo off
setlocal
title KIM - Local Server (Node)

set PORT=8080
set HOST=127.0.0.1
set URL=http://%HOST%:%PORT%/index.html

cd /d "%~dp0"

echo.
echo ================================
echo  KIM - Kesenian Irama Minang
echo  Local server (Node) at:
echo    %URL%
echo ================================
echo.
echo  Tekan Ctrl+C untuk menghentikan.
echo.

start "" "%URL%"

REM npx serve = static file server tanpa instalasi global
npx --yes serve -l %PORT% .

endlocal
