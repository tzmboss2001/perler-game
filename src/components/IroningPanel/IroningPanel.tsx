/**
 * IroningPanel - 熨烫控制面板
 * 温度滑块、熨烫按钮、时间显示、实时风险提示
 */

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/gameStore';
import { useAchievementStore } from '@/store/achievementStore';
import { useChallengeStore } from '@/store/challengeStore';
import { IroningSystem } from '@/core/IroningSystem';
import { BeadBoard } from '@/core/BeadBoard';
import { canRescue } from '@/core/RescueSystem';
import { scoreChallengeResult } from '@/core/ChallengeScoring';
import { useSound } from '@/hooks/useSound';
import './IroningPanel.css';

// 温度描述
const TEMP_LABELS: Record<number, string> = {
  1: '微温', 2: '低温', 3: '偏低',
  4: '中低', 5: '适中', 6: '最佳',
  7: '偏高', 8: '高温', 9: '很高', 10: '极热',
};

const TEMP_COLORS: Record<number, string> = {
  1: '#5b9bd5', 2: '#6bc5e8', 3: '#7dd87d',
  4: '#a8d86b', 5: '#d8d86b', 6: '#5cd85c',
  7: '#e8c44a', 8: '#e89b4a', 9: '#e8694a', 10: '#e84a4a',
};

export default function IroningPanel() {
  const navigate = useNavigate();
  const board = useGameStore((s) => s.board);
  const survivingBeads = useGameStore((s) => s.survivingBeads);
  const addStepRecord = useGameStore((s) => s.addStepRecord);
  const setPhase = useGameStore((s) => s.setPhase);
  const setIroningResult = useGameStore((s) => s.setIroningResult);
  const setResultSnapshot = useGameStore((s) => s.setResultSnapshot);
  const triggerRender = useGameStore((s) => s.triggerRender);
  const rescueUsed = useGameStore((s) => s.rescueUsed);

  // 使用存活豆子构建临时画板（经过翻转/去钉板后的豆子）
  const ironingBoard = useMemo(() => {
    const tmpBoard = new BeadBoard(board.width, board.height);
    const beads = survivingBeads || board.beads;
    for (const [key, bead] of beads) {
      tmpBoard.beads.set(key, { ...bead });
    }
    return tmpBoard;
  }, [board, survivingBeads]);

  const paperCoverage = useGameStore((s) => s.paperCoverage);
  const activeChallenge = useChallengeStore((s) => s.activeChallenge);
  const setChallengeResult = useChallengeStore((s) => s.setChallengeResult);

  const sound = useSound();

  // 挑战模式约束
  const isChallenge = !!activeChallenge;
  const fixedTemp = activeChallenge?.constraints.fixedTemp;
  const timeLimit = activeChallenge?.constraints.timeLimit;

  const [temperature, setTemperature] = useState(fixedTemp || 5);
  const [isIroning, setIsIroning] = useState(false);
  const [duration, setDuration] = useState(0);
  const [trajectory, setTrajectory] = useState<{ x: number; y: number }[]>([]);

  const ironingRef = useRef(new IroningSystem());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDraggingRef = useRef(false);

  // 更新温度
  const handleTempChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const temp = parseInt(e.target.value);
    setTemperature(temp);
    ironingRef.current.setTemperature(temp);
  };

  // 开始熨烫
  const handleStartIroning = () => {
    const sys = ironingRef.current;
    const actualTemp = fixedTemp || temperature;
    sys.setTemperature(actualTemp);
    // 传入前置步骤数据
    const originalCount = board.beads.size;
    const currentCount = ironingBoard.count;
    const lossRate = originalCount > 0 ? 1 - currentCount / originalCount : 0;
    sys.setPreStepData(paperCoverage, lossRate);
    setTemperature(actualTemp);
    sys.start();
    setIsIroning(true);
    setDuration(0);
    setTrajectory([]);
    sound.startIroning();

    timerRef.current = setInterval(() => {
      const t = sys.updateTime();
      setDuration(t);
    }, 100);
  };

  // 完成熨烫
  const handleFinishIroning = useCallback(() => {
    const sys = ironingRef.current;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // 停止熨烫音效
    sound.stopIroning();

    // 执行熨烫，应用失败效果到画板（使用存活豆子的临时画板）
    const result = sys.finish(ironingBoard);
    setIsIroning(false);
    setIroningResult(result);

    // 播放成功/失败音效 + 记录成就统计
    if (result.success) {
      sound.success();
      useAchievementStore.getState().recordWork(result.report.score);
      // 3秒内完成 = 手速之王
      if (result.report.score >= 80 && sys.duration <= 3) {
        useAchievementStore.getState().recordFastIroning();
      }
    } else {
      sound.failure();
      if (result.failureType) {
        useAchievementStore.getState().recordCrash(result.failureType);
      }
    }

    // 保存带失败效果的拼豆快照（用于结果页可视化）
    const snapshot = ironingBoard.getAllBeads().map((b) => ({ ...b }));
    setResultSnapshot(snapshot, ironingBoard.width, ironingBoard.height);

    // 记录熨烫步骤
    addStepRecord({
      step: 'ironing',
      score: result.report.score,
      detail: result.success ? '熨烫成功!' : `熨烫失败: ${result.report.title}`,
      beadsBefore: ironingBoard.count,
      beadsAfter: ironingBoard.count,
    });
    triggerRender();

    // 挑战模式：计算挑战结果
    if (isChallenge && activeChallenge) {
      const challengeRes = scoreChallengeResult(activeChallenge, result, sys.duration);
      setChallengeResult(challengeRes);
      if (challengeRes.passed) {
        useAchievementStore.getState().recordChallengeComplete();
      }
      // 挑战模式不进入抢救
      setPhase('result');
      navigate('/result');
      return;
    }

    // 失败且可抢救且未使用过抢救 → 进入抢救阶段
    if (!result.success && !rescueUsed && canRescue(result.failureType)) {
      setPhase('rescuing');
      return;
    }

    // 跳转结果页
    setPhase('result');
    navigate('/result');
  }, [ironingBoard, setIroningResult, setResultSnapshot, setPhase, navigate, triggerRender, sound, rescueUsed, isChallenge, activeChallenge, setChallengeResult, addStepRecord]);

  // 返回上一阶段（铺烘焙纸）
  const handleBack = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setPhase('papering');
  };

  // 自动停止（超过限时或15秒）
  const maxDuration = timeLimit || 15;
  useEffect(() => {
    if (isIroning && duration >= maxDuration) {
      handleFinishIroning();
    }
  }, [duration, isIroning, handleFinishIroning, maxDuration]);

  // 熨斗轨迹绘制 - 在小画布上拖拽
  const handleTrajectoryStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isIroning) return;
    isDraggingRef.current = true;
    addPoint(e);
  };

  const handleTrajectoryMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDraggingRef.current || !isIroning) return;
    addPoint(e);
  };

  const handleTrajectoryEnd = () => {
    isDraggingRef.current = false;
  };

  const addPoint = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    let clientX: number, clientY: number;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = ((clientX - rect.left) / rect.width) * ironingBoard.width;
    const y = ((clientY - rect.top) / rect.height) * ironingBoard.height;

    ironingRef.current.addTrajectoryPoint(x, y);
    setTrajectory((prev) => [...prev, { x, y }]);
  };

  // 绘制轨迹预览
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // 背景
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fillRect(0, 0, w, h);

    // 画板网格轮廓
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(2, 2, w - 4, h - 4);

    // 绘制简化的拼豆位置
    const cellW = (w - 4) / ironingBoard.width;
    const cellH = (h - 4) / ironingBoard.height;
    for (const bead of ironingBoard.beads.values()) {
      const bx = 2 + bead.x * cellW + cellW / 2;
      const by = 2 + bead.y * cellH + cellH / 2;
      ctx.fillStyle = bead.color;
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.arc(bx, by, Math.max(cellW * 0.3, 1.5), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // 绘制轨迹线
    if (trajectory.length > 1) {
      ctx.strokeStyle = `rgba(255, 150, 50, 0.8)`;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      const firstPt = trajectory[0];
      ctx.moveTo(2 + (firstPt.x / ironingBoard.width) * (w - 4), 2 + (firstPt.y / ironingBoard.height) * (h - 4));
      for (let i = 1; i < trajectory.length; i++) {
        const pt = trajectory[i];
        ctx.lineTo(2 + (pt.x / ironingBoard.width) * (w - 4), 2 + (pt.y / ironingBoard.height) * (h - 4));
      }
      ctx.stroke();

      // 热力效果
      ctx.strokeStyle = `rgba(255, 200, 100, 0.3)`;
      ctx.lineWidth = 8;
      ctx.stroke();
    }

    // 提示文字
    if (!isIroning) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('点击「开始熨烫」', w / 2, h / 2 - 6);
      ctx.fillText('然后在此区域拖动熨斗', w / 2, h / 2 + 10);
    } else if (trajectory.length === 0) {
      ctx.fillStyle = 'rgba(255, 200, 100, 0.6)';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('在这里拖动熨斗！', w / 2, h / 2);
    }
  }, [trajectory, isIroning, ironingBoard]);

  // cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const tempLabel = TEMP_LABELS[temperature] || '';
  const tempColor = TEMP_COLORS[temperature] || '#ddd';

  return (
    <div className="ironing-panel">
      <div className="ironing-header">
        <button className="ironing-back-btn" onClick={handleBack}>
          ← {isChallenge ? '放弃挑战' : '返回铺纸'}
        </button>
        <h3>{isChallenge ? `挑战: ${activeChallenge?.name}` : '熨烫控制'}</h3>
      </div>

      {/* 挑战提示 */}
      {isChallenge && activeChallenge && (
        <div className="challenge-hint-bar">
          <span>{activeChallenge.icon}</span>
          <span>{activeChallenge.description}</span>
        </div>
      )}

      {/* 温度控制 */}
      <div className="temp-control">
        <div className="temp-label-row">
          <span>温度{fixedTemp ? '（锁定）' : ''}</span>
          <span className="temp-value" style={{ color: tempColor }}>
            {temperature} - {tempLabel}
          </span>
        </div>
        <input
          type="range"
          min="1"
          max="10"
          value={temperature}
          onChange={handleTempChange}
          className="temp-slider"
          disabled={isIroning || !!fixedTemp}
          style={{
            background: `linear-gradient(to right, #5b9bd5, #5cd85c, #e84a4a)`,
          }}
        />
        <div className="temp-marks">
          <span>1</span><span>5</span><span>10</span>
        </div>
      </div>

      {/* 时间显示 */}
      <div className="time-display">
        <span>时间{timeLimit ? ` (限${timeLimit}s)` : ''}</span>
        <span className="time-value">{duration.toFixed(1)}s</span>
        <div className="time-bar">
          <div
            className="time-fill"
            style={{
              width: `${Math.min(duration / maxDuration * 100, 100)}%`,
              backgroundColor: duration > maxDuration * 0.8 ? '#e84a4a' : duration > maxDuration * 0.5 ? '#e8c44a' : '#5cd85c',
            }}
          />
        </div>
      </div>

      {/* 轨迹区域 */}
      <div className="trajectory-area">
        <canvas
          ref={canvasRef}
          width={240}
          height={240}
          className="trajectory-canvas"
          onMouseDown={handleTrajectoryStart}
          onMouseMove={handleTrajectoryMove}
          onMouseUp={handleTrajectoryEnd}
          onMouseLeave={handleTrajectoryEnd}
          onTouchStart={handleTrajectoryStart}
          onTouchMove={handleTrajectoryMove}
          onTouchEnd={handleTrajectoryEnd}
        />
      </div>

      {/* 操作按钮 */}
      <div className="ironing-actions">
        {!isIroning ? (
          <button className="start-ironing-btn" onClick={handleStartIroning}>
            开始熨烫
          </button>
        ) : (
          <button className="finish-ironing-btn" onClick={handleFinishIroning}>
            停止熨烫（{duration.toFixed(1)}s）
          </button>
        )}
      </div>
    </div>
  );
}
