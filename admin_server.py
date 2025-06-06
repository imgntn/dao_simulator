from __future__ import annotations
import asyncio
import threading
from typing import Any, Dict

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse

from dao_simulation import DAOSimulation
from settings import settings, update_settings

HTML_PAGE = """<!DOCTYPE html>
<html>
<head><title>DAO Admin</title>
<link rel=\"stylesheet\" href=\"/static/style.css\" />
</head>
<body>
<div class='container'>
<h1>DAO Admin</h1>
<div id='controls'>
<form id='settingsForm'></form>
<button onclick='startSim()'>Start</button>
<button onclick='stepSim()'>Step</button>
</div>
<pre id='output'></pre>
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
</script>
</div>
</body>
</html>"""


class AdminServer:
    """Simple web admin interface for the simulation."""

    def __init__(self, port: int = 8002) -> None:
        self.sim: DAOSimulation | None = None
        self.port = port
        self.app = FastAPI()
        self.loop = asyncio.new_event_loop()
        self._thread: threading.Thread | None = None

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
            return {'started': True}

        @self.app.post('/step')
        async def step_sim() -> Dict[str, Any]:
            if self.sim is None:
                self.sim = DAOSimulation()
            self.sim.step()
            return {'step': self.sim.schedule.steps}

        @self.app.get('/stats')
        async def stats() -> Any:
            return self.sim.datacollector.model_vars if self.sim else []

    def start(self) -> None:
        import uvicorn

        def run() -> None:
            uvicorn.run(self.app, host='0.0.0.0', port=self.port, loop='asyncio')

        self._thread = threading.Thread(target=run, daemon=True)
        self._thread.start()
        threading.Thread(target=self.loop.run_forever, daemon=True).start()

    def stop(self) -> None:
        self.loop.call_soon_threadsafe(self.loop.stop)
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=0.5)


if __name__ == '__main__':  # pragma: no cover - manual usage
    server = AdminServer()
    server.start()
    try:
        import time
        while True:
            time.sleep(0.5)
    except KeyboardInterrupt:
        pass
    server.stop()
