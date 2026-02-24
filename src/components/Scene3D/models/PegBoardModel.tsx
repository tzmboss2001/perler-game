/**
 * PegBoardModel - 钉板3D模型
 * 简化的 BoxGeometry + 颜色/纹理
 */

import { useMemo } from 'react';
import * as THREE from 'three';

interface PegBoardModelProps {
  boardWidth: number;
  boardHeight: number;
  cellSize: number;
  /** 提起高度 0~1 */
  liftHeight?: number;
  /** 倾斜角度（弧度） */
  tiltAngle?: number;
  visible?: boolean;
}

export default function PegBoardModel({
  boardWidth,
  boardHeight,
  cellSize,
  liftHeight = 0,
  tiltAngle = 0,
  visible = true,
}: PegBoardModelProps) {
  const width = boardWidth * cellSize;
  const height = boardHeight * cellSize;
  const thickness = cellSize * 0.4;

  const pegPositions = useMemo(() => {
    const positions: [number, number, number][] = [];
    const cx = width / 2;
    const cy = height / 2;
    // 每 3 格放一个钉子（简化）
    for (let x = 0; x < boardWidth; x += 3) {
      for (let y = 0; y < boardHeight; y += 3) {
        const px = x * cellSize + cellSize / 2 - cx;
        const pz = y * cellSize + cellSize / 2 - cy;
        positions.push([px, thickness / 2 + cellSize * 0.15, pz]);
      }
    }
    return positions;
  }, [boardWidth, boardHeight, cellSize, width, height, thickness]);

  if (!visible) return null;

  const liftY = liftHeight * cellSize * 8;

  return (
    <group
      position={[0, liftY, 0]}
      rotation={[0, 0, tiltAngle]}
    >
      {/* 底板 */}
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[width + cellSize, thickness, height + cellSize]} />
        <meshLambertMaterial color="#e8e0d0" />
      </mesh>

      {/* 钉子（简化为小圆柱） */}
      {pegPositions.map((pos, i) => (
        <mesh key={i} position={pos} castShadow>
          <cylinderGeometry args={[cellSize * 0.06, cellSize * 0.06, cellSize * 0.3, 6]} />
          <meshLambertMaterial color="#c0b8a8" />
        </mesh>
      ))}
    </group>
  );
}
