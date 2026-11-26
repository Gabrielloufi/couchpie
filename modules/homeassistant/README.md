# homeassistant

[Home Assistant](https://www.home-assistant.io/) in Docker, next to couchPie, until it
moves to a machine of its own. The bootstrap installs Docker and starts it.

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
- **No `privileged`, no USB, no Bluetooth.** The BroadLink and the Midea AC are on Wi-Fi.
  Home Assistant still finds the Pi's Bluetooth by itself on first start and logs
  permission errors: disable it under Settings → Devices & services → Bluetooth. Using it
  would need `/run/dbus` mounted and the `NET_ADMIN` and `NET_RAW` capabilities; leaving it
  off also keeps it away from the game controller.
- **Don't add Home Assistant's HDMI-CEC integration.** `cec-remote` owns the TV connection,
  as with Kodi.

## Devices

What each device in the house needs, as we find out. In Jira: HOMEA-2 (Dispositivos); the
BroadLink work is HOMEA-5.

### BroadLink RM4 Pro (infrared and RF, with the temperature and humidity sensor)

Bought 2026-11-26 with its temperature and humidity sensor cable (ST2), and on the home Wi-Fi.
Steps 1 to 3 below were done the same day.

1. **Unlock it in the BroadLink app.** The app locks new devices against local control, and
   Home Assistant can only talk to an unlocked one: device → ⋯ → Properties → turn off **Lock
   device**. The app keeps working.
2. **Reserve its address in the router** (DHCP reservation), so Home Assistant keeps finding
   it.
3. **Add it to Home Assistant:** Settings → Devices & services → Add integration →
   **Broadlink**, with its IP address. It brings a remote entity (to send and learn codes) and
   the cable's temperature and humidity sensors.
4. **Codes learned in the BroadLink app stay in the app.** Home Assistant can't use them, so
   each button is learned again from Home Assistant (`remote.learn_command`, below).

To find it and check whether it's still locked, from the Pi (a throwaway environment, outside
Home Assistant):

```bash
python3 -m venv /tmp/bl && /tmp/bl/bin/pip install -q broadlink
/tmp/bl/bin/python -c "import broadlink; [print(d.model, d.host[0], 'locked' if d.is_locked else 'unlocked') for d in broadlink.discover(timeout=8)]"
```

### Ventisol Fênix Inverter ceiling fan (RF remote)

| | |
|---|---|
| Fan | Ventisol Ventilador de Teto DC Fênix Inverter LED, bivolt |
| Remote | model 13930 |
| Radio | RF 433.95 MHz, ASK modulation |
| Anatel certificate | 00341-24-16487 |

What this means for Home Assistant:

- **It's radio, not infrared.** It needs the BroadLink RM4 Pro, which learns RF remotes in the
  315 and 433 MHz bands as well as infrared; the RM4 mini only does infrared. 433.95 MHz falls
  in the band the RM4 Pro covers, and ASK is the simple amplitude modulation that common
  433 MHz remotes use.
- **Learn each button of remote 13930** with the BroadLink integration: Developer tools →
  Actions → `remote.learn_command` with `command_type: rf`. It first sweeps to find the
  frequency (hold the button), then records it (press it once). Store the codes under one
  device name, such as `ventilador_fenix`.
- **Then make a fan entity** from those codes: a template fan that calls
  `remote.send_command`, or SmartIR's fan platform with a device file holding them. The voice
  assistant and PiPA can then say "liga o ventilador na velocidade 3".
- **Confirmed 2026-11-26:** the RM4 Pro learned remote 13930 in the BroadLink app and the
  fan obeys, so it sends a fixed code.
- **Learning it for Home Assistant (2026-11-26).**
  - Home Assistant's `remote.learn_command` (`command_type: rf`) found the frequency but timed
    out on the second step every time, even with the button pressed. Once it also stored a
    code without any button pressed, picked up from some other 433 MHz signal in the house.
  - What worked: [python-broadlink](https://github.com/mjg59/python-broadlink) on the Pi, at
    the known frequency (`find_rf_packet(433.95)`, from the Anatel certificate, so no sweep),
    polling `check_data()` for 30 s while the button is tapped several times.
  - Every code learned that way worked when sent back.
- **Only the buttons in use were learned:** speeds 0 (stop) to 6, ▼ (ventilação) and ▲
  (exaustão).
  - The power and light buttons are left out, because the light is a smart bulb switched on its
    own.
  - So is the ≈ button (it only cycles the speeds) and the timer, replaced by a script.
- **In Home Assistant** (`config/packages/ventilador.yaml`, the house's own file):
  - `script.ventilador_enviar` sends a command by name. The codes are inline as `b64:…`
    strings, so they don't depend on the integration's learned-codes store; a copy of the raw
    codes is in `config/ventilador-codigos-rf.json`.
  - `fan.ventilador` is a template fan with 6 speeds, where 0% is the 0 button. Its direction
    is the mode: forward = ventilação, reverse = exaustão. "On" goes back to the last speed
    used. Its state lives in helpers (`input_number.ventilador_velocidade`,
    `input_select.ventilador_sentido`), because RF is one-way.
  - `script.ventilador_desligar_em` turns it off after a number of minutes. It replaces the
    remote's 1H/2H/4H with any time, and doesn't survive a Home Assistant restart.
  - Tested through Home Assistant: 50% gave speed 3, exaustão switched the mode, and off
    stopped it.
  - For voice assistants and PiPA, three more scripts:
    - `script.ventilador_velocidade` (`velocidade` 0–6), so "velocidade 2" needs no
      percentages;
    - `script.ventilador_ventilacao` and `script.ventilador_exaustao`, because Assist has no
      intent for a fan's direction.
  - These and `script.ventilador_desligar_em` are exposed to Assist.
  - A speed's percentage rounds to the nearest speed (17% is speed 1).

### Elgin air conditioner (infrared)

Home Assistant's Broadlink integration (2026.11) gives the RM4 Pro these entities: a remote
(`remote.sala_de_estar_rm4_pro`), the sensors (`sensor.sala_de_estar_rm4_pro_temperatura`,
`..._umidade`), and, since 2026.5, an `infrared` emitter and a `radio_frequency` transmitter
for Home Assistant's native infrared platform.

**Why something more is needed.** The emitter can send any code, but Home Assistant doesn't
know which code means "frio, 23 °C". An air conditioner's remote sends the whole state on every
press (mode, temperature, fan), so it takes a full set of codes plus something that picks the
right one and shows a thermostat. The BroadLink app has that set for Elgin (its "Elgin" preset),
but it stays in the app, out of Home Assistant's reach.

Three ways to get it, cheapest first:

1. **A native infrared integration.** Home Assistant has built-in climate integrations on top of
   the infrared platform: [Gree Infrared](https://www.home-assistant.io/integrations/gree_infrared/),
   [LG Infrared](https://www.home-assistant.io/integrations/lg_infrared/), Samsung Infrared. None
   is for Elgin, but some brands share protocols, so Gree's is worth a try. It installs nothing:
   Add integration → Gree Infrared → pick the RM4 Pro's emitter.
2. **SmartIR**, a custom integration with code sets for many models, including two Elgin ones
   for BroadLink:

   | SmartIR code | Model | Modes | Fan | Temperature |
   |---|---|---|---|---|
   | 2800 | HVQI18B2IA | cool, heat | auto only | 16–32 °C |
   | 2801 | HVQI12B2FB | cool, heat | auto only | 17–30 °C |

   Each code file can be tried before installing anything, by sending one of its codes through
   the RM4 Pro. If one works, SmartIR makes it a thermostat:

   ```yaml
   climate:
     - platform: smartir
       name: Ar-condicionado
       unique_id: ar_condicionado
       device_code: 2801
       controller_data: remote.sala_de_estar_rm4_pro
       temperature_sensor: sensor.sala_de_estar_rm4_pro_temperatura
       humidity_sensor: sensor.sala_de_estar_rm4_pro_umidade
   ```
3. **Learn a few buttons** with `remote.learn_command` (off, cool at 22, 24 and 26…), and make
   them scripts. No third-party code, but no thermostat either: only the presets that were
   learned.

Whichever works, the RM4 Pro's sensor reports the room's temperature, so the voice can answer
"está quente na sala?" as well.

**Result, 2026-11-26.**

- **Gree Infrared:** no reaction.
- **SmartIR code 2801:** no reaction.
- **SmartIR code 2800** (made for the Elgin HVQI18B2IA) works on this unit: cool at 24 °C,
  cool at 22 °C and off all worked when sent straight through the RM4 Pro. Heat isn't tested
  yet.

What's installed:

- **SmartIR 1.18.2,** copied from its GitHub release into `config/custom_components/smartir`.
- **The tested code file,** placed at `custom_components/smartir/codes/climate/2800.json`.
  Otherwise SmartIR downloads it from GitHub on first use.
- **The climate,** in `config/packages/casa.yaml`: the house's own devices, kept out of this
  repository and out of the bootstrap's reach, with update checks off. It creates
  `climate.ar_condicionado`.
- **Things to keep in mind:**
  - Infrared is one-way: the thermostat shows the last state it sent, not the unit's real
    state, so a change made with the physical remote isn't seen.
  - Home Assistant warns that SmartIR uses temperature properties deprecated in 2027.11; a
    SmartIR update before then should fix it.
**Cool only, fan high (2026-11-26).**
- Both of the house's air conditioners only ever cool. The climate therefore uses a local code
  file, `codes/climate/9001.json`: SmartIR's 2800 without heat, which also makes Assist's
  "turn on" cool.
- An automation in `casa.yaml` turns the unit on in cool when its temperature changes while
  it's off. A new temperature always means cool at that temperature, so Assist's "set
  temperature" and the thermostat card just work.

**The infrared protocol.** Code 2800's "auto" fan ran at the lowest speed, and the code file
had no other. Decoding the codes showed the **Electra** protocol (as in IRremoteESP8266): a
13-byte frame starting with `0xC3`.

| Byte | Meaning |
|---|---|
| 1 | temperature: `((°C - 8) << 3) \| 7` |
| 4 | fan, bits 5–7: `0x20` high, `0x60` low (SmartIR's "auto"); medium is probably `0x40` and auto `0xa0` |
| 6 | mode: `0x20` cool |
| 9 | `0x20` on, `0x00` off (off frames also have `0x05` in byte 11) |
| 12 | checksum: the sum of bytes 0–11, modulo 256 |

- **Generating codes.** Cool with the fan high, for every temperature from 16 to 32 °C, was
  generated from one real capture of the remote. Only the data bits' spaces change, so the
  timing stays the remote's own.
- **Checks:** the generated codes match the captured ones at 29–32 °C, and a generated 23 °C
  cooled at full fan.
- **The fan speeds in Home Assistant:** `high` (the default) and `low`.
- **Where the tool lives:** the generator and the captures are in `config/ir-elgin/`, for
  other speeds later.
- **Remote display:** the remote's display goes out of sync whenever the unit gets an order
  that didn't come from it. That's normal for infrared.

- **For voice assistants and PiPA,** two scripts in `casa.yaml`, exposed to Assist:
  - `script.ar_condicionado_ligar` (`temperatura` 16–32; always cool) and
    `script.ar_condicionado_desligar`.
  - Why: Assist's "set temperature" only changes the target, and with the unit off SmartIR
    sends nothing.
  - Assist's "turn on" restores SmartIR's last mode, or its first one (heat) when it has none.
  - The script sets the mode and the temperature in one call (`climate.set_temperature` with
    `hvac_mode`).

## The touch panel next to the TV (HOMEA-7)

A small touch screen on the Pi's second HDMI port shows a Home Assistant dashboard: the room's
temperature and humidity, the air conditioner's thermostat, and the fan with a grid of
buttons like its remote. Set up 2026-11-26.

- **The dashboard** "Painel" (`/painel-casa`, storage mode, not admin-only) uses the sections
  view in two columns, which is what fits 1024×768.
  - Left: the thermostat card, with the fan-mode feature, and an off button.
  - Right: temperature and humidity tiles; the fan's tile with its speed feature; buttons for
    `script.ventilador_velocidade` 0–6; ventilação, exaustão, and "desligar em 30 min".
  - Below, on scroll: a 24-hour history graph.
- **The user** "Painel" is not an admin and logs in from the local network only.
  - Home Assistant logs it in by itself through a `trusted_networks` auth provider for the
    Pi's own address only (`/32`), with `allow_bypass_login`. Everyone else, on the home
    network or the tailnet, still gets the password login.
  - The provider must come **first** in `auth_providers`, or the login page still shows.
  - The panel must open the Pi's LAN address, not `localhost`: `tailscale serve` proxies from
    127.0.0.1, which stays untrusted.
- **The browser:** `~/.local/bin/painel-ha` starts Chromium in kiosk mode with its own profile
  (`~/.local/share/painel-ha`). It runs under Xwayland (`DISPLAY=:0`), like the kiosk's
  browsers.
- **Placing it.** labwc's window rules in `~/.config/labwc/rc.xml` (2026-11-26):
  - **Every window → the TV** (`identifier="*"`, `MoveToOutput` HDMI-A-2): Pegasus, Kodi,
    Moonlight, the kiosk's browsers, the remote's keyboard. That holds with the TV in standby,
    because its output stays connected.
  - **Then the panel → the touch screen** (`identifier="painel-ha"`, HDMI-A-1). All matching
    rules apply in order, so this one must come after the catch-all.
  - The panel's Chromium is started with `--class=painel-ha`. Its usual `chromium (<profile>)`
    name arrives only after the window opens, too late for a window rule.
  - labwc's autostart starts the panel.
  - A TV that is unplugged, not just in standby, removes its output. Windows would then land
    on the touch screen, unless the kernel forces the connector on (`video=HDMI-A-2:D`).
- **The touchscreen's input** has to be mapped to the same output: the `<touch ...
  mapToOutput=...>` line in labwc's `rc.xml`.
- **Hiding the sidebar:** the browser keeps "always hide the sidebar"
  (`localStorage.dockedSidebar = "always_hidden"`). It was set once in the panel's profile.

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
