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
<canvas id='chart' width='400' height='150'></canvas>
<h2>Top Members</h2>
<table id='topMembers'></table>
<h2>Completed Bounties</h2>
<ul id='bounties'></ul>
<script>
const ws = new WebSocket(`ws://${location.host}/ws`);
let prices = [];
function drawChart() {
  const c = document.getElementById('chart');
  const ctx = c.getContext('2d');
  ctx.clearRect(0,0,c.width,c.height);
  if (prices.length === 0) return;
  const max = Math.max(...prices);
  ctx.beginPath();
  prices.forEach((p, i) => {
    const x = (i/(prices.length-1))*c.width;
    const y = c.height - (p/max)*c.height;
    if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  });
  ctx.stroke();
}
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
    prices = data.price_history;
    drawChart();
    const table = document.getElementById('topMembers');
    table.innerHTML = '';
    data.top_members.forEach(([m,t]) => {
      const row = document.createElement('tr');
      row.innerHTML = `<td>${m}</td><td>${t.toFixed(1)}</td>`;
      table.appendChild(row);
    });
  } else if (data.event === 'bounty_completed') {
    const list = document.getElementById('bounties');
    const item = document.createElement('li');
    item.textContent = `${data.hunter} completed ${data.proposal} (+${data.reward})`;
    list.prepend(item);
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
