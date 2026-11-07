# wake

Wakes the gaming PC over the network, and turns the TV on or off, from the TV remote,
the phone or the PC.

| File | Installed to | Purpose |
|---|---|---|
| `wake-pc` | `~/.local/bin/wake-pc` | Sends the PC's Wake-on-LAN magic packet; `wake-pc status` says whether it's on. |
| `wake-page` | `~/.local/bin/wake-page` | The page the phone and the PC open: Ligar PC, Ligar TV, Modo espera. |
| `wake-page.service` | `~/.config/systemd/user/` | Runs the page, as a user service with lingering on. |

## Who wakes what

| From | The PC | The TV |
|---|---|---|
| TV remote | "Ligar PC" tile | TV's power button; the "Modo espera" tile turns it off |
| Phone, anywhere with Tailscale on | the page: Ligar PC | the page: Ligar TV, Modo espera |
| The PC | — | the page, or `curl -X POST https://<pi>.<tailnet>.ts.net/tv/on` |

## Why the Pi stays on

- **A Raspberry Pi 5 can't be woken over the network.** Its Ethernet chip's wake
  signal isn't wired to anything.
- **The magic packet is a broadcast on the home network.** Tailscale only carries
  traffic to devices that are on, so something at home has to be awake to send it.
  That's the Pi, which idles at about 3 W.

So the Pegasus menu has "Modo espera" instead of "Desligar": it turns the TV off over
HDMI-CEC (`kiosk standby`, through `cec-remote`) and leaves the Pi running. "Waking the
Pi" from the phone or the PC turns the TV back on to the Pi's input (`kiosk wake`). To
really shut the Pi down, run `sudo poweroff` over SSH; then only its power button brings
it back.

## The page

`tailscale serve` publishes it at `https://<pi>.<tailnet>.ts.net/` (the bootstrap
prints the address). Only your Tailscale devices can open it. It isn't on Funnel, so it
isn't on the internet. On the phone, open it and use "Add to home screen".

- It shows whether the PC is on (it answers a ping), refreshed every 3 seconds.
- The buttons POST to `/pc/wake`, `/tv/on` and `/tv/standby`. Requests from other
  websites' pages are refused (the browser's `Sec-Fetch-Site` header); `curl` works.
- It listens on `127.0.0.1:8095` only.

```
systemctl --user status wake-page      # is it running
journalctl --user -u wake-page         # what it did
tailscale serve status                 # is it published
wake-pc --wait                         # wake the PC and wait until it answers
```

## Windows side

The PC wakes from Sleep and from Shut down if its wired network card is set up for it:

- **Device Manager:** under the Realtek adapter's Advanced tab, turn on "Wake on Magic
  Packet" and "Shutdown Wake-On-Lan". Under Power Management, turn on "Allow this device
  to wake the computer".
- **BIOS:** turn on Wake on LAN (or "Power On by PCI-E") and turn off ErP.
- **Fast Startup:** if the PC wakes from Sleep but not from Shut down, turn it off. In
  PowerShell as administrator:

  ```powershell
  reg add "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Power" /v HiberbootEnabled /t REG_DWORD /d 0 /f
  ```

The packet goes to the card's MAC address (`PC_MAC` in `couchpie.conf`), so it works
whatever IP address the PC gets. The "on" status pings `PC_ADDRESS`, though, so give
the PC a fixed address in the router.
