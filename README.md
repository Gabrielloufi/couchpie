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
| [docs/en/wifi-adapter.md](docs/en/wifi-adapter.md) | Choosing a USB Wi-Fi adapter (for travel router mode) |
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
* [ ] Travel router mode (access point + hotel Wi-Fi), with captive portal handling; a USB Wi-Fi adapter for the hotel uplink, see [docs/en/wifi-adapter.md](docs/en/wifi-adapter.md) for what to check before buying

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
* [ ] **Phone as a joystick, several phones as several players** (a core feature, since couchPie is a living-room media centre): a touch controller on each phone becomes its own virtual gamepad on the Pi, for the emulators and for Moonlight, so a phone and couchPie are enough to play anywhere
* [ ] Cozy living-room games for friends, played with the phones as controllers: party and board-style games that run on the Pi (a browser game on the TV, a phone page per player), in English and pt-BR. Original games with their own names and art, inspired by familiar genres:
  * [ ] A shedding card game in the style of Uno (match colour or number, special cards)
  * [ ] A clue-guessing quiz in the style of Perfil: tips are revealed one by one and fewer tips means more points; the secret card shows on one phone
  * [ ] Dominoes
  * [ ] Classic card games with a standard deck: Truco, Buraco, Copas (Hearts) and others, each hand shown privately on the phone
  * [ ] A browser party game with minigames and a board, in the style of Mario Party: original characters, short minigames played with the phones (tap, tilt, swipe), and scores that carry across rounds
  * [ ] Quick extras: word games, trivia
  * [ ] Evaluate existing phone-controller game platforms and tabletop games (e.g. streamed from the PC with Moonlight)
* [ ] **Photo avatars** (a must have): each player takes a selfie when joining, and it is their token, scoreboard face and player icon in every game
* [ ] Draw on the phone, shown on the TV: drawing-and-guessing games where everyone draws on their phone and the drawings appear on the screen
* [ ] Photo scavenger hunt: the TV gives a challenge ("find something red"), everyone races to photograph one, and the group votes thumbs up or thumbs down on each photo from their phones
* [ ] Fit through the wall: a camera on a stand watches the players, a wall with a cut-out shape comes toward the screen, and they must strike a pose that fits through; the score is also how long they can hold awkward positions (balance, one leg, and so on)
* [ ] Morto/vivo (a Simon-says game): a leader gets the commands on their phone and calls them out; the others follow, and the camera checks who did the move (stand up, crouch, touch your head). Each player has their own lane or spot on screen, so the game knows who is who
* [ ] Camera and microphone rules for every game: the analysis runs on the phone, only results (pose points, a score, a chosen photo) go to the Pi, nothing is recorded unless someone saves it, and the TV shows when a camera is on. Movement games remind players to check their space and stop if anything hurts. (Camera and microphone need HTTPS.)
* [ ] Cross-service search: type or say a title once and jump to it in the right service
* [ ] One "continue watching" row across the streaming services, filled from what you opened and played

Experiments to run first, to find out what is possible before building on it:

* [ ] One virtual phone gamepad (`uinput`) in a single-player Steam game through Moonlight and Sunshine: does Moonlight see the pad, are the sticks and buttons right, and how does the latency feel?
* [ ] Two phones as two virtual gamepads in a local co-op or party game on Steam: how many pads does Moonlight pass through, and does the game see them as separate players?
* [ ] A phone-controller party game of the Jackbox kind, streamed through Moonlight (players join from their phone's browser, so only the video is streamed)
* [ ] Steam Remote Play Together as the fallback if Moonlight's controller passthrough is awkward
* [ ] The motion sensors on a real iPhone and a real Android phone over HTTPS (Tailscale name), to see what works before choosing the pointer design
* [ ] Body-pose detection in the phone's browser, on a real iPhone and a real Android phone: speed, battery and heat, and how it copes with two or three people in view
* [ ] Several phone cameras for a wider view: side-by-side tiles first, then combining the body positions each phone sees into one shared picture
* [ ] A USB Wi-Fi adapter on the Pi 5: driver support, the Pi's access point and the hotel-style uplink running together, and a long-running stability test

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
