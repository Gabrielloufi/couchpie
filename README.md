# couchPie 🛋️🥧

**Smart TV killer. Portable media hub. Pi-powered freedom machine.**

couchPie turns a Raspberry Pi 5 behind your TV into the TV's brain: a home screen driven by
the TV's own remote, streaming services, your PC's games and media files, and Home Assistant.
A Windows PC on the same network does the heavy lifting: game streaming, file sharing, and
the GPU work of a local voice assistant. Nothing needs a cloud service except the streaming
sites themselves.

The TV interface is in Brazilian Portuguese.

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

### Stage 4 – Phone as remote and ally (next up)

The phone becomes the TV's second remote. The pointer is the key idea: where the TV remote's
arrows (HDMI-CEC) can't move around a page or an app, the phone can point at it.

* [ ] Reliable remote navigation: per-site profiles for the streaming sites and a test harness (`scripts/qa-nav.py`) that catches a site's redesign before you do
* [ ] Pair a phone by scanning a QR code on the TV (one-time token, paired-device list, revoke)
* [ ] Phone as a touchpad, then as a motion pointer: a red dot on the TV that snaps to what can be clicked, and works where arrow navigation fails (HTTPS needed for the motion sensors, e.g. over Tailscale)
* [ ] Type on the phone's keyboard into the TV (logins, searches), instead of the on-screen keyboard
* [ ] Phone as an ally: search from the phone, push-to-talk voice, and "cast this link to the TV"
* [ ] Phone as a gamepad, for the emulators and for Moonlight: a touch controller on the phone becomes a virtual gamepad on the Pi, one phone per player, so a phone and couchPie are enough to play anywhere
* [ ] Cross-service search: type or say a title once and jump to it in the right service
* [ ] One "continue watching" row across the streaming services, filled from what you opened and played

### Stage 5 – Profiles and continue

* [ ] Profile selection in Pegasus ("who's watching"): each profile has its own browser logins, history and tiles
* [ ] Continue last seen: a home-screen row that resumes the last title, per profile

### Stage 6 – Search in my services

* [ ] A local cache of popular titles on the services you have, with genres, runtime, ratings and where to watch ([TMDB](https://www.themoviedb.org) data, your own API key), refreshed weekly
* [ ] Search and filters over it (genre, runtime, service), by phone, keyboard or voice, with one-tap launch

### Stage 7 – An LLM to search

* [ ] Free-form requests turned into filters over the cache ("comédia curta, até 30 minutos"), with the local LLM only choosing the filters, never inventing titles
* [ ] Voice requests for the same, in Portuguese and English

### Stage 8 – An LLM to suggest

* [ ] Suggestions that learn your taste per profile ("something funny for 30 minutes"), explained in a sentence, from the cache and the watch history

### Later

* [ ] Easy retro games: RetroArch emulators behind a Pegasus "Jogos" folder, shipped with free and homebrew games (you add your own game files), playable with phones or Bluetooth gamepads (8BitDo)
* [ ] Home Assistant on a machine of its own
* [ ] An image builder: a ready-to-boot SD card

## 🌐 Language

couchPie is bilingual, English and Brazilian Portuguese (pt-BR), throughout: the TV interface
(the home screen, Pegasus's menus, the on-screen keyboard, the phone companion), the voice
(speech recognition, commands and answers) and the documentation. Today the TV interface and
the voice are pt-BR and the documentation is English; every new feature on the roadmap is
meant to ship in both languages, and a Brazilian Portuguese version of the documentation
(`README.pt-br.md`) is welcome.

## 📚 License

This project is licensed under the Apache License, Version 2.0. See the [LICENSE](LICENSE) file for details.

Copyright 2025 CouchPie Team

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

Note: This project does not redistribute Raspberry Pi OS images. Models used by the voice
services have their own licenses (F5-TTS's pt-br checkpoint, for example, is non-commercial).
