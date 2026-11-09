# Changelog

## Unreleased

Stage 1, running on a Raspberry Pi 5.

### Changed

- License: AGPL-3.0-or-later, so that modified versions, including ones offered as a
  service, stay open.

### Added

- `NOTICE`: the license notice, with an additional term under section 7(b) of the AGPL:
  copies and works based on couchPie keep the attribution "Based on couchPie, free and
  open-source software, available at no cost at https://github.com/Gabrielloufi/couchpie".
- `CONTRIBUTING.md` with the DCO sign-off rule, checked on every pull request by
  `.github/workflows/dco.yml`; `GOVERNANCE.md`; `TRADEMARKS.md`; `THIRD_PARTY.md`.
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
- `scripts/cdp.py` to look inside kiosk pages; `scripts/qa-nav.py` to test the remote
  in a page press by press.
- Remote navigation in the kiosk browsers: pressing twice in a direction that won't
  move leaves the menu, panel or row the highlight is stuck in; OK on a menu the
  highlight opened goes into it; Back in a tab a link opened closes it.
- Roadmap: Wake-on-LAN for the PC and PiPA are the next topics.
- Wake-on-LAN for the PC: "Ligar PC" tile and `wake-pc`; `PC_MAC` in `couchpie.conf`.
- Wake page on the tailnet (`tailscale serve`): the phone or the PC wakes the PC and
  turns the TV on or off.
- `cec-remote tv on|standby`, and `kiosk wake` / `kiosk standby`.
- Home Assistant in Docker (`modules/homeassistant`): Docker from Docker's repository,
  history written less often, backups copied to the PC every hour, HTTPS on the tailnet
  at port 8443.
- Piper (text to speech, `pt_BR-faber-medium`) next to Home Assistant, on 127.0.0.1:10200.
- `modules/voice`: the voice assistant's PC side, each started at boot before login and
  reachable only from the Pi: Whisper `large-v3-turbo` (port 10300), F5-TTS pt-br with
  the cloned "dora" voice and its own Wyoming server (port 10200), llama-server in
  router mode (port 8080).
- `rebuild-yourself.md`: the whole system, step by step, from a fresh Raspberry Pi OS.
- `pipa/RESULTS.md`: how the voice services were chosen and measured.

### Changed

- PiPA moved to its own repository, [pipa-assistant](https://github.com/Gabrielloufi/pipa-assistant),
  and the PC's voice services (Whisper, F5-TTS, the llama-server presets) out of this one.
  The voice assistant section of `rebuild-yourself.md` now names the services Home Assistant
  needs and links their own projects.
- Red and green swapped on the remote: green is now Home (the menu, leaving apps
  open) and red closes the app in front (on a game stream, the game and Steam Big
  Picture).
- "Desligar" is now "Modo espera": it turns the TV off and leaves the Pi on, since a
  Pi 5 can't be woken over the network and the phone reaches the PC through it.

### Fixed

- Netflix: the arrows no longer get stuck in the title preview card.
- Disney+, Globoplay, Prime Video: the arrows reach the tiles and buttons (Chromium's
  spatial navigation couldn't).
- Paramount+: opens with the desktop's Chromium profile, the only one its bot
  protection lets through.
- Kiosk browsers, remote navigation:
  - Rows: the arrows go poster by poster and turn the row at its end, instead of
    stopping on the row's arrow buttons or page dots or jumping to another row.
  - Up and down go row by row down the whole page (Disney+ stopped at the first
    screen), and reach the header from the top of the page.
  - Profile menus (Netflix, Disney+, Globoplay, Prime Video, Paramount+) can be
    opened, browsed and closed with Back; Back puts the highlight back on the button
    or poster it came from.
  - HBO Max: the arrows work on the home page (its silent trailer was taken for a
    video being watched). Globoplay: posters are reachable and open with OK.
  - Google: the search box no longer catches the arrows until OK is pressed on it.
