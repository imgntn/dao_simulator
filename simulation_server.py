from __future__ import annotations
import asyncio
import json
import threading
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from dao_simulation import DAOSimulation

class SimulationServer:
    """Control a :class:`DAOSimulation` via REST and WebSocket."""

    def __init__(self, simulation: DAOSimulation, port: int = 8001) -> None:
        self.sim = simulation
        self.port = port
        self.app = FastAPI()
        self.connections = []
        self.loop = asyncio.new_event_loop()
        self._thread: threading.Thread | None = None
        self.sim.dao.event_bus.subscribe('*', self._on_event)

        @self.app.post('/step')
        async def do_step():
            self.sim.step()
            return {'step': self.sim.schedule.steps}

        @self.app.post('/run')
        async def do_run(steps: int = 1):
            for _ in range(steps):
                self.sim.step()
            return {'step': self.sim.schedule.steps}

        @self.app.get('/stats')
        async def stats():
            return self.sim.datacollector.model_vars

        @self.app.websocket('/ws')
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
            uvicorn.run(self.app, host='127.0.0.1', port=self.port, loop='asyncio')

        self._thread = threading.Thread(target=run, daemon=True)
        self._thread.start()
        threading.Thread(target=self.loop.run_forever, daemon=True).start()

    def stop(self) -> None:
        for ws in list(self.connections):
            asyncio.run_coroutine_threadsafe(ws.close(), self.loop)
        self.loop.call_soon_threadsafe(self.loop.stop)
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=0.5)
