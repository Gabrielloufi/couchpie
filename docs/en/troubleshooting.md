# Troubleshooting

Problems met while building couchPie, and what fixed them.

## The remote

**Nothing happens.** Check that HDMI-CEC is on in the TV (Samsung: Anynet+), then
switch the TV to another input and back: the TV only forwards the remote to the
device it considers active. `journalctl -u cec-remote` should end with
`ready on /dev/cecN`. Check that `CEC_DEVICE` in `couchpie.conf` matches the HDMI
port the TV is on.

**Some button does nothing.** Find out what it sends: set `CEC_REMOTE_DEBUG=1` (see
[modules/remote](../../modules/remote/)), press it, and read `journalctl -u cec-remote`.
Samsung sends some buttons as vendor codes (`unmapped Samsung button 0x..`); add
them to `SAMSUNG_BUTTONS` in `cec-remote`.

**The remote stops working while Kodi is open.** Kodi's own CEC support has taken the
TV connection. `cec-remote` takes it back after a few seconds, but turn Kodi's off:
re-run `scripts/bootstrap.sh` with Kodi closed, or in Kodi: Configurações → Sistema →
Entrada → Periféricos → CEC Adapter → off.

**The keyboard doesn't open by itself in Chromium.** Chromium 156 doesn't tell the
system when a text field gets focus; use the blue button. GTK apps open it by
themselves.

## Pegasus

**Pegasus doesn't close** (`kiosk desktop`, "Área de Trabalho"). Pegasus's SDL
library catches SIGTERM; `kiosk` starts it with `SDL_NO_SIGNAL_HANDLERS=1`, and
kills it if it still doesn't exit.

**Home shows an empty screen, or an app disappears behind Pegasus.** Pegasus is
unloading its menu during launches: `general.hide-delay-after-launch: -1` must be in
`~/.config/pegasus-frontend/settings.txt`.

**Tiles of a folder also appear on the home screen.** A folder's collection must be in
its own `metadata.pegasus.txt`; see [modules/pegasus](../../modules/pegasus/).

## Browsers

**Chromium started over SSH doesn't open.** It needs `DISPLAY=:0` as well as
`WAYLAND_DISPLAY`; `kiosk` sets both.

**A tile opens a second window instead of the open one.** The raise binding in
`rc.xml` must match `chromium (*/kiosk/<id>)`: Chromium names windows after the
profile path, and ignores `--class` on Wayland.

**The arrows skip something on a site, or get stuck.** The
[browser](../../modules/browser/) extension only reaches things with a pointer
cursor, at least 14 pixels across and not covered by something else; a site fix
goes in the extension, like Netflix's preview card (a trailer with subtitles, which
the highlight kept hopping between). Back gets out of pop-ups; the mouse always
works.

**A site shows a blank page.** Look at what the page loads (see below). Paramount+
answered `403` to its sign-up module (`/static/signup/…`, `/api/tn/signup/…`) and
then crashed before drawing anything, in every new profile and even with a Windows
user agent; its sign-in page was a plain `Error 403 Forbidden`. The desktop's
Chromium profile, already signed in, was let through, so its tile uses that profile
(see [modules/kiosk](../../modules/kiosk/)).

**The green button only disconnects a stream.** Run
`modules/streaming/sunshine-setup.ps1` on the PC (see
[modules/streaming](../../modules/streaming/)). To check what it would close while a
game runs: `C:\ProgramData\couchpie\close-steam-game.ps1 -DryRun`.

**Looking inside a kiosk page.** Start the tile's Chromium by hand with
`--remote-debugging-port=9222` added (it only listens on the Pi itself), then use
`scripts/cdp.py` (needs `python3-websocket`): `cdp.py eval '<javascript>'` runs
JavaScript in the page, and `cdp.py errors` reloads it and prints the errors and
failed requests.

**A streaming service won't play video.** Check that `libwidevinecdm0` is installed.
Some services may need the browser to identify itself as a Chromebook; add a
`--user-agent=…` for that tile, as the YouTube tile does.

## Shared folders

**`mount error(115)` / no answer on port 445.** The PC isn't accepting file sharing:
its network is set to Public, the "File and Printer Sharing (SMB-In)" firewall rule
is off, the shares don't exist, or a VPN hides the PC from the local network. Run
`modules/smb/windows-share.ps1` again.

**`mount error(13)` / `STATUS_LOGON_FAILURE`.** The account or password in
`/etc/cifs-creds` doesn't match the Windows account.

## Tailscale

**The Pi is offline, "node key has expired".** At the Pi, run
`sudo tailscale up --force-reauth`, repeating any non-default flags it lists (for
example `--accept-dns=false`), and open the link it prints. Then turn off key expiry
for the Pi in the admin console.
