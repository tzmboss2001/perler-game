/**
 * RemovingScene - 去除钉板3D场景
 * 翻转后视角，垂直拖拽提起钉板
 */

import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/store/gameStore';
import { useSound } from '@/hooks/useSound';
import {
  calculateStuckBeads,
  updateRemovalState,
  finalizeRemoval,
} from '@/core/BoardRemovalEngine';
import type { Bead } from '@/types/game';
import InstancedBeads from './models/InstancedBeads';
import PegBoardModel from './models/PegBoardModel';
import { useRemoveGesture } from './hooks/useRemoveGesture';
import './Scene3D.css';

const CELL_SIZE = 0.5;

/** 被卡住跟着钉板升起的豆子 */
function StuckBeads({
  beads,
  stuckKeys,
  liftHeight,
  tiltAngle,
  cellSize,
  boardWidth,
  boardHeight,
}: {
  beads: Map<string, Bead>;
  stuckKeys: string[];
  liftHeight: number;
  tiltAngle: number;
  cellSize: number;
  boardWidth: number;
  boardHeight: number;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.y = liftHeight * cellSize * 8;
      groupRef.current.rotation.z = tiltAngle;
    }
  });

  const stuckBeadList = useMemo(() => {
    return stuckKeys
      .map((k) => beads.get(k))
      .filter((b): b is Bead => b !== undefined);
  }, [stuckKeys, beads]);

  if (stuckBeadList.length === 0) return null;

  return (
    <group ref={groupRef}>
      <InstancedBeads
        beads={stuckBeadList}
        cellSize={cellSize}
        boardWidth={boardWidth}
        boardHeight={boardHeight}
        flipped
      />
    </group>
  );
}

/** 场景内容 */
function SceneContent({
  beads,
  boardWidth,
  boardHeight,
  liftHeight,
  tiltAngle,
  stuckKeys,
  droppedKeys,
}: {
  beads: Map<string, Bead>;
  boardWidth: number;
  boardHeight: number;
  liftHeight: number;
  tiltAngle: number;
  stuckKeys: string[];
  droppedKeys: Set<string>;
}) {
  // 排除卡住和掉落的豆子
  const excludeKeys = useMemo(() => {
    const set = new Set(droppedKeys);
    // 卡住的豆子如果还跟着钉板就排除
    for (const k of stuckKeys) set.add(k);
    return set;
  }, [droppedKeys, stuckKeys]);

  const beadList = useMemo(() => Array.from(beads.values()), [beads]);

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 8, 5]} intensity={0.8} castShadow />

      {/* 豆子层（正面朝上，不动） */}
      <InstancedBeads
        beads={beadList}
        cellSize={CELL_SIZE}
        boardWidth={boardWidth}
        boardHeight={boardHeight}
        excludeKeys={excludeKeys}
        flipped
      />

      {/* 钉板（向上提起） */}
      <PegBoardModel
        boardWidth={boardWidth}
        boardHeight={boardHeight}
        cellSize={CELL_SIZE}
        liftHeight={liftHeight}
        tiltAngle={tiltAngle}
      />

      {/* 卡住跟着钉板的豆子 */}
      <StuckBeads
        beads={beads}
        stuckKeys={stuckKeys}
        liftHeight={liftHeight}
        tiltAngle={tiltAngle}
        cellSize={CELL_SIZE}
        boardWidth={boardWidth}
        boardHeight={boardHeight}
      />

      {/* 桌面 */}
      <mesh position={[0, -2, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <meshLambertMaterial color="#3a3a4e" />
      </mesh>
    </>
  );
}

export default function RemovingScene() {
  const {
    board,
    survivingBeads,
    droppedBeads: prevDropped,
    setPhase,
    setSurvivingBeads,
    setRemovalState: setStoreRemovalState,
    addStepRecord,
  } = useGameStore();
  const { failure: playStuckSound } = useSound();

  const containerRef = useRef<HTMLDivElement>(null);
  const [liftHeight, setLiftHeight] = useState(0);
  const [tiltAngle, setTiltAngle] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [showHint, setShowHint] = useState(true);

  // 使用存活的豆子
  const beads = survivingBeads || board.beads;

  // 计算卡住的豆子（只在首次渲染时计算）
  const stuckKeys = useMemo(() => {
    return calculateStuckBeads(beads, board.width, board.height);
  }, [beads, board.width, board.height]);

  const [pulledKeys, setPulledKeys] = useState<string[]>([]);
  const droppedKeys = useMemo(() => new Set(pulledKeys), [pulledKeys]);

  // 速度历史（用于平均速度计算）
  const speedHistoryRef = useRef<number[]>([]);
  const maxTiltRef = useRef(0);

  // 手势控制
  const removeGesture = useRemoveGesture({
    onStateChange: useCallback((height: number, tilt: number, speed: number) => {
      setLiftHeight(height);
      setTiltAngle(tilt);
      speedHistoryRef.current.push(speed);
      if (Math.abs(tilt) > maxTiltRef.current) {
        maxTiltRef.current = Math.abs(tilt);
      }
    }, []),

    onGestureEnd: useCallback(() => {
      if (liftHeight >= 0.8 && !completed) {
        setLiftHeight(1);
        setCompleted(true);

        // 最终判定
        const avgSpeed = speedHistoryRef.current.length > 0
          ? speedHistoryRef.current.reduce((a, b) => a + b, 0) / speedHistoryRef.current.length
          : 0;

        const result = finalizeRemoval(
          stuckKeys,
          beads,
          avgSpeed,
          maxTiltRef.current,
          board.width,
        );

        setPulledKeys(result.pulledKeys);
        if (result.pulledKeys.length > 0) {
          playStuckSound();
        }
      }
    }, [liftHeight, completed, stuckKeys, beads, board.width, playStuckSound]),
  });

  // 绑定手势
  useEffect(() => {
    if (containerRef.current) {
      return removeGesture.bindToElement(containerRef.current);
    }
  }, [removeGesture]);

  // 隐藏提示
  useEffect(() => {
    if (showHint) {
      const t = setTimeout(() => setShowHint(false), 4000);
      return () => clearTimeout(t);
    }
  }, [showHint]);

  const cameraDistance = Math.max(board.width, board.height) * CELL_SIZE * 1.2;

  // 下一步
  const handleNext = () => {
    // 更新存活豆子（排除被拉走的）
    const newSurviving = new Map<string, Bead>();
    for (const [key, bead] of beads) {
      if (!droppedKeys.has(key)) {
        newSurviving.set(key, bead);
      }
    }

    setSurvivingBeads(newSurviving);

    setStoreRemovalState({
      liftHeight: 1,
      tiltAngle,
      liftSpeed: 0,
      stuckBeadKeys: stuckKeys,
      pulledBeadKeys: pulledKeys,
      completed: true,
    });

    addStepRecord({
      step: 'removing',
      score: Math.round((1 - pulledKeys.length / Math.max(beads.size, 1)) * 100),
      detail: `去钉板完成，${stuckKeys.length}颗卡住，${pulledKeys.length}颗被带出`,
      beadsBefore: beads.size,
      beadsAfter: newSurviving.size,
    });

    setPhase('papering');
  };

  return (
    <div className="scene3d-container">
      <div className="scene3d-header">
        <span className="step-badge">步骤 4/6</span>
        <h2>去除钉板</h2>
        <span />
      </div>

      <div className="scene3d-canvas-wrap" ref={containerRef}>
        <Canvas
          camera={{
            position: [0, cameraDistance * 0.9, cameraDistance * 0.5],
            fov: 50,
            near: 0.1,
            far: 100,
          }}
          gl={{ antialias: false }}
          dpr={[1, 1.5]}
        >
          <SceneContent
            beads={beads}
            boardWidth={board.width}
            boardHeight={board.height}
            liftHeight={liftHeight}
            tiltAngle={tiltAngle}
            stuckKeys={stuckKeys}
            droppedKeys={droppedKeys}
          />
        </Canvas>

        {showHint && (
          <div className="scene3d-gesture-hint">
            向上慢慢拖拽提起钉板，尽量保持垂直
          </div>
        )}
      </div>

      {/* 信息栏 */}
      <div className="scene3d-info-bar">
        <div className="angle-indicator">
          <span>提起</span>
          <div className="angle-bar">
            <div className="angle-fill" style={{ width: `${liftHeight * 100}%` }} />
          </div>
          <span>{Math.round(liftHeight * 100)}%</span>
        </div>
        {stuckKeys.length > 0 && (
          <span style={{ color: '#f59e0b' }}>{stuckKeys.length}颗卡住</span>
        )}
        {pulledKeys.length > 0 && (
          <span className="dropped-count">带出 {pulledKeys.length} 颗</span>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="scene3d-actions">
        <button
          className="btn-next"
          onClick={handleNext}
          disabled={!completed}
        >
          {completed ? '下一步：铺烘焙纸' : '向上拖拽提起钉板'}
        </button>
      </div>
    </div>
  );
}
