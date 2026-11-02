# Closes the Steam game that's running, if any. Sunshine runs this when a Moonlight
# stream of "Steam Big Picture" ends (one of the app's undo commands, added by
# sunshine-setup.ps1), just before Big Picture itself closes.
#
#   close-steam-game.ps1 [-AppId <id>] [-DryRun]
#
# -AppId closes that game instead of the running one; -DryRun only lists what it
# would close.

param(
    [int] $AppId = 0,
    [switch] $DryRun
)

$steam = Get-ItemProperty "HKCU:\Software\Valve\Steam" -ErrorAction SilentlyContinue
if (-not $steam) { "Steam isn't installed for this user"; exit }
if (-not $AppId) { $AppId = [int] $steam.RunningAppID }
if (-not $AppId) { "No Steam game is running"; exit }

# Steam lists its libraries in libraryfolders.vdf; each game's folder name is in
# its library's appmanifest_<id>.acf
$libraries = Select-String -Path (Join-Path $steam.SteamPath "steamapps\libraryfolders.vdf") -Pattern '"path"\s+"(.+)"' |
    ForEach-Object { $_.Matches[0].Groups[1].Value -replace '\\\\', '\' }

foreach ($library in $libraries) {
    $manifest = Join-Path $library "steamapps\appmanifest_$AppId.acf"
    if (-not (Test-Path $manifest)) { continue }
    $folder = (Select-String -Path $manifest -Pattern '"installdir"\s+"(.+)"').Matches[0].Groups[1].Value
    $gameDir = (Join-Path $library "steamapps\common\$folder") + "\"
    $processes = @(Get-Process | Where-Object {
        $_.Path -and $_.Path.StartsWith($gameDir, [StringComparison]::OrdinalIgnoreCase)
    })
    if ($DryRun) {
        "Game $AppId is in $gameDir; would close: " + (($processes | ForEach-Object { $_.Path }) -join ", ")
        exit
    }
    # Ask the way the window's close button would, then insist
    $processes | ForEach-Object { $_.CloseMainWindow() | Out-Null }
    Start-Sleep -Seconds 5
    $processes | Where-Object { -not $_.HasExited } | Stop-Process -Force
    exit
}
"Game $AppId isn't in any Steam library"
