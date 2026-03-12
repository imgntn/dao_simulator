'use client';

import { Text, Billboard } from '@react-three/drei';
import { FLOORS } from './constants';

interface Props {
  /** Optionally show agent count per floor */
  floorCounts?: Map<string, number>;
}

export function FloorLabels({ floorCounts }: Props) {
  return (
    <group>
      {FLOORS.map(floor => {
        const y = floor.yBase + floor.height / 2;
        const count = floorCounts?.get(floor.id);
        const label = count !== undefined
          ? `${floor.id}: ${floor.name} (${count})`
          : `${floor.id}: ${floor.name}`;

        return (
          <Billboard key={floor.id} position={[0, y, 0]} lockX lockZ>
            <Text
              fontSize={0.25}
              color={floor.color}
              anchorX="center"
              anchorY="middle"
              font={undefined}
            >
              {label}
            </Text>
          </Billboard>
        );
      })}
    </group>
  );
}
