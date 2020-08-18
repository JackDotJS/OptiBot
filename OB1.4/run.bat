@echo off
setlocal
node bootstrapper.js
if %errorlevel%==30 (
    goto reset
)
if %errorlevel%==40 (
    goto resetdbg
) else (
    goto stop
)

:reset
node bootstrapper.js skip
if %errorlevel%==30 (
    goto reset
)
if %errorlevel%==40 (
    goto resetdbg
) else (
    goto stop
)

:resetdbg
node bootstrapper.js skip debug
if %errorlevel%==30 (
    goto reset
)
if %errorlevel%==40 (
    goto resetdbg
) else (
    goto stop
)

:stop
endlocal
pause