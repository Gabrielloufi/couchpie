# couchPie 🛋️🍓🍰

**Smart TV killer. Portable media hub. Pi-powered freedom machine.**

couchPie turns your Raspberry Pi 5 into a fully-customizable entertainment center that:

* Streams games from your PC using [Sunshine](https://github.com/LizardByte/Sunshine) and [Moonlight](https://moonlight-stream.org/)
* Plays media files from your PC over the network via SMB
* Launches Netflix, Prime Video, HBO Max, and more using Chromium in kiosk mode
* Boots directly into [Kodi](https://kodi.tv) with custom app shortcuts
* Supports CEC for your TV remote
* Runs fully offline OR remotely with [Tailscale](https://tailscale.com/) for secure remote access
* Integrates with Alexa using the Manual Smart Home Skill and Home Assistant (Stage 3)
* Can be taken anywhere, broadcast its own Wi-Fi, and act like a portable smart TV system

SmartTV killer. Portable Raspberry Pi media center with Streamings, Steam Link, Moonlight, Kodi, and Tailscale for home or travel.

---

## 🚀 Project Stages

### Stage 1 – Entertainment Hub (MVP)

* [x] Raspberry Pi OS (Bookworm)
* [x] Steam Link or Moonlight via Kodi
* [x] Chromium in kiosk mode with DRM support
* [x] Kodi interface with shortcuts for each service
* [x] SMB mount to play PC-stored media
* [x] TV CEC remote support

### Stage 2 – Remote Access Anywhere

* [ ] Tailscale setup for roaming access
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

* Modular environment detection (`home`, `safe travel`, `travel`) with dynamic configs
* Boot-to-Kodi with fallback to full desktop
* Kiosk mode for Chromium
* Custom Kodi apps: Netflix, Prime, Spotify, Steam, Local PC Files, etc.
* Low-cost upgrade path: no Smart TV required

---

## 🚿 Hardware Requirements

**Minimum:**

* Raspberry Pi 5 (4GB is OK, 8GB recommended)
* Official Pi 27W USB-C PSU
* HDMI cable
* MicroSD card (32–64GB recommended)
* Optional: Bluetooth keyboard/mouse combo (e.g. Logitech K400+)

**Recommended Add-ons:**

* NVMe SSD (M.2 HAT for Pi)
* Bluetooth controller
* Broadlink RM4 Mini for IR control
* Echo Dot for Alexa

---

## 🚄 Getting Started

```bash
# Coming soon...
$ ./build-couchpie.sh input/raspbian.img
```

You’ll be able to:

* Drop in your image
* Patch in the configs
* Burn it to SD
* Boot directly into Kodi

---

## 📚 License

MIT License. Project does not redistribute Raspberry Pi OS images.

---

## 🌐 Internationalization

This project will support:

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

> Stay tuned for scripts, image builders, and documentation coming soon!
