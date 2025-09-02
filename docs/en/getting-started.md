# Getting Started with couchPie

Welcome to **couchPie 🛋️🥧** — the open-source Smart TV killer couch companion.  
This guide will help you set up a development environment on **Windows + WSL2** so you can build and test couchPie before running it on a Raspberry Pi.
note: This is my current build since this is a side project.

---

## 1. Prerequisites

- Windows 10/11 with **WSL2** enabled
- A Linux distribution inside WSL (e.g., Ubuntu 22.04)
- [VS Code](https://code.visualstudio.com/) with the *Remote – WSL* extension (optional but recommended)
- [Docker Desktop](https://www.docker.com/products/docker-desktop) installed on Windows, with:
  - ✅ **Use WSL 2 instead of Hyper-V** enabled
  - ✅ **Enable integration with your WSL distro**
---
*@Gabrielloufi (note): this is my current build since I've been working mainly on this as a side project.*

## 2. Verify Docker inside WSL

Open your WSL terminal:

```bash
docker --version
docker run hello-world
```

You should see “Hello from Docker!”.
If you get permission denied on /var/run/docker.sock, run:

```
sudo groupadd docker 2>/dev/null || true
sudo usermod -aG docker $USER
exec su -l $USER
```

## 3. Enable ARM Emulation

couchPie targets Raspberry Pi (4/5) hardware (ARM64).
Enable QEMU/binfmt once:

```bash
docker run --rm --privileged tonistiigi/binfmt --install arm64,arm
```

## 4. Sanity Check: Run Debian (ARM)

```bash
# Raspberry Pi 4/5 style (arm64)
docker run --rm -it --platform linux/arm64 arm64v8/debian:bookworm \
  bash -lc 'uname -m && head -2 /etc/os-release'
```
Expected outputs:

aarch64 → arm64 (Pi 4/5)

## 5. Build a couchPie Dev Image
Create docker/dev/Dockerfile:
```dockerfile
FROM arm64v8/debian:bookworm
ENV DEBIAN_FRONTEND=noninteractive TZ=UTC LANG=C.UTF-8
RUN apt-get update && apt-get upgrade -y && \\
    apt-get install -y --no-install-recommends \\
      bash ca-certificates curl git sudo vim nano \\
      python3 python3-pip python3-venv \\
      avahi-daemon avahi-utils tzdata locales && \\
    apt-get clean && rm -rf /var/lib/apt/lists/*
WORKDIR /opt/couchpie
CMD ["/bin/bash"]
```

Build & run:
```bash
cd docker/dev
docker build -t couchpie/dev:arm64 .
docker run --rm -it --platform linux/arm64 couchpie/dev:arm64
```

## 6. Compose Setup
Create docker-compose.yml at the repo root:
```yaml
services:
  dev:
    image: couchpie/dev:arm64
    platform: linux/arm64
    tty: true
    stdin_open: true
    volumes:
      - ./scripts:/opt/couchpie/scripts
      - ./modules:/opt/couchpie/modules
    command: ["/bin/bash"]
```

Start the dev container:
```bash
docker compose up --build dev
```

## 7. Next Steps

Develop and test scripts inside /scripts and /modules.

Use this environment for headless services (Home Assistant, IR helpers, Tailscale).

Use the actual Raspberry Pi for GPU/DRM features (Steam Link, Moonlight, Netflix/Prime, emulation).

✅ You now have a reproducible couchPie dev environment running on your PC.

## Quick FAQ for Developers

# QEMU VM vs Docker arm64: Which Should You Use?

When setting up your couchPie development environment, you have two main options:

**1. QEMU VM (Full Raspberry Pi OS Emulation)**
- Use this if you want to see and interact with the full Raspberry Pi OS GUI, just like on real hardware.
- Best for developers working on features that require the actual user experience, such as media playback, HDMI output, or IR remote behavior.
- Simulates the complete couchPie experience, including Kodi and graphical modules.

**2. Docker (with --platform linux/arm64)**
- Use this if you are developing or testing modules, services, or integrations that don’t require the full GUI.
- Ideal for headless development, automation scripts, backend services, and Home Assistant modules.
- Faster to set up and run, especially on non-ARM hardware (using QEMU/binfmt for arm64 emulation).

**Summary:**
- If you need to see the GUI or test the real user experience, use the QEMU VM.
- If you’re just building or testing modules, Docker is usually faster and easier.

For most new contributors, starting with Docker is recommended. You can always try the QEMU VM later if you need to test the full couchPie interface.