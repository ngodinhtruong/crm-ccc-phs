@echo off
setlocal

set "ROOT_DIR=%~dp0"
set "BACKEND_DIR=%ROOT_DIR%crm"
set "FRONTEND_DIR=%ROOT_DIR%crm-frontend"
set "PYTHON_EXE=%BACKEND_DIR%\.venv\Scripts\python.exe"

if not exist "%PYTHON_EXE%" (
    echo [ERROR] Khong tim thay Python virtualenv tai:
    echo         %PYTHON_EXE%
    echo Hay tao virtualenv va cai requirements truoc khi chay.
    pause
    exit /b 1
)

if not exist "%FRONTEND_DIR%\package.json" (
    echo [ERROR] Khong tim thay frontend tai:
    echo         %FRONTEND_DIR%
    pause
    exit /b 1
)

where npm.cmd >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Khong tim thay npm. Hay cai Node.js va them npm vao PATH.
    pause
    exit /b 1
)

where docker.exe >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Khong tim thay Docker. Hay cai Docker Desktop.
    pause
    exit /b 1
)

docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker Desktop chua chay. Hay khoi dong Docker Desktop.
    pause
    exit /b 1
)

docker ps --format "{{.Image}} {{.Names}}" | findstr /i "redis" >nul
if errorlevel 1 (
    echo [ERROR] Khong co Redis container nao dang chay trong Docker.
    echo Kiem tra bang lenh: docker ps
    pause
    exit /b 1
)

"%PYTHON_EXE%" -c "import redis; redis.Redis(host='127.0.0.1', port=6379).ping()" >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Redis container co chay nhung khong ket noi duoc tai 127.0.0.1:6379.
    echo Hay kiem tra container da publish port 6379 ra host chua.
    pause
    exit /b 1
)

echo Redis Docker dang hoat dong tai 127.0.0.1:6379.
echo Dang dung Django va React cu neu dang chay...

rem Dong cac cua so da duoc script nay tao o lan chay truoc.
taskkill /FI "WINDOWTITLE eq CRM - Django*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq CRM - React*" /T /F >nul 2>&1

rem Giai phong port backend/frontend ke ca khi process duoc khoi dong thu cong.
for /f "tokens=*" %%P in ('powershell.exe -NoProfile -Command "Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue ^| Select-Object -ExpandProperty OwningProcess -Unique"') do (
    echo Dang dung process %%P tren port 8000...
    taskkill /PID %%P /T /F >nul 2>&1
)

for /f "tokens=*" %%P in ('powershell.exe -NoProfile -Command "Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue ^| Select-Object -ExpandProperty OwningProcess -Unique"') do (
    echo Dang dung process %%P tren port 3000...
    taskkill /PID %%P /T /F >nul 2>&1
)

echo Dang khoi dong Django, React, Celery Worker va Celery Beat...

start "CRM - Django" /D "%BACKEND_DIR%" cmd.exe /k ""%PYTHON_EXE%" manage.py runserver 127.0.0.1:8000"
start "CRM - React" /D "%FRONTEND_DIR%" cmd.exe /k "npm.cmd run dev -- --hostname 0.0.0.0 --port 3000"

rem Chi khoi dong Celery Worker neu chua co process tuong ung.
powershell.exe -NoProfile -Command "$found = Get-CimInstance Win32_Process ^| Where-Object { $_.ExecutablePath -ieq '%PYTHON_EXE%' -and $_.CommandLine -match 'celery\s+-A\s+config\s+worker' }; if ($found) { exit 0 } else { exit 1 }"
if errorlevel 1 (
    echo Celery Worker chua chay. Dang khoi dong...
    start "CRM - Celery" /D "%BACKEND_DIR%" cmd.exe /k ""%PYTHON_EXE%" -m celery -A config worker --loglevel=info --pool=solo"
) else (
    echo Celery Worker dang chay. Bo qua khoi dong lai.
)

rem Chi khoi dong Celery Beat neu chua co process tuong ung.
powershell.exe -NoProfile -Command "$found = Get-CimInstance Win32_Process ^| Where-Object { $_.ExecutablePath -ieq '%PYTHON_EXE%' -and $_.CommandLine -match 'celery\s+-A\s+config\s+beat' }; if ($found) { exit 0 } else { exit 1 }"
if errorlevel 1 (
    echo Celery Beat chua chay. Dang khoi dong...
    start "CRM - Celery Beat" /D "%BACKEND_DIR%" cmd.exe /k ""%PYTHON_EXE%" -m celery -A config beat --loglevel=info"
) else (
    echo Celery Beat dang chay. Bo qua khoi dong lai.
)

echo Hoan tat khoi dong cac dich vu.
endlocal
