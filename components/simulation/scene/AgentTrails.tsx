'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { AgentSnapshot } from '@/lib/browser/worker-protocol';
import { AGENT_FLOOR_MAP, AGENT_FLOORS, BUILDING, TYPE_COLOR_MAP } from './constants';

interface Props {
  agents: AgentSnapshot[];
}

const TRAIL_LENGTH = 8;
const MAX_TRAILS = 50;
const MOVE_THRESHOLD = 0.01;

/** Compute grid position for an agent */
function agentPosition(agent: AgentSnapshot, indexInFloor: number, floorAgentCount: number): THREE.Vector3 {
  const floorId = AGENT_FLOOR_MAP[agent.type] ?? 'F1';
  const floor = AGENT_FLOORS.find(f => f.id === floorId);
  if (!floor) return new THREE.Vector3(0, 3, 0);

  const cols = Math.ceil(Math.sqrt(floorAgentCount));
  const spacing = 0.55;
  const row = Math.floor(indexInFloor / cols);
  const col = indexInFloor % cols;
  const totalRows = Math.ceil(floorAgentCount / cols);
  const floorWidth = BUILDING.width - 1.0;
  const floorDepth = BUILDING.depth - 1.0;

  let ox = (col - (cols - 1) / 2) * spacing;
  let oz = (row - (totalRows - 1) / 2) * spacing;
  ox = Math.max(-floorWidth / 2, Math.min(floorWidth / 2, ox));
  oz = Math.max(-floorDepth / 2, Math.min(floorDepth / 2, oz));

  const y = floor.yBase + floor.height * 0.3;
  return new THREE.Vector3(ox, y, oz);
}

interface TrailData {
  positions: THREE.Vector3[];
  color: string;
}

/** Agent trails — fading line segments behind moving agents */
export function AgentTrails({ agents }: Props) {
  const trailsRef = useRef<Map<string, TrailData>>(new Map());
  const lineRef = useRef<THREE.LineSegments>(null);

  // Compute current positions
  const currentPositions = useMemo(() => {
    const posMap = new Map<string, THREE.Vector3>();
    const floorGroups = new Map<string, AgentSnapshot[]>();

    for (const a of agents) {
      const fid = AGENT_FLOOR_MAP[a.type] ?? 'F1';
      if (!floorGroups.has(fid)) floorGroups.set(fid, []);
      floorGroups.get(fid)!.push(a);
    }

    for (const [, floorAgents] of floorGroups) {
      for (let i = 0; i < floorAgents.length; i++) {
        posMap.set(floorAgents[i].id, agentPosition(floorAgents[i], i, floorAgents.length));
      }
    }

    return posMap;
  }, [agents]);

  // Update trails
  useFrame(({ clock }) => {
    const trails = trailsRef.current;

    // Update existing trails with new positions
    let trailCount = 0;
    for (const a of agents) {
      if (trailCount >= MAX_TRAILS) break;

      const pos = currentPositions.get(a.id);
      if (!pos) continue;

      // Add bob animation
      const bobPhase = agents.indexOf(a) * 0.7;
      const t = clock.elapsedTime;
      const bobY = Math.sin(t * 1.2 + bobPhase) * 0.03;
      const bobX = Math.cos(t * 0.8 + bobPhase * 1.3) * 0.01;
      const currentPos = new THREE.Vector3(pos.x + bobX, pos.y + bobY, pos.z);

      let trail = trails.get(a.id);
      if (!trail) {
        trail = { positions: [], color: TYPE_COLOR_MAP[a.type] ?? '#888888' };
        trails.set(a.id, trail);
      }

      // Check if position changed enough
      const last = trail.positions[trail.positions.length - 1];
      if (!last || last.distanceTo(currentPos) > MOVE_THRESHOLD) {
        trail.positions.push(currentPos.clone());
        if (trail.positions.length > TRAIL_LENGTH) {
          trail.positions.shift();
        }
        trailCount++;
      }
    }

    // Clean up trails for agents no longer present
    for (const [id] of trails) {
      if (!currentPositions.has(id)) {
        trails.delete(id);
      }
    }

    // Update line geometry
    if (!lineRef.current) return;
    const segments: number[] = [];
    const colors: number[] = [];

    for (const [, trail] of trails) {
      const pts = trail.positions;
      if (pts.length < 2) continue;

      const col = new THREE.Color(trail.color);
      for (let i = 0; i < pts.length - 1; i++) {
        const alpha = i / pts.length; // 0=oldest, 1=newest
        segments.push(pts[i].x, pts[i].y, pts[i].z);
        segments.push(pts[i + 1].x, pts[i + 1].y, pts[i + 1].z);
        // Vertex colors with alpha fading
        const fade = alpha * 0.4;
        colors.push(col.r * fade, col.g * fade, col.b * fade);
        colors.push(col.r * (fade + 0.1), col.g * (fade + 0.1), col.b * (fade + 0.1));
      }
    }

    const geom = lineRef.current.geometry;
    geom.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(segments, 3)
    );
    geom.setAttribute(
      'color',
      new THREE.Float32BufferAttribute(colors, 3)
    );
    geom.attributes.position.needsUpdate = true;
    geom.attributes.color.needsUpdate = true;
  });

  return (
    <lineSegments ref={lineRef}>
      <bufferGeometry />
      <lineBasicMaterial
        vertexColors
        transparent
        opacity={0.5}
        depthWrite={false}
      />
    </lineSegments>
  );
}
