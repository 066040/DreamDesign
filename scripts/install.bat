@echo off
rem DreamDesign - optional photo-to-3D backend installer (Windows, Python 3.11)
rem The web app itself needs NO install: open docs\index.html or the GitHub Pages link.
setlocal
cd /d "%~dp0\.."

py -3.11 -V >nul 2>nul
if errorlevel 1 (
  echo.
  echo Python 3.11 is required. Install it from https://www.python.org/downloads/release/python-3119/
  echo ^(tick "Add python.exe to PATH" and "py launcher"^), then run this script again.
  pause
  exit /b 1
)

if not exist .venv\Scripts\python.exe (
  echo Creating virtual environment...
  py -3.11 -m venv .venv || goto :fail
)
call .venv\Scripts\activate.bat
python -m pip install --upgrade pip "setuptools<81" wheel || goto :fail

where nvidia-smi >nul 2>nul
if errorlevel 1 (
  echo No NVIDIA GPU found - installing CPU PyTorch ^(slow, but works^).
  set TORCHURL=https://download.pytorch.org/whl/cpu
) else (
  echo NVIDIA GPU found - installing CUDA PyTorch.
  set TORCHURL=https://download.pytorch.org/whl/cu121
)
pip install torch torchvision --index-url %TORCHURL% || goto :fail

if not exist server\TripoSR\tsr (
  where git >nul 2>nul
  if errorlevel 1 (
    echo git not found - downloading TripoSR as a zip...
    powershell -NoProfile -Command "Invoke-WebRequest https://github.com/VAST-AI-Research/TripoSR/archive/refs/heads/main.zip -OutFile server\tsr.zip; Expand-Archive server\tsr.zip server -Force; Rename-Item server\TripoSR-main TripoSR; Remove-Item server\tsr.zip" || goto :fail
  ) else (
    git clone --depth 1 https://github.com/VAST-AI-Research/TripoSR server\TripoSR || goto :fail
  )
)

rem TripoSR needs a compiled torchmcubes; we ship a pure-Python replacement (server\torchmcubes.py) instead.
findstr /v /i "torchmcubes gradio" server\TripoSR\requirements.txt > server\req-triposr.txt
pip install -r server\req-triposr.txt || goto :fail
pip install -r server\requirements.txt || goto :fail

echo.
echo Done. Start DreamDesign with scripts\run.bat
echo The first photo-to-3D run downloads the model weights ^(about 1.7 GB^).
pause
exit /b 0

:fail
echo.
echo Installation failed. See the message above, or open an issue with the full output:
echo https://github.com/066040/DreamDesign/issues
pause
exit /b 1
