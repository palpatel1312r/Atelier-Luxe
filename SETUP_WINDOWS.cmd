@echo off
setlocal
cd /d "%~dp0"
echo.
echo =========================================================
echo   WHOLESALE / ARCWELL TRADE OS - FIRST TIME SETUP
echo =========================================================
echo.
where composer >nul 2>&1 || (echo ERROR: Composer not found in PATH. & exit /b 1)
where php >nul 2>&1 || (echo ERROR: PHP not found in PATH. Use WAMP PHP CLI. & exit /b 1)
where npm >nul 2>&1 || (echo ERROR: Node.js and npm not found. & exit /b 1)
set "NEW_LARAVEL_ENV=0"
if not exist .env (
  set "NEW_LARAVEL_ENV=1"
  copy /y .env.example .env >nul
  echo Created Laravel .env. Configure central MySQL and tenant settings.
)
if not exist frontend\.env (
  copy /y frontend\.env.example frontend\.env >nul
  echo Created frontend\.env with a local Vite API proxy.
)
echo Installing PHP dependencies...
call composer install --no-interaction
if errorlevel 1 (echo Composer failed. & exit /b 1)
if "%NEW_LARAVEL_ENV%"=="1" (
  php artisan key:generate --no-interaction
  if errorlevel 1 echo Verify APP_KEY is set in your Laravel .env.
)
echo Installing frontend dependencies...
pushd frontend
call npm ci
if errorlevel 1 (popd & echo npm install failed. & exit /b 1)
popd
echo.
echo =========================================================
echo   Source dependencies installed.
echo   NEXT: Configure Laravel .env and existing tenant database.
echo   See ARCWELL_REBUILD_GUIDE.md before migrations or seeding.
echo   Run START_WINDOWS.cmd when configured.
echo =========================================================
pause
