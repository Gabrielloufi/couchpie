# 🖥️ HDMI Resolution & Display Configuration (Raspberry Pi OS Bookworm)

## 📘 Overview
When using **Raspberry Pi OS (Bookworm)**, the system’s display resolution is no longer fully controlled by `/boot/firmware/config.txt`.  
The new **Wayland-based desktop** uses a user-level configuration file (`~/.config/monitors.xml`) to override display modes at login.

This means that even if you manually force `1920x1080@60Hz` in the firmware or kernel, the GUI may still load a **lower EDID-preferred resolution** (e.g., 1366×768) unless explicitly changed in the OS Preferences.

---

## 🧠 Root Cause
Bookworm introduced:
- **Wayland + KMS (Kernel Mode Setting)** for unified video handling.
- A new **Display Preferences GUI** (`Preferences → Display → Resolution`) that saves resolution per user.
- Per-user configuration stored in:
  ```bash
  ~/.config/monitors.xml
  ```
  This XML file overrides any lower-level kernel or firmware setting once the GUI session starts.

---

## 🔌 Symptoms
- `config.txt` correctly defines `hdmi_group`, `hdmi_mode`, etc.
- `kmsprint` or `modetest` shows HDMI-A-1 at 1366×768.
- GUI reports “1366×768 (60Hz)” even though firmware forces 1080p.
- Streaming apps (e.g., Prime Video, Netflix) display messages like:
  > “Your video will play in Standard Definition because your computer hardware, HDMI cables, and display must all meet HDCP requirements for HD video.”

---

## ✅ Fix (Preferred Method via GUI)
1. Open:
   ```
   Menu → Preferences → Display
   ```
2. Select:
   ```
   HDMI-A-1 → Resolution → 1920 × 1080 @ 60Hz
   ```
3. Click:
   ```
   Apply → Save
   ```
4. Reboot:
   ```bash
   sudo reboot
   ```

This will regenerate or update your user’s `~/.config/monitors.xml` with the new mode and ensure it persists.

---

## 🧮 Alternate Fix (Manual XML)
If you wish to pre-configure it (for image shipping or kiosk setups):

Create `/etc/xdg/monitors.xml` or `/usr/share/xdg/monitors.xml` with this content:

```xml
<monitors version="2">
  <configuration>
    <monitors>
      <monitor>
        <connector>HDMI-A-1</connector>
        <mode>1920x1080</mode>
        <rate>60.0</rate>
        <primary>yes</primary>
      </monitor>
    </monitors>
  </configuration>
</monitors>
```

This enforces a **system-wide fallback**, even if no per-user `monitors.xml` exists.

---

## 🤏 Fail-Safe Option (Firmware Level)
You can still add a firmware-level fallback in `/boot/firmware/config.txt`:

```bash
hdmi_group=1
hdmi_mode=16      # 1080p60
hdmi_force_hotplug=1
```

This ensures that even if the display manager fails, the framebuffer initializes in 1080p.

---

## 🔖 Debug Commands

| Purpose | Command |
|----------|----------|
| Detect connected displays | `kmsprint | grep HDMI` |
| Inspect detailed mode info | `modetest | grep -A12 "HDMI-A-1"` |
| List kernel modes | `sudo cat /sys/class/drm/card0-HDMI-A-1/modes` |
| Check framebuffer | `fbset -s` |

---

## ⚙️ Notes
- Bookworm may **ignore firmware HDMI modes** if Wayland has an active session preference.
- The **absence of `~/.config/monitors.xml`** means defaults are still active — no override yet.
- If you want CouchPie to boot always in 1080p for all users, prefer the **system-wide XML** approach above.

---

### 📟 Summary
| Layer | File | Purpose | Priority |
|--------|------|----------|-----------|
| GUI (Wayland) | `~/.config/monitors.xml` | User resolution settings | 🥇 Highest |
| System-wide | `/etc/xdg/monitors.xml` | Default fallback | 🥈 |
| Firmware | `/boot/firmware/config.txt` | Hardware-level fallback | 🥉 |

---

📎 *Next step:*  
We'll later explore creating a **post-boot check script** for CouchPie that ensures HDMI-A-1 runs at 1080p before launching the front-end.