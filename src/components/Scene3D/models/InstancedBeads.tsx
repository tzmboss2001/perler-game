/**
 * InstancedBeads - 批量拼豆渲染
 * 使用 InstancedMesh 实现 1 个 draw call 渲染所有豆子
 */

import { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import type { Bead } from '@/types/game';

interface InstancedBeadsProps {
  beads: Bead[];
  cellSize: number;
  boardWidth: number;
  boardHeight: number;
  /** 需要排除的豆子 key 列表（已掉落的） */
  excludeKeys?: Set<string>;
  /** 是否翻转显示（背面朝上） */
  flipped?: boolean;
}

/** 将 hex 颜色转为 THREE.Color */
function hexToColor(hex: string): THREE.Color {
  return new THREE.Color(hex);
}

export default function InstancedBeads({
  beads,
  cellSize,
  boardWidth,
  boardHeight,
  excludeKeys,
  flipped = false,
}: InstancedBeadsProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  // 过滤后的豆子列表
  const visibleBeads = useMemo(() => {
    if (!excludeKeys || excludeKeys.size === 0) return beads;
    return beads.filter((b) => !excludeKeys.has(`${b.x},${b.y}`));
  }, [beads, excludeKeys]);

  // 圆柱几何体：8 段圆柱（性能优化）
  const geometry = useMemo(() => {
    const r = cellSize * 0.4;
    const h = cellSize * 0.3;
    return new THREE.CylinderGeometry(r, r, h, 8);
  }, [cellSize]);

  const material = useMemo(() => {
    return new THREE.MeshLambertMaterial({
      color: 0xffffff, // 白色基底，instanceColor 负责着色
    });
  }, []);

  // 更新实例矩阵和颜色
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const centerX = (boardWidth * cellSize) / 2;
    const centerY = (boardHeight * cellSize) / 2;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    for (let i = 0; i < visibleBeads.length; i++) {
      const bead = visibleBeads[i];
      const x = bead.x * cellSize + cellSize / 2 - centerX;
      const z = bead.y * cellSize + cellSize / 2 - centerY;
      const y = flipped ? -cellSize * 0.15 : cellSize * 0.15;

      dummy.position.set(x, y, z);
      if (flipped) {
        dummy.rotation.set(Math.PI, 0, 0);
      } else {
        dummy.rotation.set(0, 0, 0);
      }
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      color.set(bead.color);
      mesh.setColorAt(i, color);
    }

    mesh.count = visibleBeads.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [visibleBeads, cellSize, boardWidth, boardHeight, flipped]);

  if (visibleBeads.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, visibleBeads.length]}
      castShadow
      receiveShadow
    />
  );
}
