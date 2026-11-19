# Modules

Each folder is one part of couchPie. `scripts/bootstrap.sh` installs the Pi's side of all
of them, filling in the `@PLACEHOLDERS@` from `couchpie.conf`; the Windows PC's side (smb,
streaming, voice) is set up with the PowerShell scripts in those folders. The whole
procedure, in order, is [rebuild-yourself.md](../rebuild-yourself.md).

| Module | What it does | Installed to |
|---|---|---|
| [kiosk](kiosk/) | Opens Pegasus at boot and runs the menu tiles: apps start detached, and a tile whose app is open brings it to the front. Remote's Home/Close buttons, power confirmation. | `~/.local/bin/`, `~/.config/labwc/` |
| [pegasus](pegasus/) | The home screen: the "Kiosk TV" theme (made for the TV remote, folders, Portuguese) and the menu tiles. | `~/.config/pegasus-frontend/`, `~/.config/kiosk/menu/` |
| [remote](remote/) | The TV remote over HDMI-CEC, and an on-screen keyboard you drive with it. | `/usr/local/bin/cec-remote`, `~/.local/bin/remote-keyboard` |
| [browser](browser/) | Chromium extension for the kiosk browsers: the arrows move a highlight between everything clickable, OK clicks, Back goes back. | `~/.config/kiosk/tv-browser/` |
| [kodi](kodi/) | Kodi opens straight into the PC's downloads folder. | `~/.kodi/` |
| [streaming](streaming/) | Ending a Moonlight stream closes the game and Steam Big Picture on the PC. | `C:\ProgramData\couchpie\` on the PC |
| [smb](smb/) | The PC's shared folders, mounted on demand; and the Windows side. | `/etc/systemd/system/`, `/etc/cifs-creds` |
| [homeassistant](homeassistant/) | Home Assistant in Docker; backups copied to the PC. | `/srv/homeassistant/`, `/etc/docker/`, `/etc/systemd/system/` |
| [wake](wake/) | Wakes the PC (Wake-on-LAN), and turns the TV on or off, from the remote or from a page on the tailnet. | `~/.local/bin/`, `~/.config/systemd/user/` |

The voice assistant's GPU work on the PC (Whisper, a voice, a language model) and
[PiPA](https://github.com/Gabrielloufi/pipa-assistant), the personal assistant, live outside this repository; see
[rebuild-yourself.md](../rebuild-yourself.md#9-the-voice-assistant-optional-needs-a-pc-with-an-nvidia-gpu).

How they fit together is in [docs/en/architecture.md](../docs/en/architecture.md).
