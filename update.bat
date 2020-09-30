@echo off
setlocal
:PROMPT
SET /P AREYOUSURE=Force re-download OptiBot? (Y/[N])
IF /I "%AREYOUSURE%" NEQ "Y" GOTO END

git fetch --all
git reset --hard origin/master
call npm install

:END
endlocal
pause