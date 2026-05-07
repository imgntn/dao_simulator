'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SimulationSnapshot } from '@/lib/browser/worker-protocol';
import type { VisualAgentDraw, VisualLayoutRequest, VisualSceneDraw } from '@/lib/browser/visual-layout-protocol';
import { toVisualAgentInput } from '@/lib/browser/visual-layout-protocol';

interface CanvasVisualLayerProps {
  snapshot: SimulationSnapshot;
  ceremonies: Map<string, number>;
  shelving: Set<string>;
  selectedAgentId: string | null;
  labelsVisible: boolean;
  showDelegations: boolean;
  zoom: number;
  pan: { x: number; y: number };
  onInspectAgent: (agentId: string) => void;
  onVisualStats?: (stats: VisualSceneDraw['stats'] | null) => void;
}

const VIEWBOX = { x: -500, y: -320, width: 1000, height: 640 };
const COLORS = {
  ink: '#080414',
  cave: '#040210',
  parchment: '#F2DCA2',
  parchmentWarm: '#FFE6A8',
  gold: '#E8C050',
  honey: '#C49020',
  voteFor: '#D86018',
  voteAgainst: '#7050B8',
  blood: '#A82818',
  lamp: '#9DFF80',
  governance: '#B068F8',
  treasury: '#20D8C0',
  craft: '#FF9040',
  council: '#F0B830',
  passive: '#A888E8',
};

const ARCHETYPE_COLOR = {
  governance: COLORS.governance,
  treasury: COLORS.treasury,
  craft: COLORS.craft,
  council: COLORS.council,
  passive: COLORS.passive,
};

const LINK_COLOR = {
  governance: 'rgba(176,104,248,0.55)',
  treasury: 'rgba(32,216,192,0.55)',
  craft: 'rgba(255,144,64,0.55)',
  council: 'rgba(240,184,48,0.55)',
  passive: 'rgba(168,136,232,0.55)',
};

const ARCHETYPE_STYLE = {
  governance: {
    fill: '#6F35C8',
    light: '#C99BFF',
    trim: '#E8C050',
    shape: 'owl',
  },
  treasury: {
    fill: '#087E86',
    light: '#40F0D8',
    trim: '#E8C050',
    shape: 'coin',
  },
  craft: {
    fill: '#C04C18',
    light: '#FFB070',
    trim: '#F2DCA2',
    shape: 'builder',
  },
  council: {
    fill: '#B06C14',
    light: '#FFD060',
    trim: '#F2DCA2',
    shape: 'shield',
  },
  passive: {
    fill: '#5B42A8',
    light: '#C6AAFF',
    trim: '#F2DCA2',
    shape: 'moth',
  },
} as const;

type DetailLevel = 'far' | 'mid' | 'close';

interface CanvasMetrics {
  scale: number;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
  dpr: number;
}

export function CanvasVisualLayer({
  snapshot,
  ceremonies,
  shelving,
  selectedAgentId,
  labelsVisible,
  showDelegations,
  zoom,
  pan,
  onInspectAgent,
  onVisualStats,
}: CanvasVisualLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  const sceneRef = useRef<VisualSceneDraw | null>(null);
  const metricsRef = useRef<CanvasMetrics | null>(null);
  const hitRef = useRef<Array<{ id: string; x: number; y: number; r: number }>>([]);
  const [scene, setScene] = useState<VisualSceneDraw | null>(null);

  const ceremoniesPayload = useMemo(() => Array.from(ceremonies.entries()), [ceremonies]);
  const shelvingPayload = useMemo(() => Array.from(shelving.values()), [shelving]);
  const agentsPayload = useMemo(() => snapshot.agents.map(toVisualAgentInput), [snapshot.agents]);

  useEffect(() => {
    const worker = new Worker(new URL('../../../lib/browser/visual-layout-worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent<VisualSceneDraw>) => {
      if (event.data.requestId < requestIdRef.current) return;
      sceneRef.current = event.data;
      setScene(event.data);
      onVisualStats?.(event.data.stats);
    };
    return () => {
      worker.terminate();
      workerRef.current = null;
      onVisualStats?.(null);
    };
  }, [onVisualStats]);

  useEffect(() => {
    const worker = workerRef.current;
    const canvas = canvasRef.current;
    if (!worker || !canvas) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const viewport = getVisibleSceneBounds(rect.width, rect.height, zoom, pan);
    const request: VisualLayoutRequest = {
      requestId: ++requestIdRef.current,
      step: snapshot.step,
      agents: agentsPayload,
      events: snapshot.recentEvents,
      blackSwanActive: snapshot.blackSwan.active,
      ceremonies: ceremoniesPayload,
      shelving: shelvingPayload,
      selectedAgentId,
      labelsVisible,
      showDelegations,
      zoom,
      viewport,
    };
    worker.postMessage(request);
  }, [
    agentsPayload,
    ceremoniesPayload,
    labelsVisible,
    pan,
    selectedAgentId,
    shelvingPayload,
    showDelegations,
    snapshot.blackSwan.active,
    snapshot.recentEvents,
    snapshot.step,
    zoom,
  ]);

  const handleClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const metrics = metricsRef.current;
    if (!metrics) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX - rect.left) * metrics.dpr;
    const py = (event.clientY - rect.top) * metrics.dpr;
    let best: { id: string; dist: number } | null = null;
    for (const hit of hitRef.current) {
      const dx = px - hit.x;
      const dy = py - hit.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= hit.r && (!best || dist < best.dist)) best = { id: hit.id, dist };
    }
    if (best) onInspectAgent(best.id);
  }, [onInspectAgent]);

  const drawCanvas = useCallback((canvas: HTMLCanvasElement | null, nextScene: VisualSceneDraw | null, showLabels: boolean) => {
    if (!canvas || !nextScene) return;
    const metrics = metricsRef.current ?? resizeCanvas(canvas);
    metricsRef.current = metrics;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, metrics.width, metrics.height);
    hitRef.current = [];
    const detail = getDetailLevel(zoom);
    drawAmbientLighting(ctx, metrics, nextScene.step);
    drawStorm(ctx, metrics, nextScene.blackSwanActive, nextScene.step);
    drawDelegations(ctx, metrics, nextScene);
    drawAgents(ctx, metrics, nextScene.agents, showLabels, nextScene.step, detail, hitRef.current);
    drawEvents(ctx, metrics, nextScene.events, nextScene.step);
  }, [zoom]);

  useEffect(() => {
    sceneRef.current = scene;
    drawCanvas(canvasRef.current, scene, labelsVisible);
  }, [drawCanvas, labelsVisible, scene]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let raf = 0;
    const resize = () => {
      const metrics = resizeCanvas(canvas);
      metricsRef.current = metrics;
      drawCanvas(canvas, sceneRef.current, labelsVisible);
      raf = requestAnimationFrame(resize);
    };
    raf = requestAnimationFrame(resize);
    return () => cancelAnimationFrame(raf);
  }, [drawCanvas, labelsVisible]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full"
      aria-label="Canvas-rendered agents and live simulation effects"
      onClick={handleClick}
      data-ui-interactive
      style={{ pointerEvents: 'auto' }}
    />
  );
}

function resizeCanvas(canvas: HTMLCanvasElement): CanvasMetrics {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const width = Math.max(1, Math.round(rect.width * dpr));
  const height = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const scale = Math.min(width / VIEWBOX.width, height / VIEWBOX.height);
  return {
    scale,
    offsetX: (width - VIEWBOX.width * scale) / 2 - VIEWBOX.x * scale,
    offsetY: (height - VIEWBOX.height * scale) / 2 - VIEWBOX.y * scale,
    width,
    height,
    dpr,
  };
}

function sceneToCanvas(metrics: CanvasMetrics, x: number, y: number) {
  return {
    x: metrics.offsetX + x * metrics.scale,
    y: metrics.offsetY + y * metrics.scale,
  };
}

function getVisibleSceneBounds(width: number, height: number, zoom: number, pan: { x: number; y: number }) {
  if (zoom <= 1.05) {
    return { ...VIEWBOX };
  }
  const scale = Math.min(width / VIEWBOX.width, height / VIEWBOX.height);
  const viewWidth = VIEWBOX.width / Math.max(0.1, zoom);
  const viewHeight = VIEWBOX.height / Math.max(0.1, zoom);
  const centerX = -pan.x / Math.max(1, scale);
  const centerY = -pan.y / Math.max(1, scale);
  return {
    x: VIEWBOX.x + centerX - viewWidth / 2,
    y: VIEWBOX.y + centerY - viewHeight / 2,
    width: viewWidth,
    height: viewHeight,
  };
}

function getDetailLevel(zoom: number): DetailLevel {
  if (zoom >= 3.2) return 'close';
  if (zoom >= 1.65) return 'mid';
  return 'far';
}

function drawAmbientLighting(ctx: CanvasRenderingContext2D, metrics: CanvasMetrics, step: number) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const lamps = [
    { x: -260, y: -220, r: 120, color: 'rgba(176,104,248,0.10)' },
    { x: 260, y: -90, r: 120, color: 'rgba(32,216,192,0.11)' },
    { x: -260, y: 150, r: 130, color: 'rgba(255,144,64,0.10)' },
    { x: 0, y: 44, r: 150, color: 'rgba(64,232,255,0.10)' },
  ];
  for (const lamp of lamps) {
    const p = sceneToCanvas(metrics, lamp.x, lamp.y);
    const pulse = 1 + Math.sin(step * 0.08 + lamp.x * 0.01) * 0.04;
    const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, lamp.r * metrics.scale * pulse);
    gradient.addColorStop(0, lamp.color);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(p.x, p.y, lamp.r * metrics.scale * pulse, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawStorm(ctx: CanvasRenderingContext2D, metrics: CanvasMetrics, active: boolean, step: number) {
  if (!active) return;
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = '#35136F';
  ctx.fillRect(0, 0, metrics.width, metrics.height);
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.44;
  ctx.strokeStyle = COLORS.treasury;
  ctx.lineWidth = Math.max(1, metrics.scale * 0.9);
  for (let i = 0; i < 28; i++) {
    const x = ((i * 79 + step * 17) % 1100) - 550;
    const y = ((i * 53 + step * 31) % 760) - 340;
    const a = sceneToCanvas(metrics, x, y);
    const b = sceneToCanvas(metrics, x - 5, y + 22);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  if (step % 11 < 2) {
    ctx.globalAlpha = 0.13;
    ctx.fillStyle = COLORS.parchmentWarm;
    ctx.fillRect(0, 0, metrics.width, metrics.height);
  }
  ctx.restore();
}

function drawDelegations(ctx: CanvasRenderingContext2D, metrics: CanvasMetrics, scene: VisualSceneDraw) {
  ctx.save();
  for (const edge of scene.delegations) {
    const s = sceneToCanvas(metrics, edge.sx, edge.sy);
    const t = sceneToCanvas(metrics, edge.tx, edge.ty);
    const mx = (s.x + t.x) / 2;
    const my = Math.min(s.y, t.y) - 36 * metrics.scale;
    ctx.globalAlpha = edge.highlighted ? 0.88 : 0.34;
    ctx.strokeStyle = edge.highlighted ? COLORS.gold : LINK_COLOR[edge.archetype];
    ctx.lineWidth = (edge.highlighted ? 1.8 : 0.9) * metrics.dpr;
    ctx.setLineDash(edge.highlighted ? [] : [4 * metrics.dpr, 5 * metrics.dpr]);
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.quadraticCurveTo(mx, my, t.x, t.y);
    ctx.stroke();
    ctx.setLineDash([]);
    const phase = ((scene.step + edge.sourceId.length * 7) % 24) / 24;
    const px = quadraticAt(s.x, mx, t.x, phase);
    const py = quadraticAt(s.y, my, t.y, phase);
    ctx.globalAlpha = edge.highlighted ? 0.95 : 0.55;
    ctx.fillStyle = edge.highlighted ? COLORS.gold : LINK_COLOR[edge.archetype];
    ctx.beginPath();
    ctx.arc(px, py, (edge.highlighted ? 2.6 : 1.8) * metrics.dpr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function quadraticAt(a: number, b: number, c: number, t: number) {
  const inv = 1 - t;
  return inv * inv * a + 2 * inv * t * b + t * t * c;
}

function drawAgents(
  ctx: CanvasRenderingContext2D,
  metrics: CanvasMetrics,
  agents: VisualAgentDraw[],
  labelsVisible: boolean,
  step: number,
  detail: DetailLevel,
  hits: Array<{ id: string; x: number; y: number; r: number }>
) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const agent of agents) {
    const p = sceneToCanvas(metrics, agent.x, agent.y);
    const color = agent.lastVote === true
      ? COLORS.voteFor
      : agent.lastVote === false
      ? COLORS.voteAgainst
      : ARCHETYPE_COLOR[agent.archetype];
    if (agent.simplified) {
      drawDot(ctx, metrics, p.x, p.y, agent, color, step);
      hits.push({ id: agent.id, x: p.x, y: p.y + 10 * metrics.scale, r: 18 * metrics.scale });
      continue;
    }

    const bob = (agent.inCeremony || agent.isShelving ? Math.sin(step * 0.8 + agent.idx) * 2 : Math.sin(step * 0.045 + agent.idx) * 0.55) * metrics.scale;
    const bodyY = p.y + bob;
    drawFullAgent(ctx, metrics, agent, p.x, bodyY, color, step, detail);
    if (labelsVisible || detail === 'close') drawLabel(ctx, metrics, agent, p.x, bodyY - 27 * metrics.scale, detail);
    hits.push({ id: agent.id, x: p.x, y: bodyY + 14 * metrics.scale, r: 28 * metrics.scale });
  }
  ctx.restore();
}

function drawDot(ctx: CanvasRenderingContext2D, metrics: CanvasMetrics, x: number, y: number, agent: VisualAgentDraw, color: string, step: number) {
  const style = ARCHETYPE_STYLE[agent.archetype];
  const r = (agent.highlighted ? 8 : 5.5) * metrics.scale;
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = COLORS.ink;
  ctx.beginPath();
  ctx.ellipse(x, y + 24 * metrics.scale, 9 * metrics.scale, 2.5 * metrics.scale, 0, 0, Math.PI * 2);
  ctx.fill();
  if (agent.highlighted || agent.recentVote || agent.influenceRank > 0) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = agent.highlighted ? 0.32 : 0.16;
    ctx.fillStyle = style.light;
    ctx.beginPath();
    ctx.arc(x, y + 10 * metrics.scale, (agent.highlighted ? 18 : 12 + agent.influenceRank) * metrics.scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.globalAlpha = 1;
  const gradient = ctx.createRadialGradient(x - 2 * metrics.scale, y + 7 * metrics.scale, 1, x, y + 10 * metrics.scale, r * 1.4);
  gradient.addColorStop(0, style.light);
  gradient.addColorStop(0.64, color);
  gradient.addColorStop(1, style.fill);
  ctx.fillStyle = gradient;
  ctx.strokeStyle = agent.highlighted ? COLORS.gold : 'rgba(8,4,20,0.95)';
  ctx.lineWidth = (agent.highlighted ? 1.4 : 0.7) * metrics.dpr;
  ctx.beginPath();
  ctx.arc(x, y + (10 + Math.sin(step * 0.08 + agent.idx) * 0.8) * metrics.scale, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  if (agent.lastVote !== null) {
    ctx.fillStyle = agent.lastVote ? COLORS.voteFor : COLORS.voteAgainst;
    ctx.beginPath();
    ctx.arc(x + 6 * metrics.scale, y + 4 * metrics.scale, 2.4 * metrics.scale, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawFullAgent(
  ctx: CanvasRenderingContext2D,
  metrics: CanvasMetrics,
  agent: VisualAgentDraw,
  x: number,
  y: number,
  color: string,
  step: number,
  detail: DetailLevel
) {
  const s = metrics.scale;
  const style = ARCHETYPE_STYLE[agent.archetype];
  ctx.save();
  ctx.globalAlpha = 0.24;
  ctx.fillStyle = COLORS.ink;
  ctx.beginPath();
  ctx.ellipse(x, y + 44 * s, 14 * s, 3.5 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  if (agent.highlighted || agent.recentVote || agent.inCeremony) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = agent.highlighted ? 0.34 : 0.2;
    ctx.fillStyle = agent.inCeremony ? COLORS.lamp : style.light;
    ctx.beginPath();
    ctx.arc(x, y + 15 * s, (agent.highlighted ? 34 : 25 + Math.sin(step * 0.18 + agent.idx) * 2) * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }

  ctx.globalAlpha = 1;
  drawArchetypeBody(ctx, metrics, agent, x, y, color, style);

  if (agent.lastVote !== null) {
    ctx.fillStyle = agent.lastVote ? COLORS.voteFor : COLORS.voteAgainst;
    ctx.strokeStyle = COLORS.ink;
    ctx.lineWidth = 0.8 * metrics.dpr;
    ctx.beginPath();
    ctx.moveTo(x + 10 * s, y + 7 * s);
    ctx.lineTo(x + 22 * s, y + 10 * s);
    ctx.lineTo(x + 10 * s, y + 14 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = COLORS.parchmentWarm;
    ctx.beginPath();
    ctx.moveTo(x + 9 * s, y + 6 * s);
    ctx.lineTo(x + 9 * s, y + 18 * s);
    ctx.stroke();
  }

  if (agent.influenceRank > 0) {
    ctx.fillStyle = COLORS.gold;
    ctx.strokeStyle = COLORS.ink;
    ctx.beginPath();
    ctx.arc(x - 18 * s, y + 4 * s, (3 + agent.influenceRank) * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  if (detail === 'close') {
    drawMicroBars(ctx, metrics, agent, x, y + 47 * s, style.light);
  }

  ctx.fillStyle = 'rgba(8,4,20,0.75)';
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.roundRect(x - 18 * s, y + 30 * s, 36 * s, 11 * s, 2 * s);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = COLORS.parchment;
  ctx.font = `${Math.max(7, 6 * s)}px Georgia, serif`;
  ctx.fillText(agent.shortLabel, x, y + 36 * s);
  ctx.restore();
}

function drawArchetypeBody(
  ctx: CanvasRenderingContext2D,
  metrics: CanvasMetrics,
  agent: VisualAgentDraw,
  x: number,
  y: number,
  color: string,
  style: (typeof ARCHETYPE_STYLE)[keyof typeof ARCHETYPE_STYLE]
) {
  const s = metrics.scale;
  const bodyGradient = ctx.createLinearGradient(x, y - 10 * s, x, y + 38 * s);
  bodyGradient.addColorStop(0, style.light);
  bodyGradient.addColorStop(0.38, color);
  bodyGradient.addColorStop(1, style.fill);

  ctx.fillStyle = bodyGradient;
  ctx.strokeStyle = 'rgba(8,4,20,0.95)';
  ctx.lineWidth = 1.05 * metrics.dpr;
  ctx.beginPath();
  if (style.shape === 'owl') {
    ctx.moveTo(x - 13 * s, y + 6 * s);
    ctx.quadraticCurveTo(x - 18 * s, y - 12 * s, x - 5 * s, y - 6 * s);
    ctx.quadraticCurveTo(x, y - 15 * s, x + 5 * s, y - 6 * s);
    ctx.quadraticCurveTo(x + 18 * s, y - 12 * s, x + 13 * s, y + 6 * s);
    ctx.quadraticCurveTo(x + 14 * s, y + 32 * s, x, y + 39 * s);
    ctx.quadraticCurveTo(x - 14 * s, y + 32 * s, x - 13 * s, y + 6 * s);
  } else if (style.shape === 'coin') {
    ctx.ellipse(x, y + 17 * s, 13 * s, 21 * s, 0, 0, Math.PI * 2);
  } else if (style.shape === 'builder') {
    ctx.roundRect(x - 12 * s, y + 1 * s, 24 * s, 36 * s, 7 * s);
  } else if (style.shape === 'shield') {
    ctx.moveTo(x, y - 8 * s);
    ctx.lineTo(x + 15 * s, y + 0 * s);
    ctx.lineTo(x + 11 * s, y + 29 * s);
    ctx.lineTo(x, y + 40 * s);
    ctx.lineTo(x - 11 * s, y + 29 * s);
    ctx.lineTo(x - 15 * s, y + 0 * s);
    ctx.closePath();
  } else {
    ctx.moveTo(x, y - 6 * s);
    ctx.quadraticCurveTo(x - 23 * s, y + 4 * s, x - 16 * s, y + 25 * s);
    ctx.quadraticCurveTo(x - 5 * s, y + 21 * s, x, y + 39 * s);
    ctx.quadraticCurveTo(x + 5 * s, y + 21 * s, x + 16 * s, y + 25 * s);
    ctx.quadraticCurveTo(x + 23 * s, y + 4 * s, x, y - 6 * s);
  }
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = COLORS.parchmentWarm;
  if (style.shape === 'coin') {
    ctx.strokeStyle = style.trim;
    ctx.beginPath();
    ctx.arc(x, y + 17 * s, 8 * s, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x - 3 * s, y + 4 * s, 1.6 * s, 0, Math.PI * 2);
    ctx.arc(x + 3 * s, y + 4 * s, 1.6 * s, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(x - 4 * s, y + 2 * s, 1.9 * s, 0, Math.PI * 2);
    ctx.arc(x + 4 * s, y + 2 * s, 1.9 * s, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = style.trim;
  ctx.lineWidth = 0.8 * metrics.dpr;
  if (agent.archetype === 'craft') {
    ctx.beginPath();
    ctx.moveTo(x - 14 * s, y + 18 * s);
    ctx.lineTo(x + 13 * s, y + 7 * s);
    ctx.stroke();
  } else if (agent.archetype === 'governance') {
    ctx.beginPath();
    ctx.moveTo(x - 9 * s, y + 13 * s);
    ctx.quadraticCurveTo(x, y + 22 * s, x + 9 * s, y + 13 * s);
    ctx.stroke();
  } else if (agent.archetype === 'passive') {
    ctx.beginPath();
    ctx.moveTo(x - 9 * s, y + 16 * s);
    ctx.quadraticCurveTo(x, y + 24 * s, x + 9 * s, y + 16 * s);
    ctx.stroke();
  }
}

function drawMicroBars(ctx: CanvasRenderingContext2D, metrics: CanvasMetrics, agent: VisualAgentDraw, x: number, y: number, color: string) {
  const s = metrics.scale;
  const bars = [
    { value: Math.min(1, agent.tokens / 20000), fill: COLORS.gold },
    { value: agent.reputation, fill: color },
    { value: agent.optimism, fill: COLORS.lamp },
  ];
  ctx.save();
  bars.forEach((bar, i) => {
    const bx = x - 18 * s;
    const by = y + i * 4 * s;
    ctx.fillStyle = 'rgba(8,4,20,0.55)';
    ctx.fillRect(bx, by, 36 * s, 2 * s);
    ctx.fillStyle = bar.fill;
    ctx.fillRect(bx, by, Math.max(1, 36 * s * Math.max(0, Math.min(1, bar.value))), 2 * s);
  });
  ctx.restore();
}

function drawLabel(ctx: CanvasRenderingContext2D, metrics: CanvasMetrics, agent: VisualAgentDraw, x: number, y: number, detail: DetailLevel) {
  const s = metrics.scale;
  const text = detail === 'close' ? `${agent.label} ${Math.round(agent.tokens).toLocaleString()}` : agent.label;
  const w = Math.max(50, Math.min(132, text.length * 5.2)) * s;
  ctx.save();
  ctx.shadowColor = 'rgba(232,192,80,0.24)';
  ctx.shadowBlur = 8 * s;
  ctx.fillStyle = 'rgba(242,220,162,0.94)';
  ctx.strokeStyle = agent.highlighted ? COLORS.gold : 'rgba(74,44,24,0.75)';
  ctx.lineWidth = 0.8 * metrics.dpr;
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - 6 * s, w, 12 * s, 2 * s);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#4A2C18';
  ctx.font = `${Math.max(7, 6 * s)}px Georgia, serif`;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawEvents(ctx: CanvasRenderingContext2D, metrics: CanvasMetrics, events: VisualSceneDraw['events'], step: number) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const p = sceneToCanvas(metrics, event.x, event.y);
    const pulse = 1 + ((step + i) % 6) * 0.08;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.max(0.18, 0.62 - event.age * 0.18);
    ctx.fillStyle = event.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 22 * metrics.scale * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = Math.max(0.28, 0.82 - event.age * 0.18);
    ctx.strokeStyle = event.color;
    ctx.lineWidth = 1.3 * metrics.dpr;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 34 * metrics.scale * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = event.color;
    ctx.font = `${Math.max(8, 7 * metrics.scale)}px Georgia, serif`;
    ctx.fillText(event.label, p.x, p.y - (28 + i * 10) * metrics.scale);
  }
  ctx.restore();
}
