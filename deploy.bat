@echo off
cd /d "%~dp0"

REM ============================================================
REM Deploys Go Coach to Vercel.
REM Needs deploy.env (VERCEL_TOKEN) in this folder.
REM ============================================================

if not exist deploy.env (
    echo deploy.env is missing.
    pause
    exit /b 1
)
for /f "usebackq tokens=1,* delims==" %%A in ("deploy.env") do (
    if "%%A"=="VERCEL_TOKEN" set VERCEL_TOKEN=%%B
)

echo.
echo ==============================================================
echo                    Go Coach: running tests
echo ==============================================================
call node test.js
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Tests failed. Nothing was deployed.
    pause
    exit /b 1
)

call node bump-version.js
if %ERRORLEVEL% NEQ 0 (
    echo Could not update the cache version. Nothing was deployed.
    pause
    exit /b 1
)

echo.
echo ==============================================================
echo                    Go Coach: deploying...
echo ==============================================================
call vercel deploy --prod --yes
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Deploy failed. Take a screenshot of this window.
    pause
    exit /b 1
)

echo.
echo Done. The live address is printed above.
echo Press Ctrl+Shift+R in the app to load the new version.
pause
