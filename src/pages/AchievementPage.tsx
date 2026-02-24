/**
 * AchievementPage - 成就展示页面
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAchievementStore } from '@/store/achievementStore';
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_CATEGORIES,
  RARITY_LABELS,
} from '@/data/achievements';
import type { AchievementCategory } from '@/data/achievements';
import './AchievementPage.css';

export default function AchievementPage() {
  const navigate = useNavigate();
  const { unlockedIds, stats } = useAchievementStore();
  const [activeCategory, setActiveCategory] = useState<AchievementCategory | 'all'>('all');

  const unlockedSet = new Set(unlockedIds);
  const totalCount = ACHIEVEMENTS.length;
  const unlockedCount = unlockedIds.length;
  const progressPercent = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  const filtered = activeCategory === 'all'
    ? ACHIEVEMENTS
    : ACHIEVEMENTS.filter((a) => a.category === activeCategory);

  return (
    <div className="achievement-page">
      {/* 头部 */}
      <div className="achievement-header">
        <button className="achievement-back-btn" onClick={() => navigate('/')}>
          ← 返回
        </button>
        <h2 className="achievement-page-title">成就</h2>
      </div>

      {/* 总进度 */}
      <div className="achievement-progress-card">
        <div className="achievement-progress-info">
          <span className="achievement-progress-count">
            {unlockedCount}/{totalCount}
          </span>
          <span className="achievement-progress-percent">{progressPercent}%</span>
        </div>
        <div className="achievement-progress-bar">
          <div
            className="achievement-progress-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* 统计摘要 */}
      <div className="achievement-stats">
        <div className="stat-item">
          <span className="stat-value">{stats.total_works}</span>
          <span className="stat-label">作品</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{stats.total_crashes}</span>
          <span className="stat-label">翻车</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{stats.rescue_success_count}</span>
          <span className="stat-label">抢救</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{stats.challenge_complete_count}</span>
          <span className="stat-label">挑战</span>
        </div>
      </div>

      {/* 分类标签 */}
      <div className="achievement-category-tabs">
        <button
          className={`achievement-cat-tab ${activeCategory === 'all' ? 'active' : ''}`}
          onClick={() => setActiveCategory('all')}
        >
          全部
        </button>
        {ACHIEVEMENT_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            className={`achievement-cat-tab ${activeCategory === cat.id ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat.id)}
          >
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      {/* 成就列表 */}
      {filtered.length === 0 ? (
        <div className="achievement-empty">
          <span className="achievement-empty-icon">🏆</span>
          <p>暂无此分类的成就</p>
        </div>
      ) : null}
      <div className="achievement-list">
        {filtered.map((achievement) => {
          const unlocked = unlockedSet.has(achievement.id);
          const rarity = RARITY_LABELS[achievement.rarity];
          const statValue = stats[achievement.condition.stat as keyof typeof stats] ?? 0;
          const progress = Math.min(
            (statValue as number) / achievement.condition.threshold,
            1,
          );

          return (
            <div
              key={achievement.id}
              className={`achievement-item ${unlocked ? 'unlocked' : 'locked'}`}
            >
              <span className={`achievement-item-icon ${unlocked ? '' : 'locked-icon'}`}>
                {unlocked ? achievement.icon : '🔒'}
              </span>
              <div className="achievement-item-info">
                <div className="achievement-item-name">
                  {achievement.name}
                  <span
                    className="achievement-item-rarity"
                    style={{ color: rarity.color }}
                  >
                    {rarity.label}
                  </span>
                </div>
                <div className="achievement-item-desc">{achievement.description}</div>
                {!unlocked && (
                  <div className="achievement-item-progress">
                    <div className="achievement-mini-bar">
                      <div
                        className="achievement-mini-fill"
                        style={{
                          width: `${progress * 100}%`,
                          background: rarity.color,
                        }}
                      />
                    </div>
                    <span className="achievement-mini-text">
                      {statValue as number}/{achievement.condition.threshold}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
