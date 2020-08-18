@echo off
setlocal
:: this is likely the worst possible way to make automatically-restarting applications
:: but whatever, it works

:prompt
set /P ays=Confirm PRODUCTION run (Y/N)
if /I "%ays%"== "Y" goto start
if /I not "%ays%"== "Y" goto stop

:restart
git fetch --all
git reset --hard origin/master
timeout 1
call npm install

:start
node index.js

if errorlevel 19 (
  timeout 3600
  goto restart
)
if errorlevel 18 (
  goto stop
) else (
  goto restart
)

:stop
endlocal
exit
