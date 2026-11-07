# browser

A Chromium extension loaded into the kiosk browsers (Navegador and the streaming
tiles, not YouTube, whose TV interface handles the remote itself). Installed to
`~/.config/kiosk/tv-browser/`.

## The remote in a page (`nav.js`)

- **Arrows** move a red highlight to the nearest clickable thing in that direction.
  Streaming sites build most of their tiles and buttons from plain elements with
  click handlers, which Chromium's own spatial navigation can't reach, so `nav.js`
  finds them by what they look like: a pointer cursor, at least 14 pixels across, on
  screen and not covered by something else (something faded out, like a closing
  menu, doesn't count as covering). A carousel's page dots, a clickable panel around
  other controls (the controls in it are the stops) and small buttons laid over a
  card (HBO Max's "⋯") are skipped.
- **Rows.** Left and right stay in the row: the next whole poster, and at the end of
  what shows, the row's arrow button turns the row (the highlight waits for the row
  to stop sliding, then goes to the first poster that came in), or the row scrolls.
  The arrow buttons themselves are never stops.
- **Up and down** go to the nearest thing that way, row by row; when there's nothing
  more on screen, the page scrolls and the highlight follows once the next row is
  drawn. A header pinned to the top of the screen is reached once the page is near
  its top.
- **Stuck.** When a press can't move, the highlight shakes; pressing the same way
  again leaves the box it's in: a menu or dialog (closing it), a panel, or the row.
- **First press** on a page: what OK was last pressed on there (coming back to it),
  else the main action (Assistir, Continuar…), else the item nearest the left of
  the screen's middle.
- **Menus that open under the mouse** (profile menus) get a simulated hover. OK on a
  button whose menu the hover opened goes into the menu instead of closing it.
- **OK** clicks. On a text field it focuses the field for the on-screen keyboard;
  until then the arrows go past fields (one the page focuses by itself, like
  Google's search box, doesn't catch them).
- **Back** (Esc) leaves a text field; closes the open menu or dialog and puts the
  highlight back on the button or poster that opened it; or goes back a page, to the
  poster OK was pressed on there. In a tab that a link opened (a help page), with
  nothing to go back to, it closes the tab (`background.js`). In the service's own
  tab, a message says to use the green button to get back to the home screen.
- **Page Up / Page Down** (the channel buttons, if the TV sends them) scroll the
  box the highlight is in, or the page, by most of a screen.
- **Videos.** While a video plays full screen, or fills the screen on a player page
  (`/watch`, `/play`, `/video`, Globoplay's `/v/123`) or with its sound on, the
  arrows are left to the player. A home page's silent trailer doesn't count. Moving
  the mouse hides the highlight.

## Site fixes

- **Netflix** (`netflix.css`, `netflix.js`): hides the preview card that pops up
  when a title gets focus, and keeps its trailer silent. The card plays a trailer
  with subtitles, and navigation got stuck hopping between the subtitle lines.
  Without it, OK on a title opens its full details, and Back closes them.
- **Globoplay** (`globoplay.css`, `globoplay.js`): a poster's link is only in the
  preview card that opens under the mouse. The poster gets a pointer cursor, and a
  click on it follows that link.

Tested on Netflix, Disney+, HBO Max, Globoplay, Prime Video, Paramount+ and Google,
with `scripts/qa-nav.py` (see [troubleshooting](../../docs/en/troubleshooting.md)).
