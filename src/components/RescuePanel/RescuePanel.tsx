/**
 * RescuePanel - 失败抢救面板
 * 翻车后的第二次机会操作界面
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/gameStore';
import { getRescueOption, executeRescue, applyRescueToBoard } from '@/core/RescueSystem';
import type { FailureType } from '@/types/game';
import './RescuePanel.css';

const FAILURE_ICONS: Record<string, string> = {
  undercooked: '🥶',
  partial_melt: '🫠',
  burned: '🔥',
  sticky: '🧲',
};

export default function RescuePanel() {
  const navigate = useNavigate();
  const { ironingResult, board, setPhase, setIroningResult, setResultSnapshot, triggerRender } = useGameStore();

  const failureType = ironingResult?.failureType as FailureType;
  const option = failureType ? getRescueOption(failureType) : null;

  const [rescuing, setRescuing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [completed, setCompleted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);

  // 交互状态
  const [interactionCount, setInteractionCount] = useState(0);
  const requiredInteractions = failureType === 'partial_melt' ? 8 : 5;

  // 清理定时器
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // 开始抢救操作
  const handleStartRescue = () => {
    if (!option) return;
    setRescuing(true);
    setProgress(0);
    setInteractionCount(0);
    startTimeRef.current = Date.now();

    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const p = Math.min(elapsed / option.duration, 1);
      setProgress(p);
      if (p >= 1) {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }, 50);
  };

  // 用户交互（点击/拖拽）
  const handleInteraction = () => {
    if (!rescuing || completed) return;
    setInteractionCount((prev) => prev + 1);
  };

  // 完成抢救
  const handleFinishRescue = useCallback(() => {
    if (!option || !ironingResult || completed) return;
    setCompleted(true);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // 计算完成度：基于时间进度和交互次数
    const timeCompletion = progress;
    const interactionCompletion = Math.min(interactionCount / requiredInteractions, 1);
    const completionRate = timeCompletion * 0.4 + interactionCompletion * 0.6;

    // 执行抢救
    const result = executeRescue(failureType, completionRate);

    // 应用抢救效果到画板
    applyRescueToBoard(board, failureType, completionRate);

    // 更新熨烫结果
    const updatedResult = {
      ...ironingResult,
      report: {
        ...ironingResult.report,
        score: result.newScore,
        title: result.success ? '抢救成功！' : ironingResult.report.title,
        description: result.description,
      },
    };
    setIroningResult(updatedResult);

    // 更新快照
    const snapshot = board.getAllBeads().map((b) => ({ ...b }));
    setResultSnapshot(snapshot, board.width, board.height);
    triggerRender();

    // 延迟跳转结果页
    setTimeout(() => {
      setPhase('result');
      navigate('/result');
    }, 1500);
  }, [option, ironingResult, completed, progress, interactionCount, requiredInteractions, failureType, board, setIroningResult, setResultSnapshot, triggerRender, setPhase, navigate]);

  // 时间到自动完成
  useEffect(() => {
    if (rescuing && progress >= 1 && !completed) {
      handleFinishRescue();
    }
  }, [rescuing, progress, completed, handleFinishRescue]);

  // 跳过抢救，直接到结果
  const handleSkip = () => {
    setPhase('result');
    navigate('/result');
  };

  if (!ironingResult || !option) {
    return null;
  }

  const icon = FAILURE_ICONS[failureType] || '❓';

  return (
    <div className="rescue-panel">
      <div className="rescue-card">
        {/* 标题区域 */}
        <div className="rescue-header">
          <span className="rescue-icon">{icon}</span>
          <h2 className="rescue-title">翻车了！要抢救吗？</h2>
          <p className="rescue-failure-type">{ironingResult.report.title}</p>
        </div>

        {/* 抢救方案 */}
        <div className="rescue-option-card">
          <h3 className="rescue-method">{option.method}</h3>
          <p className="rescue-operation">{option.operation}</p>
          <div className="rescue-score-limit">
            抢救后最高评分：<span>{option.maxScore}</span>分
          </div>
        </div>

        {/* 抢救操作区域 */}
        {rescuing && !completed && (
          <div className="rescue-action-area" onClick={handleInteraction}>
            {/* 进度条 */}
            <div className="rescue-progress-bar">
              <div
                className="rescue-progress-fill"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <div className="rescue-progress-text">
              {(progress * 100).toFixed(0)}%
            </div>

            {/* 交互区域 */}
            <div className="rescue-interaction-zone">
              {failureType === 'undercooked' && (
                <div className="rescue-hint">
                  <span className="rescue-hint-icon">🔥</span>
                  <span>快速点击加热！({interactionCount}/{requiredInteractions})</span>
                </div>
              )}
              {failureType === 'partial_melt' && (
                <div className="rescue-hint">
                  <span className="rescue-hint-icon">👆</span>
                  <span>点击补烫未融合区域！({interactionCount}/{requiredInteractions})</span>
                </div>
              )}
              {failureType === 'burned' && (
                <div className="rescue-hint">
                  <span className="rescue-hint-icon">❄️</span>
                  <span>快速点击降温！({interactionCount}/{requiredInteractions})</span>
                </div>
              )}
              {failureType === 'sticky' && (
                <div className="rescue-hint">
                  <span className="rescue-hint-icon">🤏</span>
                  <span>慢慢点击揭开！({interactionCount}/{requiredInteractions})</span>
                </div>
              )}
            </div>

            <button className="rescue-finish-btn" onClick={handleFinishRescue}>
              完成抢救
            </button>
          </div>
        )}

        {/* 完成后提示 */}
        {completed && (
          <div className="rescue-completed">
            <span className="rescue-completed-icon">
              {interactionCount >= requiredInteractions * 0.6 ? '✅' : '😢'}
            </span>
            <p>{ironingResult.report.description}</p>
            <p className="rescue-new-score">
              新评分：<span>{ironingResult.report.score}</span>分
            </p>
          </div>
        )}

        {/* 底部按钮 */}
        {!rescuing && !completed && (
          <div className="rescue-buttons">
            <button className="rescue-start-btn" onClick={handleStartRescue}>
              开始抢救
            </button>
            <button className="rescue-skip-btn" onClick={handleSkip}>
              算了，直接看结果
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
