# homeassistant

[Home Assistant](https://www.home-assistant.io/) in Docker, next to couchPie, until it
moves to a machine of its own. The bootstrap installs Docker and starts it.

| File | Installed to | Purpose |
|---|---|---|
| `compose.yaml` | `/srv/homeassistant/compose.yaml` | The Home Assistant and Piper containers. Piper's voices go in `/srv/homeassistant/piper`. |
| `configuration.yaml` | `/srv/homeassistant/config/` (fresh installs only) | Home Assistant's default configuration, loading couchPie's package. |
| `couchpie.yaml` | `/srv/homeassistant/config/packages/` (replaced every run) | History written less often; trusts `tailscale serve` as a proxy. |
| `daemon.json` | `/etc/docker/daemon.json` | Docker's log limits. |
| `ha-backup-sync`, `.service`, `.timer` | `/usr/local/bin/`, `/etc/systemd/system/` | Copies backups to the PC every hour. |

Home Assistant is at `http://raspberrypi.local:8123` at home and at
`https://<pi>.<tailnet>.ts.net:8443/` on the tailnet (`tailscale serve`). The
wake page keeps port 443.

The first time, open it and create your account (onboarding). Until then, anyone on the
home network or the tailnet who opens it first would create the owner account.

## Why Container and not Home Assistant OS

Home Assistant OS would take over the whole Pi. Container runs beside Pegasus,
Moonlight and Kodi, and it's still a supported way to install Home Assistant.

What it doesn't have is Home Assistant OS's add-on store. Each add-on is a container
of its own here, or a manual step:

| Add-on | Here |
|---|---|
| HACS (for SmartIR) | Installed into `config/custom_components` with HACS's download script |
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
- **No `privileged`, no USB, no Bluetooth.** The BroadLink and the Midea AC are on Wi-Fi.
  Home Assistant still finds the Pi's Bluetooth by itself on first start and logs
  permission errors: disable it under Settings → Devices & services → Bluetooth. Using it
  would need `/run/dbus` mounted and the `NET_ADMIN` and `NET_RAW` capabilities; leaving it
  off also keeps it away from the game controller.
- **Don't add Home Assistant's HDMI-CEC integration.** `cec-remote` owns the TV connection,
  as with Kodi.

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
