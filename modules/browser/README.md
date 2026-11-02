# browser

A Chromium extension loaded into the kiosk browsers (Navegador and the streaming
tiles, not YouTube, whose TV interface handles the remote itself). Installed to
`~/.config/kiosk/tv-browser/`.

- **Arrows and OK** (`nav.js`): the arrows move a red highlight to the nearest
  clickable thing in that direction, and OK clicks it. Streaming sites build most
  of their tiles and buttons from plain elements with click handlers, which
  Chromium's own spatial navigation (`--enable-spatial-navigation`) can't reach, so
  `nav.js` finds them by what they look like: a pointer cursor, at least 14 pixels
  across, on screen and not covered by something else. When nothing is left in a
  direction, it scrolls the row (left/right) or the page (up/down) and looks again.
  The first press starts from the main content, near the left of the screen's
  middle. While a video fills the screen, the arrows are left to the player; moving
  the mouse hides the highlight.
- **Back** (`tv.js`): the remote's Back arrives as Esc. The first press leaves a
  text field, the next ones go back a page. Esc in fullscreen video is left to
  Chromium.
- **Netflix** (`netflix.css`, `netflix.js`): hides the preview card that pops up
  when a title gets focus, and keeps its trailer silent. The card plays a trailer
  with subtitles, and navigation got stuck hopping between the subtitle lines.
  Without it, OK on a title opens its full details, and Back closes them.

Tested on Netflix, Disney+, Globoplay, Prime Video and Paramount+.
