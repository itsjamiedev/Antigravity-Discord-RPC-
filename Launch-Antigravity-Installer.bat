@echo off
title Antigravity Presence Setup Launcher
cd /d "%~dp0desktop-app"
if not exist "node_modules\electron" (
  echo [Antigravity Setup] Installing desktop runtime...
  call npm install
)
start "" "node_modules\electron\dist\electron.exe" . --installer
