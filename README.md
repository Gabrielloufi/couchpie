# couchPie 🛋️🥧

**Smart TV killer. Portable media hub. Pi-powered freedom machine.**

couchPie turns your Raspberry Pi 4/5 into a fully-customizable entertainment center that:

* Boots straight into a TV-style home screen ([Pegasus](https://pegasus-frontend.org) with its own theme), in Brazilian Portuguese
* Streams games from your PC using [Sunshine](https://github.com/LizardByte/Sunshine) and [Moonlight](https://moonlight-stream.org/)
* Plays media files from your PC over the network via SMB, in [Kodi](https://kodi.tv)
* Opens Netflix, Prime Video, HBO Max, Disney+, Paramount+, Globoplay and YouTube full screen, using Chromium in kiosk mode
* Works with your TV remote over CEC, including an on-screen keyboard
* Runs fully offline OR remotely with [Tailscale](https://tailscale.com/) for secure remote access
* Integrates with Alexa using the Manual Smart Home Skill and Home Assistant (Stage 3)
* Can be taken anywhere, broadcast its own Wi-Fi, and act like a portable smart TV system

---

## 🚀 Project Stages

### Next up

The topics we're tackling next:

* [ ] **Wake-on-LAN for the PC:** the Pi wakes the gaming PC with a "Ligar PC" tile
  in Pegasus (and later a Home Assistant button). Away from home, ask the Pi over
  Tailscale, since the magic packet doesn't cross it.
* [ ] **PiPA (Pi Personal Assistant):** a personal assistant running on the Pi.

### Stage 1 – Entertainment Hub (MVP)

* [x] Raspberry Pi OS (Bookworm)
* [x] Moonlight tiles: Steam Big Picture and the PC's desktop
* [x] Chromium in kiosk mode with DRM support, one window and login per service
* [x] Pegasus home screen with a tile for each service, and a Streaming folder
* [x] SMB mount to play PC-stored media; Kodi opens straight into it
* [x] TV CEC remote support: Home and Close buttons, on-screen keyboard
* [x] Installer: `scripts/bootstrap.sh`

### Stage 2 – Remote Access Anywhere

* [x] The Pi on Tailscale, for SSH from anywhere
* [ ] Moonlight and the PC's folders over Tailscale when away from home
* [ ] Travel Router mode (AP + WAN passthrough)
* [ ] Hotel Wi-Fi protection with captive portal bypass

### Stage 3 – Smart Home + SSD + Emulation

* [ ] NVMe SSD storage
* [ ] EmulationStation for retro gaming (PS1, N64, GBA, etc.)
* [ ] Bluetooth gamepads (e.g. 8bitDo)
* [ ] Alexa integration via Home Assistant
* [ ] IR control of devices using Broadlink RM4 Mini

---

## 📊 Features

* Boot to a TV home screen, with the full desktop one tile away (and `kiosk off` to boot to the desktop)
* Kiosk mode for Chromium: the remote's arrows move a highlight to anything clickable, OK clicks
* Tiles: Netflix, Prime Video, HBO Max, Disney+, Paramount+, Globoplay, YouTube, Steam, the PC's desktop, Kodi with the PC's files, a browser, restart and shut down
* Low-cost upgrade path: no Smart TV required
* Planned: modular environment detection (`home`, `safe travel`, `travel`) with dynamic configs; a Spotify tile

The TV remote:

| Button | Does |
|---|---|
| Arrows, OK, Back | Navigate, open, go back |
| 🔴 Red | Home: back to the menu, leaving apps open |
| 🟢 Green | Close the app in front; on a game stream, quit the game and Steam Big Picture |
| 🔵 Blue | On-screen keyboard |
| Channel ▲ / ▼ | Scroll the page |

How it fits together: [docs/en/architecture.md](docs/en/architecture.md).

---

## 🚿 Hardware Requirements

**Minimum:**

* Raspberry Pi 5 (4GB is OK, 8GB recommended)
* Official Pi 27W USB-C PSU
* HDMI cable, to a TV with HDMI-CEC (tested on a Samsung TV)
* MicroSD card (32–64GB recommended)
* Optional: Bluetooth keyboard/mouse combo (e.g. Logitech K400+)

**Recommended Add-ons:**

* NVMe SSD (M.2 HAT for Pi)
* Bluetooth controller
* Broadlink RM4 Mini for IR control
* Echo Dot for Alexa

---

## 🚄 Getting Started

On a Raspberry Pi 5 with Raspberry Pi OS Bookworm (desktop):

```bash
git clone https://github.com/Gabrielloufi/couchpie.git
cd couchpie
cp couchpie.conf.example couchpie.conf   # your PC, shares and HDMI port
scripts/bootstrap.sh
sudo reboot
```

The full guide, including Moonlight and the PC's shared folders, is
[docs/en/install.md](docs/en/install.md); when something doesn't work, see
[docs/en/troubleshooting.md](docs/en/troubleshooting.md).

Coming later: an image builder, to patch the configs into a Raspberry Pi OS image
and burn it to an SD card ready to boot.

---

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

Note: This project does not redistribute Raspberry Pi OS images.

---

## 🌐 Internationalization

The TV interface is in Brazilian Portuguese: the home screen, Pegasus's menus, the
on-screen keyboard, and the websites the tiles open.

The documentation will support:

* [ ] English (`README.md`)
* [ ] Brazilian Portuguese (`README.pt-br.md`)

Contributions for other languages are welcome!

---

## 🚀 Goals

* Fully offline-capable media system
* Fully remote-capable smart system
* Home Assistant hub for Alexa
* Full control with CEC / Bluetooth / phone / TV remote

---

## ✨ Why couchPie?

Because it lets you:

* Replace a Smart TV
* Travel with your entire home media stack
* Stream games from your PC to any screen
* Run everything from a single portable Pi

This project is in active development. Raspberry Pi 5 makes it possible.

> Stage 1 runs on a real Pi today. Stay tuned for the image builder and Stage 2!
