@echo off
cd /d "%~dp0"

REM ============================================================
REM Go Coach: one-time setup, then the first deploy.
REM Double-click this once. After that, use deploy.bat as usual.
REM 1. Takes deploy.env from the MD Editor folder if this folder has none.
REM 2. Creates or links the Vercel project named go-coach.
REM 3. Runs deploy.bat (tests, then deploy).
REM ============================================================

if not exist deploy.env (
    if exist "..\myMDEditor\deploy.env" (
        copy "..\myMDEditor\deploy.env" deploy.env >nul
        echo Copied deploy.env from the MD Editor folder.
    ) else (
        echo deploy.env is missing and the MD Editor copy was not found.
        echo Copy a deploy.env into this folder, then run this file again.
        pause
        exit /b 1
    )
)

for /f "usebackq tokens=1,* delims==" %%A in ("deploy.env") do (
    if "%%A"=="VERCEL_TOKEN" set VERCEL_TOKEN=%%B
)

echo.
echo Linking this folder to the Vercel project go-coach...
call vercel link --yes --project go-coach --token %VERCEL_TOKEN%
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Linking failed. Take a screenshot of this window.
    pause
    exit /b 1
)

call deploy.bat
