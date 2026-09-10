@echo off
setlocal
cd /d "%~dp0"
start "Battle Life server" /min "F:\Python\python.exe" -m http.server 4173 --bind 127.0.0.1
timeout /t 1 /nobreak > nul
start "" "http://localhost:4173"
endlocal
