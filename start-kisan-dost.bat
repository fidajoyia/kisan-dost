@echo off
title Kisan Dost
cd /d "%~dp0"
where node >/dev/null 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Install the LTS version from https://nodejs.org and run this file again.
  pause
  exit /b
)
echo Checking packages...
call npm install --no-audit --no-fund
if errorlevel 1 ( pause & exit /b )
echo.
echo Kisan Dost is starting at http://localhost:3000  - keep this window open.
echo (If port 3000 is busy it will use 3001.)
call npm run dev
pause
