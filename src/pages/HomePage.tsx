import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/gameStore';
import { useUserStore } from '@/store/userStore';
import { LoginModal } from '@/components/LoginModal';
import { BOARD_SIZE_OPTIONS } from '@/types/game';
import type { TemplateCategory, Template } from '@/types/game';
import { TEMPLATES, TEMPLATE_CATEGORIES, DIFFICULTY_LABELS } from '@/data/templates';
import './HomePage.css';

/** 小型 Canvas 缩略图 */
function TemplateThumb({ template }: { template: Template }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 80;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    // 计算缩放
    const maxDim = Math.max(template.width, template.height);
    const cellSize = (size - 4) / maxDim;
    const offsetX = (size - template.width * cellSize) / 2;
    const offsetY = (size - template.height * cellSize) / 2;

    // 背景
    ctx.fillStyle = '#1a1a3e';
    ctx.fillRect(0, 0, size, size);

    // 绘制拼豆
    for (const bead of template.beads) {
      const cx = offsetX + bead.x * cellSize + cellSize / 2;
      const cy = offsetY + bead.y * cellSize + cellSize / 2;
      ctx.fillStyle = bead.color;
      ctx.beginPath();
      ctx.arc(cx, cy, cellSize * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [template]);

  return <canvas ref={canvasRef} className="template-thumb-canvas" />;
}

export default function HomePage() {
  const navigate = useNavigate();
  const { setBoardSize, setPhase, setTemplate } = useGameStore();
  const { isLoggedIn, userInfo, logout } = useUserStore();
  const [activeCategory, setActiveCategory] = useState<TemplateCategory | 'all'>('all');
  const [showLogin, setShowLogin] = useState(false);

  const handleFreeStart = (width: number, height: number) => {
    setBoardSize(width, height);
    setTemplate(null);
    setPhase('placing');
    navigate('/game');
  };

  const handleTemplateStart = useCallback((template: Template) => {
    setBoardSize(template.width, template.height);
    setTemplate(template);
    // 预加载模板拼豆到画板
    const store = useGameStore.getState();
    for (const bead of template.beads) {
      store.board.placeBead(bead.x, bead.y, bead.color, bead.colorId);
    }
    setPhase('placing');
    navigate('/game');
  }, [setBoardSize, setTemplate, setPhase, navigate]);

  const filteredTemplates = activeCategory === 'all'
    ? TEMPLATES
    : TEMPLATES.filter(t => t.category === activeCategory);

  return (
    <div className="home-page">
      {/* 顶部用户栏 */}
      <div className="home-user-bar">
        {isLoggedIn ? (
          <div className="user-info-bar">
            <span className="user-nickname">{userInfo?.nickname}</span>
            <button className="user-logout-btn" onClick={logout}>退出</button>
          </div>
        ) : (
          <button className="user-login-btn" onClick={() => setShowLogin(true)}>
            登录
          </button>
        )}
      </div>

      <div className="home-header">
        <h1 className="home-title">云拼豆</h1>
        <p className="home-subtitle">数字拼豆创作游戏</p>
        <p className="home-slogan">失败不是惩罚，是内容</p>
      </div>

      {/* 作品广场入口 */}
      <div className="section-card gallery-entry entry-gallery" onClick={() => navigate('/gallery')}>
        <div className="gallery-entry-content">
          <span className="gallery-entry-icon">🏛️</span>
          <div className="gallery-entry-text">
            <h3>作品广场</h3>
            <p>浏览社区作品 · 翻车排行榜</p>
          </div>
          <span className="gallery-entry-arrow">→</span>
        </div>
      </div>

      {/* 挑战模式入口 */}
      <div className="section-card gallery-entry entry-challenge" onClick={() => navigate('/challenge')}>
        <div className="gallery-entry-content">
          <span className="gallery-entry-icon">🎯</span>
          <div className="gallery-entry-text">
            <h3>挑战模式</h3>
            <p>每日挑战 · 限时限温 · 翻车目标</p>
          </div>
          <span className="gallery-entry-arrow">→</span>
        </div>
      </div>

      {/* 成就入口 */}
      <div className="section-card gallery-entry entry-achievement" onClick={() => navigate('/achievements')}>
        <div className="gallery-entry-content">
          <span className="gallery-entry-icon">🏆</span>
          <div className="gallery-entry-text">
            <h3>成就</h3>
            <p>收集成就徽章 · 查看统计</p>
          </div>
          <span className="gallery-entry-arrow">→</span>
        </div>
      </div>

      {/* 自由创作区域 */}
      <div className="section-card">
        <h2 className="section-title">自由创作</h2>
        <div className="size-options">
          {BOARD_SIZE_OPTIONS.map((option) => (
            <button
              key={option.label}
              className="size-btn"
              onClick={() => handleFreeStart(option.width, option.height)}
            >
              <span className="size-label">{option.label}</span>
              <span className="size-grid">{option.width * option.height} 格</span>
            </button>
          ))}
        </div>
      </div>

      {/* 使用模板区域 */}
      <div className="section-card template-section">
        <h2 className="section-title">使用模板</h2>

        {/* 分类标签 */}
        <div className="category-tabs">
          <button
            className={`category-tab ${activeCategory === 'all' ? 'active' : ''}`}
            onClick={() => setActiveCategory('all')}
          >
            全部
          </button>
          {TEMPLATE_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              className={`category-tab ${activeCategory === cat.id ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* 模板卡片网格 */}
        <div className="template-grid">
          {filteredTemplates.map(template => {
            const diff = DIFFICULTY_LABELS[template.difficulty];
            return (
              <button
                key={template.id}
                className="template-card"
                onClick={() => handleTemplateStart(template)}
              >
                <TemplateThumb template={template} />
                <span className="template-name">{template.name}</span>
                <span className="template-size">{template.width}x{template.height}</span>
                <span
                  className="template-difficulty"
                  style={{ color: diff.color }}
                >
                  {diff.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="home-footer">
        <p>选择模板或自由创作，完成后熨烫看看会发生什么吧！</p>
      </div>

      {/* 登录弹窗 */}
      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          onSuccess={() => setShowLogin(false)}
        />
      )}
    </div>
  );
}
