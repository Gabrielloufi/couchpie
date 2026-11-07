# How couchPie works

couchPie is ordinary Raspberry Pi OS (Bookworm, labwc on Wayland) with a TV-style
home screen on top. The desktop is still there, one tile away.

## Boot

1. The Pi logs in to the desktop automatically.
2. labwc's autostart runs `kiosk boot`, which opens Pegasus full screen (unless the
   boot mode is set to the desktop with `kiosk off`), and starts the on-screen
   keyboard in the background.
3. Meanwhile the `cec-remote` service has registered the Pi with the TV over HDMI-CEC,
   so the TV remote already works.

## The pieces

```
TV remote ─CEC─> cec-remote ─virtual keyboard─> labwc ─> app in front
                     │                            │      (Pegasus, Kodi, Chromium, Moonlight)
                     │                            └─ Home / Close / raise bindings (rc.xml)
                     └─socket─> remote-keyboard ─wtype─> app in front

Pegasus tile ─> kiosk run <id> ─> app started detached, or brought to the front if open
```

| Piece | Module | Role |
|---|---|---|
| Pegasus + "Kiosk TV" theme | [pegasus](../../modules/pegasus/) | Home screen: tiles, the Streaming folder, Portuguese. |
| `kiosk` | [kiosk](../../modules/kiosk/) | Opens Pegasus, launches what tiles ask for, power prompts. |
| labwc bindings | [kiosk](../../modules/kiosk/) | Home, Close, and bringing open apps to the front. |
| `cec-remote` | [remote](../../modules/remote/) | TV remote → key presses; keeps the TV connection. |
| `remote-keyboard` | [remote](../../modules/remote/) | On-screen keyboard driven by the remote. |
| Kiosk browsers | [kiosk](../../modules/kiosk/), [browser](../../modules/browser/) | One full-screen Chromium per web tile, with remote-friendly navigation. |
| Kodi | [kodi](../../modules/kodi/) | Media files from the PC; opens straight into them. |
| SMB mounts | [smb](../../modules/smb/) | The PC's shared folders, mounted on demand. |
| Moonlight + Sunshine | (packages), [streaming](../../modules/streaming/) | Streams Steam Big Picture or the PC's desktop; the red button quits the app on the PC. |
| Home Assistant | [homeassistant](../../modules/homeassistant/) | Home automation, in Docker beside the rest; backups copied to the PC. |
| Whisper, F5-TTS, llama-server | [voice](../../modules/voice/) | On the PC's GPU: speech to text, text to speech and the LLM for Home Assistant's voice assistant. |
| `wake-pc`, wake page | [wake](../../modules/wake/) | Wakes the PC over the network; the page lets the phone and the PC wake the PC and turn the TV on or off over Tailscale. The Pi stays on to do it. |

## Decisions worth knowing

- **Pegasus, not Kodi, as the launcher.** Pegasus is a launcher first, themeable in
  QML, and starts any command; Kodi is one of the tiles. Pegasus is built from source
  because its prebuilt Raspberry Pi release is 32-bit and draws straight to the
  display, so it can't run as a window under Wayland.
- **Pegasus stays loaded while apps run** (`hide-delay-after-launch: -1`), and apps
  start detached from it. By default Pegasus unloads its menu until the launched
  command exits, and re-showing it afterwards covered the app just brought to the
  front.
- **One Chromium profile per web tile.** Each service keeps its own login and its own
  window, so Home, Close and "bring to front" act on one service. Chromium names the
  window `chromium (<profile path>)`, which is what labwc's bindings match.
- **Our own navigation for web pages, the TV interface for YouTube.** Chromium's
  `--enable-spatial-navigation` only reaches real links and buttons, and streaming
  sites build their tiles from plain elements with click handlers; the
  [browser](../../modules/browser/) extension finds anything that looks clickable,
  moves a highlight with the arrows and clicks with OK. YouTube's own TV interface
  (`youtube.com/tv`, only served to a TV user agent) is built for remotes and needs
  nothing extra.
- **Red on a stream quits the app on the PC.** Closing Moonlight only disconnects,
  leaving the game and Big Picture running; `moonlight-qt quit` makes Sunshine end
  the app and run its undo commands, which close both.
- **The remote goes through one service.** `cec-remote` grabs the kernel's CEC input
  device and re-emits keys on its own virtual keyboard, so it can translate buttons
  (OK → Enter, Samsung's vendor-specific Back → Esc), route them to the on-screen
  keyboard, and add Home/Close. Kodi's own CEC support is turned off so it doesn't
  take the TV connection.
- **Home and Close are labwc bindings.** labwc can find a window by its app ID and
  focus, raise or close it (`ForEach`/`If` queries), which no command-line tool on
  Raspberry Pi OS does.
- **Shares mount on demand** (systemd automount), so a PC that's off doesn't affect
  the boot.
