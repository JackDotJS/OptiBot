@echo off
setlocal
:: this is likely the worst possible way to make automatically-restarting applications
:: but whatever, it works

:prompt
set /P ays=Confirm DEBUG run (Y/N)
if /I "%ays%"== "Y" goto start
if /I not "%ays%"== "Y" goto stop

:start
node index.js debug

if errorlevel 19 (
  timeout 3600
  goto start
)
if errorlevel 18 (
  goto stop
) else (
  goto start
)

:stop
endlocal
exit
