from __future__ import annotations

import asyncio
import json
import threading
from pathlib import Path
from typing import Any, Dict, List

from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from dao_simulation import DAOSimulation
from utils.event_engine import EventEngine
from utils.news_feed import NewsFeed
from utils.validation import (
    ValidationError, sanitize_simulation_steps, sanitize_proposal_id, 
    sanitize_agent_id, sanitize_token_amount, validate_string, validate_json_dict
)
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
        self._server = None
        self.news_feed: NewsFeed | None = None
        self._auto_started = False
        self._register_routes()

    def _ensure_simulation(self) -> None:
        """Ensure a simulation is running and connected to the event bus for live updates."""
        if self.sim is None:
            self.sim = DAOSimulation(enable_player=True)
            self.sim.event_engine = EventEngine(None)
            self.sim.dao.event_bus.subscribe('*', self._on_event)
            self.news_feed = NewsFeed(self.sim.dao.event_bus)
            self._auto_started = True

    def _register_routes(self) -> None:
        @self.app.get('/', response_class=HTMLResponse)
        async def index(request: Request) -> HTMLResponse:
            return self.templates.TemplateResponse('index.html', {'request': request})

        @self.app.get('/marketing', response_class=HTMLResponse)
        async def marketing(request: Request) -> HTMLResponse:
            return self.templates.TemplateResponse('marketing.html', {'request': request})

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
            if self.sim is None or not self._auto_started:
                self.sim = DAOSimulation(enable_player=True)
                # Allow scheduling events through the API
                self.sim.event_engine = EventEngine(None)
                self.sim.dao.event_bus.subscribe('*', self._on_event)
                self.news_feed = NewsFeed(self.sim.dao.event_bus)
                self._auto_started = False
            return {'started': True}

        @self.app.post('/step')
        async def step_sim() -> Dict[str, Any]:
            self._ensure_simulation()
            self.sim.step()
            return {'step': self.sim.schedule.steps}

        @self.app.post('/run')
        async def run_sim(request: Request) -> Dict[str, Any]:
            try:
                data = await request.json()
                data = validate_json_dict(data)
                steps = sanitize_simulation_steps(data.get('steps', 1))
            except ValidationError as e:
                raise HTTPException(status_code=400, detail=str(e))
            except Exception:
                raise HTTPException(status_code=400, detail="Invalid request data")
            
            self._ensure_simulation()
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

        @self.app.get('/news')
        async def get_news() -> Any:
            if not self.news_feed:
                return []
            return list(self.news_feed.summaries)

        @self.app.get('/trending')
        async def trending() -> Any:
            if not self.news_feed:
                return []
            return self.news_feed.get_trending()

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
                raise HTTPException(status_code=400, detail="No simulation running")
            
            try:
                data = await request.json()
                data = validate_json_dict(data, required_keys=['id', 'vote'])
                pid = sanitize_proposal_id(data.get('id'))
                vote = bool(data.get('vote', True))
            except ValidationError as e:
                raise HTTPException(status_code=400, detail=str(e))
            except Exception:
                raise HTTPException(status_code=400, detail="Invalid request data")
            
            if 0 <= pid < len(self.sim.dao.proposals):
                proposal = self.sim.dao.proposals[pid]
                self.sim.player.enqueue('vote', proposal=proposal, vote=vote)
                return {"queued": "vote"}
            else:
                raise HTTPException(status_code=404, detail="Proposal not found")

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
            # Auto-initialize simulation for live updates when first client connects
            if len(self.connections) == 1:
                self._ensure_simulation()
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

        config = uvicorn.Config(
            self.app, host="127.0.0.1", port=self.port, loop="asyncio", log_level="warning"
        )
        self._server = uvicorn.Server(config)

        def run() -> None:
            self._server.run()

        self._thread = threading.Thread(target=run, daemon=True)
        self._thread.start()
        threading.Thread(target=self.loop.run_forever, daemon=True).start()

    def stop(self) -> None:
        for ws in list(self.connections):
            asyncio.run_coroutine_threadsafe(ws.close(), self.loop)
        self.loop.call_soon_threadsafe(self.loop.stop)
        if self._server:
            self._server.should_exit = True
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=1)


def create_app(simulation: DAOSimulation = None) -> FastAPI:
    """Factory function to create a web server FastAPI app."""
    server = WebServer()
    if simulation:
        server.sim = simulation
    return server.app


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
