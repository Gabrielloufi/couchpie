# Third-party software and services

couchPie's own code is in this repository, under `AGPL-3.0-or-later`. This page lists what
comes from others: software couchPie installs, builds or works with, the services it opens,
and the models the voice assistant uses. It keeps clear what is couchPie and what belongs to
other projects, each under its own license.

**The repository contains no third-party code.** These components are installed by
`scripts/bootstrap.sh`, from Docker images, or by you following the guides. They are separate
programs that couchPie starts or talks to. Anyone distributing them (for example, preinstalled
on a box) must follow each one's license, which for the GPL ones includes offering their
source code.

Licenses marked ✓ were checked against the project's own license file or package metadata
in November 2026. Licenses marked "not checked" are as generally known; check them before
relying on them. Licenses can change between versions.

## On the Raspberry Pi

| Component | Used for | License | How couchPie gets it | Source |
|---|---|---|---|---|
| Pegasus | The home screen | GPL-3.0-or-later ✓ | Built from source by `bootstrap.sh` | [pegasus-frontend](https://github.com/mmatyas/pegasus-frontend) |
| Kodi | Media files | GPL-2.0-or-later ✓ | Raspberry Pi OS package | [xbmc/xbmc](https://github.com/xbmc/xbmc) |
| Moonlight | Game streaming from the PC | GPL-3.0 ✓ | Moonlight's apt repository (see the install guide) | [moonlight-qt](https://github.com/moonlight-stream/moonlight-qt) |
| Chromium | The kiosk browsers | BSD-3-Clause and others (not checked) | Raspberry Pi OS package | [chromium.org](https://www.chromium.org/) |
| Widevine CDM | Playing DRM-protected streams in Chromium | Proprietary, Google (not checked) | Raspberry Pi OS package `libwidevinecdm0` | — |
| labwc | The desktop's window manager; Home and Close bindings | GPL-2.0 ✓ | Part of Raspberry Pi OS | [labwc](https://github.com/labwc/labwc) |
| v4l-utils (`cec-ctl`) | Talking to the TV over HDMI-CEC | GPL-2.0 / LGPL-2.1 family ✓ (see its COPYING) | Raspberry Pi OS package | [v4l-utils (mirror)](https://github.com/gjasny/v4l-utils) |
| wtype | Typing from the on-screen keyboard | MIT ✓ | Raspberry Pi OS package | [atx/wtype](https://github.com/atx/wtype) |
| python-evdev | Reading the remote, the virtual keyboard | BSD-3-Clause ✓ | Raspberry Pi OS package `python3-evdev` | [python-evdev](https://github.com/gvalkov/python-evdev) |
| Pillow | Making the menu's tiles | MIT-CMU ✓ | Raspberry Pi OS package `python3-pil` | [Pillow](https://github.com/python-pillow/Pillow) |
| GTK 3, PyGObject | The on-screen keyboard and dialogs | LGPL-2.1-or-later (not checked) | Raspberry Pi OS packages | [gtk.org](https://www.gtk.org/) |
| GTK Layer Shell | Keeping the keyboard on top | LGPL-3.0-or-later, most files MIT ✓ | Raspberry Pi OS package | [gtk-layer-shell](https://github.com/wmww/gtk-layer-shell) |
| cifs-utils | Mounting the PC's shared folders | GPL-3.0 (not checked) | Raspberry Pi OS package | [samba.org](https://wiki.samba.org/index.php/LinuxCIFS_utils) |
| Docker Engine | Running Home Assistant | Apache-2.0 ✓ (Moby) | Docker's apt repository | [moby/moby](https://github.com/moby/moby) |
| Home Assistant | Home automation | Apache-2.0 ✓ | Docker image | [home-assistant/core](https://github.com/home-assistant/core) |
| Wyoming Piper | Text-to-speech server for Home Assistant | MIT ✓ | Docker image `rhasspy/wyoming-piper` | [wyoming-piper](https://github.com/rhasspy/wyoming-piper) |
| Piper (`piper-tts`) | The speech engine inside Wyoming Piper | GPL-3.0-or-later ✓ | Inside the Docker image | [piper1-gpl](https://github.com/OHF-Voice/piper1-gpl) |
| Tailscale | Reaching the Pi and the PC from anywhere | BSD-3-Clause ✓ (client) | Tailscale's installer | [tailscale](https://github.com/tailscale/tailscale) |
| Raspberry Pi OS | The operating system | Many licenses (not checked) | Installed by you; couchPie doesn't redistribute it | [raspberrypi.com](https://www.raspberrypi.com/software/) |

Development and test scripts (`scripts/cdp.py`, `scripts/qa-nav.py`) also use
[websocket-client](https://github.com/websocket-client/websocket-client) (Apache-2.0 ✓).

## On the PC

| Component | Used for | License | Source |
|---|---|---|---|
| Sunshine | Game streaming host | GPL-3.0 ✓ | [LizardByte/Sunshine](https://github.com/LizardByte/Sunshine) |
| Steam | Games, Big Picture | Proprietary, Valve (not checked) | [store.steampowered.com](https://store.steampowered.com/) |
| Wyoming Faster Whisper | Speech-to-text server | MIT ✓ | [wyoming-faster-whisper](https://github.com/rhasspy/wyoming-faster-whisper) |
| llama.cpp (`llama-server`) | Runs the language model | MIT ✓ | [ggml-org/llama.cpp](https://github.com/ggml-org/llama.cpp) |
| F5-TTS | Optional voice on the PC | MIT ✓ (code) | [SWivid/F5-TTS](https://github.com/SWivid/F5-TTS) |
| Tailscale | Reaching the PC | BSD-3-Clause ✓ (client) | [tailscale](https://github.com/tailscale/tailscale) |

## Models

Models have their own licenses, separate from the software that runs them. Check each
model's license (its model card) before using it, and especially before any commercial use.

- **Speech-to-text model** (Whisper `large-v3-turbo`): check its model card (not checked).
- **Language model** (for example Gemma): check the model's own terms (not checked).
- **F5-TTS pt-BR checkpoint**: non-commercial license; it can't be used in anything sold.
- **Piper voices**: each voice has its own license, listed with the voice.

## Services

couchPie opens these services' own websites or apps, with your own accounts and
subscriptions: Netflix, Prime Video, HBO Max, Disney+, Paramount+, Globoplay and YouTube;
and it can use Tailscale's coordination service. couchPie is not affiliated with or endorsed
by any of them; their names and logos are their owners' trademarks (see
[TRADEMARKS.md](TRADEMARKS.md)).

## Separate projects by the same author

- [PiPA (pipa-assistant)](https://github.com/Gabrielloufi/pipa-assistant): the personal
  assistant, in its own repository under its own license. It uses
  [nanobot](https://github.com/HKUDS/nanobot) (license not checked).
