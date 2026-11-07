@echo off
rem Local LLM: web chat + OpenAI-compatible API at http://127.0.0.1:8080.
rem The server starts at boot by itself (task "\local-ai\llama-server", from
rem setup-llm-service.ps1), so this just opens the web chat, starting the task if needed.
rem Without the task it runs the server in this window, for this PC only, as before.
cd /d "%~dp0llama.cpp"
curl.exe -sf -o nul -m 2 http://127.0.0.1:8080/health && goto open
schtasks /run /tn "\local-ai\llama-server" >nul 2>&1 || goto console
echo Starting the llama-server task...
for /l %%i in (1,1,60) do (
    curl.exe -sf -o nul -m 2 http://127.0.0.1:8080/health && goto open
    ping -n 2 127.0.0.1 >nul
)
echo It didn't answer within a minute. See C:\local-ai\logs\llama-server.log
pause
exit /b 1

:open
start "" http://127.0.0.1:8080
exit /b

:console
start "" http://127.0.0.1:8080
llama-server.exe --models-preset models.ini --models-max 1 --host 127.0.0.1 --port 8080
pause
