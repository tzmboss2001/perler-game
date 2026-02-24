/**
 * FlippingScene - 翻转钉板3D场景
 * 手势驱动翻转，实时掉落判定
 */

import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/store/gameStore';
import { useSound } from '@/hooks/useSound';
import {
  createFlipState,
  calculateDroppedBeads,
  finalizeFlip,
  createDropAnimation,
  type DropAnimation,
} from '@/core/FlippingEngine';
import type { Bead, FlipState } from '@/types/game';
import InstancedBeads from './models/InstancedBeads';
import PegBoardModel from './models/PegBoardModel';
import TapeModel from './models/TapeModel';
import { useFlipGesture } from './hooks/useFlipGesture';
import './Scene3D.css';

const CELL_SIZE = 0.5; // 3D 空间中每格的尺寸

/** 掉落豆子动画组件 */
function DroppingBeads({
  animations,
  cellSize,
}: {
  animations: DropAnimation[];
  cellSize: number;
}) {
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const timeRef = useRef(0);

  useFrame((_, delta) => {
    timeRef.current += delta;
    for (let i = 0; i < animations.length; i++) {
      const mesh = meshRefs.current[i];
      if (!mesh) continue;
      const anim = animations[i];
      const t = timeRef.current;

      // 抛物线运动
      mesh.position.x = anim.startX * cellSize + anim.velocityX * t;
      mesh.position.y = -0.5 * 9.8 * t * t + anim.velocityY * t * 0.3;
      mesh.position.z = anim.startY * cellSize;
      mesh.rotation.x += anim.rotation * delta;
      mesh.rotation.z += anim.rotation * delta * 0.7;

      // 低于一定高度后隐藏
      if (mesh.position.y < -10) {
        mesh.visible = false;
      }
    }
  });

  return (
    <>
      {animations.map((anim, i) => (
        <mesh
          key={anim.key}
          ref={(el) => { meshRefs.current[i] = el; }}
          position={[
            anim.startX * cellSize,
            0,
            anim.startY * cellSize,
          ]}
        >
          <cylinderGeometry args={[cellSize * 0.4, cellSize * 0.4, cellSize * 0.3, 8]} />
          <meshLambertMaterial color="#aaa" />
        </mesh>
      ))}
    </>
  );
}

/** 翻转组（钉板 + 豆子 + 胶带一起翻转） */
function FlipGroup({
  angle,
  beads,
  boardWidth,
  boardHeight,
  droppedKeys,
  tapeStrips,
}: {
  angle: number;
  beads: Bead[];
  boardWidth: number;
  boardHeight: number;
  droppedKeys: Set<string>;
  tapeStrips: { id: string; startX: number; startY: number; endX: number; endY: number; width: number; pressure: number }[];
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (groupRef.current) {
      // 绕 X 轴翻转（前后翻转）
      groupRef.current.rotation.x = -(angle * Math.PI) / 180;
    }
  });

  return (
    <group ref={groupRef}>
      <PegBoardModel
        boardWidth={boardWidth}
        boardHeight={boardHeight}
        cellSize={CELL_SIZE}
      />
      <InstancedBeads
        beads={beads}
        cellSize={CELL_SIZE}
        boardWidth={boardWidth}
        boardHeight={boardHeight}
        excludeKeys={droppedKeys}
      />
      <TapeModel
        strips={tapeStrips}
        cellSize={CELL_SIZE}
        boardWidth={boardWidth}
        boardHeight={boardHeight}
      />
    </group>
  );
}

/** 场景内容 */
function SceneContent({
  angle,
  beads,
  boardWidth,
  boardHeight,
  droppedKeys,
  dropAnimations,
  tapeStrips,
}: {
  angle: number;
  beads: Bead[];
  boardWidth: number;
  boardHeight: number;
  droppedKeys: Set<string>;
  dropAnimations: DropAnimation[];
  tapeStrips: { id: string; startX: number; startY: number; endX: number; endY: number; width: number; pressure: number }[];
}) {
  return (
    <>
      {/* 灯光 */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 8, 5]} intensity={0.8} castShadow />

      {/* 相机初始位置在 Canvas 的 camera prop 设置 */}

      {/* 翻转组 */}
      <FlipGroup
        angle={angle}
        beads={beads}
        boardWidth={boardWidth}
        boardHeight={boardHeight}
        droppedKeys={droppedKeys}
        tapeStrips={tapeStrips}
      />

      {/* 掉落的豆子动画 */}
      {dropAnimations.length > 0 && (
        <DroppingBeads animations={dropAnimations} cellSize={CELL_SIZE} />
      )}

      {/* 地板 */}
      <mesh position={[0, -8, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <meshLambertMaterial color="#2a2a3e" />
      </mesh>
    </>
  );
}

export default function FlippingScene() {
  const {
    board,
    tapingResult,
    setPhase,
    setFlipState: setStoreFlipState,
    setSurvivingBeads,
    setDroppedBeads: setStoreDroppedBeads,
    addStepRecord,
  } = useGameStore();
  const { failure: playDropSound } = useSound();

  const containerRef = useRef<HTMLDivElement>(null);
  const [angle, setAngle] = useState(0);
  const [flipCompleted, setFlipCompleted] = useState(false);
  const [droppedKeys, setDroppedKeys] = useState<Set<string>>(new Set());
  const [dropAnimations, setDropAnimations] = useState<DropAnimation[]>([]);
  const [showHint, setShowHint] = useState(true);

  const beads = useMemo(() => Array.from(board.beads.values()), [board.beads]);
  const tapeStrips = tapingResult?.strips ?? [];

  // 手势控制
  const flipGesture = useFlipGesture({
    onAngleChange: useCallback((newAngle: number, velocity: number, dt: number) => {
      setAngle(newAngle);

      // 实时掉落判定
      if (tapingResult && newAngle > 30) {
        const newDropped = calculateDroppedBeads(
          newAngle,
          velocity,
          tapingResult,
          board.beads,
          board.width,
          board.height,
          droppedKeys,
        );

        if (newDropped.length > 0) {
          setDroppedKeys((prev) => {
            const next = new Set(prev);
            for (const k of newDropped) next.add(k);
            return next;
          });

          // 创建掉落动画
          const newAnims = newDropped.map((key) => {
            const [x, y] = key.split(',').map(Number);
            return createDropAnimation(key, x, y, newAngle, velocity, board.width);
          });
          setDropAnimations((prev) => [...prev, ...newAnims]);
          playDropSound();
        }
      }
    }, [tapingResult, board, droppedKeys, playDropSound]),

    onGestureEnd: useCallback(() => {
      // 如果角度接近 180°，自动完成
      if (angle >= 150 && !flipCompleted) {
        setAngle(180);
        setFlipCompleted(true);

        // 最终掉落计算
        if (tapingResult) {
          const finalDropped = finalizeFlip(
            tapingResult,
            board.beads,
            flipGesture.getState().angularVelocity,
            droppedKeys,
          );
          if (finalDropped.length > 0) {
            setDroppedKeys((prev) => {
              const next = new Set(prev);
              for (const k of finalDropped) next.add(k);
              return next;
            });
            playDropSound();
          }
        }
      }
    }, [angle, flipCompleted, tapingResult, board, droppedKeys, playDropSound]),
  });

  // 绑定手势
  useEffect(() => {
    if (containerRef.current) {
      return flipGesture.bindToElement(containerRef.current);
    }
  }, [flipGesture]);

  // 隐藏提示
  useEffect(() => {
    if (showHint) {
      const t = setTimeout(() => setShowHint(false), 4000);
      return () => clearTimeout(t);
    }
  }, [showHint]);

  // 相机位置
  const cameraDistance = Math.max(board.width, board.height) * CELL_SIZE * 1.2;

  // 下一步
  const handleNext = () => {
    // 计算存活豆子
    const surviving = new Map<string, Bead>();
    for (const [key, bead] of board.beads) {
      if (!droppedKeys.has(key)) {
        surviving.set(key, bead);
      }
    }

    setSurvivingBeads(surviving);
    setStoreDroppedBeads(Array.from(droppedKeys));
    setStoreFlipState({
      angle: 180,
      angularVelocity: 0,
      completed: true,
      droppedBeadKeys: Array.from(droppedKeys),
    });

    addStepRecord({
      step: 'flipping',
      score: Math.round((1 - droppedKeys.size / Math.max(board.beads.size, 1)) * 100),
      detail: `翻转完成，掉落 ${droppedKeys.size} 颗豆子`,
      beadsBefore: board.beads.size,
      beadsAfter: surviving.size,
    });

    setPhase('removing');
  };

  return (
    <div className="scene3d-container">
      <div className="scene3d-header">
        <span className="step-badge">步骤 3/6</span>
        <h2>翻转钉板</h2>
        <span />
      </div>

      <div className="scene3d-canvas-wrap" ref={containerRef}>
        <Canvas
          camera={{
            position: [0, cameraDistance * 0.8, cameraDistance * 0.6],
            fov: 50,
            near: 0.1,
            far: 100,
          }}
          gl={{ antialias: false }} // 移动端关闭抗锯齿
          dpr={[1, 1.5]}
        >
          <SceneContent
            angle={angle}
            beads={beads}
            boardWidth={board.width}
            boardHeight={board.height}
            droppedKeys={droppedKeys}
            dropAnimations={dropAnimations}
            tapeStrips={tapeStrips}
          />
        </Canvas>

        {showHint && (
          <div className="scene3d-gesture-hint">
            向右滑动翻转钉板，慢慢翻防止豆子掉落
          </div>
        )}
      </div>

      {/* 信息栏 */}
      <div className="scene3d-info-bar">
        <div className="angle-indicator">
          <span>翻转</span>
          <div className="angle-bar">
            <div className="angle-fill" style={{ width: `${(angle / 180) * 100}%` }} />
          </div>
          <span>{Math.round(angle)}°</span>
        </div>
        {droppedKeys.size > 0 && (
          <span className="dropped-count">掉落 {droppedKeys.size} 颗</span>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="scene3d-actions">
        <button
          className="btn-next"
          onClick={handleNext}
          disabled={!flipCompleted}
        >
          {flipCompleted ? '下一步：去钉板' : '翻转至180°继续'}
        </button>
      </div>
    </div>
  );
}
