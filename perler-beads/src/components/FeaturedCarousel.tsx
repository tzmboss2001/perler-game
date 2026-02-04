import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Fire, Play } from '@phosphor-icons/react';
import { colors, radius, typography, shadows, animation } from '../styles/designSystem';

// 精选作品数据接口
export interface FeaturedWork {
  id: string;
  title: string;
  imageUrl: string;        // 作品图片
  author?: string;         // 作者（可选，官方作品无作者）
  beadCount: number;       // 珠子数量
  gridSize: string;        // 网格尺寸，如 "29x29"
  difficulty: 'easy' | 'medium' | 'hard';
  isOfficial: boolean;     // 是否官方作品
  category: string;        // 分类
}

interface FeaturedCarouselProps {
  works: FeaturedWork[];
  autoPlayInterval?: number;  // 自动播放间隔，默认 3000ms
  onWorkClick?: (work: FeaturedWork) => void;
}

const FeaturedCarousel: React.FC<FeaturedCarouselProps> = ({
  works,
  autoPlayInterval = 3000,
  onWorkClick,
}) => {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchEndX, setTouchEndX] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // 难度标签配置
  const difficultyConfig = {
    easy: { label: '简单', color: colors.bead.green },
    medium: { label: '中等', color: colors.bead.yellow },
    hard: { label: '困难', color: colors.bead.red },
  };

  // 自动播放
  useEffect(() => {
    if (!isAutoPlaying || works.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % works.length);
    }, autoPlayInterval);

    return () => clearInterval(timer);
  }, [isAutoPlaying, works.length, autoPlayInterval]);

  // 处理触摸滑动
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsAutoPlaying(false);
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    const diff = touchStartX - touchEndX;
    const threshold = 50;

    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        // 左滑 - 下一个
        setCurrentIndex((prev) => (prev + 1) % works.length);
      } else {
        // 右滑 - 上一个
        setCurrentIndex((prev) => (prev - 1 + works.length) % works.length);
      }
    }

    // 恢复自动播放
    setTimeout(() => setIsAutoPlaying(true), 5000);
  };

  // 点击指示器
  const handleDotClick = (index: number) => {
    setIsAutoPlaying(false);
    setCurrentIndex(index);
    setTimeout(() => setIsAutoPlaying(true), 5000);
  };

  // 点击作品
  const handleWorkClick = useCallback((work: FeaturedWork) => {
    if (onWorkClick) {
      onWorkClick(work);
    } else {
      // 默认行为：跳转到模板详情页
      navigate(`/mobile/template/${work.id}`);
    }
  }, [navigate, onWorkClick]);

  if (works.length === 0) return null;

  const currentWork = works[currentIndex];

  return (
    <div style={styles.container}>
      {/* 标题 */}
      <div style={styles.header}>
        <div style={styles.titleWrapper}>
          <Fire size={18} weight="fill" style={{ color: colors.bead.orange }} />
          <span style={styles.title}>精选作品</span>
        </div>
      </div>

      {/* 轮播区域 */}
      <div
        ref={containerRef}
        style={styles.carouselWrapper}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          style={{
            ...styles.carouselTrack,
            transform: `translateX(-${currentIndex * 100}%)`,
          }}
        >
          {works.map((work) => (
            <div
              key={work.id}
              style={styles.slide}
              onClick={() => handleWorkClick(work)}
            >
              <div style={styles.card}>
                {/* 作品图片 */}
                <div style={styles.imageWrapper}>
                  <img
                    src={work.imageUrl}
                    alt={work.title}
                    style={styles.image}
                  />
                  {/* 难度标签 */}
                  <div
                    style={{
                      ...styles.difficultyBadge,
                      background: `linear-gradient(145deg, ${difficultyConfig[work.difficulty].color}, ${difficultyConfig[work.difficulty].color}dd)`,
                      boxShadow: `0 2px 8px ${difficultyConfig[work.difficulty].color}50`,
                    }}
                  >
                    {difficultyConfig[work.difficulty].label}
                  </div>
                  {/* 官方标签 */}
                  {work.isOfficial && (
                    <div style={styles.officialBadge}>官方</div>
                  )}
                  {/* 点击提示 */}
                  <div style={styles.clickHint}>
                    <Play size={14} weight="fill" />
                    <span>点击查看</span>
                  </div>
                </div>

                {/* 作品信息 */}
                <div style={styles.info}>
                  <h3 style={styles.workTitle}>{work.title}</h3>
                  <div style={styles.meta}>
                    <span style={styles.metaItem}>{work.gridSize}</span>
                    <span style={styles.metaDot}>·</span>
                    <span style={styles.metaItem}>{work.beadCount} 颗珠子</span>
                    {work.author && (
                      <>
                        <span style={styles.metaDot}>·</span>
                        <span style={styles.metaItem}>by {work.author}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 指示器 */}
      {works.length > 1 && (
        <div style={styles.dots}>
          {works.map((_, index) => (
            <button
              key={index}
              style={{
                ...styles.dot,
                ...(index === currentIndex ? styles.dotActive : {}),
              }}
              onClick={() => handleDotClick(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    marginBottom: '24px',
  },

  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px',
  },

  titleWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },

  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyAlt,
    background: colors.gradients.primary,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },

  carouselWrapper: {
    overflow: 'hidden',
    borderRadius: radius.card,
  },

  carouselTrack: {
    display: 'flex',
    transition: `transform ${animation.duration.normal} ${animation.easing.default}`,
  },

  slide: {
    flex: '0 0 100%',
    minWidth: '100%',
  },

  card: {
    background: colors.bg.card,
    borderRadius: radius.card,
    border: `1px solid ${colors.border.soft}`,
    boxShadow: shadows.card,
    overflow: 'hidden',
  },

  imageWrapper: {
    position: 'relative',
    width: '100%',
    height: '200px',
    overflow: 'hidden',
    background: '#1a1b2e',  // 深色背景，让拼豆图案更突出
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  image: {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',  // 完整显示，不裁剪
    imageRendering: 'pixelated',  // 像素化渲染，更清晰
  },

  difficultyBadge: {
    position: 'absolute',
    top: '12px',
    left: '12px',
    padding: '4px 10px',
    borderRadius: radius.full,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    color: '#ffffff',
  },

  officialBadge: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    padding: '4px 10px',
    borderRadius: radius.full,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    color: '#ffffff',
    background: `linear-gradient(145deg, ${colors.bead.purple}, ${colors.bead.blue})`,
    boxShadow: `0 2px 8px ${colors.bead.purple}50`,
  },

  clickHint: {
    position: 'absolute',
    bottom: '10px',
    right: '10px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 10px',
    background: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    borderRadius: radius.full,
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    fontFamily: typography.fontFamilyAlt,
  },

  info: {
    padding: '14px 16px',
  },

  workTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.primary,
    margin: '0 0 6px',
  },

  meta: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '4px',
  },

  metaItem: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.muted,
  },

  metaDot: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
  },

  dots: {
    display: 'flex',
    justifyContent: 'center',
    gap: '8px',
    marginTop: '12px',
  },

  dot: {
    width: '8px',
    height: '8px',
    borderRadius: radius.full,
    background: colors.bg.tertiary,
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    transition: animation.transition.fast,
  },

  dotActive: {
    width: '20px',
    background: `linear-gradient(90deg, ${colors.bead.cyan}, ${colors.bead.pink})`,
  },
};

export default FeaturedCarousel;
