/**
 * useFlipGesture - 翻转手势 Hook
 * 水平拖拽控制翻转角度
 */

import { useRef, useCallback, useEffect } from 'react';

interface FlipGestureState {
  angle: number;
  angularVelocity: number;
  isGesturing: boolean;
}

interface UseFlipGestureOptions {
  onAngleChange: (angle: number, velocity: number, dt: number) => void;
  onGestureEnd: () => void;
  enabled?: boolean;
}

export function useFlipGesture(options: UseFlipGestureOptions) {
  const { onAngleChange, onGestureEnd, enabled = true } = options;

  const stateRef = useRef<FlipGestureState>({
    angle: 0,
    angularVelocity: 0,
    isGesturing: false,
  });

  const pointerRef = useRef<{
    startX: number;
    startY: number;
    lastX: number;
    lastTime: number;
    pointerId: number;
  } | null>(null);

  const handlePointerDown = useCallback((e: PointerEvent) => {
    if (!enabled) return;
    pointerRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastTime: performance.now(),
      pointerId: e.pointerId,
    };
    stateRef.current.isGesturing = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [enabled]);

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!pointerRef.current || !stateRef.current.isGesturing) return;

    const now = performance.now();
    const dt = (now - pointerRef.current.lastTime) / 1000;
    const deltaX = e.clientX - pointerRef.current.startX;

    // 水平拖拽距离映射到角度 (约 300px = 180度)
    const screenWidth = window.innerWidth;
    const sensitivity = 180 / (screenWidth * 0.6);
    const newAngle = Math.max(0, Math.min(180, deltaX * sensitivity));

    // 角速度计算
    const angleChange = Math.abs(newAngle - stateRef.current.angle);
    const velocity = dt > 0.001 ? (angleChange * Math.PI / 180) / dt : 0;

    stateRef.current.angle = newAngle;
    stateRef.current.angularVelocity = velocity;

    pointerRef.current.lastX = e.clientX;
    pointerRef.current.lastTime = now;

    onAngleChange(newAngle, velocity, dt);
  }, [onAngleChange]);

  const handlePointerUp = useCallback(() => {
    if (!stateRef.current.isGesturing) return;
    stateRef.current.isGesturing = false;
    pointerRef.current = null;
    onGestureEnd();
  }, [onGestureEnd]);

  // 挂载到 canvas 容器
  const bindToElement = useCallback((el: HTMLElement | null) => {
    if (!el) return;
    el.addEventListener('pointerdown', handlePointerDown);
    el.addEventListener('pointermove', handlePointerMove);
    el.addEventListener('pointerup', handlePointerUp);
    el.addEventListener('pointercancel', handlePointerUp);

    return () => {
      el.removeEventListener('pointerdown', handlePointerDown);
      el.removeEventListener('pointermove', handlePointerMove);
      el.removeEventListener('pointerup', handlePointerUp);
      el.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [handlePointerDown, handlePointerMove, handlePointerUp]);

  return {
    bindToElement,
    getState: () => stateRef.current,
    reset: () => {
      stateRef.current = { angle: 0, angularVelocity: 0, isGesturing: false };
      pointerRef.current = null;
    },
  };
}
