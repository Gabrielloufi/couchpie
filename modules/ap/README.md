# ap

The Pi's own Wi-Fi, for phones: a hotspot (`couchpie-ap`) that guests join from a QR code on the
TV, with the phone remote one tap away. It's optional: `AP_SSID` in `couchpie.conf` turns it on.

| File | Installed to | Purpose |
|---|---|---|
| `couchpie-ap-refresh` | `/usr/local/sbin/` | Keeps the hotspot's names, the remote's HTTPS certificate and the sign-in prompt (below) |
| `couchpie-ap-refresh.service`, `.timer` | `/etc/systemd/system/` | Runs it at boot and daily |
| `90-couchpie-ap` | `/etc/NetworkManager/dispatcher.d/` | Firewall and port 80 when the hotspot comes up |
| `dnsmasq-couchpie.conf` | `/etc/NetworkManager/dnsmasq-shared.d/couchpie.conf` | The hotspot's DNS reads couchPie's names |

## The hotspot

- **What it is:** NetworkManager's shared mode on `wlan0`.
  - The Pi is 10.42.0.1; phones get addresses by DHCP.
  - Phones reach the internet through the Pi's Ethernet, so **the Pi must be on Ethernet**:
    `wlan0` can't be a hotspot and a client at once.
- **What the bootstrap does:** it creates the connection (WPA2, 2.4 GHz) with a generated
  password, kept in `~/.config/couchpie/ap-password` (mode 600).
- **Nobody types the password:** the home screen's **Controle Remoto** tile shows it as a QR
  code that phone cameras join from (modules/phone).
- **The firewall:** Docker (Home Assistant) sets the iptables FORWARD policy to DROP, which would
  cut the phones off the internet. Without internet, Android quietly moves to mobile data and
  can't reach the Pi either. The dispatcher accepts the hotspot's traffic in the DOCKER-USER
  chain.

## HTTPS without Tailscale on the phone

Browsers only give the microphone (voice) and the gyroscope (pointer) to HTTPS pages.
- **On the tailnet:** `tailscale serve` already publishes the remote at
  `https://<pi>.<tailnet>.ts.net:8446/`.
- **On the hotspot, without Tailscale on the phone:**
  1. The hotspot's DNS answers that same name with the Pi's address.
  2. The phone remote serves HTTPS there itself.
  3. The certificate is Tailscale's, from Let's Encrypt, for that name: `couchpie-ap-refresh`
     fetches it with `tailscale cert` and copies it to `/etc/couchpie/tls/`. The key is
     readable by the desktop user's group.
- **The result:** the same address works on both networks, with a valid certificate.
- **The Pi still needs Tailscale,** with HTTPS certificates on for the tailnet, to get the
  certificate. Phones don't.
- **One limit:** a phone with *Private DNS* set to a fixed provider (Android's Settings > Network)
  skips the hotspot's DNS. On such a phone the name doesn't resolve. The default "automatic"
  setting works.

## The sign-in prompt (captive portal)

Phones check whether a new Wi-Fi reaches the internet by fetching known addresses, such as
`connectivitycheck.gstatic.com` and `captive.apple.com`.
- **How it works:**
  - The hotspot's DNS points those addresses to the Pi, and port 80 goes to the phone remote.
  - The remote answers with a redirect to itself, so the phone shows "Sign in to the network"
    and opens the remote.
  - That page asks for the person's name and an avatar (modules/phone). **Entrar** saves them
    and releases the phone: from then on the remote answers the checks as the internet would.
  - The release lasts until the phone leaves the Wi-Fi (`iw station dump`, every 30 s).
- **Why the page sends you to the browser:** the sign-in window is a reduced browser without a
  microphone. For voice, the page points to the browser: `couchpie.lan`, or the TV's second QR
  code.
- **Until Entrar:** Android uses mobile data for the internet.
- **To turn the prompt off:** set `AP_PORTAL=0` in `/etc/default/couchpie-ap`, then
  `sudo systemctl start couchpie-ap-refresh`.

## Names on the hotspot

`/etc/couchpie/ap-hosts`, written by `couchpie-ap-refresh`:
- `couchpie.lan`: the remote (port 80 redirects to its HTTPS address).
- the Pi's tailnet name.
- the internet checks, while the prompt is on.

## Settings

`/etc/default/couchpie-ap`, all optional:
- `AP_ADDRESS`: 10.42.0.1.
- `AP_PORTAL`: 1.
- `AP_GROUP`: the group that may read the certificate's key.
