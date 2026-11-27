# phone

The phone as the TV's remote: a web page that any phone on the home network, the Pi's own Wi-Fi
or the tailnet can open.

| File | Installed to | Purpose |
|---|---|---|
| `phone-remote` | `~/.local/bin/` | The page and its small API, on port 8096 |
| `phone-remote.service` | `~/.config/systemd/user/` | Runs it at login |

**What it offers:**
- **The remote's buttons:** arrows, OK, Back, Home, Close and the keyboard. They go through
  `cec-remote`'s socket, so they act exactly like the TV remote.
- **TV power:** on and off.
- **The apps:** the home screen's apps, with their logos, read from Pegasus's menu files. The
  reboot and standby tiles are left out, so a stray tap can't restart the Pi.
- **"Casa":** a link to Home Assistant on the same host.
- **"Apontar":** the phone's gyroscope moves a mouse pointer on the TV.
  - It talks to the Pi over a WebSocket, and the moves reach `cec-remote`'s virtual "Phone
    pointer" device.
  - A two-step calibration finds the axes (turn right, then tilt up). They depend on how the
    phone is held and on the browser.
  - A dead zone and smoothing steady the hand.

**Who can use it:** it only answers private addresses (the home network, the Pi's Wi-Fi, the
tailnet), never the internet. There is no password: anyone on those networks can use the TV, as
with the TV's own remote.

**HTTPS:** browsers only give the gyroscope to HTTPS pages. On the tailnet,
`sudo tailscale serve --bg --https=8446 http://127.0.0.1:8096` publishes it as
`https://<pi>.<tailnet>.ts.net:8446/`, with Tailscale's certificate.
