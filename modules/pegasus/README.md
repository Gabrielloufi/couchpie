# pegasus

The home screen, on [Pegasus Frontend](https://pegasus-frontend.org) (built from
source by `scripts/bootstrap.sh`, pinned to a tested commit).

| Path | Installed to | Purpose |
|---|---|---|
| `theme/kiosk-tv/` | `~/.config/pegasus-frontend/themes/kiosk-tv/` | The "Kiosk TV" theme. |
| `menu/metadata.pegasus.txt` | `~/.config/kiosk/menu/` | Home screen tiles ("Início"). |
| `menu/streaming/metadata.pegasus.txt` | `~/.config/kiosk/menu/streaming/` | The Streaming folder. |
| `menu/make-tiles` | `~/.config/kiosk/menu/` | Draws tile images from the logos into `media/`. |
| `menu/logos/` | `~/.config/kiosk/menu/logos/` | Logos (not in the repository; see its README). |
| `settings.txt` | merged into `~/.config/pegasus-frontend/settings.txt` | Portuguese, this theme, and keep the menu loaded while apps run. |

## The theme

- A 5-column grid of tiles; the selected one grows and gets a red outline.
- The first collection is the home screen. A tile with `x-folder: <collection>` is a
  folder: OK opens that collection in its place, Back closes it. Without a picture
  of its own, it shows its first four tiles.
- Back on the home screen is left to Pegasus, which opens its menu (Configurações,
  Ajuda, Sair).
- Header: where you are, the time and the date. Footer: what the selected tile does,
  and what the remote's buttons do.
- Coming back from an app returns to the same tile, inside a folder if needed.

## Menu files

One file per collection: Pegasus adds every game in a file to *all* the collections
defined above it, so a folder's collection can't share a file with the home screen.
Both folders are listed in `~/.config/pegasus-frontend/game_dirs.txt`.

Tiles are ordered by `sort-by`, compared as text, so keep two digits. Pegasus skips
entries without a `file:` line; tiles use made-up `kiosk:<id>` URIs.
