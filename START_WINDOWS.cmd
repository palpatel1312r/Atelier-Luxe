@echo off
setlocal
cd /d "%~dp0"
if not exist .env (echo Missing Laravel .env. Run SETUP_WINDOWS.cmd first. & exit /b 1)
if not exist frontend\node_modules (echo Missing npm dependencies. Run SETUP_WINDOWS.cmd first. & exit /b 1)
echo Starting Laravel API and Vite frontend in separate windows.
start "Wholesale Laravel API" /D "%~dp0" cmd /k php artisan serve --host=127.0.0.1 --port=8000
start "Wholesale React UI" /D "%~dp0frontend" cmd /k npm run dev
echo Open http://127.0.0.1:5173
pause
