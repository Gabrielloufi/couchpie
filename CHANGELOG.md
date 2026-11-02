# Changelog

## Unreleased

Stage 1, running on a Raspberry Pi 5.

### Added

- `scripts/bootstrap.sh`: installs couchPie on Raspberry Pi OS Bookworm, settings
  from `couchpie.conf`.
- Pegasus home screen with the "Kiosk TV" theme: made for the TV remote, folders,
  Brazilian Portuguese, clock.
- Tiles: Área de Trabalho, Streaming folder (Netflix, Paramount+, HBO Max, Disney+,
  Globoplay, Prime Video), YouTube (TV interface), Steam Big Picture and the PC's
  desktop (Moonlight), Moonlight, Kodi, Navegador, Reiniciar, Desligar.
- `kiosk`: boot to Pegasus, apps launched detached, open apps brought to the front,
  boot mode toggle, confirmation before restart and shutdown.
- Kiosk browsers: one full-screen Chromium profile per service, Portuguese, no
  translate prompt; remote navigation extension (arrows move a highlight to anything
  clickable, OK clicks, Back goes back).
- `cec-remote`: TV remote over HDMI-CEC; OK, Samsung's Back, number buttons; red
  Home, green Close, blue keyboard; keeps the TV connection from other programs.
- `remote-keyboard`: on-screen keyboard driven by the remote.
- Kodi opens straight into the PC's downloads; its own CEC support turned off.
- The PC's shared folders mounted on demand; `windows-share.ps1` for the Windows side.
- `make-tiles`: tile images from logos, or text tiles without them.
- Docs: architecture, install, troubleshooting.
- Channel ▲/▼ on the remote scroll the page (Page Up / Page Down).
- Green button on a Moonlight stream quits the app on the PC; with
  `modules/streaming/sunshine-setup.ps1`, that closes the game and Steam Big Picture.
- `scripts/cdp.py` to look inside kiosk pages.
- Roadmap: Wake-on-LAN for the PC and PiPA are the next topics.

### Fixed

- Netflix: the arrows no longer get stuck in the title preview card.
- Disney+, Globoplay, Prime Video: the arrows reach the tiles and buttons (Chromium's
  spatial navigation couldn't).
- Paramount+: opens with the desktop's Chromium profile, the only one its bot
  protection lets through.
