# Rebuild couchPie yourself

Everything, in order, starting from a Raspberry Pi that already runs a fresh Raspberry Pi OS.
At the end you have:

- the TV box: a Pegasus home screen, streaming services, Kodi, and games from the PC;
- the TV remote driving all of it, plus an on-screen keyboard;
- the PC waking from the remote or from your phone, anywhere;
- Home Assistant next to the rest, backing itself up to the PC;
- optionally, a local voice assistant in Brazilian Portuguese: no cloud, the PC's GPU does
  the heavy work.

The TV interface is in Brazilian Portuguese. Each step ends with a way to check it worked.
Steps marked *(optional)* can be skipped; later steps say what they need.

---

## 0. What you need

| | |
|---|---|
| **Raspberry Pi 5** | 8 GB recommended. Official 27 W power supply. |
| **microSD card** | 64–128 GB, A2/U3. Docker images, Pegasus's build and Home Assistant don't fit well in 32 GB. |
| **Raspberry Pi OS** | Bookworm, **64-bit, with desktop**, installed, with your user and network set up. Tested on Bookworm. |
| **Ethernet** | Recommended for the Pi: the PC wake-up and Home Assistant's device discovery go over the home network. |
| **TV with HDMI-CEC** | Turned on in the TV's settings (Samsung calls it Anynet+). Tested on a Samsung TV. |
| **Windows PC** *(optional)* | For game streaming (Sunshine), media files (shared folders), Wake-on-LAN, and the voice assistant (an NVIDIA GPU; 12 GB fits everything). |
| **Tailscale account** | Free. For the phone's wake page and Home Assistant from anywhere. |
| **A phone** | With the Tailscale app, and later the Home Assistant app. |

---

## 1. Prepare the Pi

On the Pi (a terminal on its desktop, or SSH):

```bash
sudo apt update && sudo apt full-upgrade -y
sudo raspi-config          # Localisation Options → Timezone; Interface Options → SSH, if you want it
sudo reboot
```

**Check:** `getconf LONG_BIT` prints `64`, and `df -h /` shows your card's size.

---

## 2. Tailscale on the Pi and the phone

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up          # open the link it prints and sign in
```

In the [Tailscale admin console](https://login.tailscale.com/admin):

1. **Machines** → the Pi → **Disable key expiry**. Otherwise it drops off the tailnet after
   about six months and needs signing in again at the Pi.
2. **DNS** → turn on **MagicDNS** and **HTTPS Certificates**. The wake page and Home
   Assistant's HTTPS address need them.

Install Tailscale on your phone and sign in with the same account.

**Check:** `tailscale status` on the Pi lists the phone. `tailscale ip` prints the Pi's
Tailscale addresses (you'll need them in step 9).

---

## 3. The Windows PC *(optional)*

Skip what you don't want; each part says what it's for. Get the repository on the PC too
(`git clone https://github.com/Gabrielloufi/couchpie.git`, or download the ZIP), since the
scripts below come from it. Run them in **PowerShell as administrator**, from the
repository's folder.

**3.1 Game streaming.**
1. Install [Sunshine](https://github.com/LizardByte/Sunshine/releases) and open its web
   page (https://localhost:47990) to set its username and password.
2. So that the remote's red button on a stream also closes the game and Steam Big Picture:

```powershell
powershell -ExecutionPolicy Bypass -File modules\streaming\sunshine-setup.ps1
```

**3.2 Media files for Kodi.** Shares your folders and creates the `couchpie` account the Pi
signs in with (it asks for a password; remember it for step 6):

```powershell
powershell -ExecutionPolicy Bypass -File modules\smb\windows-share.ps1 -Folders D:\Videos,D:\sharedFolder
```

**3.3 Wake-on-LAN**, so the Pi can turn the PC on:
1. **Device Manager** → your wired network adapter:
   - Advanced tab: turn on **Wake on Magic Packet** and **Shutdown Wake-On-Lan**.
   - Power Management tab: **Allow this device to wake the computer**.
2. **BIOS:** turn on Wake on LAN (or "Power On by PCI-E") and turn off **ErP**.
3. **The adapter's MAC address:** `getmac /v`. Keep it for step 5.
4. **Router:** give the PC a fixed IP address (a DHCP reservation).
5. If the PC wakes from Sleep but not from Shut down, turn off Fast Startup:
   ```powershell
   reg add "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Power" /v HiberbootEnabled /t REG_DWORD /d 0 /f
   ```

**3.4 Tailscale on the PC**, running even before anyone logs in, so the PC is reachable from
outside as soon as it wakes:
1. Install Tailscale and sign in.
2. In PowerShell as administrator (Windows', not WSL's):

```powershell
& "C:\Program Files\Tailscale\tailscale.exe" set --unattended
```

**Check:** `tailscale debug prefs` shows `"ForceDaemon": true`. Without a password typed at the PC,
Sunshine, the shared folders and Tailscale keep working. Games need a signed-in session:
Moonlight shows the Windows sign-in screen, and you can type your PIN with the remote.

---

## 4. Moonlight on the Pi *(optional, for game streaming)*

```bash
curl -1sLf 'https://dl.cloudsmith.io/public/moonlight-game-streaming/moonlight-qt/setup.deb.sh' \
  | distro=raspbian codename=$(lsb_release -cs) sudo -E bash
sudo apt install moonlight-qt
```

Open Moonlight from the Pi's desktop menu and pick the PC. It shows a PIN: enter it in
Sunshine's web page on the PC.

**Check:** Moonlight lists the PC, unlocked. Note the name it shows; that's `PC_HOST` below.

---

## 5. couchPie and its settings

```bash
git clone https://github.com/Gabrielloufi/couchpie.git
cd couchpie
cp couchpie.conf.example couchpie.conf
nano couchpie.conf
```

| Setting | What to put | How to find it |
|---|---|---|
| `PC_HOST` | The PC's name in Moonlight | Step 4 |
| `PC_ADDRESS` | The PC's fixed IP address | Step 3.3, or `ipconfig` on the PC |
| `PC_MAC` | The PC's wired network adapter | `getmac /v` on the PC |
| `SMB_SHARES` | The share names from step 3.2, separated by spaces | Each share is named after its folder: `D:\Videos` is `Videos` |
| `SMB_USER` | `couchpie` | Step 3.2 created it |
| `KODI_SHARE` | The share Kodi opens at start | One of `SMB_SHARES` |
| `HA_BACKUP_SHARE` | The share Home Assistant's backups are copied to | One of `SMB_SHARES` |
| `CEC_DEVICE`, `CEC_INPUT` | The HDMI port the TV is on | On a Pi 5, the port next to the USB-C power input is HDMI0: `/dev/cec0` and `vc4-hdmi-0`. The other one is `/dev/cec1` and `vc4-hdmi-1`. |

Without a PC, leave the PC settings as they are; the tiles that need it just won't work.

---

## 6. Run the installer

```bash
scripts/bootstrap.sh
```

The first run takes 20–30 minutes: it builds Pegasus (10–15 minutes) and downloads Home
Assistant and Piper (about 1 GB). Run it as your desktop user; it uses `sudo` where it needs to. It:

1. Installs the packages, and builds the Pegasus home screen at a tested version.
2. Installs each module from [modules/](modules/): the kiosk and its tiles, the TV remote
   service, the browser extension, Kodi's start folder, the PC's shared folders (mounted on
   demand), the wake page, and Home Assistant with Piper in Docker.
3. Merges its key bindings into labwc's `rc.xml` (keeping `rc.xml.bak`).
4. Publishes the wake page and Home Assistant to your tailnet with `tailscale serve`.
5. Makes the Pi log in to its desktop by itself.

It ends with a list of what's left for you, including the addresses of the wake page and
Home Assistant. Then:

```bash
sudo nano /etc/cifs-creds      # the password from step 3.2
sudo reboot
```

It's safe to run again any time, for example after `git pull`; it only replaces couchPie's
own files.

**Check:** after the reboot, the TV shows the Pegasus home screen.

---

## 7. First start

- **The remote:**
  - The arrows move through the tiles and OK opens them.
  - 🟢 green brings back the menu, 🔴 red closes the app in front, 🔵 blue opens the keyboard.
  - If the remote does nothing, switch the TV to another input and back.
- **Kodi:** the first time, it asks whether to enable "Quiosque: abrir Downloads do PC":
  choose Yes. If the installer said Kodi hadn't run yet, close Kodi and run
  `scripts/bootstrap.sh` once more, to turn off Kodi's own CEC support (it would take the
  remote away).
- **Streaming services:** open each tile once and sign in; each keeps its own login.
- **Steam Big Picture** and **Área de Trabalho do PC** stream from the PC.
- **Ligar PC:** shut the PC down, then press the tile; the PC turns on.
- **Modo espera** turns the TV off. The Pi stays on, because nothing can wake a Pi 5 over
  the network, and the phone reaches the PC through it.
- **The wake page:** on the phone, with Tailscale on, open `https://<pi>.<tailnet>.ts.net/`
  (the installer printed it) and add it to the home screen. It turns the PC and the TV on
  from anywhere.

Details and fixes: [docs/en/troubleshooting.md](docs/en/troubleshooting.md).

---

## 8. Home Assistant

Open `https://<pi>.<tailnet>.ts.net:8443/` (or `http://<pi>.local:8123` at home) **soon**:
whoever opens it first creates the owner account.

1. **Create your account** and go through the setup.
2. **Backups:** Settings → System → Backups. Turn on automatic backups (daily, keep 3).
   - **Save the emergency kit somewhere that isn't the Pi.** Backups are encrypted, and its
     key is the only way to restore them.
   - The Pi copies them to `couchpie\homeassistant-backups` on the PC's share every hour, when
     the PC is on.
3. **Bluetooth:** Settings → Devices & services → Bluetooth → disable it, unless you need it.
   Home Assistant finds the Pi's adapter by itself, but can't use it from the container.
4. **Piper** (a male voice for now, which runs on the Pi): Add integration → **Wyoming
   Protocol**, host `127.0.0.1`, port `10200`.
5. **The phone:** install the Home Assistant app and sign in at the tailnet address above.
6. **Never add Home Assistant's HDMI-CEC integration:** the TV remote service owns that
   connection.

**Check:** on the Pi, `systemctl list-timers ha-backup-sync` shows the next backup copy.
Everything else is in [modules/homeassistant/](modules/homeassistant/).

---

## 9. The voice assistant *(optional; needs the PC's NVIDIA GPU)*

Home Assistant listens through your phone, and the PC does the heavy work:

- **Whisper** turns speech into text.
- **F5-TTS** speaks the replies with a female voice ("dora").
- **llama-server** runs the language model.

All three start at boot, and only the Pi can reach them. Follow
[modules/voice/README.md](modules/voice/README.md):

1. **Copy the folders:** on the PC, copy `modules\voice\windows\whisper` and `f5-tts` to
   `D:\local-ai\`, and the files in `llm\` to `D:\local-ai\`.
2. **Install Whisper and F5-TTS**, as yourself:
   ```powershell
   powershell -ExecutionPolicy Bypass -File D:\local-ai\whisper\install.ps1
   powershell -ExecutionPolicy Bypass -File D:\local-ai\f5-tts\install.ps1
   ```
3. **The language model:**
   - Unzip a Windows CUDA build of [llama.cpp](https://github.com/ggml-org/llama.cpp/releases) into `D:\local-ai\llama.cpp`.
   - Download the model (`gemma-4-12b`, see `models.ini.example`) into `C:\local-ai\models\llm`.
   - Copy `models.ini.example` to `D:\local-ai\llama.cpp\models.ini`.
4. **Start them at boot**, in PowerShell as administrator. Use the Pi's addresses: `hostname -I` and
   `tailscale ip` on the Pi.
   ```powershell
   $pi = '192.168.0.77', '100.x.y.z', 'fd7a:115c:a1e0::xxxx'
   powershell -ExecutionPolicy Bypass -File D:\local-ai\whisper\setup-admin.ps1 -Allowed $pi
   powershell -ExecutionPolicy Bypass -File D:\local-ai\f5-tts\setup-admin.ps1 -Allowed $pi
   powershell -ExecutionPolicy Bypass -File D:\local-ai\setup-llm-service.ps1 -Allowed $pi
   ```
5. **Connect them in Home Assistant:**
   - Add integration → **Wyoming Protocol**, twice: `<pc>` port `10300` (Whisper) and
     `<pc>` port `10200` (F5-TTS).
   - Add integration → **llama.cpp**: URL `http://<pc>:8080/v1`, model `gemma-4-12b`.
6. **Create the assistant:** Settings → Voice assistants → Add assistant, Português (Brasil):
   - speech to text: Whisper;
   - text to speech: f5-tts, voice `dora`;
   - conversation agent: the llama.cpp one, with **Prefer handling commands locally** on.

**Check:** press the Assist button in the phone app and say "que horas são?". A reply comes
back in a few seconds. The first reply after the PC starts takes longer, because it loads
the model.

The next step, PiPA (a personal assistant behind the same voice, and on Telegram), is on
the roadmap in the [README](README.md).

---

## 10. Keeping it up to date

```bash
cd ~/couchpie && git pull && scripts/bootstrap.sh          # couchPie
sudo apt update && sudo apt full-upgrade                   # Raspberry Pi OS
sudo docker compose -f /srv/homeassistant/compose.yaml pull && \
  sudo docker compose -f /srv/homeassistant/compose.yaml up -d   # Home Assistant and Piper
```

Read Home Assistant's release notes before updating it, and keep a recent backup.

## When something doesn't work

- [docs/en/troubleshooting.md](docs/en/troubleshooting.md): the remote, Pegasus, browsers,
  shared folders, Tailscale.
- Each folder in [modules/](modules/) has a README with its files, logs and everyday commands.
- Logs on the Pi:
  - `~/.cache/kiosk.log`
  - `journalctl -u cec-remote`
  - `journalctl --user -u wake-page`
  - `sudo docker logs homeassistant`
- Logs on the PC: `C:\local-ai\<service>\logs\` and `C:\local-ai\logs\`.
