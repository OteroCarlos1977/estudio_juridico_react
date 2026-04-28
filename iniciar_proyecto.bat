@echo off
title Iniciar Frontend y Backend

echo ========================================
echo Iniciando proyecto...
echo ========================================

REM Guardamos la ruta raiz desde donde se ejecuta este .bat
set ROOT=%~dp0

echo.
echo Iniciando FRONTEND...
cd /d "%ROOT%frontend"
start "FRONTEND - npm run dev" cmd /k "npm run dev"

echo.
echo Iniciando BACKEND...
cd /d "%ROOT%backend"
start "BACKEND - npm run start" cmd /k "npm run start"

echo.
echo Esperando que el frontend levante...
timeout /t 5 /nobreak >nul

echo.
echo Abriendo navegador...
start http://localhost:5173

echo.
echo Proyecto iniciado.
echo.
pause