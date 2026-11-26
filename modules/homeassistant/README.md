# homeassistant

[Home Assistant](https://www.home-assistant.io/) in Docker, on the same Raspberry Pi as couchPie:
a Home Assistant flavor for people who want both on one Pi, until it moves to a machine of its
own. It's an optional module.
- **Today** the bootstrap installs it along with every other module.
- **Later:** an installer will let you pick the modules (media center, games, Home Assistant,
  personal assistant).

**What it provides:**
- Docker, Home Assistant and Piper;
- backups copied to the PC;
- history written more gently on the SD card;
- a touch panel next to the TV.

Your house's devices, dashboards and automations are yours, and belong in a repository of
your own (see [Your house's own configuration](#your-houses-own-configuration)).

| File | Installed to | Purpose |
|---|---|---|
| `compose.yaml` | `/srv/homeassistant/compose.yaml` | The Home Assistant and Piper containers. Piper's voices go in `/srv/homeassistant/piper`. |
| `configuration.yaml` | `/srv/homeassistant/config/` (fresh installs only) | Home Assistant's default configuration, loading couchPie's package. |
| `couchpie.yaml` | `/srv/homeassistant/config/packages/` (replaced every run) | History written less often. |
| `daemon.json` | `/etc/docker/daemon.json` | Docker's log limits. |
| `ha-backup-sync`, `.service`, `.timer` | `/usr/local/bin/`, `/etc/systemd/system/` | Copies backups to the PC every hour. |
| `painel/painel-ha`, `painel/labwc-windowrules.xml` | `~/.local/bin/`, `~/.config/labwc/rc.xml` (by hand for now) | The touch panel's browser, and the window rules that keep it on the small screen and everything else on the TV. |

Home Assistant is at `http://raspberrypi.local:8123` at home and at
`https://<pi>.<tailnet>.ts.net:8443/` on the tailnet (`tailscale serve`). The
wake page keeps port 443.

The first time, open it at home and create your account (onboarding). Until then, anyone
on the home network or the tailnet who opens it first would create the owner account.

**The tailnet address needs one setting first**, or every request through it fails with
"400: Bad Request" and the log says "A request from a reverse proxy was received from
127.0.0.1, but your HTTP integration is not set-up for reverse proxies". `tailscale serve`
passes requests on from 127.0.0.1, and Home Assistant must be told to trust it:

1. At home (`http://raspberrypi.local:8123`), open Settings → System → Network.
2. In the web server's settings, turn on **Use X-Forwarded-For** and add `127.0.0.1` and `::1`
   as **trusted proxies**. Save; Home Assistant restarts.
3. **Within 5 minutes**, confirm the new settings on that same page. Since 2026.11, every
   change to these settings is a trial: if it isn't kept in time, Home Assistant goes back to
   the previous settings and doesn't try the change again. These settings can't be set in
   YAML anymore; Home Assistant ignores an `http:` block there.

## Why Container and not Home Assistant OS

Home Assistant OS would take over the whole Pi. Container runs beside Pegasus,
Moonlight and Kodi, and it's still a supported way to install Home Assistant.

What it doesn't have is Home Assistant OS's add-on store. Each add-on is a container
of its own here, or a manual step:

| Add-on | Here |
|---|---|
| SmartIR (infrared and RF devices as climate and fan entities) | Copied from its GitHub release into `config/custom_components/smartir`; HACS optional, for updates |
| Piper (text to speech) | The `piper` container, below |
| Whisper, Speech-to-Phrase (speech to text) | Their own containers, once we add them |
| Mosquitto (MQTT) | Only if an MQTT device shows up |
| Matter server | Not planned: Home Assistant supports Matter on Home Assistant OS only |
| File editor | Edit the files over SSH or VS Code |

## On the Pi 5

- **Docker comes from Docker's repository**, because Home Assistant needs Docker Engine 23
  or later and Bookworm's `docker.io` is older.
- **16 KB memory pages**, the Pi 5 kernel's default, used to crash Home Assistant (jemalloc,
  fixed with `DISABLE_JEMALLOC`). It has used mimalloc since, and 2026.11 runs as it is.
- **No `privileged`, no USB, no Bluetooth.** Wi-Fi devices, such as an infrared and RF bridge or a Wi-Fi air conditioner, need none of it.
  Home Assistant still finds the Pi's Bluetooth by itself on first start and logs
  permission errors: disable it under Settings → Devices & services → Bluetooth. Using it
  would need `/run/dbus` mounted and the `NET_ADMIN` and `NET_RAW` capabilities; leaving it
  off also keeps it away from the game controller.
- **Don't add Home Assistant's HDMI-CEC integration.** `cec-remote` owns the TV connection,
  as with Kodi.

## Your house's own configuration

This module installs Home Assistant itself. A house's devices, their codes, dashboards,
automations and scripts are that house's, and are best kept out of this repository:

- **In Home Assistant:** put them in YAML packages in `config/packages/`.
  - Every file there is loaded.
  - The bootstrap only replaces `couchpie.yaml`, so give yours any other name.
  - `configuration.yaml` is installed only on a fresh install, so your own version is safe
    too.
- **In git:** keep them in a private repository of your own, with a small script that copies
  them onto the Pi. Otherwise they exist only on the SD card and in Home Assistant's
  encrypted backups.
- **This author's version** is the private `home-assistant-gabe`. It holds:
  - the devices: a BroadLink RM4 Pro, an RF ceiling fan, and an infrared air conditioner
    through SmartIR with a code file of its own;
  - their codes and scripts for voice;
  - the panel's dashboard;
  - an `install.sh` that copies the files, runs `check_config` and restarts Home Assistant.
- **PiPA works the same way:** `pipa-assistant` is public, and `pipa-gabe` holds the private
  persona and settings.

## A touch panel next to the TV

A small touch screen on the Pi's second HDMI port can show a Home Assistant dashboard, while
every app stays on the TV. The module has the two pieces in `painel/`. For now they're
installed by hand (HOMEA-15):

1. **A dashboard that fits the screen.** The sections view with two columns fits 1024×768.
   Don't make it admin-only.
2. **A user for the panel** that isn't an admin, with "Can only log in from the local network"
   on.
3. **Automatic login for that user, from the Pi only,** in `configuration.yaml`:

   ```yaml
   homeassistant:
     auth_providers:
       - type: trusted_networks
         trusted_networks:
           - <the Pi's LAN address>/32
         trusted_users:
           <the Pi's LAN address>/32: <the panel user's ID>
         allow_bypass_login: true
       - type: homeassistant
   ```

   - **Order matters:** the trusted provider must come first, or the login page still shows.
   - **Only the Pi is trusted:** it is the only address (`/32`). Everyone else, on the home
     network or the tailnet, still gets the password login.
   - **Use the LAN address:** the panel must open the Pi's LAN address, not `localhost`.
     `tailscale serve` proxies from 127.0.0.1, which stays untrusted.
4. **The browser.** Copy `painel/painel-ha` to `~/.local/bin/`, and add
   `$HOME/.local/bin/painel-ha &` (with the path written out) to `~/.config/labwc/autostart`.
   - It starts Chromium in kiosk mode, with its own profile (`~/.local/share/painel-ha`) and
     the window class `painel-ha`.
   - It runs under Xwayland (`DISPLAY=:0`), like the kiosk's browsers.
   - `PAINEL_URL` picks the dashboard. The default is `http://<the Pi's LAN
     address>:8123/painel-casa/sala`.
5. **The window rules.** Add `painel/labwc-windowrules.xml` to `~/.config/labwc/rc.xml` and
   reload labwc (`kill -HUP` its process). `wlr-randr` lists your outputs.
   - **Every window goes to the TV** (`identifier="*"`, `MoveToOutput` HDMI-A-2): Pegasus,
     Kodi, Moonlight, the kiosk's browsers, the remote's keyboard. That holds with the TV in
     standby, because its output stays connected.
   - **Then the panel goes to the touch screen** (`identifier="painel-ha"`, HDMI-A-1). All
     matching rules apply in order, so this one must come after the catch-all.
   - **Why the class:** the panel's Chromium is started with `--class=painel-ha`. Its usual
     `chromium (<profile>)` name arrives only after the window opens, too late for a window
     rule.
   - **An unplugged TV** (not just in standby) removes its output. Windows would then land on
     the touch screen, unless the kernel forces the connector on (`video=HDMI-A-2:D`).
6. **The touch input** goes to the same output: a line like `<touch
   deviceName="<your touchscreen>" mapToOutput="HDMI-A-1" mouseEmulation="yes" />` in
   `rc.xml`. Otherwise touches land on the TV's output.
7. **Hide the sidebar** once, in the panel's own browser: the user's profile → "Always hide
   the sidebar". The setting is kept in that browser's profile.

## Piper: the voice

[Wyoming Piper](https://github.com/rhasspy/wyoming-piper) speaks Home Assistant's replies.
It listens on `127.0.0.1:10200` only, since the Wyoming protocol has no password, and
Home Assistant reaches it there because both use the host's network.

To add it, after onboarding: Settings → Devices & services → Add integration → **Wyoming
Protocol**, host `127.0.0.1`, port `10200`. Then pick it as the text-to-speech engine of
a voice assistant (Settings → Voice assistants), with language Português (Brasil) and a
voice.

The Brazilian Portuguese voices are `pt_BR-faber-medium` (the default here), `-cadu-medium`,
`-jeff-medium` and `-edresson-low`. Each is about 60 MB and is downloaded the first time
it's used, so choosing another one in Home Assistant is enough to switch. Faber pauses the
least, which suits short replies.

On the Pi 5, with Home Assistant running, a two-sentence reply ("Pronto, liguei o
ventilador da sala. Quer que eu ajuste a temperatura do ar também?") takes 1.4 to 2 seconds
to synthesize, and the first sentence's audio is ready in 0.5 to 1 second, because Piper
sends each sentence as soon as it's done. A voice's first use after a restart takes a few
seconds more to load it. Piper uses about 300 MB of memory; the image takes 780 MB of disk.

## Backups and history

**Backups** are written on the Pi first (`config/backups`) and copied to the PC every hour
(`ha-backup-sync`). That way a PC that's off never costs a backup; the copy catches up the
next time it's on. They land in `couchpie/homeassistant-backups` on the `HA_BACKUP_SHARE`
share (`sharedFolder` by default). Nothing is deleted on the PC.

Set the backups up once in Home Assistant (Settings → System → Backups): automatic, daily,
keeping 3 on the Pi. **Save the emergency kit somewhere that isn't the Pi**: backups are
encrypted, and its key is the only way to restore them.

**History** (the recorder's database) stays on the Pi. Home Assistant writes it to one
database, with no fallback. One on the PC would leave gaps whenever the PC sleeps, and the
recorder doesn't start at all if its database is missing when Home Assistant starts.
SQLite, the default database, isn't safe on a network share either. So `couchpie.yaml`
makes it gentler on the microSD card instead: written every 30 s instead of 5, kept for 7
days instead of 10. Long-term statistics, like energy, are kept beyond that.

## Everyday commands

```
sudo docker compose -f /srv/homeassistant/compose.yaml pull && \
  sudo docker compose -f /srv/homeassistant/compose.yaml up -d     # update
sudo docker restart homeassistant                                  # restart
sudo docker logs -f homeassistant                                  # log (or piper)
sudo docker exec homeassistant python -m homeassistant --script check_config --config /config
systemctl list-timers ha-backup-sync                               # last and next backup copy
journalctl -u ha-backup-sync                                       # what it copied
```

Read the release notes before updating. To go back, restore a backup made on the older
version; installing an older image doesn't undo changes to the data.

## Moving it to its own machine later

Make a backup, then restore it during the new install's onboarding; the new machine can be
a different kind of device. Home Assistant OS runs directly on a small x86 PC. On a Mac
mini it would run in a virtual machine, since Home Assistant doesn't support Docker Desktop.
