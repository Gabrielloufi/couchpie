#Requires -RunAsAdministrator
<#
Makes the local LLM server start at boot, before anyone logs in, and lets the
Raspberry Pi (Home Assistant, PiPA) and your own Tailscale devices reach it.
Safe to run again: it replaces the firewall rule and the task with these.

  Run in PowerShell as administrator:
  powershell -ExecutionPolicy Bypass -File D:\local-ai\setup-llm-service.ps1 -Allowed <addresses>

To undo:
  Unregister-ScheduledTask -TaskPath '\local-ai\' -TaskName llama-server -Confirm:$false
  Remove-NetFirewallRule -Name local-ai-llama-server
#>

param(
    # Who may connect to port 8080: the Raspberry Pi (home network and Tailscale), and any of
    # your own devices that should use the LLM (`tailscale status` lists their addresses).
    # Not all of Tailscale's 100.64.0.0/10: devices shared into your tailnet get addresses
    # there too, and llama-server has no API key. Run this again to change the list.
    [Parameter(Mandatory)] [string[]]$allowed
)

$ErrorActionPreference = 'Stop'
$exe = 'D:\local-ai\llama.cpp\llama-server.exe'

# Firewall: TCP 8080, only for llama-server, only from those addresses, only on Private
# networks (the home Ethernet and Tailscale both are). Everything else stays blocked.
Get-NetFirewallRule -Name 'local-ai-llama-server' -ErrorAction SilentlyContinue | Remove-NetFirewallRule
# Also drop rules Windows made for llama-server.exe from its "allow access?" prompt: a
# block rule there would override this one, and an allow rule would let anyone in
Get-NetFirewallApplicationFilter -Program $exe -ErrorAction SilentlyContinue |
    Get-NetFirewallRule | Where-Object { $_.Direction -eq 'Inbound' } | Remove-NetFirewallRule
New-NetFirewallRule -Name 'local-ai-llama-server' `
    -DisplayName 'local-ai: llama-server (TCP 8080) from the Pi and own devices' `
    -Direction Inbound -Action Allow -Protocol TCP -LocalPort 8080 -Program $exe `
    -RemoteAddress $allowed -Profile Private | Out-Null

# Boot task. S4U runs it as this user without storing the password, so it starts before
# anyone logs in, can read the models and use the GPU, and isn't SYSTEM. The 30 s delay
# lets the GPU driver settle. No time limit; normal priority (a task's default, 7, is
# below normal and slows the model's CPU part); llama-serve.ps1 restarts the server if
# it exits, and the task restarts llama-serve.ps1 if that fails.
$user = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -WorkingDirectory 'D:\local-ai' `
    -Argument '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "D:\local-ai\llama-serve.ps1"'
$trigger = New-ScheduledTaskTrigger -AtStartup
$trigger.Delay = 'PT30S'
$principal = New-ScheduledTaskPrincipal -UserId $user -LogonType S4U -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) -Priority 4 `
    -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -MultipleInstances IgnoreNew `
    -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskPath '\local-ai\' -TaskName 'llama-server' -Force `
    -Description 'llama-server for this PC, the Raspberry Pi and own Tailscale devices (D:\local-ai\llama-serve.ps1)' `
    -Action $action -Trigger $trigger -Principal $principal -Settings $settings | Out-Null

# Start it now, unless a llama-server is already up (it would just wait for that one)
if (-not (Get-Process llama-server -ErrorAction SilentlyContinue)) {
    Start-ScheduledTask -TaskPath '\local-ai\' -TaskName 'llama-server'
}
Write-Output "Done: firewall rule local-ai-llama-server, task \local-ai\llama-server (as $user)."
