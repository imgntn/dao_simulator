'use client';

import { Text } from '@react-three/drei';
import { FLOORS, BUILDING } from './constants';

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
          <group key={floor.id}>
            {/* Label on the front face */}
            <Text
              position={[0, y, BUILDING.depth / 2 + 0.2]}
              fontSize={0.25}
              color={floor.color}
              anchorX="center"
              anchorY="middle"
              font={undefined}
            >
              {label}
            </Text>

            {/* Label on the back face */}
            <Text
              position={[0, y, -(BUILDING.depth / 2 + 0.2)]}
              fontSize={0.25}
              color={floor.color}
              anchorX="center"
              anchorY="middle"
              rotation={[0, Math.PI, 0]}
              font={undefined}
            >
              {label}
            </Text>
          </group>
        );
      })}
    </group>
  );
}
