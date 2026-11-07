#!/usr/bin/python3 -I
"""QA for remote navigation in the kiosk browsers. Presses remote buttons the way the
TV remote does (through cec-remote's virtual keyboard) and, after each press, prints
what the highlight is on, the page, the scroll position and any open menus or dialogs.
Run it on the Pi, with the browser started with --remote-debugging-port=9222.

  qa-nav.py [--shots DIR] [--wait SECONDS] BUTTON...

Buttons: up down left right ok back home close keyboard, and pageup / pagedown (the
channel buttons). Needs python3-websocket. See docs/en/troubleshooting.md.
"""

import json
import os
import subprocess
import sys
import time
import urllib.request

import websocket

STATE = r"""(() => {
  const describe = (e) => {
    if (!e || e === document.body) return "-";
    const label = e.getAttribute("aria-label") || e.getAttribute("title") || e.getAttribute("alt") || "";
    const text = (e.innerText || "").trim().replace(/\s+/g, " ").slice(0, 40);
    return e.tagName.toLowerCase() + (label ? ` [${label.slice(0, 40)}]` : "") + (text ? ` "${text}"` : "");
  };
  // The highlight as the extension sees it (this runs in its world when it's there)
  const current = globalThis.tvNav ? tvNav.current() : document.querySelector("[data-tv-nav=current]");
  const r = current && current.getBoundingClientRect();
  const open = [...document.querySelectorAll("[role=dialog], [aria-modal=true], [role=menu], [role=listbox], [aria-expanded=true]")]
    .filter((e) => e.getBoundingClientRect().height > 0 && getComputedStyle(e).visibility !== "hidden" && !e.closest("[aria-hidden=true]"))
    .map((e) => (e.getAttribute("role") || "expanded") + ":" + (e.getAttribute("aria-label") || e.dataset.uia || e.className || "").toString().slice(0, 30));
  let scroller = 0;
  for (const e of document.querySelectorAll("*")) if (e.scrollTop > scroller) scroller = e.scrollTop;
  return JSON.stringify({
    on: describe(current),
    box: r ? [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)] : null,
    page: location.pathname + location.search.slice(0, 30),
    scroll: [Math.round(scrollY), Math.round(scroller)],
    open,
  });
})()"""


def page_socket():
    pages = json.load(urllib.request.urlopen("http://127.0.0.1:9222/json"))
    page = next(p for p in pages if p["type"] == "page")
    return websocket.create_connection(page["webSocketDebuggerUrl"], timeout=5, suppress_origin=True)


def extension_context(ws):
    """The remote navigation extension's world in the page, if it's loaded there."""
    ws.send(json.dumps({"id": 100, "method": "Runtime.enable"}))
    end = time.time() + 1.5
    while time.time() < end:
        try:
            msg = json.loads(ws.recv())
        except websocket.WebSocketTimeoutException:
            break
        context = msg.get("params", {}).get("context", {})
        if msg.get("method") == "Runtime.executionContextCreated" and context.get("name") == "TV remote browsing":
            return context["id"]
    return None


def state():
    ws = page_socket()
    ws.settimeout(1.5)
    params = {"expression": STATE, "returnByValue": True}
    context = extension_context(ws)
    if context:
        params["contextId"] = context
    ws.send(json.dumps({"id": 1, "method": "Runtime.evaluate", "params": params}))
    while True:
        reply = json.loads(ws.recv())
        if reply.get("id") == 1:
            break
    ws.close()
    return json.loads(reply["result"]["result"].get("value") or "{}")


def press(button):
    if button in ("pageup", "pagedown"):
        key = "Prior" if button == "pageup" else "Next"
        subprocess.run(["wtype", "-k", key], check=True)
    else:
        subprocess.run([os.path.expanduser("~/.local/bin/remote-keyboard"), "press", button],
                       check=True, stderr=subprocess.DEVNULL)


def main():
    args = sys.argv[1:]
    shots, wait = None, 0.9
    while args and args[0].startswith("--"):
        option, value = args[0], args[1]
        args = args[2:]
        if option == "--shots":
            shots = value
            os.makedirs(shots, exist_ok=True)
        elif option == "--wait":
            wait = float(value)
    if not args:
        sys.exit(__doc__)
    print(f"{'start':10} {json.dumps(state(), ensure_ascii=False)}")
    for i, button in enumerate(args, 1):
        press(button)
        time.sleep(wait)
        print(f"{i:>2} {button:7} {json.dumps(state(), ensure_ascii=False)}", flush=True)
        if shots:
            subprocess.run(["grim", "-s", "0.4", f"{shots}/{i:02d}-{button}.png"])


if __name__ == "__main__":
    main()
