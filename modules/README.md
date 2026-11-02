# Modules

Each folder is one part of couchPie. `scripts/bootstrap.sh` installs all of them,
filling in the `@PLACEHOLDERS@` from `couchpie.conf`.

| Module | What it does | Installed to |
|---|---|---|
| [kiosk](kiosk/) | Opens Pegasus at boot and runs the menu tiles: apps start detached, and a tile whose app is open brings it to the front. Remote's Home/Close buttons, power confirmation. | `~/.local/bin/`, `~/.config/labwc/` |
| [pegasus](pegasus/) | The home screen: the "Kiosk TV" theme (made for the TV remote, folders, Portuguese) and the menu tiles. | `~/.config/pegasus-frontend/`, `~/.config/kiosk/menu/` |
| [remote](remote/) | The TV remote over HDMI-CEC, and an on-screen keyboard you drive with it. | `/usr/local/bin/cec-remote`, `~/.local/bin/remote-keyboard` |
| [browser](browser/) | Chromium extension for the kiosk browsers: the arrows move a highlight between everything clickable, OK clicks, Back goes back. | `~/.config/kiosk/tv-browser/` |
| [kodi](kodi/) | Kodi opens straight into the PC's downloads folder. | `~/.kodi/` |
| [streaming](streaming/) | Ending a Moonlight stream closes the game and Steam Big Picture on the PC. | `C:\ProgramData\couchpie\` on the PC |
| [smb](smb/) | The PC's shared folders, mounted on demand; and the Windows side. | `/etc/systemd/system/`, `/etc/cifs-creds` |

How they fit together is in [docs/en/architecture.md](../docs/en/architecture.md).
