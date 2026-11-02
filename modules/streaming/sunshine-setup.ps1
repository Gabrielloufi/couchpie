# Makes ending a Moonlight stream of "Steam Big Picture" close the game too, not
# only Big Picture. Run in PowerShell as administrator on the PC running Sunshine:
#
#   powershell -ExecutionPolicy Bypass -File sunshine-setup.ps1
#
# Copies close-steam-game.ps1 to C:\ProgramData\couchpie and adds it to the app's
# undo commands. Sunshine runs those in reverse order when the app quits, so the
# game closes first, then Big Picture. Keeps a copy of apps.json as apps.json.bak.
# Safe to run again.

param(
    [string] $App = "Steam Big Picture",
    [string] $Config = "C:\Program Files\Sunshine\config\apps.json"
)
$ErrorActionPreference = "Stop"

$dir = "C:\ProgramData\couchpie"
New-Item $dir -ItemType Directory -Force | Out-Null
if ($PSScriptRoot -ne $dir) {
    Copy-Item (Join-Path $PSScriptRoot "close-steam-game.ps1") $dir -Force
}
$undo = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$dir\close-steam-game.ps1`""

$apps = Get-Content $Config -Raw | ConvertFrom-Json
$entry = $apps.apps | Where-Object name -eq $App
if (-not $entry) { throw "There's no app named '$App' in $Config" }
$commands = @($entry.'prep-cmd' | Where-Object { $_ })
if ($commands | Where-Object undo -eq $undo) {
    "Already set up."
    exit
}
$commands += [pscustomobject]@{ do = ""; undo = $undo }
if ($entry.PSObject.Properties["prep-cmd"]) { $entry.'prep-cmd' = $commands }
else { $entry | Add-Member "prep-cmd" $commands }

Copy-Item $Config "$Config.bak" -Force
# Without a byte order mark, which Windows PowerShell's UTF8 encoding would add
[IO.File]::WriteAllText($Config, ($apps | ConvertTo-Json -Depth 10), (New-Object Text.UTF8Encoding $false))
Restart-Service SunshineService
"Done: ending a stream of '$App' now closes the game too."
