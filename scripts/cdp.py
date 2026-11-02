#!/usr/bin/python3 -I
"""Looks inside the page of a kiosk browser started with --remote-debugging-port=9222.
Needs python3-websocket.

  cdp.py eval 'document.title'   run JavaScript in the page and print the result
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


def evaluate(expression):
    ws = connect()
    # Wrapped in a function so repeated calls can declare the same names
    ws.send(json.dumps({"id": 1, "method": "Runtime.evaluate", "params": {
        "expression": f"(() => {{ return ({expression}); }})()",
        "returnByValue": True, "awaitPromise": True}}))
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
    if len(sys.argv) >= 3 and sys.argv[1] == "eval":
        evaluate(sys.argv[2])
    elif len(sys.argv) >= 2 and sys.argv[1] == "errors":
        errors(int(sys.argv[2]) if len(sys.argv) > 2 else 25)
    else:
        sys.exit(__doc__)
