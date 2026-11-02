// Remote navigation for the kiosk browsers. The arrow keys move a highlight to the
// nearest thing on the page that can be clicked, OK (Enter) clicks it, and when
// there's nothing further in that direction the page (or the row) scrolls.
//
// Streaming sites build most of their tiles and buttons out of plain elements with
// click handlers, which Chromium's own spatial navigation can't reach, so this finds
// them by what they look like: a pointer cursor, visible and not covered by
// something else.
(() => {
  if (window.top !== window) return;

  const DIRECTIONS = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
  const CONTROLS = "a[href], button, input:not([type=hidden]), select, textarea, summary, " +
    "[role=button], [role=link], [role=tab], [role=menuitem], [role=option], [role=checkbox], " +
    "[role=switch], [contenteditable=''], [contenteditable=true], [tabindex]:not([tabindex='-1'])";
  const TEXT_FIELD = "input:not([type=button]):not([type=submit]):not([type=checkbox]):not([type=radio]), textarea, [contenteditable=''], [contenteditable=true]";

  let current = null;
  const ring = document.createElement("div");
  Object.assign(ring.style, {
    position: "fixed", zIndex: "2147483647", pointerEvents: "none", display: "none",
    border: "4px solid #e8473b", borderRadius: "10px", boxSizing: "border-box",
    boxShadow: "0 0 0 2px rgba(0,0,0,0.6), 0 0 18px rgba(232,71,59,0.8)",
    transition: "left 80ms, top 80ms, width 80ms, height 80ms",
  });

  // Every element, including those inside open shadow roots
  function* allElements(root) {
    for (const el of root.querySelectorAll("*")) {
      yield el;
      if (el.shadowRoot) yield* allElements(el.shadowRoot);
    }
  }

  function visibleOnScreen(el, rect) {
    const points = [[0.5, 0.5], [0.25, 0.25], [0.75, 0.75], [0.25, 0.75], [0.75, 0.25]];
    const root = el.getRootNode();
    for (const [fx, fy] of points) {
      const x = rect.left + rect.width * fx, y = rect.top + rect.height * fy;
      if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) continue;
      const hit = root.elementFromPoint(x, y);
      if (hit && (hit === el || el.contains(hit))) return true;
    }
    return false;
  }

  function candidates() {
    const cursors = new Map();
    const cursorOf = (el) => {
      if (!cursors.has(el)) cursors.set(el, el instanceof Element ? getComputedStyle(el).cursor : "");
      return cursors.get(el);
    };
    const found = [];
    for (const el of allElements(document)) {
      if (el === ring) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width < 14 || rect.height < 14) continue;  // not carousel dots
      if (rect.bottom <= 0 || rect.right <= 0 || rect.top >= innerHeight || rect.left >= innerWidth) continue;
      if (rect.width * rect.height > innerWidth * innerHeight * 0.85) continue;
      const parent = el.parentElement || el.getRootNode().host;
      // The outermost element with a pointer cursor: its children inherit the cursor
      const clickable = el.matches(CONTROLS) ||
        (cursorOf(el) === "pointer" && !(parent && cursorOf(parent) === "pointer"));
      if (clickable && visibleOnScreen(el, rect)) found.push({ el, rect });
    }
    return found;
  }

  function best(from, [dx, dy], options) {
    const fx = from.left + from.width / 2, fy = from.top + from.height / 2;
    let winner = null, winnerScore = Infinity;
    for (const c of options) {
      if (c.el === current || c.el.contains(current)) continue;
      const r = c.rect, cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const along = (cx - fx) * dx + (cy - fy) * dy;
      if (along <= 4) continue;
      // Gap between the facing edges, and how far off to the side it is
      const gap = dx > 0 ? r.left - from.right : dx < 0 ? from.left - r.right
        : dy > 0 ? r.top - from.bottom : from.top - r.bottom;
      const side = dx ? Math.abs(cy - fy) : Math.abs(cx - fx);
      const overlaps = dx ? r.top < from.bottom && r.bottom > from.top
        : r.left < from.right && r.right > from.left;
      const score = Math.max(gap, 0) + side * (overlaps ? 0.3 : 2) + along * 0.05;
      if (score < winnerScore) { winner = c.el; winnerScore = score; }
    }
    return winner;
  }

  function scrollable(el, horizontal) {
    for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
      const style = getComputedStyle(e);
      const overflow = horizontal ? style.overflowX : style.overflowY;
      const room = horizontal ? e.scrollWidth - e.clientWidth : e.scrollHeight - e.clientHeight;
      if (room > 4 && /(auto|scroll)/.test(overflow)) return e;
    }
    return horizontal ? null : document.scrollingElement;
  }

  function scrollToward(el, [dx, dy]) {
    const box = scrollable(el, dx !== 0);
    if (!box) return false;
    const before = [box.scrollLeft, box.scrollTop];
    const page = box === document.scrollingElement;
    const amount = (dx ? (page ? innerWidth : box.clientWidth) : (page ? innerHeight : box.clientHeight)) * 0.7;
    box.scrollBy({ left: dx * amount, top: dy * amount, behavior: "instant" });
    return box.scrollLeft !== before[0] || box.scrollTop !== before[1];
  }

  function select(el) {
    current = el;
    if (el.matches(CONTROLS)) el.focus({ preventScroll: true });
    else if (document.activeElement && document.activeElement.matches(TEXT_FIELD)) document.activeElement.blur();
    el.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
    draw();
  }

  function draw() {
    if (!current || !current.isConnected) {
      current = null;
      ring.style.display = "none";
      return;
    }
    if (!ring.isConnected) document.documentElement.append(ring);
    const r = current.getBoundingClientRect();
    Object.assign(ring.style, {
      display: "block", left: `${r.left - 6}px`, top: `${r.top - 6}px`,
      width: `${r.width + 12}px`, height: `${r.height + 12}px`,
    });
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

  // While a video fills the screen, the arrows belong to the player
  function watching() {
    if (document.fullscreenElement) return true;
    return [...document.querySelectorAll("video")].some((v) => {
      const r = v.getBoundingClientRect();
      return r.width * r.height > innerWidth * innerHeight * 0.7;
    });
  }

  addEventListener("keydown", (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || watching()) return;
    const typing = document.activeElement && document.activeElement.matches(TEXT_FIELD);

    if (event.key === "Enter") {
      if (typing || !current || !current.isConnected) return;
      event.preventDefault();
      event.stopPropagation();
      if (current.matches(TEXT_FIELD)) current.focus();
      else click(current);
      return;
    }

    const direction = DIRECTIONS[event.key];
    if (!direction) return;
    if (typing && (direction[0] !== 0 || document.activeElement.matches("textarea"))) return;
    event.preventDefault();
    event.stopPropagation();

    if (!current || !current.isConnected) {
      // Start from what has focus, or else from the main content: the item nearest
      // the left of the screen's middle (where pages put their main buttons), not the
      // menu in the corner
      const options = candidates();
      const focused = options.find((c) => c.el === document.activeElement);
      const distance = (c) => Math.hypot(c.rect.left + c.rect.width / 2 - innerWidth * 0.3,
        c.rect.top + c.rect.height / 2 - innerHeight * 0.45);
      const first = focused || options.sort((a, b) => distance(a) - distance(b))[0];
      if (first) select(first.el);
      return;
    }

    let next = best(current.getBoundingClientRect(), direction, candidates());
    if (!next && scrollToward(current, direction)) {
      next = best(current.getBoundingClientRect(), direction, candidates());
    }
    if (next) select(next);
    else draw();
  }, true);

  // Keep the highlight on its element as the page scrolls or animates; hide it while
  // a mouse or touchpad is in use. Chromium also sends mouse moves without the
  // pointer moving (to update hover effects after a scroll), so compare positions.
  addEventListener("scroll", draw, true);
  addEventListener("resize", draw);
  setInterval(() => { if (current) draw(); }, 400);
  let pointer = null;
  addEventListener("mousemove", (event) => {
    if (!event.isTrusted) return;
    const moved = pointer && Math.hypot(event.screenX - pointer[0], event.screenY - pointer[1]) > 3;
    pointer = [event.screenX, event.screenY];
    if (moved) {
      current = null;
      draw();
    }
  }, true);
})();
