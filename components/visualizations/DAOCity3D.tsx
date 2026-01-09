'use client';

import { useRef, useMemo, useState, memo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Line } from '@react-three/drei';
import * as THREE from 'three';
import type { DAOCityNetworkData, DAOTowerData, InterDAOEdge } from '@/lib/types/dao-city';

interface DAOCity3DProps {
  data: DAOCityNetworkData;
  onDaoSelect?: (daoId: string | null) => void;
  selectedDaoId?: string | null;
}

interface DAOTowerProps {
  tower: DAOTowerData;
  isSelected: boolean;
  onClick: () => void;
}

// Individual DAO Tower component
const DAOTower = memo(function DAOTower({ tower, isSelected, onClick }: DAOTowerProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  // Animate tower on hover
  useFrame(() => {
    if (meshRef.current) {
      const targetScale = hovered || isSelected ? 1.1 : 1.0;
      meshRef.current.scale.lerp(
        new THREE.Vector3(targetScale, targetScale, targetScale),
        0.1
      );
    }
  });

  const towerHeight = Math.max(5, tower.height);
  const towerWidth = 4;
  const color = new THREE.Color(tower.color);

  return (
    <group position={tower.position}>
      {/* Base platform */}
      <mesh position={[0, -0.5, 0]}>
        <cylinderGeometry args={[towerWidth * 1.2, towerWidth * 1.5, 1, 8]} />
        <meshStandardMaterial color={color} opacity={0.3} transparent />
      </mesh>

      {/* Main tower */}
      <mesh
        ref={meshRef}
        position={[0, towerHeight / 2, 0]}
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[towerWidth, towerHeight, towerWidth]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered || isSelected ? 0.3 : 0.1}
        />
      </mesh>

      {/* Windows (floors) */}
      {Array.from({ length: Math.floor(towerHeight / 2) }).map((_, i) => (
        <mesh key={i} position={[0, i * 2 + 1, towerWidth / 2 + 0.01]}>
          <planeGeometry args={[towerWidth * 0.8, 1.5]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive="#88ccff"
            emissiveIntensity={0.5}
            opacity={0.8}
            transparent
          />
        </mesh>
      ))}

      {/* Roof/antenna */}
      <mesh position={[0, towerHeight + 1, 0]}>
        <coneGeometry args={[towerWidth / 3, 2, 4]} />
        <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
      </mesh>

      {/* DAO name label */}
      <Text
        position={[0, towerHeight + 4, 0]}
        fontSize={2}
        color={tower.color}
        anchorX="center"
        anchorY="bottom"
      >
        {tower.name}
      </Text>

      {/* Token symbol */}
      <Text
        position={[0, towerHeight + 2.5, 0]}
        fontSize={1}
        color="#888888"
        anchorX="center"
        anchorY="bottom"
      >
        ${tower.tokenSymbol}
      </Text>

      {/* Rank badge */}
      {tower.rank > 0 && tower.rank <= 3 && (
        <mesh position={[towerWidth / 2 + 1, towerHeight, 0]}>
          <sphereGeometry args={[0.8, 16, 16]} />
          <meshStandardMaterial
            color={tower.rank === 1 ? '#FFD700' : tower.rank === 2 ? '#C0C0C0' : '#CD7F32'}
            metalness={0.9}
            roughness={0.1}
          />
        </mesh>
      )}

      {/* Member count indicator (floating particles) */}
      {Array.from({ length: Math.min(tower.memberCount, 20) }).map((_, i) => {
        const angle = (i / 20) * Math.PI * 2;
        const radius = towerWidth + 1;
        const height = (i % 5) * 2 + 2;
        return (
          <mesh
            key={`member-${i}`}
            position={[
              Math.cos(angle) * radius,
              height,
              Math.sin(angle) * radius,
            ]}
          >
            <sphereGeometry args={[0.2, 8, 8]} />
            <meshStandardMaterial color={tower.color} emissive={tower.color} emissiveIntensity={0.5} />
          </mesh>
        );
      })}
    </group>
  );
});

// Inter-DAO connection line
const InterDAOConnection = memo(function InterDAOConnection({
  edge,
  towers,
}: {
  edge: InterDAOEdge;
  towers: DAOTowerData[];
}) {
  const fromTower = towers.find(t => t.daoId === edge.fromDaoId);
  const toTower = towers.find(t => t.daoId === edge.toDaoId);

  if (!fromTower || !toTower) return null;

  const fromPos = fromTower.position;
  const toPos = toTower.position;

  // Create an arc between towers
  const midHeight = Math.max(fromTower.height, toTower.height) + 10;
  const midPoint: [number, number, number] = [
    (fromPos[0] + toPos[0]) / 2,
    midHeight,
    (fromPos[2] + toPos[2]) / 2,
  ];

  const points = [
    new THREE.Vector3(fromPos[0], fromTower.height, fromPos[2]),
    new THREE.Vector3(midPoint[0], midPoint[1], midPoint[2]),
    new THREE.Vector3(toPos[0], toTower.height, toPos[2]),
  ];

  const curve = new THREE.QuadraticBezierCurve3(points[0], points[1], points[2]);
  const curvePoints = curve.getPoints(20);

  const lineColor = edge.type === 'bridge' ? '#60A5FA' :
                    edge.type === 'proposal' ? '#4ADE80' :
                    '#F472B6';

  return (
    <Line
      points={curvePoints}
      color={lineColor}
      lineWidth={edge.active ? 3 : 1}
      opacity={edge.active ? 0.8 : 0.3}
      transparent
      dashed={!edge.active}
      dashSize={edge.active ? 0 : 1}
      gapSize={edge.active ? 0 : 0.5}
    />
  );
});

// Ground plane with grid
function CityGround() {
  return (
    <group>
      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>

      {/* Grid lines */}
      {Array.from({ length: 21 }).map((_, i) => {
        const pos = (i - 10) * 10;
        return (
          <group key={`grid-${i}`}>
            <Line
              points={[[pos, -0.9, -100], [pos, -0.9, 100]]}
              color="#2a2a4e"
              lineWidth={0.5}
            />
            <Line
              points={[[-100, -0.9, pos], [100, -0.9, pos]]}
              color="#2a2a4e"
              lineWidth={0.5}
            />
          </group>
        );
      })}
    </group>
  );
}

// Central marketplace hub
function MarketplaceHub() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = clock.getElapsedTime() * 0.2;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Central platform */}
      <mesh position={[0, -0.5, 0]}>
        <cylinderGeometry args={[8, 10, 1, 32]} />
        <meshStandardMaterial color="#2a2a4e" metalness={0.5} roughness={0.5} />
      </mesh>

      {/* Rotating rings */}
      <mesh ref={meshRef} position={[0, 2, 0]}>
        <torusGeometry args={[6, 0.3, 16, 32]} />
        <meshStandardMaterial color="#4ADE80" emissive="#4ADE80" emissiveIntensity={0.3} />
      </mesh>

      <mesh position={[0, 4, 0]} rotation={[Math.PI / 3, 0, 0]}>
        <torusGeometry args={[4, 0.2, 16, 32]} />
        <meshStandardMaterial color="#60A5FA" emissive="#60A5FA" emissiveIntensity={0.3} />
      </mesh>

      {/* Label */}
      <Text
        position={[0, 8, 0]}
        fontSize={1.5}
        color="#ffffff"
        anchorX="center"
        anchorY="bottom"
      >
        Global Marketplace
      </Text>
    </group>
  );
}

// Scene content
function CityScene({ data, onDaoSelect, selectedDaoId }: DAOCity3DProps) {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <pointLight position={[50, 50, 50]} intensity={0.8} />
      <pointLight position={[-50, 50, -50]} intensity={0.5} />
      <directionalLight position={[0, 100, 0]} intensity={0.4} />

      {/* Ground */}
      <CityGround />

      {/* Central marketplace */}
      <MarketplaceHub />

      {/* DAO Towers */}
      {data.towers.map(tower => (
        <DAOTower
          key={tower.daoId}
          tower={tower}
          isSelected={selectedDaoId === tower.daoId}
          onClick={() => onDaoSelect?.(tower.daoId === selectedDaoId ? null : tower.daoId)}
        />
      ))}

      {/* Inter-DAO connections */}
      {data.interDaoEdges.map((edge, i) => (
        <InterDAOConnection
          key={`edge-${edge.fromDaoId}-${edge.toDaoId}-${i}`}
          edge={edge}
          towers={data.towers}
        />
      ))}

      {/* Camera controls */}
      <OrbitControls
        enablePan
        enableZoom
        enableRotate
        minDistance={30}
        maxDistance={200}
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI / 2 - 0.1}
      />
    </>
  );
}

// Stats overlay
function CityStats({ data }: { data: DAOCityNetworkData }) {
  const totalMembers = data.towers.reduce((sum, t) => sum + t.memberCount, 0);
  const totalTreasury = data.towers.reduce((sum, t) => sum + t.treasuryBalance, 0);
  const activeConnections = data.interDaoEdges.filter(e => e.active).length;

  return (
    <div className="absolute bottom-4 left-4 bg-gray-900/90 border border-gray-700 rounded-lg p-3 text-sm">
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        <div>
          <p className="text-gray-400 text-xs">DAOs</p>
          <p className="text-white font-bold">{data.towers.length}</p>
        </div>
        <div>
          <p className="text-gray-400 text-xs">Total Members</p>
          <p className="text-white font-bold">{totalMembers}</p>
        </div>
        <div>
          <p className="text-gray-400 text-xs">Treasury</p>
          <p className="text-green-400 font-bold">{totalTreasury.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-gray-400 text-xs">Active Links</p>
          <p className="text-blue-400 font-bold">{activeConnections}</p>
        </div>
      </div>
    </div>
  );
}

// Legend
function CityLegend() {
  return (
    <div className="absolute top-4 right-4 bg-gray-900/90 border border-gray-700 rounded-lg p-3 text-xs">
      <p className="text-gray-300 font-medium mb-2">Connections</p>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-blue-400"></div>
          <span className="text-gray-400">Token Bridge</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-green-400"></div>
          <span className="text-gray-400">Joint Proposal</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-pink-400"></div>
          <span className="text-gray-400">Member Transfer</span>
        </div>
      </div>
    </div>
  );
}

// Main component
export default function DAOCity3D({ data, onDaoSelect, selectedDaoId }: DAOCity3DProps) {
  if (!data || !data.towers || data.towers.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900 text-gray-400">
        <p>No DAO city data available</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative bg-gray-900">
      <Canvas
        camera={{ position: [80, 60, 80], fov: 50 }}
        gl={{ antialias: true }}
      >
        <CityScene data={data} onDaoSelect={onDaoSelect} selectedDaoId={selectedDaoId} />
      </Canvas>

      <CityStats data={data} />
      <CityLegend />

      {/* Title */}
      <div className="absolute top-4 left-4">
        <h2 className="text-xl font-bold text-white">DAO City</h2>
        <p className="text-sm text-gray-400">Multi-DAO Ecosystem</p>
      </div>
    </div>
  );
}
