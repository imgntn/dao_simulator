'use client';

import { useMemo, useEffect, useRef } from 'react';
import { useSimulationStore } from '@/lib/browser/simulation-store';
import { TYPE_COLOR_MAP } from '../scene/constants';

interface Node {
  id: string;
  type: string;
  tokens: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface Edge {
  from: string;
  to: string;
}

const WIDTH = 300;
const HEIGHT = 200;
const NODE_RADIUS_MIN = 4;
const NODE_RADIUS_MAX = 12;

export function DelegationGraph() {
  const snapshot = useSimulationStore(s => s.snapshot);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<Node[]>([]);
  const animRef = useRef<number>(0);

  const { nodes, edges, maxTokens } = useMemo(() => {
    if (!snapshot) return { nodes: [] as Node[], edges: [] as Edge[], maxTokens: 1 };

    const edgeList: Edge[] = [];
    const involvedIds = new Set<string>();

    for (const agent of snapshot.agents) {
      if (agent.delegateTo) {
        edgeList.push({ from: agent.id, to: agent.delegateTo });
        involvedIds.add(agent.id);
        involvedIds.add(agent.delegateTo);
      }
    }

    const nodeList: Node[] = [];
    let max = 1;
    for (const agent of snapshot.agents) {
      if (involvedIds.has(agent.id)) {
        nodeList.push({
          id: agent.id,
          type: agent.type,
          tokens: agent.tokens,
          x: Math.random() * WIDTH,
          y: Math.random() * HEIGHT,
          vx: 0,
          vy: 0,
        });
        max = Math.max(max, agent.tokens);
      }
    }

    return { nodes: nodeList, edges: edgeList, maxTokens: max };
  }, [snapshot]);

  // Sync initial positions
  useEffect(() => {
    if (nodes.length > 0) {
      const existing = new Map(nodesRef.current.map(n => [n.id, n]));
      nodesRef.current = nodes.map(n => {
        const prev = existing.get(n.id);
        return prev ? { ...n, x: prev.x, y: prev.y, vx: prev.vx, vy: prev.vy } : n;
      });
    } else {
      nodesRef.current = [];
    }
  }, [nodes]);

  // Force-directed layout animation
  useEffect(() => {
    if (nodes.length === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const nodeMap = new Map<string, Node>();

    function tick() {
      const ns = nodesRef.current;
      nodeMap.clear();
      for (const n of ns) nodeMap.set(n.id, n);

      // Repulsion
      for (let i = 0; i < ns.length; i++) {
        for (let j = i + 1; j < ns.length; j++) {
          const dx = ns[j].x - ns[i].x;
          const dy = ns[j].y - ns[i].y;
          const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
          const force = 800 / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          ns[i].vx -= fx;
          ns[i].vy -= fy;
          ns[j].vx += fx;
          ns[j].vy += fy;
        }
      }

      // Attraction (edges)
      for (const edge of edges) {
        const a = nodeMap.get(edge.from);
        const b = nodeMap.get(edge.to);
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const force = (dist - 60) * 0.01;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      }

      // Center gravity
      const cx = WIDTH / 2;
      const cy = HEIGHT / 2;
      for (const n of ns) {
        n.vx += (cx - n.x) * 0.002;
        n.vy += (cy - n.y) * 0.002;
      }

      // Apply velocity with damping
      for (const n of ns) {
        n.vx *= 0.85;
        n.vy *= 0.85;
        n.x += n.vx;
        n.y += n.vy;
        n.x = Math.max(15, Math.min(WIDTH - 15, n.x));
        n.y = Math.max(15, Math.min(HEIGHT - 15, n.y));
      }

      // Draw
      if (!ctx) return;
      ctx.clearRect(0, 0, WIDTH, HEIGHT);

      // Draw edges
      ctx.lineWidth = 1;
      for (const edge of edges) {
        const a = nodeMap.get(edge.from);
        const b = nodeMap.get(edge.to);
        if (!a || !b) continue;
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();

        // Arrowhead
        const angle = Math.atan2(b.y - a.y, b.x - a.x);
        const r = NODE_RADIUS_MIN + (b.tokens / maxTokens) * (NODE_RADIUS_MAX - NODE_RADIUS_MIN);
        const tipX = b.x - Math.cos(angle) * r;
        const tipY = b.y - Math.sin(angle) * r;
        ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
        ctx.beginPath();
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(tipX - 6 * Math.cos(angle - 0.4), tipY - 6 * Math.sin(angle - 0.4));
        ctx.lineTo(tipX - 6 * Math.cos(angle + 0.4), tipY - 6 * Math.sin(angle + 0.4));
        ctx.fill();
      }

      // Draw nodes
      for (const n of ns) {
        const r = NODE_RADIUS_MIN + (n.tokens / maxTokens) * (NODE_RADIUS_MAX - NODE_RADIUS_MIN);
        ctx.fillStyle = TYPE_COLOR_MAP[n.type] ?? '#888';
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      animRef.current = requestAnimationFrame(tick);
    }

    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [nodes, edges, maxTokens]);

  if (!snapshot) return null;

  return (
    <div className="px-4 pb-3">
      {edges.length === 0 ? (
        <div className="text-xs text-[var(--sim-text-dim)] text-center py-4">
          No active delegations
        </div>
      ) : (
        <div className="border border-[var(--sim-border)] rounded bg-[var(--sim-surface)]">
          <canvas
            ref={canvasRef}
            width={WIDTH}
            height={HEIGHT}
            style={{ width: WIDTH, height: HEIGHT }}
          />
          <div className="text-[9px] text-[var(--sim-text-dim)] text-center py-1">
            {nodes.length} agents · {edges.length} delegations
          </div>
        </div>
      )}
    </div>
  );
}
