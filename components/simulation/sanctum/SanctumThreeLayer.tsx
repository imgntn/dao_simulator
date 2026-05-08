'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { SimulationSnapshot } from '@/lib/browser/worker-protocol';
import type { VisualAgentDraw, VisualArchetype, VisualLayoutRequest, VisualQuality, VisualSceneDraw } from '@/lib/browser/visual-layout-protocol';
import { toVisualAgentInput } from '@/lib/browser/visual-layout-protocol';

export type ThreeRendererStats = VisualSceneDraw['stats'] & {
  renderer: 'three';
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
};

interface SanctumThreeLayerProps {
  snapshot: SimulationSnapshot;
  ceremonies: Map<string, number>;
  shelving: Set<string>;
  selectedAgentId: string | null;
  labelsVisible: boolean;
  showDelegations: boolean;
  quality: VisualQuality;
  zoom: number;
  pan: { x: number; y: number };
  onInspectAgent: (agentId: string) => void;
  onHoverAgent?: (agent: VisualAgentDraw | null) => void;
  onSelectedAgentPosition?: (position: { x: number; y: number } | null) => void;
  onVisualStats?: (stats: ThreeRendererStats | null) => void;
  onRendererError?: () => void;
}

const VIEWBOX = { x: -500, y: -320, width: 1000, height: 640 };
const MAX_AGENTS = 512;
const MAX_VOTES = 512;
const MAX_GLOWS = 256;
const MAX_EVENT_PARTICLES = 96;

const ARCHETYPE_COLORS: Record<VisualArchetype, number> = {
  governance: 0xb068f8,
  treasury: 0x20d8c0,
  craft: 0xff9040,
  council: 0xf0b830,
  passive: 0xa888e8,
};

const VOTE_FOR = 0xd86018;
const VOTE_AGAINST = 0x7050b8;
const GOLD = 0xe8c050;
const LAMP = 0x9dff80;

export function SanctumThreeLayer({
  snapshot,
  ceremonies,
  shelving,
  selectedAgentId,
  labelsVisible,
  showDelegations,
  quality,
  zoom,
  pan,
  onInspectAgent,
  onHoverAgent,
  onSelectedAgentPosition,
  onVisualStats,
  onRendererError,
}: SanctumThreeLayerProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  const sceneDrawRef = useRef<VisualSceneDraw | null>(null);
  const runtimeRef = useRef<ThreeRuntime | null>(null);
  const hoverIdRef = useRef<string | null>(null);
  const qualityRef = useRef(quality);
  const [sceneDraw, setSceneDraw] = useState<VisualSceneDraw | null>(null);

  const ceremoniesPayload = useMemo(() => Array.from(ceremonies.entries()), [ceremonies]);
  const shelvingPayload = useMemo(() => Array.from(shelving.values()), [shelving]);
  const agentsPayload = useMemo(() => snapshot.agents.map(toVisualAgentInput), [snapshot.agents]);

  useEffect(() => {
    qualityRef.current = quality;
  }, [quality]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    try {
      const runtime = createRuntime(host);
      runtimeRef.current = runtime;
      let raf = 0;
      const frame = () => {
        renderRuntime(runtime, sceneDrawRef.current, qualityRef.current);
        const draw = sceneDrawRef.current;
        if (draw) {
          onVisualStats?.({
            ...draw.stats,
            renderer: 'three',
            drawCalls: runtime.renderer.info.render.calls,
            triangles: runtime.renderer.info.render.triangles,
            geometries: runtime.renderer.info.memory.geometries,
            textures: runtime.renderer.info.memory.textures,
          });
        }
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
      return () => {
        cancelAnimationFrame(raf);
        disposeRuntime(runtime);
        runtimeRef.current = null;
        onVisualStats?.(null);
      };
    } catch (error) {
      console.error('[SanctumThreeLayer] WebGL renderer failed', error);
      onRendererError?.();
      return undefined;
    }
  }, [onRendererError, onVisualStats]);

  useEffect(() => {
    const worker = new Worker(new URL('../../../lib/browser/visual-layout-worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent<VisualSceneDraw>) => {
      if (event.data.requestId < requestIdRef.current) return;
      sceneDrawRef.current = event.data;
      setSceneDraw(event.data);
    };
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const worker = workerRef.current;
    const host = hostRef.current;
    if (!worker || !host) return;
    const rect = host.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
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
      quality,
      zoom,
      viewport: getVisibleSceneBounds(rect.width, rect.height, zoom, pan),
    };
    worker.postMessage(request);
  }, [
    agentsPayload,
    ceremoniesPayload,
    labelsVisible,
    pan,
    quality,
    selectedAgentId,
    shelvingPayload,
    showDelegations,
    snapshot.blackSwan.active,
    snapshot.recentEvents,
    snapshot.step,
    zoom,
  ]);

  useEffect(() => {
    if (!selectedAgentId || !sceneDraw) {
      onSelectedAgentPosition?.(null);
      return;
    }
    const selected = sceneDraw.agents.find(agent => agent.id === selectedAgentId);
    onSelectedAgentPosition?.(selected ? { x: selected.x, y: selected.y } : null);
  }, [onSelectedAgentPosition, sceneDraw, selectedAgentId]);

  const pickAgent = useCallback((clientX: number, clientY: number) => {
    const runtime = runtimeRef.current;
    const host = hostRef.current;
    const draw = sceneDrawRef.current;
    if (!runtime || !host || !draw) return null;
    const rect = host.getBoundingClientRect();
    runtime.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    runtime.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    runtime.raycaster.setFromCamera(runtime.pointer, runtime.camera);
    const intersections = runtime.raycaster.intersectObjects(Object.values(runtime.agentMeshes), false);
    const hit = intersections.find(item => item.instanceId !== undefined);
    if (!hit || hit.instanceId === undefined) return null;
    const mesh = hit.object as THREE.InstancedMesh;
    const id = runtime.pickIds.get(mesh.uuid)?.[hit.instanceId] ?? null;
    return id ? draw.agents.find(agent => agent.id === id) ?? null : null;
  }, []);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const agent = pickAgent(event.clientX, event.clientY);
    const id = agent?.id ?? null;
    if (id === hoverIdRef.current) return;
    hoverIdRef.current = id;
    event.currentTarget.style.cursor = id ? 'pointer' : 'inherit';
    onHoverAgent?.(agent);
  }, [onHoverAgent, pickAgent]);

  const handlePointerLeave = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    hoverIdRef.current = null;
    event.currentTarget.style.cursor = 'inherit';
    onHoverAgent?.(null);
  }, [onHoverAgent]);

  const handleClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const agent = pickAgent(event.clientX, event.clientY);
    if (agent) onInspectAgent(agent.id);
  }, [onInspectAgent, pickAgent]);

  return (
    <div
      ref={hostRef}
      className="absolute inset-0 h-full w-full"
      aria-label="GPU-rendered agents and live simulation effects"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onClick={handleClick}
      style={{ pointerEvents: 'auto' }}
    />
  );
}

interface ThreeRuntime {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  raycaster: THREE.Raycaster;
  pointer: THREE.Vector2;
  agentMeshes: Record<VisualArchetype, THREE.InstancedMesh>;
  glowMesh: THREE.InstancedMesh;
  voteForMesh: THREE.InstancedMesh;
  voteAgainstMesh: THREE.InstancedMesh;
  eventMesh: THREE.InstancedMesh;
  delegationLines: THREE.LineSegments;
  stormLines: THREE.LineSegments;
  pickIds: Map<string, string[]>;
  lastWidth: number;
  lastHeight: number;
}

function createRuntime(host: HTMLDivElement): ThreeRuntime {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.domElement.className = 'h-full w-full';
  renderer.domElement.style.display = 'block';
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-500, 500, 320, -320, 1, 2000);
  camera.position.set(0, 0, 1000);
  const agentGeometry = new THREE.CircleGeometry(10, 18);
  const glowGeometry = new THREE.CircleGeometry(24, 24);
  const voteGeometry = new THREE.PlaneGeometry(7, 7);
  const eventGeometry = new THREE.RingGeometry(14, 22, 28);
  const pickIds = new Map<string, string[]>();
  const agentMeshes = Object.fromEntries(
    (Object.keys(ARCHETYPE_COLORS) as VisualArchetype[]).map(archetype => {
      const mesh = new THREE.InstancedMesh(
        agentGeometry,
        new THREE.MeshBasicMaterial({ color: ARCHETYPE_COLORS[archetype], transparent: true, opacity: 0.94 }),
        MAX_AGENTS
      );
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.count = 0;
      scene.add(mesh);
      pickIds.set(mesh.uuid, []);
      return [archetype, mesh];
    })
  ) as unknown as Record<VisualArchetype, THREE.InstancedMesh>;

  const glowMesh = new THREE.InstancedMesh(
    glowGeometry,
    new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false }),
    MAX_GLOWS
  );
  glowMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  glowMesh.count = 0;
  scene.add(glowMesh);

  const voteForMesh = new THREE.InstancedMesh(
    voteGeometry,
    new THREE.MeshBasicMaterial({ color: VOTE_FOR, transparent: true, opacity: 0.95, depthWrite: false }),
    MAX_VOTES
  );
  voteForMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  voteForMesh.count = 0;
  scene.add(voteForMesh);

  const voteAgainstMesh = new THREE.InstancedMesh(
    voteGeometry,
    new THREE.MeshBasicMaterial({ color: VOTE_AGAINST, transparent: true, opacity: 0.95, depthWrite: false }),
    MAX_VOTES
  );
  voteAgainstMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  voteAgainstMesh.count = 0;
  scene.add(voteAgainstMesh);

  const eventMesh = new THREE.InstancedMesh(
    eventGeometry,
    new THREE.MeshBasicMaterial({ color: LAMP, transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending, depthWrite: false }),
    MAX_EVENT_PARTICLES
  );
  eventMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  eventMesh.count = 0;
  scene.add(eventMesh);

  const delegationLines = new THREE.LineSegments(
    new THREE.BufferGeometry(),
    new THREE.LineBasicMaterial({ color: 0xe8c050, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending })
  );
  scene.add(delegationLines);

  const stormLines = new THREE.LineSegments(
    new THREE.BufferGeometry(),
    new THREE.LineBasicMaterial({ color: 0x20d8c0, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending })
  );
  scene.add(stormLines);

  return {
    renderer,
    scene,
    camera,
    raycaster: new THREE.Raycaster(),
    pointer: new THREE.Vector2(),
    agentMeshes,
    glowMesh,
    voteForMesh,
    voteAgainstMesh,
    eventMesh,
    delegationLines,
    stormLines,
    pickIds,
    lastWidth: 0,
    lastHeight: 0,
  };
}

function renderRuntime(runtime: ThreeRuntime, draw: VisualSceneDraw | null, quality: VisualQuality) {
  const canvas = runtime.renderer.domElement;
  const parent = canvas.parentElement;
  if (!parent) return;
  const rect = parent.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return;
  if (runtime.lastWidth !== rect.width || runtime.lastHeight !== rect.height) {
    resizeRuntime(runtime, rect.width, rect.height);
  }
  runtime.renderer.info.reset();
  if (draw) updateScene(runtime, draw, quality);
  runtime.renderer.render(runtime.scene, runtime.camera);
}

function resizeRuntime(runtime: ThreeRuntime, width: number, height: number) {
  runtime.lastWidth = width;
  runtime.lastHeight = height;
  runtime.renderer.setSize(width, height, false);
  const scale = Math.min(width / VIEWBOX.width, height / VIEWBOX.height);
  const worldWidth = width / scale;
  const worldHeight = height / scale;
  runtime.camera.left = -worldWidth / 2;
  runtime.camera.right = worldWidth / 2;
  runtime.camera.top = worldHeight / 2;
  runtime.camera.bottom = -worldHeight / 2;
  runtime.camera.updateProjectionMatrix();
}

function updateScene(runtime: ThreeRuntime, draw: VisualSceneDraw, quality: VisualQuality) {
  const grouped: Record<VisualArchetype, VisualAgentDraw[]> = {
    governance: [],
    treasury: [],
    craft: [],
    council: [],
    passive: [],
  };
  for (const agent of draw.agents.slice(0, MAX_AGENTS)) grouped[agent.archetype].push(agent);

  for (const archetype of Object.keys(runtime.agentMeshes) as VisualArchetype[]) {
    const mesh = runtime.agentMeshes[archetype];
    const ids: string[] = [];
    const agents = grouped[archetype].slice(0, MAX_AGENTS);
    mesh.count = agents.length;
    agents.forEach((agent, index) => {
      ids[index] = agent.id;
      const voteColor = agent.lastVote === true ? VOTE_FOR : agent.lastVote === false ? VOTE_AGAINST : ARCHETYPE_COLORS[agent.archetype];
      const scale = agent.simplified ? 0.72 : agent.highlighted ? 1.35 : 1;
      const bob = (agent.inCeremony || agent.isShelving ? Math.sin(draw.step * 0.8 + agent.idx) * 2 : Math.sin(draw.step * 0.05 + agent.idx) * 0.6);
      tempMatrix.compose(
        tempVector.set(agent.x, -agent.y - bob, zFor(agent)),
        tempQuaternion,
        tempScale.set(scale, scale, 1)
      );
      mesh.setMatrixAt(index, tempMatrix);
      mesh.setColorAt(index, tempColor.setHex(voteColor));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    runtime.pickIds.set(mesh.uuid, ids);
  }

  let glowCount = 0;
  for (const agent of draw.agents) {
    if (glowCount >= MAX_GLOWS) break;
    if (!agent.highlighted && !agent.recentVote && !agent.inCeremony && agent.influenceRank === 0) continue;
    const size = agent.highlighted ? 1.8 : agent.inCeremony ? 1.5 : 1 + agent.influenceRank * 0.12;
    tempMatrix.compose(
      tempVector.set(agent.x, -agent.y, -0.2),
      tempQuaternion,
      tempScale.set(size, size, 1)
    );
    runtime.glowMesh.setMatrixAt(glowCount, tempMatrix);
    glowCount += 1;
  }
  runtime.glowMesh.count = glowCount;
  runtime.glowMesh.instanceMatrix.needsUpdate = true;

  let forCount = 0;
  let againstCount = 0;
  for (const agent of draw.agents) {
    if (agent.lastVote === null) continue;
    const target = agent.lastVote ? runtime.voteForMesh : runtime.voteAgainstMesh;
    const index = agent.lastVote ? forCount++ : againstCount++;
    if (index >= MAX_VOTES) continue;
    tempMatrix.compose(
      tempVector.set(agent.x + 14, -agent.y - 10, 1.8),
      tempQuaternion,
      tempScale.set(agent.highlighted ? 1.2 : 0.95, agent.highlighted ? 1.2 : 0.95, 1)
    );
    target.setMatrixAt(index, tempMatrix);
  }
  runtime.voteForMesh.count = Math.min(forCount, MAX_VOTES);
  runtime.voteAgainstMesh.count = Math.min(againstCount, MAX_VOTES);
  runtime.voteForMesh.instanceMatrix.needsUpdate = true;
  runtime.voteAgainstMesh.instanceMatrix.needsUpdate = true;

  let eventCount = 0;
  if (quality !== 'low') {
    for (const event of draw.events) {
      if (eventCount >= MAX_EVENT_PARTICLES) break;
      const pulse = 1.1 + ((draw.step + eventCount) % 12) * 0.06;
      tempMatrix.compose(
        tempVector.set(event.x, -event.y, 0.6),
        tempQuaternion,
        tempScale.set(pulse, pulse, 1)
      );
      runtime.eventMesh.setMatrixAt(eventCount, tempMatrix);
      eventCount += 1;
    }
  }
  runtime.eventMesh.count = eventCount;
  runtime.eventMesh.instanceMatrix.needsUpdate = true;

  updateDelegationLines(runtime.delegationLines, draw, quality);
  updateStormLines(runtime.stormLines, draw, quality);
}

function updateDelegationLines(lines: THREE.LineSegments, draw: VisualSceneDraw, quality: VisualQuality) {
  if (quality === 'low') {
    lines.visible = false;
    return;
  }
  lines.visible = draw.delegations.length > 0;
  const positions: number[] = [];
  for (const edge of draw.delegations) {
    positions.push(edge.sx, -edge.sy, 0.2, edge.tx, -edge.ty, 0.2);
  }
  lines.geometry.dispose();
  lines.geometry = new THREE.BufferGeometry();
  lines.geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const material = lines.material as THREE.LineBasicMaterial;
  material.opacity = quality === 'medium' ? 0.32 : 0.48;
}

function updateStormLines(lines: THREE.LineSegments, draw: VisualSceneDraw, quality: VisualQuality) {
  if (!draw.blackSwanActive) {
    lines.visible = false;
    return;
  }
  lines.visible = true;
  const count = quality === 'low' ? 12 : quality === 'medium' ? 24 : 42;
  const positions: number[] = [];
  for (let i = 0; i < count; i++) {
    const x = ((i * 79 + draw.step * 17) % 1100) - 550;
    const y = ((i * 53 + draw.step * 31) % 760) - 340;
    positions.push(x, -y, 0.1, x - 5, -(y + 22), 0.1);
  }
  lines.geometry.dispose();
  lines.geometry = new THREE.BufferGeometry();
  lines.geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
}

function disposeRuntime(runtime: ThreeRuntime) {
  for (const mesh of Object.values(runtime.agentMeshes)) {
    mesh.geometry.dispose();
    disposeMaterial(mesh.material);
  }
  runtime.glowMesh.geometry.dispose();
  disposeMaterial(runtime.glowMesh.material);
  runtime.voteForMesh.geometry.dispose();
  runtime.voteAgainstMesh.geometry.dispose();
  disposeMaterial(runtime.voteForMesh.material);
  disposeMaterial(runtime.voteAgainstMesh.material);
  runtime.eventMesh.geometry.dispose();
  disposeMaterial(runtime.eventMesh.material);
  runtime.delegationLines.geometry.dispose();
  runtime.stormLines.geometry.dispose();
  disposeMaterial(runtime.delegationLines.material);
  disposeMaterial(runtime.stormLines.material);
  runtime.renderer.dispose();
  runtime.renderer.domElement.remove();
}

function disposeMaterial(material: THREE.Material | THREE.Material[]) {
  if (Array.isArray(material)) material.forEach(item => item.dispose());
  else material.dispose();
}

function getVisibleSceneBounds(width: number, height: number, zoom: number, pan: { x: number; y: number }) {
  if (zoom <= 1.05) return { ...VIEWBOX };
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

function zFor(agent: VisualAgentDraw) {
  if (agent.highlighted) return 3;
  if (agent.recentVote || agent.inCeremony) return 2;
  return agent.simplified ? 0.8 : 1.2;
}

const tempMatrix = new THREE.Matrix4();
const tempVector = new THREE.Vector3();
const tempQuaternion = new THREE.Quaternion();
const tempScale = new THREE.Vector3();
const tempColor = new THREE.Color();
