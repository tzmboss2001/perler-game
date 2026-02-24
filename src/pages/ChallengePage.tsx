/**
 * ChallengePage - 挑战模式页面
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/gameStore';
import { useChallengeStore } from '@/store/challengeStore';
import { CHALLENGE_DIFFICULTY } from '@/data/challenges';
import type { ChallengeDef } from '@/data/challenges';
import { TEMPLATES } from '@/data/templates';
import './ChallengePage.css';

export default function ChallengePage() {
  const navigate = useNavigate();
  const { setBoardSize, setPhase, setTemplate } = useGameStore();
  const { dailyChallenges, weeklyChallenges, refreshChallenges, setActiveChallenge } = useChallengeStore();

  useEffect(() => {
    refreshChallenges();
  }, [refreshChallenges]);

  const handleStartChallenge = (challenge: ChallengeDef) => {
    // 设置挑战
    setActiveChallenge(challenge);

    // 设置画板
    const w = challenge.boardWidth || 15;
    const h = challenge.boardHeight || 15;
    setBoardSize(w, h);

    // 使用模板（如果指定）
    if (challenge.templateId) {
      const template = TEMPLATES.find((t) => t.id === challenge.templateId);
      if (template) {
        setTemplate(template);
        const store = useGameStore.getState();
        for (const bead of template.beads) {
          store.board.placeBead(bead.x, bead.y, bead.color, bead.colorId);
        }
      }
    } else {
      setTemplate(null);
      // 使用随机模板
      const randomTemplate = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)];
      setBoardSize(randomTemplate.width, randomTemplate.height);
      setTemplate(randomTemplate);
      const store = useGameStore.getState();
      for (const bead of randomTemplate.beads) {
        store.board.placeBead(bead.x, bead.y, bead.color, bead.colorId);
      }
    }

    // 直接进入熨烫阶段（挑战模式跳过放置）
    setPhase('ironing');
    navigate('/game');
  };

  const getDiffClass = (difficulty: string) => {
    if (difficulty === 'easy') return 'diff-easy';
    if (difficulty === 'medium') return 'diff-medium';
    return 'diff-hard';
  };

  const renderChallengeCard = (challenge: ChallengeDef, index: number) => {
    const diff = CHALLENGE_DIFFICULTY[challenge.difficulty];
    return (
      <div
        key={challenge.code}
        className="challenge-card"
        onClick={() => handleStartChallenge(challenge)}
      >
        <div className="challenge-card-header">
          <span className="challenge-card-icon">{challenge.icon}</span>
          <span className="challenge-card-index">#{index + 1}</span>
        </div>
        <h3 className="challenge-card-name">{challenge.name}</h3>
        <p className="challenge-card-desc">{challenge.description}</p>
        <div className="challenge-card-footer">
          <span
            className={`challenge-card-diff ${getDiffClass(challenge.difficulty)}`}
            style={{ color: diff.color }}
          >
            {diff.label}
          </span>
          <span className="challenge-card-score">
            {challenge.scoring.baseScore}分
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="challenge-page">
      {/* 头部 */}
      <div className="challenge-header">
        <button className="challenge-back-btn" onClick={() => navigate('/')}>
          ← 返回
        </button>
        <h2 className="challenge-page-title">挑战模式</h2>
      </div>

      {/* 每日挑战 */}
      <div className="challenge-section">
        <div className="challenge-section-header">
          <h3>每日挑战</h3>
          <span className="challenge-section-tag">每天更新</span>
        </div>
        {dailyChallenges.length > 0 ? (
          <div className="challenge-grid">
            {dailyChallenges.map((c, i) => renderChallengeCard(c, i))}
          </div>
        ) : (
          <div className="challenge-empty">
            <span className="challenge-empty-icon">🎯</span>
            <p>暂无每日挑战，请稍后再来</p>
          </div>
        )}
      </div>

      {/* 每周挑战 */}
      <div className="challenge-section">
        <div className="challenge-section-header">
          <h3>每周挑战</h3>
          <span className="challenge-section-tag weekly">高难度</span>
        </div>
        {weeklyChallenges.length > 0 ? (
          <div className="challenge-grid">
            {weeklyChallenges.map((c, i) => renderChallengeCard(c, i))}
          </div>
        ) : (
          <div className="challenge-empty">
            <span className="challenge-empty-icon">🔥</span>
            <p>暂无每周挑战，敬请期待</p>
          </div>
        )}
      </div>
    </div>
  );
}
