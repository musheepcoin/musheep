@echo off
setlocal
cd /d "%~dp0"

set "CODEX_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if exist "%CODEX_NODE%" (
  set "NODE_EXE=%CODEX_NODE%"
) else (
  set "NODE_EXE=node"
)

start "ORIS Server" "%NODE_EXE%" server.mjs
timeout /t 2 >nul
start "" http://127.0.0.1:8787/index.html
