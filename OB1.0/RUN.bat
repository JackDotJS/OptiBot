@echo off
:restart
node index.js
timeout 5
goto restart