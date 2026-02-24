/**
 * TapeModel - 胶带3D模型
 * 半透明平面几何体，渲染在豆子和钉板之间
 */

import { useMemo } from 'react';
import * as THREE from 'three';
import type { TapeStrip } from '@/types/game';

interface TapeModelProps {
  strips: TapeStrip[];
  cellSize: number;
  boardWidth: number;
  boardHeight: number;
  /** 翻转后胶带在上方 */
  flipped?: boolean;
}

export default function TapeModel({
  strips,
  cellSize,
  boardWidth,
  boardHeight,
  flipped = false,
}: TapeModelProps) {
  const centerX = (boardWidth * cellSize) / 2;
  const centerZ = (boardHeight * cellSize) / 2;
  const tapeY = flipped ? cellSize * 0.2 : cellSize * 0.35;

  const material = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: '#F5F0E0',
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
  }, []);

  return (
    <group>
      {strips.map((strip) => {
        const sx = strip.startX * cellSize - centerX;
        const sz = strip.startY * cellSize - centerZ;
        const ex = strip.endX * cellSize - centerX;
        const ez = strip.endY * cellSize - centerZ;

        const dx = ex - sx;
        const dz = ez - sz;
        const length = Math.sqrt(dx * dx + dz * dz);
        if (length < cellSize * 0.5) return null;

        const angle = Math.atan2(dz, dx);
        const midX = (sx + ex) / 2;
        const midZ = (sz + ez) / 2;
        const tapeWidth = strip.width * cellSize;

        return (
          <mesh
            key={strip.id}
            position={[midX, tapeY, midZ]}
            rotation={[-Math.PI / 2, 0, -angle]}
            material={material}
          >
            <planeGeometry args={[length, tapeWidth]} />
          </mesh>
        );
      })}
    </group>
  );
}
