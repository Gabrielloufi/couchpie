# CouchPie HDMI, DRM and Widevine Configuration Guide

## Summary
This document records the troubleshooting steps and verified findings regarding **HDCP and Widevine DRM playback** on Raspberry Pi 5 running **Raspberry Pi OS (Bookworm)** with Chromium.

Prime Video and other streaming services limit playback to **Standard Definition (SD)** on the Pi because the HDMI stack currently lacks **HDCP 2.x negotiation support**, even though Widevine DRM (software-level, L3) functions properly.

---

## Verified Configuration

**OS**: Debian 12 (Bookworm) – Raspberry Pi 5 build  
**Browser**: Chromium 140.0.7339.207 (arm64)  
**DRM Library**: Widevine 4.10.2662.3 (L3, software-secure)

### HDMI Detection
```bash
kmsprint | grep HDMI
```
→ `HDMI-A-1` (connected) — 1366×768 initially, later adjusted to 1920×1080 @ 60 Hz.

### Resolution Fix
Some systems remain stuck at 1366×768 due to saved preferences.  
Resolved by adjusting the display mode in the **Raspberry Pi OS GUI → Preferences → Screen Configuration** tool, then saving as the default.

No `~/.config/monitors.xml` file was present, confirming system-level persistence.

---

## DRM & HDCP Diagnostics

### Kernel Driver
```bash
lsmod | grep vc4
```
shows normal vc4 + drm helper modules.

### EDID & HDCP Capability
```bash
sudo cat /sys/class/drm/card1-HDMI-A-1/edid | edid-decode | grep -i hdcp
```
No HDCP extension block → HDMI driver does not expose HDCP capability.

### DRM Connector Enumeration
```bash
for f in /sys/class/drm/*/status; do echo "$f: $(cat $f 2>/dev/null)"; done
```
→ `/sys/class/drm/card1-HDMI-A-1: connected`

### Widevine Verification
```bash
dpkg -s libwidevinecdm0 | grep -i version
chromium-browser --enable-widevine --no-sandbox --enable-logging=stderr --v=1 2>&1 | grep -i widevine
```
Output confirms:
```
Registering bundled Widevine 4.10.2662.3
```

**Interpretation:** Widevine L3 loaded successfully; HDCP unavailable → only SD content permitted by DRM-restricted services (Prime, Netflix, Disney+).

---

## Chromium Behavior
- `chrome://components` shows **no separate Widevine CDM entry** — expected on Raspberry Pi builds.
- Logs confirm L3 registration but no hardware DRM or HDCP handshake.
- Prime Video enforces SD output with message:
  > *“Your video will play in Standard Definition because your computer hardware, HDMI cables, and display must all meet content protection (HDCP) requirements for HD video.”*

---

## Workarounds & Recommendations

### For HD Streaming
- **Use TV’s built-in apps or external streamer** (Fire TV, Chromecast, Android TV).  
  Raspberry Pi’s HDMI controller cannot negotiate HDCP 2.x; firmware support is not public.

### For Local Media Playback
- Use **VLC**, **MPV**, or **Kodi** for 1080p/4K local playback.  
  Install InputStream Adaptive for adaptive streaming:
  ```bash
  sudo apt install -y kodi kodi-inputstream-adaptive
  ```

### Optional: Upscale SD Streams
```bash
chromium-browser --enable-widevine --use-gl=egl --use-angle=opengles \
  --enable-features=VaapiVideoDecoder --ignore-gpu-blocklist \
  --force-device-scale-factor=1.5
```
This enhances visual output but doesn’t unlock HDCP.

---

## Summary of Findings
| Component | Status | Notes |
|------------|--------|-------|
| HDMI link | ✅ Connected | 1080p60 confirmed |
| VC4 driver | ✅ Loaded | Standard KMS operation |
| EDID HDCP | ❌ Missing | No HDCP capability in driver |
| Widevine CDM | ✅ Loaded (L3) | Software-secure only |
| Prime Video HD | ❌ Blocked by HDCP | Limited to SD playback |

---

## Conclusion
Chromium on Raspberry Pi (Bookworm) successfully loads Widevine L3 DRM but cannot complete an HDCP handshake through the vc4 HDMI driver.  
Until Raspberry Pi OS or the VC4 KMS stack gains HDCP 2.x support, protected streaming platforms (e.g., Prime Video, Netflix) will remain limited to SD resolution.  
CouchPie will maintain this configuration as “known limitation – DRM L3 only.”