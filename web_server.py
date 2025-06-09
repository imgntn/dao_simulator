from __future__ import annotations

import asyncio
import json
import threading
from pathlib import Path
from typing import Any, Dict, List

from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles

from dao_simulation import DAOSimulation
from settings import settings, update_settings

HTML_PAGE = """<!DOCTYPE html>
<html>
<head>
<title>DAO Web Interface</title>
<link rel=\"stylesheet\" href=\"/static/style.css\" />
<script src=\"https://cdn.jsdelivr.net/npm/d3@7\"></script>
<script src=\"/static/dashboard_network.js\"></script>
</head>
<body>
<header><h1>DAO Web Interface</h1></header>
<div class='container'>
<div id='controls'>
<form id='settingsForm'></form>
<button onclick='startSim()'>Start</button>
<button onclick='stepSim()'>Step</button>
</div>
<pre id='output' class='log'></pre>
<h2>Live Metrics</h2>
<ul>
<li>Members: <span id='members'>0</span></li>
<li>DAO Token Price: <span id='price'>0</span></li>
<li>Recent Proposals:</li>
<ul id='proposals'></ul>
</ul>
<div id='metrics'>
<canvas id='chart' width='400' height='150'></canvas>
<canvas id='giniChart' width='400' height='150'></canvas>
</div>
<h2>Delegation Network</h2>
<div id='network'></div>
</div>
<script>
async function loadSettings() {
  const resp = await fetch('/settings');
  const data = await resp.json();
  const form = document.getElementById('settingsForm');
  form.innerHTML = '';
  for (const [k,v] of Object.entries(data)) {
    const label = document.createElement('label');
    label.textContent = k;
    const input = document.createElement('input');
    input.name = k;
    input.value = v;
    label.appendChild(input);
    form.appendChild(label);
    form.appendChild(document.createElement('br'));
  }
}
async function saveSettings() {
  const form = document.getElementById('settingsForm');
  const data = {};
  for (const el of form.elements) { if(el.name) data[el.name] = el.value; }
  await fetch('/settings', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data)});
}
async function startSim() { await saveSettings(); await fetch('/start', {method:'POST'}); }
async function stepSim() { const r = await fetch('/step', {method:'POST'}); const d = await r.json(); document.getElementById('output').textContent = JSON.stringify(d,null,2); }
loadSettings();
const ws = new WebSocket(`ws://${location.host}/ws`);
let prices = [];
let ginis = [];
function drawChart() {
  const c = document.getElementById('chart');
  const ctx = c.getContext('2d');
  ctx.clearRect(0,0,c.width,c.height);
  if (prices.length === 0) return;
  const max = Math.max(...prices);
  ctx.beginPath();
  prices.forEach((p,i) => {
    const x = (i/(prices.length-1))*c.width;
    const y = c.height - (p/max)*c.height;
    if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  });
  ctx.stroke();
}
function drawGini() {
  const c = document.getElementById('giniChart');
  const ctx = c.getContext('2d');
  ctx.clearRect(0,0,c.width,c.height);
  if (ginis.length === 0) return;
  const max = Math.max(...ginis);
  ctx.beginPath();
  ginis.forEach((p,i) => {
    const x = (i/(ginis.length-1))*c.width;
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
    ginis = data.gini_history;
    drawChart();
    drawGini();
  } else if (data.event === 'network_update') {
    window.handleNetworkUpdate(data);
  }
};
</script>
</body>
</html>"""


class WebServer:
    """Unified admin panel and dashboard."""

    def __init__(self, port: int = 8003) -> None:
        self.sim: DAOSimulation | None = None
        self.port = port
        self.app = FastAPI()
        static_dir = Path(__file__).resolve().parent / "static"
        if static_dir.exists():
            self.app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")
        self.connections: List[WebSocket] = []
        self.loop = asyncio.new_event_loop()
        self._thread: threading.Thread | None = None
        self._register_routes()

    def _register_routes(self) -> None:
        @self.app.get('/', response_class=HTMLResponse)
        async def index() -> str:
            return HTML_PAGE

        @self.app.get('/settings')
        async def get_settings() -> Dict[str, Any]:
            return settings

        @self.app.post('/settings')
        async def set_settings(request: Request) -> Dict[str, Any]:
            data = await request.json()
            for k, v in data.items():
                if k in settings:
                    try:
                        casted = type(settings[k])(v)
                    except Exception:
                        casted = v
                    update_settings(**{k: casted})
            return settings

        @self.app.post('/start')
        async def start_sim() -> Dict[str, Any]:
            self.sim = DAOSimulation()
            self.sim.dao.event_bus.subscribe('*', self._on_event)
            return {'started': True}

        @self.app.post('/step')
        async def step_sim() -> Dict[str, Any]:
            if self.sim is None:
                self.sim = DAOSimulation()
                self.sim.dao.event_bus.subscribe('*', self._on_event)
            self.sim.step()
            return {'step': self.sim.schedule.steps}

        @self.app.get('/stats')
        async def stats() -> Any:
            return self.sim.datacollector.model_vars if self.sim else []

        @self.app.websocket('/ws')
        async def websocket_endpoint(ws: WebSocket) -> None:
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

    def _on_event(self, **data: Any) -> None:
        if not self.connections:
            return
        msg = json.dumps(data)
        for ws in list(self.connections):
            asyncio.run_coroutine_threadsafe(ws.send_text(msg), self.loop)

    def start(self) -> None:
        import uvicorn

        def run() -> None:
            uvicorn.run(self.app, host='0.0.0.0', port=self.port, loop='asyncio')

        self._thread = threading.Thread(target=run, daemon=True)
        self._thread.start()
        threading.Thread(target=self.loop.run_forever, daemon=True).start()

    def stop(self) -> None:
        for ws in list(self.connections):
            asyncio.run_coroutine_threadsafe(ws.close(), self.loop)
        self.loop.call_soon_threadsafe(self.loop.stop)
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=0.5)


if __name__ == '__main__':  # pragma: no cover - manual usage
    server = WebServer()
    server.start()
    try:
        import time
        while True:
            time.sleep(0.5)
    except KeyboardInterrupt:
        pass
    server.stop()
