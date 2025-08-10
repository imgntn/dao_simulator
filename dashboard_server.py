from __future__ import annotations

import asyncio
import json
import threading
from typing import List

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path

template_dir = Path(__file__).resolve().parent / "templates"
HTML_PAGE: str | None = None


def _load_html_page() -> str:
    global HTML_PAGE
    if HTML_PAGE is not None:
        return HTML_PAGE
    try:
        HTML_PAGE = (template_dir / "index.html").read_text()
    except Exception:
        HTML_PAGE = "<html><body><h1>Dashboard</h1></body></html>"
    return HTML_PAGE


class DashboardServer:
    """WebSocket dashboard streaming DAO events."""

    def __init__(self, event_bus, port: int = 8000) -> None:
        self.event_bus = event_bus
        self.port = port
        self.app = FastAPI()
        static_dir = Path(__file__).resolve().parent / "static"
        if static_dir.exists():
            self.app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")
        self.connections: List[WebSocket] = []
        self.loop = asyncio.new_event_loop()
        self._thread: threading.Thread | None = None
        self.event_bus.subscribe("*", self._on_event)

        @self.app.get("/")
        async def index():
            return HTMLResponse(_load_html_page())

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
            uvicorn.run(self.app, host="127.0.0.1", port=self.port, loop="asyncio")

        self._thread = threading.Thread(target=run, daemon=True)
        self._thread.start()
        threading.Thread(target=self.loop.run_forever, daemon=True).start()

    def stop(self) -> None:
        for ws in list(self.connections):
            asyncio.run_coroutine_threadsafe(ws.close(), self.loop)
        self.loop.call_soon_threadsafe(self.loop.stop)
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=0.5)
