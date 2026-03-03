'use client';

import { useMemo } from 'react';
import { Text } from '@react-three/drei';

interface Props {
  tokenPrice: number;
}

export function TokenPriceIndicator({ tokenPrice }: Props) {
  const height = useMemo(() => {
    return Math.max(0.5, Math.min(6, tokenPrice * 2));
  }, [tokenPrice]);

  const color = tokenPrice >= 1.0 ? '#22c55e' : '#ef4444';
  const label = `$${tokenPrice.toFixed(2)}`;

  return (
    <group position={[3, 0, 0]}>
      <mesh position={[0, height / 2, 0]}>
        <boxGeometry args={[0.4, height, 0.4]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.2}
          roughness={0.5}
          metalness={0.3}
        />
      </mesh>
      <Text
        position={[0, height + 0.4, 0]}
        fontSize={0.5}
        color={color}
        anchorX="center"
        anchorY="bottom"
        font={undefined}
      >
        {label}
      </Text>
      <Text
        position={[0, height + 1.0, 0]}
        fontSize={0.25}
        color="#9ca3af"
        anchorX="center"
        anchorY="bottom"
        font={undefined}
      >
        Token Price
      </Text>
    </group>
  );
}
