# kiosk

Turns the Raspberry Pi OS desktop into a TV box: Pegasus fills the screen at boot,
and the normal desktop is one tile away.

| File | Installed to | Purpose |
|---|---|---|
| `kiosk` | `~/.local/bin/kiosk` | Starts and stops Pegasus, and runs what the menu tiles ask for (`kiosk run <tile>`). |
| `kiosk-confirm` | `~/.local/bin/kiosk-confirm` | Full-screen yes/no question for Reiniciar, answerable with the remote. Cancelar starts selected. |
| `labwc-rc.xml` | merged into `~/.config/labwc/rc.xml` | Key bindings: Home, Close, Ctrl+Alt+K, and the keys `kiosk` uses to raise an open app. |
| `pegasus.desktop` | `~/Desktop/`, `~/.local/share/applications/` | "Pegasus" icon to get back to the menu from the desktop. |

```
kiosk start     open Pegasus if it isn't running
kiosk desktop   close Pegasus and stay on the desktop
kiosk close-stream  quit the app streaming from the PC, and Moonlight (red button)
kiosk standby   Modo espera: turn the TV off; the Pi stays on (see ../wake/)
kiosk wake      turn the TV on, to the Pi's input
kiosk boot      run by labwc's autostart; opens Pegasus unless boot mode is off
kiosk on|off    what the next boot shows: Pegasus (on) or the desktop (off)
kiosk status    boot mode, and whether Pegasus is running
kiosk run APP   used by the tiles
```

## How tiles launch apps

Pegasus waits for the command a tile runs and, by default, unloads its menu in the
meantime. `kiosk run` therefore starts apps detached and returns at once, and
Pegasus is set to stay loaded (`general.hide-delay-after-launch: -1`), so Home
always shows a working menu.

If the app is already open, `kiosk run` presses one of the `XF86Launch*` keys
instead; labwc's binding for that key finds the app's window and brings it to the
front. Chromium names each window after its profile, `chromium (<profile path>)`,
so every kiosk browser can be found on its own.

## Kiosk browsers

Every web tile is a separate full-screen Chromium (`--kiosk`) with its own profile in
`~/.local/share/kiosk/<name>`, so each service keeps its own login. Before starting
one, `kiosk` sets the profile to ask sites for Portuguese and not to offer
translations. Web pages get the [browser](../browser/) extension, which moves a
highlight with the arrows and clicks with OK; YouTube instead gets its TV interface
(`youtube.com/tv` with a smart-TV user agent), which handles the remote itself.

**Paramount+** is the exception: its bot protection refuses fresh profiles (HTTP 403,
even for its sign-in page) but accepts Chromium's desktop profile, where you're
signed in. Its tile therefore opens the desktop profile in kiosk mode, with the
extension, and leaves that profile's settings alone. That window is just
`chromium`, and it's the same browser as on the desktop: closing one closes the
other.

## The red button

`labwc-rc.xml` binds the red button (`XF86Close`) to close the app in front and
show Pegasus. On a Moonlight window it runs `kiosk close-stream` instead: that asks
the PC to quit the streamed app (`moonlight-qt quit <pc>`), which a close request
doesn't do, then closes Moonlight. With the PC side set up (see
[streaming](../streaming/)), quitting also closes the game and Steam Big Picture.

## Adding a tile

1. Add a `game:` block to `../pegasus/menu/metadata.pegasus.txt` (or to a folder's
   file) with `launch: @HOME@/.local/bin/kiosk run <id>`.
2. Add `<id>` to the `run` case in `kiosk`. For a website, one line:
   `<id>) web_page <id> XF86LaunchB "https://…" ;;`
3. For a website, add a binding for its raise key to `labwc-rc.xml`, matching
   `chromium (*/kiosk/<id>)`. Unused keys: `XF86LaunchB` to `XF86LaunchF`.
4. Optionally a logo: see `../pegasus/menu/logos/`.
