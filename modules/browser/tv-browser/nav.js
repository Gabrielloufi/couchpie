// Remote navigation for the kiosk browsers. The TV remote arrives as keyboard keys:
//
//   arrows        move a highlight to the nearest clickable thing in that direction.
//                 At the end of a row they turn the row (pressing its arrow button),
//                 at the end of the page they scroll it. When a press can't move,
//                 the highlight shakes; pressing that way again leaves the box it's
//                 stuck in (menu, dialog, panel).
//   OK (Enter)    clicks it.
//   Back (Esc)    closes the open menu or dialog, or else goes back a page.
//   Page Up/Down  (the channel buttons) scroll the page a screen at a time.
//
// Streaming sites build most tiles and buttons out of plain elements with click
// handlers, which Chromium's own spatial navigation can't reach, so this finds them
// by what they look like: a pointer cursor, on screen and not covered by something
// else. Menus that open on mouse hover get a simulated hover.
(() => {
  if (window.top !== window) return;

  const DIRECTIONS = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
  const CONTROLS = "a[href], button, input:not([type=hidden]), select, textarea, summary, " +
    "[role=button], [role=link], [role=tab], [role=menuitem], [role=option], [role=checkbox], " +
    "[role=switch], [contenteditable=''], [contenteditable=true], [tabindex]:not([tabindex='-1'])";
  // Controls that do something themselves, unlike a focusable box around other controls
  const ACTIONS = "a[href], button, input, select, textarea, summary, [role=button], [role=link], " +
    "[role=tab], [role=menuitem], [role=option], [role=checkbox], [role=switch]";
  const TEXT_FIELD = "input:not([type=button]):not([type=submit]):not([type=checkbox]):not([type=radio]), textarea, [contenteditable=''], [contenteditable=true]";
  const OVERLAY = "[role=dialog], [aria-modal=true], [role=menu], [role=listbox], dialog[open]";
  const MODAL = "[role=dialog], [aria-modal=true], dialog[open]";
  // Elements whose menus open on hover: menu buttons, and anything in the page header
  const HOVER = "[aria-haspopup], [aria-expanded], header *, nav *, [role=banner] *, " +
    "[role=navigation] *, [role=menu] *, [role=menubar] *";
  // A row's arrow buttons: used to turn the row, never a place to stop
  const PAGER_LABEL = /pr[oó]xim|anterior|next|prev|seguinte|avan[cç]ar|mais t[ií]tulos|t[ií]tulos anteriores|scroll (left|right)|rolar|\bseta\b|arrow (left|right)|(left|right) arrow|carousel|carrossel/i;
  const PAGER_CLASS = new Set(["arrow", "arrows", "chevron", "next", "prev", "previous", "pager",
    "paginator", "pagination"]);
  // A carousel's page dots ("3 de 15 itens"): never a place to stop
  const DOT_LABEL = /^\s*(slide\s*|item\s*|p[aá]gina\s*)?\d+\s*(de|of|\/)\s*\d+|^(ir para|go to|mostrar|show) (o |a )?(slide|item|p[aá]gina|page|banner)|^\s*(p[aá]gina|page|slide)\s*\d+\s*$/i;
  // Not "Sair": on its own that's usually "log out"
  const CLOSE_LABEL = /^(close|fechar|cancelar|dismiss|voltar|back|[×✕✖xX])$|fechar|close/i;
  // Main actions: where the first press lands on a title's page or dialog
  const PRIMARY = /^(assistir|assista|continuar|reproduzir|retomar|come[cç]ar|ver agora|play|watch|resume|start)\b/i;
  // Video player pages: /watch (Netflix, HBO Max), /play (Disney+), /video (Paramount+),
  // /v/123 (Globoplay)
  const PLAYER_PAGE = /\/(watch|play|player|video)(\/|$)|\/v\/\d/i;
  const PRESSES_TO_LEAVE = 2;  // presses into a wall before the highlight leaves its box
  const TURN_LIMIT = 2000;     // ms to wait at most for a row to finish turning

  let current = null;    // the highlighted element
  let lastRect = null;   // where it was, to recover when the page redraws it
  let hovered = null;    // the element we're simulating a hover on
  let wall = null;       // { key, count }: presses that couldn't move
  let busyUntil = 0;     // while a row turns
  let queued = null;     // an arrow pressed meanwhile
  let pressed = null;    // what OK was last pressed on, to come back to
  let trail = [];        // the last few highlighted elements, to come back out of a menu
  let typingIn = null;   // the text field the person chose to type in
  let chosenAt = 0;      // when OK was last pressed or the mouse clicked

  const ring = document.createElement("div");
  Object.assign(ring.style, {
    position: "fixed", zIndex: "2147483647", pointerEvents: "none", display: "none",
    border: "4px solid #e8473b", borderRadius: "10px", boxSizing: "border-box",
    boxShadow: "0 0 0 2px rgba(0,0,0,0.6), 0 0 18px rgba(232,71,59,0.8)",
    transition: "left 80ms, top 80ms, width 80ms, height 80ms, transform 60ms",
  });

  const toast = document.createElement("div");
  Object.assign(toast.style, {
    position: "fixed", left: "50%", bottom: "48px", transform: "translateX(-50%)",
    zIndex: "2147483647", pointerEvents: "none", display: "none",
    background: "rgba(20,20,22,0.92)", color: "#fff", font: "600 22px system-ui, sans-serif",
    padding: "14px 24px", borderRadius: "12px", border: "2px solid #e8473b",
  });

  // ---- what's on screen

  // Every element, including those inside open shadow roots
  function* allElements(root) {
    for (const el of root.querySelectorAll("*")) {
      yield el;
      if (el.shadowRoot) yield* allElements(el.shadowRoot);
    }
  }

  const parentOf = (el) => el.parentElement || (el.getRootNode() && el.getRootNode().host) || null;

  // How opaque an element ends up, its ancestors' opacity included (menus fade out
  // through a wrapper)
  function opacity(el) {
    let value = 1;
    for (let a = el; a && a !== document.documentElement && value > 0.02; a = parentOf(a)) {
      if (a instanceof Element) value *= Number(getComputedStyle(a).opacity);
    }
    return value;
  }

  // Whether the element is what a click on it would hit. Things faded out to nothing
  // (a menu that's closing) don't count as covering it.
  function hitVisible(el, rect) {
    const points = [[0.5, 0.5], [0.25, 0.25], [0.75, 0.75], [0.25, 0.75], [0.75, 0.25]];
    const root = el.getRootNode();
    // Points in the part that's on screen, so a row peeking in at the bottom counts
    const left = Math.max(rect.left, 0), top = Math.max(rect.top, 0);
    const width = Math.min(rect.right, innerWidth) - left, height = Math.min(rect.bottom, innerHeight) - top;
    if (width <= 0 || height <= 0) return false;
    for (const [fx, fy] of points) {
      const x = left + width * fx, y = top + height * fy;
      const hit = root.elementFromPoint(x, y);
      if (!hit) continue;
      if (hit === el || el.contains(hit)) return true;
      if (opacity(hit) > 0.05) continue;
      for (const below of root.elementsFromPoint(x, y)) {
        if (below === el || el.contains(below)) return true;
        if (opacity(below) > 0.05) break;
      }
    }
    return false;
  }

  function styleCache() {
    const cache = new Map();
    return (el) => {
      if (!cache.has(el)) cache.set(el, getComputedStyle(el));
      return cache.get(el);
    };
  }

  // The part of an element that can actually be seen: inside the window and inside
  // every ancestor that clips its overflow (a carousel row, a trailer's frame). A
  // fixed element (a dialog) escapes its ancestors' clipping, and an ancestor with no
  // size of its own is just a holder that clips nothing that's showing.
  // A body's overflow applies to the page (the viewport) unless the html element has
  // its own: then it clips nothing
  const bodyScrollsPage = () => {
    const s = getComputedStyle(document.documentElement);
    return s.overflowX === "visible" && s.overflowY === "visible";
  };

  function visibleRect(el, styles) {
    const r = el.getBoundingClientRect();
    let left = Math.max(r.left, 0), top = Math.max(r.top, 0);
    let right = Math.min(r.right, innerWidth), bottom = Math.min(r.bottom, innerHeight);
    for (let a = el; a && a !== document.documentElement; a = parentOf(a)) {
      if (!(a instanceof Element)) continue;
      const s = styles(a);
      if (a !== el && (s.overflowX !== "visible" || s.overflowY !== "visible") && !(a === document.body && bodyScrollsPage())) {
        const ar = a.getBoundingClientRect();
        if (ar.width >= 1 && ar.height >= 1) {
          if (s.overflowX !== "visible") { left = Math.max(left, ar.left); right = Math.min(right, ar.right); }
          if (s.overflowY !== "visible") { top = Math.max(top, ar.top); bottom = Math.min(bottom, ar.bottom); }
          if (right <= left || bottom <= top) return null;
        }
      }
      if (s.position === "fixed") break;
    }
    return right > left && bottom > top ? { width: right - left, height: bottom - top } : null;
  }

  function isDot(el) {
    const label = el.getAttribute("aria-label") || el.getAttribute("title") || "";
    return DOT_LABEL.test(label) || /^[•·●○◦]$/.test((el.innerText || "").trim());
  }

  function isPager(el) {
    const label = `${el.getAttribute("aria-label") || ""} ${el.getAttribute("title") || ""}`;
    if (PAGER_LABEL.test(label)) return true;
    if (/^[‹›<>❮❯❬❭〈〉]$/.test((el.innerText || "").trim())) return true;
    for (const node of [el, parentOf(el)]) {
      if (!(node instanceof Element)) continue;
      const name = typeof node.className === "string" ? node.className : node.getAttribute("class") || "";
      const tokens = name.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase().split(/[^a-z]+/);
      if (tokens.some((t) => PAGER_CLASS.has(t))) return true;
    }
    return false;
  }

  // Clickable things on screen. "relaxed" also takes covered ones, to leave a box.
  function candidates(relaxed = false) {
    const styles = styleCache();
    const cursor = (el) => (el instanceof Element ? styles(el).cursor : "");
    const found = [];
    for (const el of allElements(document)) {
      if (el === ring || el === toast) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width < 14 || rect.height < 14) continue;  // not carousel dots
      if (rect.bottom <= 0 || rect.right <= 0 || rect.top >= innerHeight || rect.left >= innerWidth) continue;
      if (rect.width * rect.height > innerWidth * innerHeight * 0.85) continue;
      const parent = parentOf(el);
      // The outermost element with a pointer cursor: its children inherit the cursor
      const clickable = el.matches(CONTROLS) ||
        (cursor(el) === "pointer" && !(parent && cursor(parent) === "pointer"));
      // Decorations marked hidden from screen readers (Netflix's scrim over the poster
      // peeking in at a row's end) aren't things to stop on
      if (!clickable || el.getAttribute("aria-hidden") === "true" || isDot(el)) continue;
      // A clickable panel around other controls (Disney+'s episode list) isn't a stop,
      // nor a wrapper around one link that fills it (Disney+'s hero): what's in it is
      if (!el.matches(ACTIONS)) {
        const inner = el.querySelectorAll(CONTROLS);
        if (inner.length >= 2) continue;
        if (inner.length === 1) {
          const r = inner[0].getBoundingClientRect();
          if (r.width * r.height >= 0.5 * rect.width * rect.height) continue;
        }
      }
      const style = styles(el);
      if (style.visibility === "hidden" || style.pointerEvents === "none") continue;
      if (!relaxed && !hitVisible(el, rect)) continue;
      const seen = visibleRect(el, styles);
      if (!seen) continue;
      // How much of its width shows: a poster cut off at a row's end is a cue to turn
      // the row, one running off the bottom of the screen just needs a scroll
      found.push({ el, rect, seen: seen.width / rect.width, pager: isPager(el) });
    }
    return withoutOverlays(found);
  }

  // Small buttons laid over a card (HBO Max's "..." menu) aren't stops: OK on the card
  // opens the title, which has the same options. Row arrows and main actions stay.
  function withoutOverlays(found) {
    const label = (el) => (el.getAttribute("aria-label") || el.innerText || "").trim();
    // In the same tile: a few levels up from the button (not a header over a hero)
    const sameTile = (el, card) => {
      for (let a = parentOf(el), i = 0; a && i < 4; a = parentOf(a), i++) if (a.contains(card)) return true;
      return false;
    };
    return found.filter((c) => {
      if (c.pager) return true;
      const r = c.rect, area = r.width * r.height;
      const under = found.find((o) => o !== c && !o.pager && area < 0.25 * o.rect.width * o.rect.height &&
        o.rect.left <= r.left + 2 && o.rect.right >= r.right - 2 && o.rect.top <= r.top + 2 &&
        o.rect.bottom >= r.bottom - 2 && sameTile(c.el, o.el));
      return !under || PRIMARY.test(label(c.el));
    });
  }

  function best(from, [dx, dy], options) {
    const fx = from.left + from.width / 2, fy = from.top + from.height / 2;
    let winner = null, winnerScore = Infinity;
    const href = current && current.href;
    for (const c of options) {
      if (c.el === current || (current && (c.el.contains(current) || current.contains(c.el)))) continue;
      const r = c.rect, cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      // A card's picture and caption are often two links to the same title: one stop
      if (href && c.el.href === href && r.left < from.right + 40 && r.right > from.left - 40 &&
          r.top < from.bottom + 40 && r.bottom > from.top - 40) continue;
      // Clearly that way: past by half the smaller one's size, not just a taller
      // neighbour in the same row whose middle sits a little lower
      const along = (cx - fx) * dx + (cy - fy) * dy;
      if (along <= Math.max(4, 0.5 * (dx ? Math.min(r.width, from.width) : Math.min(r.height, from.height)))) continue;
      // Gap between the facing edges, and how far off to the side it is
      const gap = dx > 0 ? r.left - from.right : dx < 0 ? from.left - r.right
        : dy > 0 ? r.top - from.bottom : from.top - r.bottom;
      const overlaps = dx ? r.top < from.bottom && r.bottom > from.top
        : r.left < from.right && r.right > from.left;
      // Off to the side: by the gap between the edges (a short row just below, not
      // under this item, still comes before the row after it)
      const side = overlaps ? (dx ? Math.abs(cy - fy) : Math.abs(cx - fx))
        : dx ? Math.max(r.top - from.bottom, from.top - r.bottom) : Math.max(r.left - from.right, from.left - r.right);
      const score = Math.max(gap, 0) + side * (overlaps ? 0.3 : 2) + along * 0.05 + (1 - c.seen) * 300;
      if (score < winnerScore) { winner = c; winnerScore = score; }
    }
    return winner;
  }

  const sameRow = (a, b) => a.top < b.bottom - 4 && a.bottom > b.top + 4;

  // The menu, dialog or fixed panel an element is in
  function boxOf(el) {
    let fixed = null;
    for (let a = el; a && a !== document.body; a = parentOf(a)) {
      if (!(a instanceof Element)) continue;
      if (a.matches(OVERLAY)) return a;
      if (!fixed && /^(fixed|sticky)$/.test(getComputedStyle(a).position)) fixed = a;
    }
    return fixed;
  }

  function shown(el) {
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    const s = getComputedStyle(el);
    if (s.visibility === "hidden" || el.getAttribute("aria-hidden") === "true" || opacity(el) < 0.05) return false;
    return hitVisible(el, r);
  }

  // Open menus and dialogs
  const openOverlays = () => [...document.querySelectorAll(OVERLAY)].filter(shown);

  // The dialog on top, if one is open: the highlight stays inside it
  function topModal() {
    const open = [...document.querySelectorAll(MODAL)].filter(shown);
    return open[open.length - 1] || null;
  }

  // What the arrows can move to: everything, or only what's in the open dialog
  function reachable(relaxed = false) {
    const modal = topModal();
    const all = candidates(relaxed);
    return modal ? all.filter((c) => modal.contains(c.el)) : all;
  }

  // While a video fills what can be seen of the screen, the arrows belong to the
  // player. (A trailer behind a page's banner is a full-size video clipped to the
  // banner, so its element's size alone says nothing.)
  function watching() {
    if (document.fullscreenElement) return true;
    const styles = styleCache();
    const player = PLAYER_PAGE.test(location.pathname);
    return [...document.querySelectorAll("video")].some((v) => {
      if (!player && (v.muted || v.volume === 0)) return false;  // a home page's silent trailer
      const seen = visibleRect(v, styles);
      return seen && seen.width * seen.height > innerWidth * innerHeight * 0.8;
    });
  }

  // The box to scroll to see more around an element. The body is left to the page's
  // own scrolling, which it usually hands its overflow to.
  function scrollable(el, horizontal) {
    for (let e = el; e && e !== document.documentElement && e !== document.body; e = parentOf(e)) {
      if (!(e instanceof Element)) continue;
      const style = getComputedStyle(e);
      const overflow = horizontal ? style.overflowX : style.overflowY;
      const room = horizontal ? e.scrollWidth - e.clientWidth : e.scrollHeight - e.clientHeight;
      if (room > 4 && /(auto|scroll)/.test(overflow)) return e;
    }
    return horizontal ? null : document.scrollingElement;
  }

  function scrollBy(box, dx, dy, share) {
    const page = box === document.scrollingElement;
    const before = [box.scrollLeft, box.scrollTop];
    const width = page ? innerWidth : box.clientWidth, height = page ? innerHeight : box.clientHeight;
    box.scrollBy({ left: dx * width * share, top: dy * height * share, behavior: "instant" });
    if (box.scrollLeft !== before[0] || box.scrollTop !== before[1]) return true;
    // Pages whose body scrolls on its own (html { overflow: hidden })
    return page && !!document.body && box !== document.body && scrollBy(document.body, dx, dy, share);
  }

  // ---- the highlight

  // The highlighted element carries data-tv-nav="current" (scripts/qa-nav.py reads it)
  function setCurrent(el) {
    if (current && current !== el) current.removeAttribute("data-tv-nav");
    current = el;
    if (el) {
      el.setAttribute("data-tv-nav", "current");
      lastRect = el.getBoundingClientRect();
    }
  }

  function select(el, { hovering = true } = {}) {
    setCurrent(el);
    trail = [...trail.filter((e) => e !== el && e.isConnected).slice(-11), el];
    // Text fields get focus only on OK: focusing one opens its suggestions
    if (el.matches(CONTROLS) && !el.matches(TEXT_FIELD)) el.focus({ preventScroll: true });
    else if (document.activeElement && document.activeElement.matches(TEXT_FIELD)) document.activeElement.blur();
    if (hovering) hover(el);
    reveal(el);
    draw();
  }

  // Scroll an element into view, but only through what a person could scroll:
  // scrolling a carousel's clipped track (overflow: hidden) knocks it out of step with
  // its arrows
  function reveal(el) {
    const clipped = [];
    for (const a of ancestors(parentOf(el))) {
      if (a === document.body) continue;
      const s = getComputedStyle(a);
      if (/hidden|clip/.test(s.overflowX)) clipped.push([a, "scrollLeft", a.scrollLeft]);
      if (/hidden|clip/.test(s.overflowY)) clipped.push([a, "scrollTop", a.scrollTop]);
    }
    el.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
    for (const [a, axis, value] of clipped) if (a[axis] !== value) a[axis] = value;
  }

  function draw() {
    if (!current || !current.isConnected) {
      ring.style.display = "none";
      return;
    }
    if (!ring.isConnected) document.documentElement.append(ring);
    const r = current.getBoundingClientRect();
    if (r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth) lastRect = r;
    Object.assign(ring.style, {
      display: "block", left: `${r.left - 6}px`, top: `${r.top - 6}px`,
      width: `${r.width + 12}px`, height: `${r.height + 12}px`,
    });
  }

  // The highlight can't move: a short shake toward where it tried to go
  function shake([dx, dy]) {
    ring.style.transform = `translate(${dx * 10}px, ${dy * 10}px)`;
    setTimeout(() => { ring.style.transform = ""; }, 120);
  }

  // Whether the highlight can go on from where it is: its element is still on the page
  // and can be seen, not covered by a menu or dialog that opened over it
  function usable(el) {
    return el && el.isConnected && hitVisible(el, el.getBoundingClientRect());
  }

  // Covered: something opened over it, start again in what's on top
  function covered(el) {
    const r = el.getBoundingClientRect();
    return el.isConnected && r.bottom > 0 && r.top < innerHeight && !hitVisible(el, r);
  }

  // After the page redrew or scrolled away the highlighted element, highlight what's
  // in its place on the screen
  function recover() {
    if (usable(current)) return true;
    setCurrent(null);
    if (!lastRect) return false;
    const cx = lastRect.left + lastRect.width / 2, cy = lastRect.top + lastRect.height / 2;
    let closest = null, distance = 160;
    for (const c of reachable()) {
      if (c.pager) continue;
      const d = Math.hypot(c.rect.left + c.rect.width / 2 - cx, c.rect.top + c.rect.height / 2 - cy);
      if (d < distance) { closest = c; distance = d; }
    }
    if (closest) select(closest.el);
    return !!closest;
  }

  // First press: start from what has focus, or else the main action (Assistir,
  // Continuar...), or else the item nearest the left of the middle (where pages and
  // dialogs put their main buttons)
  function start() {
    const modal = topModal();
    const options = reachable().filter((c) => !c.pager);
    const focused = options.find((c) => c.el === document.activeElement);
    const area = modal ? modal.getBoundingClientRect() : { left: 0, top: 0, width: innerWidth, height: innerHeight };
    const top = Math.max(area.top, 0), height = Math.min(area.top + area.height, innerHeight) - top;
    const x = area.left + area.width * 0.3, y = top + height * 0.45;
    const label = (c) => (c.el.getAttribute("aria-label") || c.el.innerText || "").trim();
    const distance = (c) => Math.hypot(c.rect.left + c.rect.width / 2 - x, c.rect.top + c.rect.height / 2 - y);
    const nearest = (list) => list.sort((a, b) => distance(a) - distance(b))[0];
    const came = !modal && origin();
    if (came) return select(came);
    const first = focused || nearest(options.filter((c) => PRIMARY.test(label(c)))) || nearest(options);
    if (first) select(first.el);
  }

  // ---- simulated mouse

  function mouse(el, type, related, bubbles) {
    const r = el.getBoundingClientRect();
    const init = { bubbles, cancelable: true, composed: true, view: window, relatedTarget: related || null,
      clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 };
    el.dispatchEvent(type.startsWith("pointer")
      ? new PointerEvent(type, { ...init, pointerType: "mouse", isPrimary: true })
      : new MouseEvent(type, init));
  }

  function ancestors(el) {
    const list = [];
    for (let a = el; a && a !== document.documentElement; a = parentOf(a)) if (a instanceof Element) list.push(a);
    return list;
  }

  // Hover the element if it's a menu button (or in the header), as moving the mouse
  // onto it would, and unhover the previous one, so hover menus open and close
  function hover(el) {
    const target = el && el.matches(HOVER) ? el : null;
    if (target === hovered) return;
    const old = hovered;
    hovered = target;
    if (old && old.isConnected) {
      mouse(old, "pointerout", el, true);
      mouse(old, "mouseout", el, true);
      for (const a of ancestors(old)) {
        if (el && a.contains(el)) break;
        mouse(a, "pointerleave", el, false);
        mouse(a, "mouseleave", el, false);
      }
    }
    if (target) {
      mouse(target, "pointerover", old, true);
      mouse(target, "mouseover", old, true);
      for (const a of ancestors(target).reverse()) {
        if (old && old.isConnected && a.contains(old)) continue;
        mouse(a, "pointerenter", old, false);
        mouse(a, "mouseenter", old, false);
      }
    }
  }

  function click(el) {
    const r = el.getBoundingClientRect();
    const at = { bubbles: true, cancelable: true, composed: true, view: window,
      clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, button: 0 };
    el.dispatchEvent(new PointerEvent("pointerdown", { ...at, pointerType: "mouse", isPrimary: true }));
    el.dispatchEvent(new MouseEvent("mousedown", at));
    el.dispatchEvent(new PointerEvent("pointerup", { ...at, pointerType: "mouse", isPrimary: true }));
    el.dispatchEvent(new MouseEvent("mouseup", at));
    el.click();
  }

  // ---- moving

  function move(direction) {
    const [dx, dy] = direction;
    const from = onScreen(current.getBoundingClientRect());
    const options = reachable();
    const stops = options.filter((c) => !c.pager);
    const whole = (list) => best(from, direction, list.filter((c) => c.seen >= 0.9));

    if (dx !== 0) {
      // Along the row: the next whole item; at the end of what shows, turn the row with
      // its arrow button or scroll it; then what's cut off at its edge
      const here = pinned(current);
      const row = stops.filter((c) => inRow(c.rect, from) && pinned(c.el) === here);
      const inside = whole(row);
      if (inside) {
        select(inside.el);
        return true;
      }
      const pager = best(from, direction, options.filter((c) => c.pager && sameRow(c.rect, from)));
      if (pager) {
        turnRow(pager.el, from, direction);
        return true;
      }
      const cut = best(from, direction, row);
      if (cut) {
        select(cut.el);
        return true;
      }
      const box = scrollable(current, true);
      if (box && scrollBy(box, dx, 0, 0.7)) {
        afterScroll(direction);
        return true;
      }
      return false;  // end of the row: a shake, and a second press leaves it (leave())
    }

    let next = whole(stops) || best(from, direction, stops);
    // Nothing that way on screen, or only a header pinned to the top of the screen while
    // there's more page above: scroll, then look again
    const box = scrollable(current, false);
    const early = next && box && !pinned(current) && pinned(next.el) && room(box, dy) > innerHeight * 0.25;
    if ((!next || early) && box && scrollBy(box, 0, dy, 0.7)) {
      afterScroll(direction);
      return true;
    }
    if (next) {
      select(next.el);
      return true;
    }
    return false;
  }

  // After scrolling: go to what came in, or wait a moment for the page to draw it
  function afterScroll(direction) {
    if (lookAgain(direction)) return;
    draw();
    busyUntil = Date.now() + 500;
    setTimeout(() => {
      busyUntil = 0;
      lookAgain(direction);
      replay();
    }, 350);
  }

  // In the same row: overlapping by at least half the height of the shorter one
  function inRow(a, b) {
    return Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) >= 0.5 * Math.min(a.height, b.height);
  }

  function lookAgain(direction) {
    const from = onScreen(current.getBoundingClientRect());
    let stops = reachable().filter((c) => !c.pager && (pinned(current) || !pinned(c.el)));
    if (direction[0]) stops = stops.filter((c) => inRow(c.rect, from));  // a row that scrolled
    const next = best(from, direction, stops.filter((c) => c.seen >= 0.9)) || best(from, direction, stops);
    if (next) select(next.el);
    return !!next;
  }

  // An arrow pressed while a row turned or the page scrolled
  function replay() {
    const direction = queued;
    queued = null;
    if (direction && usable(current)) move(direction);
  }

  // The part of a rect on screen
  function onScreen(r) {
    const left = Math.max(r.left, 0), top = Math.max(r.top, 0);
    const right = Math.min(r.right, innerWidth), bottom = Math.min(r.bottom, innerHeight);
    return right > left && bottom > top ? { left, top, right, bottom, width: right - left, height: bottom - top } : r;
  }

  // Pinned to the screen: a header, footer or side bar that stays put as the page scrolls
  function pinned(el) {
    for (let a = el; a && a !== document.documentElement; a = parentOf(a)) {
      if (a instanceof Element && /^(fixed|sticky)$/.test(getComputedStyle(a).position)) return true;
    }
    return false;
  }

  // How far a box can still scroll up (dy < 0) or down
  function room(box, dy) {
    return dy < 0 ? box.scrollTop : box.scrollHeight - box.clientHeight - box.scrollTop;
  }

  // Turn a row with its arrow button, wait for it to stop sliding, then go to the first
  // item that came in
  function turnRow(pagerEl, from, [dx]) {
    let rowBox = parentOf(pagerEl);
    while (rowBox && current && !rowBox.contains(current)) rowBox = parentOf(rowBox);
    const where = () => [...(rowBox || document).querySelectorAll(CONTROLS)].slice(0, 120)
      .map((e) => Math.round(e.getBoundingClientRect().left)).join();
    const started = Date.now(), initial = where();
    let last = initial, moved = false, stillSince = started;
    click(pagerEl);
    busyUntil = started + TURN_LIMIT;
    // Wait for the row to start sliding (some wait a moment first) and then stop
    const settle = () => {
      const now = where(), time = Date.now();
      if (now !== last) {
        moved = true;
        last = now;
        stillSince = time;
      }
      const done = (moved && time - stillSince >= 200) || (!moved && time - started >= 900) ||
        time - started >= TURN_LIMIT;
      if (!done) {
        setTimeout(settle, 100);
        return;
      }
      busyUntil = 0;
      const row = reachable().filter((c) => !c.pager && c.seen >= 0.9 && inRow(c.rect, from));
      row.sort((a, b) => dx > 0 ? a.rect.left - b.rect.left : b.rect.right - a.rect.right);
      if (row[0]) select(row[0].el);
      else if (!recover()) draw();
      replay();
    };
    setTimeout(settle, 100);
  }

  // Pressed twice into a wall: leave the box the highlight is in
  function leave(direction) {
    const box = boxOf(current);
    const from = onScreen(current.getBoundingClientRect());
    const pick = (list) => best(from, direction, list.filter((c) => c.seen >= 0.9)) || best(from, direction, list);
    const outside = (list) => list.filter((c) => !c.pager && !(box && box.contains(c.el)));
    const shown = reachable();
    // Out of the menu or panel it's in, even to something partly covered; or else to
    // whatever is that way, off the row (a screen that's all one fixed panel)
    const next = pick(outside(shown)) || pick(outside(candidates(true))) || pick(shown.filter((c) => !c.pager));
    if (!next) return false;
    if (box && !box.contains(next.el)) {
      if (box.matches(OVERLAY)) close(box);
      else if (hovered && box.contains(hovered)) hover(null);
    }
    select(next.el);
    return true;
  }

  // ---- Back

  // Close an open menu or dialog: undo our hover, press its close button, or press
  // the button that opened it
  function close(overlay) {
    if (hovered && (overlay.contains(hovered) || hovered.contains(overlay) || overlay === hovered)) {
      hover(null);
      return true;
    }
    for (const el of overlay.querySelectorAll(CONTROLS)) {
      const label = el.getAttribute("aria-label") || el.getAttribute("title") || (el.innerText || "").trim();
      if (label.length <= 40 && CLOSE_LABEL.test(label) && shown(el)) {
        click(el);
        return true;
      }
    }
    const opener = openerOf(overlay) || [...document.querySelectorAll("[aria-expanded=true]")].find(shown);
    if (opener) {
      click(opener);
      return true;
    }
    return false;
  }

  function say(text) {
    toast.textContent = text;
    if (!toast.isConnected) document.documentElement.append(toast);
    toast.style.display = "block";
    clearTimeout(say.timer);
    say.timer = setTimeout(() => { toast.style.display = "none"; }, 2500);
  }

  // Back arrives as Esc. Let the page use it first (many close their menus on Esc);
  // if nothing changed, close what's open ourselves, or else go back a page.
  // The open menu covering an element, if that's what covers it (dialogs start from
  // their main action instead, see start())
  function menuOver(el) {
    const r = el.getBoundingClientRect();
    const hit = el.getRootNode().elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    const overlay = hit && hit.closest("[role=menu], [role=listbox]");
    return overlay && shown(overlay) ? overlay : null;
  }

  // The first item in a menu: top left
  function firstIn(menu) {
    const items = reachable().filter((c) => !c.pager && menu.contains(c.el));
    items.sort((a, b) => a.rect.top - b.rect.top || a.rect.left - b.rect.left);
    return items.length ? items[0].el : null;
  }

  // The button that opens a menu or dialog
  function openerOf(overlay) {
    const controls = overlay.id && document.querySelector(`[aria-controls="${CSS.escape(overlay.id)}"]`);
    if (controls) return controls;
    const label = (overlay.getAttribute("aria-labelledby") || "").split(/\s+/)[0];
    const labelled = label && document.getElementById(label);
    return labelled && labelled.matches("[aria-expanded], [aria-haspopup]") ? labelled : null;
  }

  // After a menu or dialog closes, put the highlight back on the button that opened
  // it, or on what OK was pressed on, once that's on screen again (dialogs animate out)
  function returnFrom(overlay) {
    if (!overlay) return returnTo(null);
    // The highlight's last stop before it went into the menu (the menu may be gone
    // from the page already, so anything still on it counts)
    const before = [...trail].reverse().find((el) => el.isConnected && !overlay.contains(el));
    returnTo(openerOf(overlay) || before || (pressed && !overlay.contains(pressed) ? pressed : null), overlay);
  }

  // closed: the menu or dialog that closed, or true for the page that was left
  function returnTo(target, closed) {
    const find = typeof target === "function" ? target : () => target;
    const left = current;
    let tries = 0;
    const attempt = () => {
      const stale = closed === true ? current === left : closed && closed.contains(current);
      if (usable(current) && !stale) return;  // already moved on
      const el = find();
      if (el && el.isConnected && !covered(el) && el.getBoundingClientRect().width > 0) select(el, { hovering: false });
      else if (++tries < (closed === true ? 25 : 10)) setTimeout(attempt, 150);  // pages redraw slower
      else recover();
    };
    setTimeout(attempt, 150);
  }

  // What OK was pressed on, by page address, to come back to it with Back; kept in the
  // tab's session storage so it outlasts a page load
  const ORIGINS = "tv-nav-origins";
  // A poster's picture names its title better than its text (often just a badge)
  const labelOf = (el) => (el.getAttribute("aria-label") || el.getAttribute("title") ||
    (el.querySelector("img[alt]:not([alt=''])") || { alt: "" }).alt || el.innerText || "")
    .trim().replace(/\s+/g, " ").slice(0, 80);

  function remember(el) {
    try {
      const all = JSON.parse(sessionStorage.getItem(ORIGINS) || "{}");
      delete all[location.href];
      all[location.href] = { href: el.getAttribute("href") || "", label: labelOf(el) };
      for (const key of Object.keys(all).slice(0, -30)) delete all[key];
      sessionStorage.setItem(ORIGINS, JSON.stringify(all));
    } catch (error) {
      // no storage here
    }
  }

  function origin() {
    let saved;
    try {
      saved = JSON.parse(sessionStorage.getItem(ORIGINS) || "{}")[location.href];
    } catch (error) {
      return null;
    }
    if (!saved) return null;
    const same = (el) => (saved.href ? el.getAttribute("href") === saved.href : saved.label && labelOf(el) === saved.label);
    const onScreen = candidates(true).find((c) => same(c.el));
    if (onScreen) return onScreen.el;
    // Scrolled away: any link to the same place
    return saved.href ? [...document.querySelectorAll("a[href]")].find((a) => same(a) && a.getBoundingClientRect().width > 0) || null : null;
  }

  // A menu open around the highlight that isn't marked as one (Globoplay's profile
  // menu): its button says aria-expanded. Only header, nav and pop-up buttons count, not
  // a section expanded in the page.
  function menuButtonAround(el) {
    if (!el) return null;
    return [...document.querySelectorAll("[aria-expanded=true]")].reverse().find((b) => {
      const wrapper = parentOf(b);
      return wrapper && wrapper.contains(el) && shown(b) &&
        b.matches("[aria-haspopup], header *, nav *, [role=banner] *, [role=navigation] *");
    }) || null;
  }

  // OK on a button whose menu the highlight's hover opened: a click would close it
  // again, so go to the menu's first item instead
  function intoMenu(button) {
    if (hovered !== button || button.getAttribute("aria-expanded") !== "true") return false;
    const id = button.getAttribute("aria-controls");
    const menu = (id && document.getElementById(id)) || parentOf(button);
    const items = reachable().filter((c) => !c.pager && c.el !== button && menu.contains(c.el) &&
      !c.el.contains(button));
    if (!items.length) return false;
    items.sort((a, b) => a.rect.top - b.rect.top || a.rect.left - b.rect.left);
    select(items[0].el);
    return true;
  }

  function closeMenu(button) {
    if (hovered && (hovered === button || parentOf(button).contains(hovered))) hover(null);
    // Still open, and the button only toggles it (a link would go somewhere)
    setTimeout(() => {
      if (button.getAttribute("aria-expanded") === "true" && !button.matches("a[href]")) click(button);
    }, 100);
  }

  function back() {
    const focused = document.activeElement;
    if (focused && focused.matches(TEXT_FIELD)) {
      focused.blur();
      return;
    }
    const before = { url: location.href, open: openOverlays().map((o) => [o, opacity(o)]) };
    const inside = current && before.open.map(([o]) => o).reverse().find((o) => o.contains(current));
    const menuButton = !inside && menuButtonAround(current);
    setTimeout(() => {
      // Did the page close something itself? (It may still be fading out.)
      const open = openOverlays();
      if (before.open.some(([o, was]) => !open.includes(o) || opacity(o) < was - 0.05)) {
        returnFrom(inside || before.open[before.open.length - 1][0]);
        return;
      }
      if (location.href !== before.url) {
        returnTo(origin, true);  // back on a page: to what OK was pressed on there
        return;
      }
      const target = open[open.length - 1];
      if (target && close(target)) {
        returnFrom(inside || target);
        return;
      }
      if (menuButton) {
        if (menuButton.getAttribute("aria-expanded") === "true") closeMenu(menuButton);
        returnTo(menuButton, parentOf(menuButton));
        return;
      }
      // A menu our hover opened without saying so (Paramount+'s profile menu): undo the
      // hover, and if that hides the highlight, go back to where the menu was opened
      if (hovered && current) {
        const was = current;
        hover(null);
        setTimeout(() => {
          if (usable(was)) {
            goBack(before.url);
            return;
          }
          const opener = [...trail].reverse().find((el) => el !== was && usable(el) && opacity(el) > 0.9);
          if (opener) select(opener, { hovering: false });
          else recover();
        }, 350);
        return;
      }
      goBack(before.url);
    }, 150);
  }

  // Back a page. With no page to go back to, a tab a link opened closes (the background
  // worker does it; never the first tab); otherwise say how to get to the home screen.
  function goBack(url) {
    history.back();
    const started = Date.now();
    const wait = async () => {
      if (location.href !== url) {
        returnTo(origin, true);  // to what OK was pressed on there
        return;
      }
      if (Date.now() - started < 700) {
        setTimeout(wait, 100);
        return;
      }
      let closed = false;
      try {
        closed = await chrome.runtime.sendMessage("close-tab");
      } catch (error) {
        // the worker isn't there (an old copy of the extension)
      }
      if (!closed) say("Para voltar ao menu, use o botão verde");
    };
    setTimeout(wait, 100);
  }

  // ---- keys

  addEventListener("keydown", (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key === "Escape") {
      if (!document.fullscreenElement) back();
      return;  // the page gets Esc too
    }
    if (watching()) return;
    // Typing: in a text field the person chose (OK on it, a click, or letters typed into
    // it, as the on-screen keyboard does), not one the page focused when it loaded
    const field = document.activeElement && document.activeElement.matches(TEXT_FIELD) ? document.activeElement : null;
    if (field && event.key.length === 1) typingIn = field;
    const typing = !!field && field === typingIn;

    if (event.key === "PageDown" || event.key === "PageUp") {
      if (typing) return;
      event.preventDefault();
      event.stopPropagation();
      const dy = event.key === "PageDown" ? 1 : -1;
      const anchor = (current && current.isConnected && current) ||
        document.elementFromPoint(innerWidth / 2, innerHeight / 2);
      const box = anchor && scrollable(anchor, false);
      const was = current && current.isConnected ? current.getBoundingClientRect() : null;
      if (!(box && scrollBy(box, 0, dy, 0.85)) && box !== document.scrollingElement) {
        scrollBy(document.scrollingElement, 0, dy, 0.85);
      }
      // Keep the highlight in the same place on the screen, on whatever is there now
      if (was) {
        const r = current.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) {
          setCurrent(null);
          lastRect = was;
          recover();
        } else {
          draw();
        }
      }
      return;
    }

    if (event.key === "Enter") {
      if (typing || !current || !current.isConnected) return;
      event.preventDefault();
      event.stopPropagation();
      chosenAt = Date.now();
      if (current.matches(TEXT_FIELD)) {
        typingIn = current;
        current.focus();
      } else if (!intoMenu(current)) {
        pressed = current;
        remember(current);
        click(current);
      }
      return;
    }

    const direction = DIRECTIONS[event.key];
    if (!direction) return;
    if (typing && (direction[0] !== 0 || document.activeElement.matches("textarea"))) return;
    event.preventDefault();
    event.stopPropagation();
    if (Date.now() < busyUntil) {
      queued = direction;
      return;
    }

    const modal = topModal();
    if (!usable(current) || (modal && !modal.contains(current))) {
      // A menu that opened over the highlight (HBO Max's profile menu covers its own
      // button) takes it; otherwise find the highlight's place again, or start over
      const menu = current && covered(current) && menuOver(current);
      const first = menu && firstIn(menu);
      if (first) select(first);
      else if ((current && covered(current)) || (modal && current && !modal.contains(current)) || !recover()) start();
      wall = null;
      return;
    }
    if (move(direction)) {
      wall = null;
      return;
    }
    wall = wall && wall.key === event.key ? { key: event.key, count: wall.count + 1 } : { key: event.key, count: 1 };
    if (wall.count >= PRESSES_TO_LEAVE && leave(direction)) wall = null;
    else shake(direction);
  }, true);

  // For diagnosis from the extension's own world (scripts/cdp.py eval --extension);
  // pages can't see it
  globalThis.tvNav = { candidates, reachable, topModal, openOverlays, watching, boxOf,
    current: () => current, usable, covered };

  // Keep the highlight on its element as the page scrolls or animates; hide it while
  // a mouse or touchpad is in use. Chromium also sends mouse moves without the
  // pointer moving (to update hover effects after a scroll), so compare positions.
  addEventListener("scroll", draw, true);
  addEventListener("resize", draw);
  setInterval(() => { if (current) draw(); }, 400);
  // A text field that gets focus right after OK or a click (a search button that opens
  // its field) is one to type in
  addEventListener("focusin", (event) => {
    const target = event.composedPath()[0];
    if (target instanceof Element && target.matches(TEXT_FIELD) && Date.now() - chosenAt < 2000) typingIn = target;
  }, true);
  addEventListener("pointerdown", (event) => {
    if (event.isTrusted) chosenAt = Date.now();
  }, true);
  let pointer = null;
  addEventListener("mousemove", (event) => {
    if (!event.isTrusted) return;
    const moved = pointer && Math.hypot(event.screenX - pointer[0], event.screenY - pointer[1]) > 3;
    pointer = [event.screenX, event.screenY];
    if (moved) {
      hovered = null;
      setCurrent(null);
      lastRect = null;
      draw();
    }
  }, true);
})();
