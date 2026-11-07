<#
llama-server in the background, for the boot task "\local-ai\llama-server" (set up by
setup-llm-service.ps1). Same router setup as start-llm.bat, but listening on every
interface: the firewall rule decides who gets in (this PC, the Raspberry Pi, and
your own Tailscale devices). Restarts the server if it exits.

Logs: C:\local-ai\logs\llama-server.log (the previous run's in llama-server.log.previous)
#>

$llama = 'D:\local-ai\llama.cpp'
$logs = 'C:\local-ai\logs'
$serverArgs = '--models-preset', 'models.ini', '--models-max', '1', '--host', '0.0.0.0', '--port', '8080'

New-Item -ItemType Directory -Force $logs | Out-Null
function Note($text) { "$(Get-Date -Format s) $text" | Add-Content "$logs\llama-serve.log" }

while ($true) {
    # Another llama-server has the port (start-llm.bat's old way, or the MKT Orquestra chat's):
    # wait for it to close instead of failing to bind
    if (Get-Process llama-server -ErrorAction SilentlyContinue) {
        Note 'another llama-server is running; waiting for it to exit'
        while (Get-Process llama-server -ErrorAction SilentlyContinue) { Start-Sleep -Seconds 15 }
    }
    foreach ($name in 'llama-server.log', 'llama-server.out.log') {
        if (Test-Path "$logs\$name") { Move-Item -Force "$logs\$name" "$logs\$name.previous" }
    }
    Note 'starting llama-server'
    $server = Start-Process -FilePath "$llama\llama-server.exe" -WorkingDirectory $llama `
        -ArgumentList $serverArgs -NoNewWindow -PassThru -Wait `
        -RedirectStandardError "$logs\llama-server.log" -RedirectStandardOutput "$logs\llama-server.out.log"
    Note "llama-server exited with code $($server.ExitCode); restarting in 10 s"
    Start-Sleep -Seconds 10
}
