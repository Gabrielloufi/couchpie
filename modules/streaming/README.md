# streaming

The PC side of game streaming: [Sunshine](https://github.com/LizardByte/Sunshine)
on the Windows PC, [Moonlight](https://moonlight-stream.org/) on the Pi.

| File | Where | Purpose |
|---|---|---|
| `close-steam-game.ps1` | `C:\ProgramData\couchpie\` on the PC | Closes the Steam game that's running. |
| `sunshine-setup.ps1` | run once on the PC, as administrator | Adds it to Sunshine's "Steam Big Picture" app. |

## The green button while streaming

On the Pi, the green button on a Moonlight window runs `kiosk close-stream`, which
asks the PC to **quit** the app (`moonlight-qt quit <pc>`) rather than just
disconnecting, then closes Moonlight. Quitting makes Sunshine run the app's undo
commands, in reverse order:

1. `close-steam-game.ps1` closes the game: Steam records the running game's ID in
   the registry (`HKCU\Software\Valve\Steam\RunningAppID`); the script finds the
   game's folder in Steam's libraries and closes the programs running from it,
   politely first, then by force after 5 seconds.
2. `steam://close/bigpicture` closes Big Picture (Sunshine's default).

Games started by a separate launcher (EA, Ubisoft) run from outside their Steam
folder, so they stay open.

## Setup

In PowerShell as administrator, on the PC:

```powershell
powershell -ExecutionPolicy Bypass -File modules\streaming\sunshine-setup.ps1
```

It keeps the previous `apps.json` as `apps.json.bak` and restarts Sunshine. To see
what would be closed without closing anything:

```powershell
powershell -ExecutionPolicy Bypass -File C:\ProgramData\couchpie\close-steam-game.ps1 -DryRun
```
