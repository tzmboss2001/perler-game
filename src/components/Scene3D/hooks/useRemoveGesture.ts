/**
 * useRemoveGesture - 去钉板手势 Hook
 * 垂直拖拽控制提起高度，水平偏移控制倾斜角度
 */

import { useRef, useCallback } from 'react';

interface RemoveGestureState {
  liftHeight: number;
  tiltAngle: number;
  liftSpeed: number;
  isGesturing: boolean;
}

interface UseRemoveGestureOptions {
  onStateChange: (height: number, tilt: number, speed: number, dt: number) => void;
  onGestureEnd: () => void;
  enabled?: boolean;
}

export function useRemoveGesture(options: UseRemoveGestureOptions) {
  const { onStateChange, onGestureEnd, enabled = true } = options;

  const stateRef = useRef<RemoveGestureState>({
    liftHeight: 0,
    tiltAngle: 0,
    liftSpeed: 0,
    isGesturing: false,
  });

  const pointerRef = useRef<{
    startX: number;
    startY: number;
    lastY: number;
    lastTime: number;
  } | null>(null);

  const handlePointerDown = useCallback((e: PointerEvent) => {
    if (!enabled) return;
    pointerRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      lastY: e.clientY,
      lastTime: performance.now(),
    };
    stateRef.current.isGesturing = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [enabled]);

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!pointerRef.current || !stateRef.current.isGesturing) return;

    const now = performance.now();
    const dt = (now - pointerRef.current.lastTime) / 1000;

    // 向上拖拽 = 提起（deltaY 为负）
    const screenHeight = window.innerHeight;
    const deltaY = pointerRef.current.startY - e.clientY;
    const newHeight = Math.max(0, Math.min(1, deltaY / (screenHeight * 0.5)));

    // 水平偏移 = 倾斜
    const deltaX = e.clientX - pointerRef.current.startX;
    const maxTilt = Math.PI / 6; // 最大倾斜 30度
    const tiltAngle = (deltaX / (screenHeight * 0.3)) * maxTilt;

    // 提起速度
    const heightChange = Math.abs(newHeight - stateRef.current.liftHeight);
    const speed = dt > 0.001 ? heightChange / dt : 0;

    stateRef.current.liftHeight = newHeight;
    stateRef.current.tiltAngle = tiltAngle;
    stateRef.current.liftSpeed = speed;

    pointerRef.current.lastY = e.clientY;
    pointerRef.current.lastTime = now;

    onStateChange(newHeight, tiltAngle, speed, dt);
  }, [onStateChange]);

  const handlePointerUp = useCallback(() => {
    if (!stateRef.current.isGesturing) return;
    stateRef.current.isGesturing = false;
    pointerRef.current = null;
    onGestureEnd();
  }, [onGestureEnd]);

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
      stateRef.current = { liftHeight: 0, tiltAngle: 0, liftSpeed: 0, isGesturing: false };
      pointerRef.current = null;
    },
  };
}
