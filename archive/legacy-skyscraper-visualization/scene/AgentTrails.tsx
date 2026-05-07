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
// Max segments: each trail can produce TRAIL_LENGTH-1 segments, each segment = 2 vertices
const MAX_VERTICES = MAX_TRAILS * (TRAIL_LENGTH - 1) * 2;

/** Compute grid position for an agent */
function agentPosition(agent: AgentSnapshot, indexInFloor: number, floorAgentCount: number, out: THREE.Vector3): void {
  const floorId = AGENT_FLOOR_MAP[agent.type] ?? 'F1';
  const floor = AGENT_FLOORS.find(f => f.id === floorId);
  if (!floor) { out.set(0, 3, 0); return; }

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

  out.set(ox, floor.yBase + floor.height * 0.3, oz);
}

interface TrailData {
  positions: THREE.Vector3[];
  color: THREE.Color;
}

/** Agent trails — fading line segments behind moving agents */
export function AgentTrails({ agents }: Props) {
  const trailsRef = useRef<Map<string, TrailData>>(new Map());
  const lineRef = useRef<THREE.LineSegments>(null);

  // Pre-allocate buffer attributes once — reuse by updating data in place
  const { posAttr, colAttr } = useMemo(() => {
    const posArr = new Float32Array(MAX_VERTICES * 3);
    const colArr = new Float32Array(MAX_VERTICES * 3);
    return {
      posAttr: new THREE.BufferAttribute(posArr, 3),
      colAttr: new THREE.BufferAttribute(colArr, 3),
    };
  }, []);

  // Pre-allocate reusable vector
  const tmpVec = useMemo(() => new THREE.Vector3(), []);

  // Build agent index map to avoid indexOf in loop
  const agentIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    agents.forEach((a, i) => map.set(a.id, i));
    return map;
  }, [agents]);

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
        const v = new THREE.Vector3();
        agentPosition(floorAgents[i], i, floorAgents.length, v);
        posMap.set(floorAgents[i].id, v);
      }
    }

    return posMap;
  }, [agents]);

  // Update trails
  useFrame(({ clock }) => {
    const trails = trailsRef.current;
    const t = clock.elapsedTime;

    // Update existing trails with new positions
    let trailCount = 0;
    for (const a of agents) {
      if (trailCount >= MAX_TRAILS) break;

      const pos = currentPositions.get(a.id);
      if (!pos) continue;

      // Add bob animation using pre-built index
      const idx = agentIndexMap.get(a.id) ?? 0;
      const bobPhase = idx * 0.7;
      const bobY = Math.sin(t * 1.2 + bobPhase) * 0.03;
      const bobX = Math.cos(t * 0.8 + bobPhase * 1.3) * 0.01;
      tmpVec.set(pos.x + bobX, pos.y + bobY, pos.z);

      let trail = trails.get(a.id);
      if (!trail) {
        trail = { positions: [], color: new THREE.Color(TYPE_COLOR_MAP[a.type] ?? '#888888') };
        trails.set(a.id, trail);
      }

      // Check if position changed enough
      const last = trail.positions[trail.positions.length - 1];
      if (!last || last.distanceTo(tmpVec) > MOVE_THRESHOLD) {
        trail.positions.push(tmpVec.clone());
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

    // Update line geometry in place
    if (!lineRef.current) return;

    const posArr = posAttr.array as Float32Array;
    const colArr = colAttr.array as Float32Array;
    let vertexIdx = 0;

    for (const [, trail] of trails) {
      const pts = trail.positions;
      if (pts.length < 2) continue;

      const col = trail.color;
      for (let i = 0; i < pts.length - 1; i++) {
        if (vertexIdx >= MAX_VERTICES) break;
        const alpha = i / pts.length;
        const fade = alpha * 0.4;

        // Vertex 1
        const vi = vertexIdx * 3;
        posArr[vi] = pts[i].x;
        posArr[vi + 1] = pts[i].y;
        posArr[vi + 2] = pts[i].z;
        colArr[vi] = col.r * fade;
        colArr[vi + 1] = col.g * fade;
        colArr[vi + 2] = col.b * fade;
        vertexIdx++;

        // Vertex 2
        const vi2 = vertexIdx * 3;
        posArr[vi2] = pts[i + 1].x;
        posArr[vi2 + 1] = pts[i + 1].y;
        posArr[vi2 + 2] = pts[i + 1].z;
        colArr[vi2] = col.r * (fade + 0.1);
        colArr[vi2 + 1] = col.g * (fade + 0.1);
        colArr[vi2 + 2] = col.b * (fade + 0.1);
        vertexIdx++;
      }
    }

    // Zero out remaining vertices
    for (let i = vertexIdx * 3; i < posArr.length; i++) {
      posArr[i] = 0;
      colArr[i] = 0;
    }

    const geom = lineRef.current.geometry;
    if (!geom.attributes.position) {
      geom.setAttribute('position', posAttr);
      geom.setAttribute('color', colAttr);
    }
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    geom.setDrawRange(0, vertexIdx);
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
