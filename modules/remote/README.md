# remote

The TV remote, through the TV's HDMI-CEC connection, and an on-screen keyboard for it.

| File | Installed to | Purpose |
|---|---|---|
| `cec-remote` | `/usr/local/bin/cec-remote` | System service: registers the Pi with the TV and turns remote buttons into key presses. |
| `cec-remote.service` | `/etc/systemd/system/` | Runs it at boot. |
| `remote-keyboard` | `~/.local/bin/remote-keyboard` | On-screen keyboard, started by labwc's autostart. |

## Buttons

| Button | In apps | With the keyboard open |
|---|---|---|
| Arrows | arrow keys | move the selection |
| OK | Enter | type the selected key |
| Back | Esc | close the keyboard |
| Red | Home: Pegasus to the front (nothing closes) | Home |
| Green | Close the app in front and show Pegasus | Close |
| Blue | open the keyboard | close the keyboard |
| Numbers | digits | digits, typed straight into the app |
| Channel ▲ / ▼ | Page Up / Page Down: scroll the page | the same |
| Play, Pause, Rewind, Fast-forward | media keys | — |

Red and Green press `XF86HomePage` and `XF86Close`, which labwc handles (see
`../kiosk/labwc-rc.xml`).

## How `cec-remote` works

- Registers as "Raspberry Pi", a playback device, with `cec-ctl`, and tells the TV it
  is the active source: Samsung TVs only forward the remote to the active source.
- Answers the TV's power, deck and menu status queries, and re-announces itself when
  the TV switches to its input.
- Reads the standard buttons from the input device the kernel makes for the CEC port
  (grabbed, so they don't also reach apps), and Samsung's vendor-specific buttons
  (Back is `0x91`) from the CEC messages, and presses keys on a virtual keyboard.
- If another program takes over the TV connection (Kodi's own CEC support does),
  puts its registration back after a few seconds.
- Talks to the on-screen keyboard over `/run/cec-remote.sock` (group `input`).

`CEC_REMOTE_DEBUG=1` in the service's environment logs every button, to find out
what a remote sends:

```
sudo systemctl edit cec-remote     # [Service] Environment=CEC_REMOTE_DEBUG=1
journalctl -u cec-remote -f
```

## The on-screen keyboard

- Opens by itself when a text field gets focus in apps that support it (GTK apps:
  it watches squeekboard, Raspberry Pi OS's touch keyboard, and takes its place),
  or with the blue button anywhere (Chromium, Pegasus, Moonlight).
- Types into the focused app with `wtype`, so it never takes keyboard focus.
- Letters with ç, and a symbols page with accents, `www.` and `.com`.
- `remote-keyboard press <button>` acts as if a remote button was pressed (`up`,
  `down`, `left`, `right`, `ok`, `back`, `home`, `close`, `keyboard`); handy over SSH.
