# couchPie 🛋️🥧

**Smart TV killer. Portable media hub. Pi-powered freedom machine.**

couchPie turns a Raspberry Pi 5 behind your TV into the TV's brain: a home screen driven by
the TV's own remote, streaming services, your PC's games and media files, and Home Assistant.
A Windows PC on the same network does the heavy lifting: game streaming, file sharing, and
the GPU work of a local voice assistant. Nothing needs a cloud service except the streaming
sites themselves.

The TV interface is in Brazilian Portuguese.

## Why couchPie

couchPie wants to be three things at once: a **saviour for old smart TVs** and a media centre
you control, a **low-cost game platform** (retro games, games streamed from a PC, and phones
as controllers), and a **party games enabler** for friends in the living room. Consoles and
games are expensive, especially in Brazil; couchPie is meant to be cheap and free to use,
and open for anyone to learn from, change and improve.

The software is free and open source, and stays that way. A ready-made couchPie box may be
sold in the future for convenience (assembled, set up and supported), running the same open
software. See [GOVERNANCE.md](GOVERNANCE.md).

## How it fits together

```
 TV remote ─HDMI-CEC─┐
                     TV ═HDMI═ Raspberry Pi 5 ══ home network ══ Windows PC (NVIDIA GPU)
                               ├ Pegasus home screen, tiles      ├ Sunshine (games)
                               ├ Chromium kiosk browsers         ├ shared folders (SMB)
                               ├ Kodi, Moonlight                 ├ Wake-on-LAN
                               ├ wake page                       └ voice: Whisper, F5-TTS,
                               ├ Home Assistant + Piper (Docker)        llama-server
                               └ PiPA (pipa-assistant)
                                         ║
                                     Tailscale ══ your phone, anywhere
                                                  (wake page, Home Assistant app)
```

The Pi stays on (a Pi 5 can't be woken over the network), so it's always there to wake the
PC, run Home Assistant, and answer the phone. More detail:
[docs/en/architecture.md](docs/en/architecture.md).

## Modules

Each folder in [modules/](modules/) is one part, with its own README. `scripts/bootstrap.sh`
installs everything on the Pi; the PC's parts are PowerShell scripts in the same folders.

**The TV box** (on the Pi)

| Module | What it does |
|---|---|
| [kiosk](modules/kiosk/) | Opens the home screen at boot and runs what each tile asks for: apps start in the background, and a tile whose app is already open brings it to the front. Standby (TV off) and the PC wake tile. |
| [pegasus](modules/pegasus/) | The home screen: the "Kiosk TV" theme for [Pegasus](https://pegasus-frontend.org), made for a TV remote, with folders and the menu's tiles. |
| [remote](modules/remote/) | The TV's remote over HDMI-CEC: buttons become key presses, and an on-screen keyboard you drive with it. Also turns the TV on and off. |
| [browser](modules/browser/) | A Chromium extension for the streaming sites: the remote's arrows move a highlight between everything clickable, OK clicks, Back goes back. One full-screen browser and login per service. |
| [kodi](modules/kodi/) | [Kodi](https://kodi.tv) opens straight into the PC's shared downloads. |

**With the PC**

| Module | Runs on | What it does |
|---|---|---|
| [streaming](modules/streaming/) | PC | [Sunshine](https://github.com/LizardByte/Sunshine) setup so that closing a [Moonlight](https://moonlight-stream.org/) stream with the remote also closes the game and Steam Big Picture. |
| [smb](modules/smb/) | PC + Pi | Shares the PC's folders and mounts them on the Pi on demand, so a PC that's off never holds anything up. |
| [wake](modules/wake/) | Pi | Wakes the PC with Wake-on-LAN from a home-screen tile, or from a page on your tailnet that your phone opens anywhere; the page also turns the TV on and off. |

**Home automation and voice**

| Module | Runs on | What it does |
|---|---|---|
| [homeassistant](modules/homeassistant/) | Pi | [Home Assistant](https://www.home-assistant.io/) in Docker, next to the TV box, with Piper (local text to speech). Backups are written on the Pi and copied to the PC every hour. HTTPS on the tailnet. |
| Voice services | PC | Not in this repository: the voice assistant's GPU work, reached over the network. Speech to text (Whisper), a language model (llama.cpp's `llama-server`) and, optionally, a voice on the PC (the Pi's Piper is the fallback). See [rebuild-yourself.md](rebuild-yourself.md#9-the-voice-assistant-optional-needs-a-pc-with-an-nvidia-gpu). |
| [PiPA](https://github.com/Gabrielloufi/pipa-assistant) | Pi | *In progress*, in its own repository: the Pi Personal Assistant, an agent ([nanobot](https://github.com/HKUDS/nanobot)) behind Home Assistant's voice and Telegram. Home Assistant answers simple home commands itself and passes everything else to PiPA. |

## The TV remote

| Button | Does |
|---|---|
| Arrows, OK, Back | Navigate, open, go back |
| 🟢 Green | Home: back to the menu, leaving apps open |
| 🔴 Red | Close the app in front; on a game stream, quit the game and Steam Big Picture |
| 🔵 Blue | On-screen keyboard |
| Channel ▲ / ▼ | Scroll the page |
| Numbers | Digits |

The home screen's tiles: Netflix, Prime Video, HBO Max, Disney+, Paramount+, Globoplay,
YouTube (TV interface), Steam Big Picture and the PC's desktop over Moonlight, Kodi, a
browser, Ligar PC (wake the PC), the Raspberry Pi's desktop, Reiniciar, and Modo espera
(TV off).

## Get started

**[rebuild-yourself.md](rebuild-yourself.md)** walks through the whole system in order,
from a freshly installed Raspberry Pi OS: Tailscale, the PC's side, the installer, Home
Assistant and the voice assistant, with a check after each step.

Just the TV box, on a Raspberry Pi 5 with Raspberry Pi OS Bookworm (64-bit, desktop):

```bash
git clone https://github.com/Gabrielloufi/couchpie.git
cd couchpie
cp couchpie.conf.example couchpie.conf   # your PC, shares and HDMI port
scripts/bootstrap.sh
sudo reboot
```

| Doc | What |
|---|---|
| [rebuild-yourself.md](rebuild-yourself.md) | The whole system, step by step |
| [docs/en/install.md](docs/en/install.md) | The TV box alone, and everyday commands |
| [docs/en/architecture.md](docs/en/architecture.md) | How the pieces talk to each other |
| [docs/en/troubleshooting.md](docs/en/troubleshooting.md) | When something doesn't work |
| [CHANGELOG.md](CHANGELOG.md) | What changed |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to contribute, and signing commits (DCO) |
| [GOVERNANCE.md](GOVERNANCE.md) | The project's goals, and who decides |
| [TRADEMARKS.md](TRADEMARKS.md) | Using the couchPie name and logo |
| [THIRD_PARTY.md](THIRD_PARTY.md) | Software, services and models from others, and their licenses |

## Hardware

* Raspberry Pi 5 (8 GB recommended) with the official 27 W USB-C power supply
* microSD card, 64–128 GB, A2/U3
* A TV with HDMI-CEC (tested on a Samsung TV), and an HDMI cable
* Ethernet for the Pi, recommended
* Optional: a Windows PC with an NVIDIA GPU (12 GB for the whole voice stack); a Bluetooth
  keyboard; a BroadLink RM4 Pro for IR and RF devices; a 7" HDMI touch screen

## 🚀 Roadmap

### Stage 1 – Entertainment hub ✅

* [x] Pegasus home screen with a tile per service and a Streaming folder
* [x] Chromium in kiosk mode with DRM, one window and login per service, navigable with the remote
* [x] Moonlight tiles: Steam Big Picture and the PC's desktop
* [x] The PC's folders over SMB; Kodi opens straight into them
* [x] TV remote over HDMI-CEC, with an on-screen keyboard
* [x] Installer: `scripts/bootstrap.sh`

### Stage 2 – Remote access and wake-up

* [x] The Pi on Tailscale
* [x] Wake-on-LAN for the PC, from the remote or from the phone anywhere; standby turns the TV off
* [x] The PC on Tailscale before anyone logs in (unattended mode)
* [ ] Moonlight and the PC's folders over Tailscale when away from home
* [ ] Travel router mode (access point + hotel Wi-Fi), with captive portal handling

### Stage 3 – Smart home and voice

* [x] Home Assistant in Docker, backups copied to the PC
* [x] Local voice services: Whisper, F5-TTS (female pt-BR voice), llama-server, Piper (the PC's services live outside this repository)
* [ ] [PiPA](https://github.com/Gabrielloufi/pipa-assistant): one voice listener routing to Home Assistant or a personal agent ([nanobot](https://github.com/HKUDS/nanobot)), also on Telegram
* [ ] Devices: BroadLink IR/RF (fans, air conditioner via SmartIR), Midea air conditioner
* [ ] A 7" touch screen dashboard next to the TV
* [ ] A voice satellite on the Pi (USB mic and speaker)
* [ ] Alexa through Home Assistant

### Later

* [ ] Bluetooth gamepads (8BitDo) and EmulationStation for retro games
* [ ] Home Assistant on a machine of its own
* [ ] An image builder: a ready-to-boot SD card

## 🌐 Language

The TV interface is in Brazilian Portuguese: the home screen, Pegasus's menus, the on-screen
keyboard, the websites the tiles open, and the voice. The documentation is in English; a
Brazilian Portuguese version (`README.pt-br.md`) is welcome.

## 📚 License

This project is licensed under the GNU Affero General Public License, version 3 or (at your
option) any later version (`AGPL-3.0-or-later`). See the [LICENSE](LICENSE) file for details.

Copyright 2025 CouchPie Team

In short: you can use, study, change and share couchPie, but if you distribute a modified
version, or run one that people use over a network, you must offer them its source code under
the same license. This is meant to keep couchPie and its forks open.

The name "couchPie" and its logo are not covered by the license; see
[TRADEMARKS.md](TRADEMARKS.md).

Software, services and models from other projects keep their own licenses; see
[THIRD_PARTY.md](THIRD_PARTY.md). This project does not redistribute Raspberry Pi OS images.
Models used by the voice services have their own licenses (F5-TTS's pt-br checkpoint, for
example, is non-commercial).
