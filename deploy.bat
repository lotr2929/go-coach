@echo off
setlocal

REM Windows reads a .bat file line by line while it runs, and switching branches below
REM replaces this file on disk. So the script first copies itself to the temporary
REM folder and runs that copy, which nothing changes. The block below is read whole
REM before it runs, so returning to this file afterwards is safe.
if /i not "%~2"=="/copy" (
    copy /y "%~f0" "%TEMP%\gocoach-deploy.bat" >nul
    call "%TEMP%\gocoach-deploy.bat" "%~1" /copy "%~dp0."
    exit /b
)
cd /d "%~3"

REM ============================================================
REM Deploys Go Coach from the laptop: deploy.bat - git push - Vercel.
REM 1. Copies the wording from docs/text into the app (make-text.js) and runs the tests.
REM 2. Sets a new version number, so installed copies update.
REM 3. Merges the current branch into main and pushes main to GitHub.
REM Vercel then puts GitHub's main live by itself.
REM Run it from the branch that holds the work (or from main).
REM Add /nopause when it is run by Claude, so the window does not wait.
REM ============================================================

set BRANCH=
for /f "delims=" %%B in ('git branch --show-current') do set BRANCH=%%B
if "%BRANCH%"=="" (
    echo Could not tell which branch this folder is on. Nothing was deployed.
    goto fail
)

set DIRTY=
for /f "delims=" %%L in ('git status --porcelain') do set DIRTY=1
if defined DIRTY (
    echo There are changes that have not been committed. Nothing was deployed.
    git status --short
    goto fail
)

echo.
echo ==============================================================
echo          Go Coach: deploying branch %BRANCH%
echo ==============================================================
git fetch origin
if errorlevel 1 (
    echo Could not reach GitHub. Nothing was deployed.
    goto fail
)

call node make-text.js
if errorlevel 1 (
    echo.
    echo The wording in docs/text has a mistake, shown above. Nothing was deployed.
    goto fail
)

call node test.js
if errorlevel 1 (
    echo.
    echo Tests failed. Nothing was deployed.
    goto fail
)

call node bump-version.js
if errorlevel 1 (
    echo Could not update the version number. Nothing was deployed.
    goto fail
)
git commit -q -m "Set the version number and wording for deploy" sw.js text-data.js
if errorlevel 1 (
    echo Could not save the version number. Nothing was deployed.
    goto fail
)

if /i "%BRANCH%"=="main" goto merged
git switch -q main
if errorlevel 1 (
    echo Could not switch to main. Nothing was deployed.
    goto fail
)
git merge -q --ff-only origin/main
if errorlevel 1 (
    echo main on this laptop differs from GitHub. Nothing was deployed.
    git switch -q %BRANCH%
    goto fail
)
git merge -q --no-ff %BRANCH% -m "Deploy %BRANCH% from the laptop"
if errorlevel 1 (
    echo %BRANCH% could not be merged into main. Nothing was deployed.
    git merge --abort
    git switch -q %BRANCH%
    goto fail
)

:merged
call node test.js
if errorlevel 1 (
    echo.
    echo Tests failed after merging. Nothing was deployed.
    goto fail
)

git push origin main
if errorlevel 1 (
    echo.
    echo Could not send main to GitHub. Nothing was deployed.
    goto fail
)

echo.
echo Done. GitHub has the new version and Vercel is putting it live.
echo It takes a minute or two. Then press Ctrl+Shift+R in the app.
if /i not "%~1"=="/nopause" pause
exit /b 0

:fail
if /i not "%~1"=="/nopause" pause
exit /b 1
