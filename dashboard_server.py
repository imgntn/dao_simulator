from __future__ import annotations

import asyncio
import json
import threading
from typing import List

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse

HTML_PAGE = """<!DOCTYPE html>
<html>
<head><title>DAO Dashboard</title></head>
<body>
<h1>DAO Live Metrics</h1>
<ul>
<li>Members: <span id='members'>0</span></li>
<li>DAO Token Price: <span id='price'>0</span></li>
<li>Recent Proposals:</li>
<ul id='proposals'></ul>
</ul>
<script>
const ws = new WebSocket(`ws://${location.host}/ws`);
ws.onmessage = (ev) => {
  const data = JSON.parse(ev.data);
  if (data.event === 'step_end') {
    document.getElementById('members').textContent = data.num_members;
    document.getElementById('price').textContent = data.token_price.toFixed(2);
    const list = document.getElementById('proposals');
    list.innerHTML = '';
    for (const title of data.recent_proposals) {
      const li = document.createElement('li');
      li.textContent = title;
      list.appendChild(li);
    }
  }
};
</script>
</body>
</html>"""


class DashboardServer:
    """WebSocket dashboard streaming DAO events."""

    def __init__(self, event_bus, port: int = 8000) -> None:
        self.event_bus = event_bus
        self.port = port
        self.app = FastAPI()
        self.connections: List[WebSocket] = []
        self.loop = asyncio.new_event_loop()
        self._thread: threading.Thread | None = None
        self.event_bus.subscribe("*", self._on_event)

        @self.app.get("/")
        async def index():
            return HTMLResponse(HTML_PAGE)

        @self.app.websocket("/ws")
        async def websocket_endpoint(ws: WebSocket):
            await ws.accept()
            self.connections.append(ws)
            try:
                while True:
                    await ws.receive_text()
            except WebSocketDisconnect:
                pass
            finally:
                if ws in self.connections:
                    self.connections.remove(ws)

    def _on_event(self, **data) -> None:
        if not self.connections:
            return
        msg = json.dumps(data)
        for ws in list(self.connections):
            asyncio.run_coroutine_threadsafe(ws.send_text(msg), self.loop)

    def start(self) -> None:
        import uvicorn

        def run() -> None:
            uvicorn.run(self.app, host="0.0.0.0", port=self.port, loop="asyncio")

        self._thread = threading.Thread(target=run, daemon=True)
        self._thread.start()
        threading.Thread(target=self.loop.run_forever, daemon=True).start()

    def stop(self) -> None:
        for ws in list(self.connections):
            asyncio.run_coroutine_threadsafe(ws.close(), self.loop)
        self.loop.call_soon_threadsafe(self.loop.stop)
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=0.5)
