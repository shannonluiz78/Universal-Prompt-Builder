@echo off
cd /d "%~dp0"
echo.
echo Starting Prompt Builder V1.2 at http://127.0.0.1:8765
start "" "http://127.0.0.1:8765"
where py >nul 2>nul
if %errorlevel% == 0 (
  py -3 server.py --port 8765
) else (
  python server.py --port 8765
)
echo.
echo If this did not start, check that Python 3 is installed.
pause
