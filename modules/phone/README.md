# phone

The phone as the TV's remote: a web page that any phone on the home network, the Pi's own Wi-Fi
(modules/ap) or the tailnet can open.

| File | Installed to | Purpose |
|---|---|---|
| `phone-remote` | `~/.local/bin/` | The page and its small API, on port 8096 (and HTTPS on the Pi's own Wi-Fi) |
| `phone-remote.service` | `~/.config/systemd/user/` | Runs it at login |

## What the page offers

- **The remote's buttons:** arrows, OK, Back, Home, Close and the keyboard. They go through
  `cec-remote`'s socket, so they act exactly like the TV remote.
- **TV power:** on and off.
- **The apps:** the home screen's apps, with their logos, read from Pegasus's menu files.
  - The reboot, standby and Controle Remoto tiles are left out, so a stray tap can't restart
    the Pi.
- **The voice assistant (PiPA):**
  - **🎤 Falar** records; a second tap sends. A text box takes typed questions too.
  - The remote sends the audio to speech-to-text, asks the assistant, and shows the answer.
  - It speaks the answer with the assistant's voice, or the phone's own when there's no voice
    server.
  - All three are OpenAI-style endpoints. The defaults are PiPA's on the same Pi
    ([pipa-assistant](https://github.com/Gabrielloufi/pipa-assistant): `pipa-stt` on 8904,
    `pipa-bridge` on 8901).
  - The section appears only when the assistant answers. Each phone keeps its own conversation.
- **"Casa":** a link to Home Assistant on the same host.
- **"Apontar":** the phone's gyroscope moves a mouse pointer on the TV.
  - It talks to the Pi over a WebSocket, and the moves reach `cec-remote`'s virtual "Phone
    pointer" device.
  - A two-step calibration finds the axes (turn right, then tilt up). They depend on how the
    phone is held and on the browser.
  - A dead zone and smoothing steady the hand.

## Profiles: a name and an avatar

The first time a phone opens the remote (on the Pi's Wi-Fi this is the sign-in page), a window
asks for the person's name and an avatar.
- **Where it's kept:** by the phone's MAC address, in `~/.local/state/couchpie/phones.json`
  (mode 600). Phones use one MAC per Wi-Fi network, so it stays the same on this one.
- **On the page:** the avatar is at the top. Tap it to change the name or the avatar.
- **For the assistant:** each message starts with "(quem fala: Nome, pelo controle do celular)",
  so it knows whom it's talking to. The name is what the person typed, not a login.
- **Avatars:** initials on a color, for now. The profile's `avatar` has a `kind`, so pictures
  (`"picture"`) can come later. The "Foto ou desenho" button is there, off.
- **Through tailscale serve:** phones have no MAC that the Pi can see (they all arrive from
  127.0.0.1), so there's no profile.

## The "Controle Remoto" tile

The home screen's tile opens `/tv` on the TV (`kiosk run remote`). It shows two QR codes:
1. The first joins the Pi's own Wi-Fi, with no password to type.
2. The second opens the remote's HTTPS address in the phone's browser.

The page is only served to the Pi's own browser, so the Wi-Fi password never goes over the
network. It needs `qrencode`.

## Who can use it

It only answers private addresses (the home network, the Pi's Wi-Fi, the tailnet), never the
internet. There is no password: anyone on those networks can use the TV, as with the TV's own
remote. The same goes for the assistant, as with a voice assistant in the room.

## HTTPS

Browsers only give the gyroscope and the microphone to HTTPS pages. The same address,
`https://<pi>.<tailnet>.ts.net:8446/`, works:
- **On the tailnet:** published by `tailscale serve --https=8446 http://127.0.0.1:8096` (the
  bootstrap sets it up).
- **On the Pi's own Wi-Fi, without Tailscale on the phone:** the hotspot's DNS points the name
  to the Pi. phone-remote then serves HTTPS itself, on 10.42.0.1:8446, with Tailscale's
  certificate for the name (see modules/ap). It reloads the certificate when renewed.

## The sign-in prompt

On the Pi's own Wi-Fi, phones show "Sign in to the network", and it opens this remote (see
modules/ap).
- The window asks for the name and avatar (above). **Entrar** saves them and releases the
  phone's internet.
- The sign-in window has no microphone, so for voice the page points to the browser:
  `couchpie.lan`, or the TV's second QR code.

## Settings

All optional, as `Environment=` lines in the unit. See the header of `phone-remote`:
- the ports;
- the hotspot's address, interface and password file;
- the certificate's paths;
- the assistant's name and its chat, speech-to-text and text-to-speech URLs.
