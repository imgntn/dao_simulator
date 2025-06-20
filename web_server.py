from __future__ import annotations

import asyncio
import json
import threading
from pathlib import Path
from typing import Any, Dict, List

from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from dao_simulation import DAOSimulation
from utils.event_engine import EventEngine
from settings import settings, update_settings



class WebServer:
    """Unified admin panel and dashboard."""

    def __init__(self, port: int = 8003) -> None:
        self.sim: DAOSimulation | None = None
        self.port = port
        self.app = FastAPI()
        static_dir = Path(__file__).resolve().parent / "static"
        if static_dir.exists():
            self.app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")
        template_dir = Path(__file__).resolve().parent / "templates"
        self.templates = Jinja2Templates(directory=str(template_dir))
        self.connections: List[WebSocket] = []
        self.loop = asyncio.new_event_loop()
        self._thread: threading.Thread | None = None
        self._register_routes()

    def _register_routes(self) -> None:
        @self.app.get('/', response_class=HTMLResponse)
        async def index(request: Request) -> HTMLResponse:
            return self.templates.TemplateResponse('index.html', {'request': request})

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
            self.sim = DAOSimulation(enable_player=True)
            # Allow scheduling events through the API
            self.sim.event_engine = EventEngine(None)
            self.sim.dao.event_bus.subscribe('*', self._on_event)
            return {'started': True}

        @self.app.post('/step')
        async def step_sim() -> Dict[str, Any]:
            if self.sim is None:
                self.sim = DAOSimulation(enable_player=True)
                self.sim.dao.event_bus.subscribe('*', self._on_event)
            self.sim.step()
            return {'step': self.sim.schedule.steps}

        @self.app.post('/run')
        async def run_sim(request: Request) -> Dict[str, Any]:
            data = await request.json()
            steps = int(data.get('steps', 1)) if isinstance(data, dict) else 1
            if self.sim is None:
                self.sim = DAOSimulation(enable_player=True)
                self.sim.dao.event_bus.subscribe('*', self._on_event)
            for _ in range(steps):
                self.sim.step()
            return {'step': self.sim.schedule.steps}

        @self.app.get('/stats')
        async def stats() -> Any:
            return self.sim.datacollector.model_vars if self.sim else []

        @self.app.get('/leaderboard')
        async def leaderboard() -> Any:
            if not self.sim:
                return {"token": [], "influence": []}
            dc = self.sim.datacollector
            return {
                "token": dc.token_ranking_history[-1] if dc.token_ranking_history else [],
                "influence": dc.influence_ranking_history[-1] if dc.influence_ranking_history else [],
            }

        @self.app.get('/events')
        async def list_events() -> Any:
            if not self.sim or not self.sim.event_engine:
                return []
            return self.sim.event_engine.list_events()

        @self.app.post('/events')
        async def add_event(request: Request) -> Dict[str, Any]:
            if not self.sim or not self.sim.event_engine:
                return {"error": "no simulation"}
            data = await request.json()
            if not isinstance(data, dict) or 'step' not in data or 'type' not in data:
                return {"error": "invalid event"}
            self.sim.event_engine.add_event(data)
            return {"added": True}

        @self.app.post('/player/vote')
        async def player_vote(request: Request) -> Dict[str, Any]:
            if not self.sim or not getattr(self.sim, 'player', None):
                return {"error": "no simulation"}
            data = await request.json()
            pid = int(data.get('id', -1))
            vote = bool(data.get('vote', True))
            if 0 <= pid < len(self.sim.dao.proposals):
                proposal = self.sim.dao.proposals[pid]
                self.sim.player.enqueue('vote', proposal=proposal, vote=vote)
            return {"queued": "vote"}

        @self.app.post('/player/comment')
        async def player_comment(request: Request) -> Dict[str, Any]:
            if not self.sim or not getattr(self.sim, 'player', None):
                return {"error": "no simulation"}
            data = await request.json()
            pid = int(data.get('id', -1))
            sentiment = data.get('sentiment', 'neutral')
            if 0 <= pid < len(self.sim.dao.proposals):
                proposal = self.sim.dao.proposals[pid]
                self.sim.player.enqueue('comment', proposal=proposal, sentiment=sentiment)
            return {"queued": "comment"}

        @self.app.post('/player/create')
        async def player_create() -> Dict[str, Any]:
            if not self.sim or not getattr(self.sim, 'player', None):
                return {"error": "no simulation"}
            self.sim.player.enqueue('create_proposal')
            return {"queued": "create"}

        @self.app.post('/player/delegate')
        async def player_delegate(request: Request) -> Dict[str, Any]:
            if not self.sim or not getattr(self.sim, 'player', None):
                return {"error": "no simulation"}
            data = await request.json()
            pid = int(data.get('id', -1))
            amount = float(data.get('amount', 0))
            if 0 <= pid < len(self.sim.dao.proposals):
                proposal = self.sim.dao.proposals[pid]
                self.sim.player.enqueue('delegate', proposal=proposal, amount=amount)
            return {"queued": "delegate"}

        @self.app.post('/player/swap')
        async def player_swap(request: Request) -> Dict[str, Any]:
            if not self.sim or not getattr(self.sim, 'player', None):
                return {"error": "no simulation"}
            data = await request.json()
            t_in = data.get('token_in')
            t_out = data.get('token_out')
            amount = float(data.get('amount', 0))
            self.sim.player.enqueue('swap', token_in=t_in, token_out=t_out, amount=amount)
            return {"queued": "swap"}

        @self.app.post('/player/add_liquidity')
        async def player_add_liquidity(request: Request) -> Dict[str, Any]:
            if not self.sim or not getattr(self.sim, 'player', None):
                return {"error": "no simulation"}
            data = await request.json()
            ta = data.get('token_a')
            tb = data.get('token_b')
            amt_a = float(data.get('amount_a', 0))
            amt_b = float(data.get('amount_b', 0))
            self.sim.player.enqueue(
                'add_liquidity', token_a=ta, token_b=tb, amount_a=amt_a, amount_b=amt_b
            )
            return {"queued": "add_liquidity"}

        @self.app.post('/player/remove_liquidity')
        async def player_remove_liquidity(request: Request) -> Dict[str, Any]:
            if not self.sim or not getattr(self.sim, 'player', None):
                return {"error": "no simulation"}
            data = await request.json()
            ta = data.get('token_a')
            tb = data.get('token_b')
            share = float(data.get('share', 0))
            self.sim.player.enqueue(
                'remove_liquidity', token_a=ta, token_b=tb, share=share
            )
            return {"queued": "remove_liquidity"}

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
