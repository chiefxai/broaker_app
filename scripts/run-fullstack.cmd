@echo off
setlocal
set "SCRIPT_DIR=%~dp0"
for %%I in ("%SCRIPT_DIR%..") do set "APP_DIR=%%~fI"
set "BACKEND_DIR=%APP_DIR%\backend"
set "FRONTEND_DIR=%APP_DIR%\frontend"

if not defined HOST_LAN_IP (
  for /f "usebackq delims=" %%I in (`powershell -NoProfile -Command "Get-NetIPConfiguration ^| Where-Object { $_.IPv4DefaultGateway -and $_.IPv4Address } ^| Select-Object -First 1 -ExpandProperty IPv4Address ^| Select-Object -First 1 -ExpandProperty IPAddress"`) do set "HOST_LAN_IP=%%I"
)
if not defined HOST_LAN_IP (
  echo Could not detect the host LAN IPv4 address.
  echo Set HOST_LAN_IP in Command Prompt, for example: set HOST_LAN_IP=192.168.1.20
  pause
  exit /b 1
)

if not exist "%BACKEND_DIR%\.env" (
  echo Backend env file not found: "%BACKEND_DIR%\.env"
  pause
  exit /b 1
)
if not exist "%FRONTEND_DIR%\.env.local" (
  echo Frontend env file not found: "%FRONTEND_DIR%\.env.local"
  pause
  exit /b 1
)
where docker >nul 2>nul
if errorlevel 1 (
  echo Docker is required. Install and start Docker Desktop, then retry.
  pause
  exit /b 1
)

pushd "%APP_DIR%"
set "MINIO_BIND_HOST=0.0.0.0"
set "KEYCLOAK_BIND_HOST=0.0.0.0"
docker compose --env-file "%BACKEND_DIR%\.env" -p broaker-app -f "%BACKEND_DIR%\docker-compose.yml" -f "%APP_DIR%\docker-compose.fullstack.yml" up --build -d
if errorlevel 1 (
  popd
  pause
  exit /b 1
)
popd

echo.
echo Broaker is starting. Open exp://%HOST_LAN_IP%:8082 in Expo Go.
echo API: http://%HOST_LAN_IP%:8001/api/v1
pause
endlocal
