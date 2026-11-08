#Requires -RunAsAdministrator
<#
Starts the Wyoming Whisper server at boot, before anyone logs in, and lets only the Pi
and the tailnet reach it. Safe to run again. Run it in PowerShell as administrator:

  powershell -ExecutionPolicy Bypass -File D:\local-ai\whisper\setup-admin.ps1 -Allowed <pi-lan-ip>,<pi-tailscale-ipv4>,<pi-tailscale-ipv6>

It runs the server as LOCAL SERVICE, a low-privilege built-in account with no password
to store, and checks that a transcription works under it. If the GPU isn't usable from
that account, it falls back to SYSTEM. -Account System skips straight to SYSTEM.

Who may connect: -Allowed takes the addresses of the Raspberry Pi running Home Assistant,
on the home network and on Tailscale (`tailscale ip` on the Pi). Not all of Tailscale's
100.64.0.0/10: devices shared into your tailnet get addresses there too, and Wyoming has
no password.
#>
param(
    [Parameter(Mandatory)] [string[]]$Allowed,
    [ValidateSet('LocalService', 'System')] [string]$Account = 'LocalService'
)

$ErrorActionPreference = 'Stop'
$TaskName = 'Wyoming Whisper'
$RuleName = 'Wyoming Whisper (Pi and tailnet)'
$Port = 10300
$Python = 'C:\local-ai\whisper\.venv\Scripts\python.exe'
$Folder = 'D:\local-ai\whisper'
$Models = 'C:\local-ai\models\whisper'
$Logs = 'C:\local-ai\whisper\logs'

New-Item -ItemType Directory -Force $Logs | Out-Null
Start-Transcript -Path "$Logs\setup-admin.log" -Append | Out-Null

# Firewall: only the Pi and the tailnet. No -Program filter: the venv's python.exe only
# launches the real interpreter, which is the process that listens.
Get-NetFirewallRule -DisplayName $RuleName -ErrorAction SilentlyContinue | Remove-NetFirewallRule
# Also drop the rules Windows makes for this Python from its "allow access?" prompt (when
# the server runs by hand): an allow rule would let anyone in on any port, and a block rule
# would override the one below
Get-NetFirewallApplicationFilter | Where-Object { $_.Program -like 'C:\local-ai\whisper\python\*' } |
    Get-NetFirewallRule | Where-Object { $_.Direction -eq 'Inbound' } | Remove-NetFirewallRule
New-NetFirewallRule -DisplayName $RuleName -Direction Inbound -Action Allow -Protocol TCP `
    -LocalPort $Port -RemoteAddress $Allowed -Profile Private | Out-Null
"Firewall rule '$RuleName': TCP $Port from $($Allowed -join ', ')"

# LOCAL SERVICE reads the interpreter, venv and scripts, and writes models and logs
$localService = '*S-1-5-19'
icacls 'C:\local-ai\whisper' /grant "${localService}:(OI)(CI)RX" /Q | Out-Null
icacls $Folder /grant "${localService}:(OI)(CI)RX" /Q | Out-Null
icacls $Models /grant "${localService}:(OI)(CI)M" /Q | Out-Null
icacls $Logs /grant "${localService}:(OI)(CI)M" /Q | Out-Null

# Account names are translated on non-English Windows (LOCAL SERVICE is "SERVICO LOCAL"
# in Portuguese), so look them up from their well-known SIDs
function Get-AccountName([string]$Sid) {
    (New-Object System.Security.Principal.SecurityIdentifier $Sid).Translate(
        [System.Security.Principal.NTAccount]).Value
}

function Register-WhisperTask([string]$UserId) {
    Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    Get-CimInstance Win32_Process -Filter "Name = 'python.exe'" |
        Where-Object { $_.CommandLine -like '*whisper\run.py*' } |
        ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
    Start-Sleep -Seconds 2

    $action = New-ScheduledTaskAction -Execute $Python -Argument "`"$Folder\run.py`" --local-files-only" `
        -WorkingDirectory 'C:\local-ai\whisper'
    # At startup, and again every 5 minutes in case it stopped; a running one is left alone
    $trigger = New-ScheduledTaskTrigger -AtStartup
    $trigger.Repetition = (New-ScheduledTaskTrigger -Once -At (Get-Date) `
        -RepetitionInterval (New-TimeSpan -Minutes 5)).Repetition
    $settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) `
        -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -MultipleInstances IgnoreNew `
        -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
    $principal = New-ScheduledTaskPrincipal -UserId $UserId -LogonType ServiceAccount -RunLevel Limited
    Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings `
        -Principal $principal -Description 'Speech-to-text for Home Assistant (Wyoming, port 10300). See D:\local-ai\whisper\README.md' `
        -Force | Out-Null
    Start-ScheduledTask -TaskName $TaskName
    "Task '$TaskName' registered as $UserId and started"
}

# A real transcription through the server proves the GPU works under that account
function Test-Whisper {
    $deadline = (Get-Date).AddSeconds(120)
    while (-not (Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue)) {
        if ((Get-Date) -gt $deadline) { Write-Host "Not listening on $Port after 120 s"; return $false }
        Start-Sleep -Seconds 1
    }
    $out = & $Python "$Folder\wyoming_test.py" 127.0.0.1 $Port "$Folder\test\comando.wav" 2>&1 | Out-String
    Write-Host $out.Trim()
    return ($out -match 'ventilador')
}

$ok = $false
if ($Account -eq 'LocalService') {
    Register-WhisperTask (Get-AccountName 'S-1-5-19')
    $ok = Test-Whisper
    if (-not $ok) { "Didn't work as LOCAL SERVICE; falling back to SYSTEM" }
}
if (-not $ok) {
    Register-WhisperTask (Get-AccountName 'S-1-5-18')
    $ok = Test-Whisper
}
if ($ok) { "OK: Whisper answers on port $Port" } else { "FAILED: see $Logs\server.log" }
Stop-Transcript | Out-Null
