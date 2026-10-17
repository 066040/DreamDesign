@echo off
rem Starts DreamDesign with the photo-to-3D backend at http://localhost:8000
cd /d "%~dp0\..\server"
if not exist ..\.venv\Scripts\activate.bat (
  echo Run scripts\install.bat first.
  pause
  exit /b 1
)
call ..\.venv\Scripts\activate.bat
start "" cmd /c "timeout /t 5 >nul & start http://localhost:8000"
python -m uvicorn server:app --port 8000
pause
