@echo off
setlocal
where py >nul 2>nul
if %errorlevel% equ 0 (
  py -3 "%~dp0serve.py" %*
  goto :done
)
where python >nul 2>nul
if %errorlevel% equ 0 (
  python "%~dp0serve.py" %*
  goto :done
)
echo Python 3 is required. Install Python, then run this file again.
:done
pause
