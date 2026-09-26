@echo off
rem Launch an isolated Edge debug instance (CDP port 9222, persistent profile).
rem Reuse the same profile so Tampermonkey and login states persist across runs.
setlocal
set "EDGE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not exist "%EDGE%" set "EDGE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
if not exist "%EDGE%" (
    echo Microsoft Edge not found. Edit the path in this script.
    exit /b 1
)
start "" "%EDGE%" --remote-debugging-port=9222 --user-data-dir="%~dp0edge-profile" --no-first-run --no-default-browser-check
endlocal
