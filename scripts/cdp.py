#!/usr/bin/python3 -I
"""Looks inside the page of a kiosk browser started with --remote-debugging-port=9222.
Needs python3-websocket.

  cdp.py eval 'document.title'   run JavaScript in the page and print the result
  cdp.py eval --extension '...'  the same, in the remote navigation extension's world,
                                 where tvNav (nav.js's diagnosis hooks) is defined
  cdp.py errors [SECONDS]        reload the page and print JavaScript errors, console
                                 errors and failed requests (default: 25 seconds)

See docs/en/troubleshooting.md.
"""

import json
import sys
import time
import urllib.request

import websocket


def connect():
    pages = json.load(urllib.request.urlopen("http://127.0.0.1:9222/json"))
    page = next(p for p in pages if p["type"] == "page")
    return websocket.create_connection(page["webSocketDebuggerUrl"], timeout=2, suppress_origin=True)


def extension_context(ws):
    """The execution context of the remote navigation extension in the main frame."""
    ws.send(json.dumps({"id": 100, "method": "Runtime.enable"}))
    end = time.time() + 2
    while time.time() < end:
        try:
            msg = json.loads(ws.recv())
        except websocket.WebSocketTimeoutException:
            continue
        context = msg.get("params", {}).get("context", {})
        if msg.get("method") == "Runtime.executionContextCreated" and context.get("name") == "TV remote browsing":
            return context["id"]
    sys.exit("the remote navigation extension isn't loaded in this page")


def evaluate(expression, in_extension=False):
    ws = connect()
    params = {"expression": f"(() => {{ return ({expression}); }})()",  # repeated calls can reuse names
              "returnByValue": True, "awaitPromise": True}
    if in_extension:
        params["contextId"] = extension_context(ws)
    ws.send(json.dumps({"id": 1, "method": "Runtime.evaluate", "params": params}))
    while True:
        try:
            reply = json.loads(ws.recv())
        except websocket.WebSocketTimeoutException:
            continue
        if reply.get("id") == 1:
            break
    result = reply["result"].get("result", {})
    value = result.get("value", result.get("description", result))
    print(value if isinstance(value, str) else json.dumps(value, indent=1, ensure_ascii=False))


def errors(seconds):
    ws = connect()
    for i, method in enumerate(["Runtime.enable", "Log.enable", "Network.enable"], 1):
        ws.send(json.dumps({"id": i, "method": method}))
    ws.send(json.dumps({"id": 9, "method": "Page.reload", "params": {"ignoreCache": True}}))
    urls, seen = {}, set()
    end = time.time() + seconds
    while time.time() < end:
        try:
            msg = json.loads(ws.recv())
        except websocket.WebSocketTimeoutException:
            continue
        method, params = msg.get("method"), msg.get("params", {})
        line = None
        if method == "Network.requestWillBeSent":
            urls[params["requestId"]] = params["request"]["url"]
        elif method == "Runtime.exceptionThrown":
            details = params["exceptionDetails"]
            line = "EXCEPTION " + (details.get("exception", {}).get("description") or details.get("text", ""))
        elif method == "Runtime.consoleAPICalled" and params["type"] in ("error", "assert"):
            line = "CONSOLE " + " ".join(str(a.get("value", a.get("description", ""))) for a in params["args"])
        elif method == "Network.loadingFailed" and not params.get("canceled"):
            line = f"FAILED {params['errorText']} {urls.get(params['requestId'], '')}"
        elif method == "Network.responseReceived" and params["response"]["status"] >= 400:
            line = f"HTTP {params['response']['status']} {params['response']['url']}"
        if line and line[:300] not in seen:
            seen.add(line[:300])
            print(line[:300])


if __name__ == "__main__":
    if len(sys.argv) >= 4 and sys.argv[1:3] == ["eval", "--extension"]:
        evaluate(sys.argv[3], in_extension=True)
    elif len(sys.argv) >= 3 and sys.argv[1] == "eval":
        evaluate(sys.argv[2])
    elif len(sys.argv) >= 2 and sys.argv[1] == "errors":
        errors(int(sys.argv[2]) if len(sys.argv) > 2 else 25)
    else:
        sys.exit(__doc__)
