@echo off
call node bootstrapper.js %1 %2 %3 %4 %5 %6 %7 %8 %9
if %ERRORLEVEL% == 3 (
    EXIT
) ELSE (
    echo Press any key to exit.
    PAUSE >nul
    EXIT
)