# Logos

Put the logos for the menu tiles here. They aren't part of the repository, since
they're the services' trademarks; git ignores everything in this folder but this
file.

`make-tiles` looks for these names and turns each logo into a tile. A tile whose
logo is missing shows its name instead, so the menu works without any.

| Tile | File |
|---|---|
| Área de Trabalho | `raspberrypi.jpg` |
| Steam Big Picture | `steam.webp` |
| YouTube | `youtube.png` |
| Netflix | `netflix.png` |
| Paramount+ | `paramount.png` |
| HBO Max | `hbomax.jpg` |
| Disney+ | `disney.webp` |
| Globoplay | `globoplay.jpg` |
| Prime Video | `primevideo.jpg` |

To use another file name or change how a logo is drawn (as is, turned white on the
brand color, cropped), edit the `TILES` table at the top of `../make-tiles`.

`scripts/bootstrap.sh` copies whatever is here to `~/.config/kiosk/menu/logos/` on
the Pi and builds the tiles.
