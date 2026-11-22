@echo off
setlocal
set "ROOT=%~dp0.."
set "CLI="

if exist "%ROOT%\target\release\paperloom.exe" set "CLI=%ROOT%\target\release\paperloom.exe"
if not defined CLI if exist "%ROOT%\target\x86_64-pc-windows-msvc\release\paperloom.exe" set "CLI=%ROOT%\target\x86_64-pc-windows-msvc\release\paperloom.exe"
if not defined CLI if exist "%ROOT%\target\debug\paperloom.exe" set "CLI=%ROOT%\target\debug\paperloom.exe"

if not defined CLI (
  for /f "delims=" %%P in ('where paperloom 2^>nul') do if not defined CLI set "CLI=%%P"
)

if not defined CLI (
  echo PaperLoom CLI not found. Build it with cargo build --release --bin paperloom or add it to PATH. 1>&2
  exit /b 1
)

"%CLI%" agent mcp %*
