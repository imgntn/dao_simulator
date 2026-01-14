'use client';

import { useRef, useMemo, useState, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, RoundedBox, Float } from '@react-three/drei';
import * as THREE from 'three';

// Types
interface DAOMemberData {
  id: string;
  name?: string;
  activity: 'voting' | 'proposing' | 'discussing' | 'coding' | 'reviewing' | 'resting' | 'trading' | 'chatting';
  floor: number;
  reputation?: number;
  tokens?: number;
}

interface DAOTowerProps {
  members: DAOMemberData[];
  totalFloors?: number;
  onMemberClick?: (member: DAOMemberData) => void;
  onFloorClick?: (floor: number) => void;
  heightClassName?: string;
}

// Floor configuration
const FLOOR_CONFIG = {
  0: { name: 'Lobby', color: '#4ADE80', activity: 'chatting', icon: '🏛️' },
  1: { name: 'Treasury', color: '#FBBF24', activity: 'trading', icon: '💰' },
  2: { name: 'Governance', color: '#60A5FA', activity: 'voting', icon: '🗳️' },
  3: { name: 'Dev Hub', color: '#A78BFA', activity: 'coding', icon: '💻' },
  4: { name: 'Proposals', color: '#F472B6', activity: 'proposing', icon: '📝' },
  5: { name: 'Lounge', color: '#FB923C', activity: 'resting', icon: '☕' },
} as const;

// Cute pastel colors for members
const MEMBER_COLORS = [
  '#FFB5BA', // soft pink
  '#B5D8FF', // soft blue
  '#C5FFB5', // soft green
  '#FFE5B5', // soft orange
  '#E5B5FF', // soft purple
  '#B5FFF5', // soft cyan
  '#FFB5E5', // soft magenta
  '#FFF5B5', // soft yellow
];

// Activity animations
const ACTIVITY_ANIMATIONS: Record<string, { bobSpeed: number; bobHeight: number; rotateSpeed: number }> = {
  voting: { bobSpeed: 2, bobHeight: 0.05, rotateSpeed: 0 },
  proposing: { bobSpeed: 1.5, bobHeight: 0.08, rotateSpeed: 0.5 },
  discussing: { bobSpeed: 3, bobHeight: 0.03, rotateSpeed: 1 },
  coding: { bobSpeed: 4, bobHeight: 0.02, rotateSpeed: 0 },
  reviewing: { bobSpeed: 1, bobHeight: 0.04, rotateSpeed: 0.2 },
  resting: { bobSpeed: 0.5, bobHeight: 0.02, rotateSpeed: 0 },
  trading: { bobSpeed: 2.5, bobHeight: 0.06, rotateSpeed: 0.8 },
  chatting: { bobSpeed: 2, bobHeight: 0.04, rotateSpeed: 0.3 },
};

// Cute member character component
function MemberCharacter({
  member,
  position,
  color,
  onClick,
  isSelected,
}: {
  member: DAOMemberData;
  position: [number, number, number];
  color: string;
  onClick: () => void;
  isSelected: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const animation = ACTIVITY_ANIMATIONS[member.activity] || ACTIVITY_ANIMATIONS.resting;

  useFrame((state) => {
    if (!groupRef.current) return;

    // Cute bobbing animation
    const bob = Math.sin(state.clock.elapsedTime * animation.bobSpeed + position[0]) * animation.bobHeight;
    groupRef.current.position.y = position[1] + bob;

    // Gentle rotation for some activities
    if (animation.rotateSpeed > 0) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * animation.rotateSpeed) * 0.2;
    }

    // Scale up when hovered
    const targetScale = hovered || isSelected ? 1.2 : 1;
    groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
  });

  return (
    <group
      ref={groupRef}
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* Body - cute rounded blob */}
      <mesh castShadow>
        <capsuleGeometry args={[0.15, 0.1, 8, 16]} />
        <meshStandardMaterial
          color={color}
          roughness={0.4}
          metalness={0.1}
          emissive={color}
          emissiveIntensity={hovered || isSelected ? 0.3 : 0.1}
        />
      </mesh>

      {/* Face - simple and cute */}
      {/* Left eye */}
      <mesh position={[-0.05, 0.05, 0.14]}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshBasicMaterial color="#1a1a2e" />
      </mesh>
      {/* Right eye */}
      <mesh position={[0.05, 0.05, 0.14]}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshBasicMaterial color="#1a1a2e" />
      </mesh>
      {/* Blush marks */}
      <mesh position={[-0.1, -0.02, 0.13]}>
        <circleGeometry args={[0.025, 16]} />
        <meshBasicMaterial color="#FF9999" transparent opacity={0.5} />
      </mesh>
      <mesh position={[0.1, -0.02, 0.13]}>
        <circleGeometry args={[0.025, 16]} />
        <meshBasicMaterial color="#FF9999" transparent opacity={0.5} />
      </mesh>

      {/* Activity indicator - floating above head */}
      {hovered && (
        <Float speed={2} rotationIntensity={0} floatIntensity={0.5}>
          <Text
            position={[0, 0.35, 0]}
            fontSize={0.12}
            color="white"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.01}
            outlineColor="#333"
          >
            {member.activity}
          </Text>
        </Float>
      )}

      {/* Selection ring */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.15, 0]}>
          <ringGeometry args={[0.2, 0.25, 32]} />
          <meshBasicMaterial color="#FBBF24" transparent opacity={0.8} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

// Floor component with room-like appearance
function Floor({
  floorNumber,
  config,
  members,
  onMemberClick,
  onFloorClick,
  selectedMemberId,
  isHighlighted,
}: {
  floorNumber: number;
  config: (typeof FLOOR_CONFIG)[keyof typeof FLOOR_CONFIG];
  members: DAOMemberData[];
  onMemberClick: (member: DAOMemberData) => void;
  onFloorClick: () => void;
  selectedMemberId: string | null;
  isHighlighted: boolean;
}) {
  const floorY = floorNumber * 1.2;
  const [hovered, setHovered] = useState(false);

  // Distribute members across the floor
  const memberPositions = useMemo(() => {
    return members.map((member, i) => {
      const angle = (i / Math.max(members.length, 1)) * Math.PI * 2;
      const radius = 0.8 + Math.random() * 0.3;
      const x = Math.cos(angle) * radius * 0.6;
      const z = Math.sin(angle) * radius * 0.6;
      return {
        member,
        position: [x, floorY + 0.35, z] as [number, number, number],
        color: MEMBER_COLORS[i % MEMBER_COLORS.length],
      };
    });
  }, [members, floorY]);

  return (
    <group>
      {/* Floor base - rounded box for cozy feel */}
      <RoundedBox
        args={[3, 0.15, 2.5]}
        radius={0.05}
        smoothness={4}
        position={[0, floorY, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onFloorClick();
        }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color={config.color}
          roughness={0.8}
          metalness={0.1}
          emissive={config.color}
          emissiveIntensity={hovered || isHighlighted ? 0.2 : 0.05}
        />
      </RoundedBox>

      {/* Floor walls - glass-like for visibility */}
      <RoundedBox
        args={[3.1, 0.8, 2.6]}
        radius={0.1}
        smoothness={4}
        position={[0, floorY + 0.5, 0]}
      >
        <meshStandardMaterial
          color="white"
          transparent
          opacity={0.1}
          roughness={0.1}
          metalness={0.9}
        />
      </RoundedBox>

      {/* Floor label */}
      <Text
        position={[-1.6, floorY + 0.5, 0]}
        rotation={[0, Math.PI / 2, 0]}
        fontSize={0.15}
        color={config.color}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.005}
        outlineColor="#333"
      >
        {config.name}
      </Text>

      {/* Member count badge */}
      {members.length > 0 && (
        <group position={[1.6, floorY + 0.7, 0]}>
          <mesh>
            <circleGeometry args={[0.15, 32]} />
            <meshBasicMaterial color={config.color} />
          </mesh>
          <Text
            position={[0, 0, 0.01]}
            fontSize={0.12}
            color="white"
            anchorX="center"
            anchorY="middle"
          >
            {members.length}
          </Text>
        </group>
      )}

      {/* Render members on this floor */}
      {memberPositions.map(({ member, position, color }) => (
        <MemberCharacter
          key={member.id}
          member={member}
          position={position}
          color={color}
          onClick={() => onMemberClick(member)}
          isSelected={selectedMemberId === member.id}
        />
      ))}
    </group>
  );
}

// Decorative elements
function Decorations({ totalFloors }: { totalFloors: number }) {
  const buildingHeight = totalFloors * 1.2;

  return (
    <group>
      {/* Building base/ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[8, 8]} />
        <meshStandardMaterial color="#2D3748" roughness={0.9} />
      </mesh>

      {/* Cute cloud decorations */}
      {[...Array(5)].map((_, i) => (
        <Float key={i} speed={0.5 + i * 0.1} rotationIntensity={0} floatIntensity={0.3}>
          <group position={[(i - 2) * 2, buildingHeight + 1 + i * 0.5, -2 + i * 0.5]}>
            <mesh>
              <sphereGeometry args={[0.3, 16, 16]} />
              <meshStandardMaterial color="white" transparent opacity={0.7} />
            </mesh>
            <mesh position={[0.25, -0.05, 0]}>
              <sphereGeometry args={[0.2, 16, 16]} />
              <meshStandardMaterial color="white" transparent opacity={0.7} />
            </mesh>
            <mesh position={[-0.2, -0.05, 0]}>
              <sphereGeometry args={[0.22, 16, 16]} />
              <meshStandardMaterial color="white" transparent opacity={0.7} />
            </mesh>
          </group>
        </Float>
      ))}

      {/* Little trees around the building */}
      {[[-2.5, 0, 1.5], [2.5, 0, 1.5], [-2.5, 0, -1.5], [2.5, 0, -1.5]].map((pos, i) => (
        <group key={i} position={pos as [number, number, number]}>
          {/* Tree trunk */}
          <mesh position={[0, 0.2, 0]}>
            <cylinderGeometry args={[0.05, 0.08, 0.4, 8]} />
            <meshStandardMaterial color="#8B4513" />
          </mesh>
          {/* Tree top - cute round shape */}
          <mesh position={[0, 0.55, 0]}>
            <sphereGeometry args={[0.25, 16, 16]} />
            <meshStandardMaterial color="#22C55E" />
          </mesh>
        </group>
      ))}

      {/* Roof decoration */}
      <group position={[0, buildingHeight + 0.3, 0]}>
        <mesh>
          <coneGeometry args={[0.3, 0.5, 4]} />
          <meshStandardMaterial color="#F472B6" />
        </mesh>
        <Float speed={2} rotationIntensity={0.5} floatIntensity={0.2}>
          <mesh position={[0, 0.4, 0]}>
            <sphereGeometry args={[0.1, 16, 16]} />
            <meshStandardMaterial color="#FBBF24" emissive="#FBBF24" emissiveIntensity={0.5} />
          </mesh>
        </Float>
      </group>
    </group>
  );
}

// Main tower scene
function TowerScene({
  members,
  totalFloors,
  onMemberClick,
  onFloorClick,
  selectedMemberId,
  highlightedFloor,
}: {
  members: DAOMemberData[];
  totalFloors: number;
  onMemberClick: (member: DAOMemberData) => void;
  onFloorClick: (floor: number) => void;
  selectedMemberId: string | null;
  highlightedFloor: number | null;
}) {
  // Group members by floor
  const membersByFloor = useMemo(() => {
    const grouped: Record<number, DAOMemberData[]> = {};
    for (let i = 0; i < totalFloors; i++) {
      grouped[i] = [];
    }
    members.forEach((member) => {
      const floor = Math.min(member.floor, totalFloors - 1);
      if (!grouped[floor]) grouped[floor] = [];
      grouped[floor].push(member);
    });
    return grouped;
  }, [members, totalFloors]);

  return (
    <>
      {/* Lighting - warm and cozy */}
      <ambientLight intensity={0.4} color="#FFF5E6" />
      <directionalLight
        position={[5, 10, 5]}
        intensity={0.8}
        color="#FFFAF0"
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <pointLight position={[-3, 5, -3]} intensity={0.3} color="#FFE4C4" />
      <pointLight position={[3, 3, 3]} intensity={0.2} color="#E6E6FA" />

      {/* Background color */}
      <color attach="background" args={['#1a1a2e']} />

      {/* Decorations */}
      <Decorations totalFloors={totalFloors} />

      {/* Floors */}
      {[...Array(totalFloors)].map((_, i) => {
        const config = FLOOR_CONFIG[i as keyof typeof FLOOR_CONFIG] || FLOOR_CONFIG[0];
        return (
          <Floor
            key={i}
            floorNumber={i}
            config={config}
            members={membersByFloor[i] || []}
            onMemberClick={onMemberClick}
            onFloorClick={() => onFloorClick(i)}
            selectedMemberId={selectedMemberId}
            isHighlighted={highlightedFloor === i}
          />
        );
      })}

      {/* Camera controls */}
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.2}
        minDistance={5}
        maxDistance={15}
      />
    </>
  );
}

// Selected member detail panel
function MemberDetailPanel({
  member,
  onClose,
}: {
  member: DAOMemberData;
  onClose: () => void;
}) {
  const floorConfig = FLOOR_CONFIG[member.floor as keyof typeof FLOOR_CONFIG] || FLOOR_CONFIG[0];

  return (
    <div className="absolute top-4 right-4 w-64 bg-gray-900/95 border border-gray-700 rounded-xl p-4 shadow-xl z-10">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
            style={{ backgroundColor: floorConfig.color + '33' }}
          >
            {floorConfig.icon}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white truncate">
              {member.name || member.id.substring(0, 12)}
            </h4>
            <p className="text-xs text-gray-400">{floorConfig.name}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors p-1"
          aria-label="Close member details"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Activity</span>
          <span className="capitalize px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: floorConfig.color + '33', color: floorConfig.color }}>
            {member.activity}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Floor</span>
          <span className="text-white">{member.floor} - {floorConfig.name}</span>
        </div>
        {member.reputation !== undefined && (
          <div className="flex justify-between">
            <span className="text-gray-400">Reputation</span>
            <span className="text-white">{member.reputation.toFixed(1)}</span>
          </div>
        )}
        {member.tokens !== undefined && (
          <div className="flex justify-between">
            <span className="text-gray-400">Tokens</span>
            <span className="text-white">{member.tokens.toFixed(1)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Floor legend component
function FloorLegend({
  totalFloors,
  memberCounts,
  highlightedFloor,
  onFloorHover,
}: {
  totalFloors: number;
  memberCounts: Record<number, number>;
  highlightedFloor: number | null;
  onFloorHover: (floor: number | null) => void;
}) {
  return (
    <div className="absolute bottom-4 left-4 bg-gray-900/90 border border-gray-700 rounded-lg p-3 z-10">
      <h4 className="text-xs font-semibold text-gray-400 mb-2">Floors</h4>
      <div className="space-y-1">
        {[...Array(totalFloors)].reverse().map((_, idx) => {
          const i = totalFloors - 1 - idx;
          const config = FLOOR_CONFIG[i as keyof typeof FLOOR_CONFIG] || FLOOR_CONFIG[0];
          const count = memberCounts[i] || 0;
          const isHighlighted = highlightedFloor === i;

          return (
            <button
              key={i}
              className={`
                flex items-center gap-2 w-full px-2 py-1 rounded text-left text-xs transition-all
                ${isHighlighted ? 'bg-white/10' : 'hover:bg-white/5'}
              `}
              onMouseEnter={() => onFloorHover(i)}
              onMouseLeave={() => onFloorHover(null)}
            >
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: config.color }}
              />
              <span className="text-white flex-1">{config.name}</span>
              <span className="text-gray-400">{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Loading skeleton
export function TowerSkeleton({ heightClassName }: { heightClassName?: string }) {
  const heightClass = heightClassName ?? 'h-[clamp(320px,60vh,560px)]';
  return (
    <div className={`w-full ${heightClass} bg-gray-800 rounded-lg flex items-center justify-center`}>
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-gray-700 border-t-pink-500 animate-spin" />
        <p className="text-gray-400 text-sm">Building the DAO tower...</p>
        <p className="text-gray-500 text-xs mt-1">Getting everyone settled in</p>
      </div>
    </div>
  );
}

// Empty state
function EmptyState({ heightClassName }: { heightClassName: string }) {
  return (
    <div className={`w-full ${heightClassName} bg-gray-800 rounded-lg flex items-center justify-center`}>
      <div className="text-center px-4">
        <div className="text-6xl mb-4">🏢</div>
        <p className="text-gray-400 text-sm">No members in the tower yet</p>
        <p className="text-gray-500 text-xs mt-1">Start a simulation to see members move in!</p>
      </div>
    </div>
  );
}

// Main component
export function DAOTower({
  members,
  totalFloors = 6,
  onMemberClick,
  onFloorClick,
  heightClassName,
}: DAOTowerProps) {
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [highlightedFloor, setHighlightedFloor] = useState<number | null>(null);
  const heightClass = heightClassName ?? 'h-[clamp(320px,60vh,560px)]';

  const selectedMember = useMemo(
    () => members.find(m => m.id === selectedMemberId) || null,
    [members, selectedMemberId]
  );

  const memberCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    members.forEach(m => {
      const floor = Math.min(m.floor, totalFloors - 1);
      counts[floor] = (counts[floor] || 0) + 1;
    });
    return counts;
  }, [members, totalFloors]);

  const handleMemberClick = useCallback((member: DAOMemberData) => {
    setSelectedMemberId(prev => prev === member.id ? null : member.id);
    onMemberClick?.(member);
  }, [onMemberClick]);

  const handleFloorClick = useCallback((floor: number) => {
    setHighlightedFloor(prev => prev === floor ? null : floor);
    onFloorClick?.(floor);
  }, [onFloorClick]);

  if (members.length === 0) {
    return <EmptyState heightClassName={heightClass} />;
  }

  return (
    <div className={`w-full ${heightClass} bg-gray-900 rounded-lg relative overflow-hidden`}>
      <Canvas
        shadows
        camera={{ position: [6, 5, 6], fov: 50 }}
        dpr={[1, 2]}
      >
        <TowerScene
          members={members}
          totalFloors={totalFloors}
          onMemberClick={handleMemberClick}
          onFloorClick={handleFloorClick}
          selectedMemberId={selectedMemberId}
          highlightedFloor={highlightedFloor}
        />
      </Canvas>

      {/* Title */}
      <div className="absolute top-4 left-4 z-10">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <span>🏢</span> DAO Tower
        </h3>
        <p className="text-xs text-gray-400">{members.length} members across {totalFloors} floors</p>
      </div>

      {/* Floor legend */}
      <FloorLegend
        totalFloors={totalFloors}
        memberCounts={memberCounts}
        highlightedFloor={highlightedFloor}
        onFloorHover={setHighlightedFloor}
      />

      {/* Selected member panel */}
      {selectedMember && (
        <MemberDetailPanel
          member={selectedMember}
          onClose={() => setSelectedMemberId(null)}
        />
      )}

      {/* Instructions */}
      <div className="absolute bottom-4 right-4 text-xs text-gray-500 bg-gray-900/80 px-2 py-1 rounded">
        Drag to rotate • Scroll to zoom • Click members
      </div>

      {/* Screen reader summary */}
      <div className="sr-only" role="status">
        DAO Tower visualization showing {members.length} members across {totalFloors} floors.
        {selectedMember && `Selected member: ${selectedMember.name || selectedMember.id}, on floor ${selectedMember.floor}, activity: ${selectedMember.activity}.`}
      </div>
    </div>
  );
}

export default DAOTower;
