import React, { useState, useEffect } from 'react';
import { Camera, Palette, GridFour, Sparkle, ArrowRight, X } from '@phosphor-icons/react';
import { colors, radius, typography, shadows, animation } from '../styles/designSystem';

const ONBOARDING_COMPLETED_KEY = 'perler_onboarding_completed';

interface OnboardingModalProps {
  onComplete?: () => void;
  forceShow?: boolean; // 用于设置页面重新触发
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({ onComplete, forceShow = false }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // 检查是否需要显示引导
  useEffect(() => {
    if (forceShow) {
      setIsVisible(true);
      return;
    }
    const completed = localStorage.getItem(ONBOARDING_COMPLETED_KEY);
    if (!completed) {
      setIsVisible(true);
    }
  }, [forceShow]);

  // 引导页面内容
  const pages = [
    {
      icon: <Sparkle size={64} weight="fill" />,
      iconColor: colors.bead.yellow,
      title: '欢迎来到拼豆工坊',
      description: '将你喜欢的图片\n变成可制作的拼豆图案',
      beadColors: [colors.bead.pink, colors.bead.orange, colors.bead.yellow, colors.bead.green, colors.bead.cyan],
    },
    {
      icon: <Camera size={64} weight="fill" />,
      iconColor: colors.bead.cyan,
      title: '简单三步完成作品',
      description: '1. 上传或拍摄图片\n2. 调整大小和颜色\n3. 对照图案制作',
      beadColors: [colors.bead.cyan, colors.bead.blue, colors.bead.purple],
    },
    {
      icon: <Palette size={64} weight="fill" />,
      iconColor: colors.bead.pink,
      title: '多品牌珠子色板',
      description: '支持 Perler、Hama、Artkal\n自动匹配最接近的珠子颜色',
      beadColors: [colors.bead.red, colors.bead.pink, colors.bead.purple],
    },
    {
      icon: <GridFour size={64} weight="fill" />,
      iconColor: colors.bead.green,
      title: '贴心的制作辅助',
      description: '区块选择 + 同色高亮\n坐标语音播报 + 屏幕常亮',
      beadColors: [colors.bead.green, colors.bead.cyan, colors.bead.yellow],
    },
  ];

  const handleComplete = () => {
    localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
    setIsVisible(false);
    onComplete?.();
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleNext = () => {
    if (isAnimating) return;

    if (currentPage < pages.length - 1) {
      setIsAnimating(true);
      setCurrentPage(prev => prev + 1);
      setTimeout(() => setIsAnimating(false), 300);
    } else {
      handleComplete();
    }
  };

  const handleDotClick = (index: number) => {
    if (isAnimating || index === currentPage) return;
    setIsAnimating(true);
    setCurrentPage(index);
    setTimeout(() => setIsAnimating(false), 300);
  };

  if (!isVisible) return null;

  const page = pages[currentPage];
  const isLastPage = currentPage === pages.length - 1;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* 跳过按钮 */}
        {!isLastPage && (
          <button style={styles.skipButton} onClick={handleSkip}>
            跳过
          </button>
        )}

        {/* 关闭按钮（最后一页） */}
        {isLastPage && (
          <button style={styles.closeButton} onClick={handleComplete}>
            <X size={20} weight="bold" />
          </button>
        )}

        {/* 内容区域 */}
        <div style={styles.content}>
          {/* 装饰珠子 */}
          <div style={styles.beadDecor}>
            {page.beadColors.map((color, i) => (
              <span
                key={i}
                style={{
                  ...styles.beadDot,
                  background: `linear-gradient(145deg, ${color}, ${color}cc)`,
                  boxShadow: `0 2px 8px ${color}50`,
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>

          {/* 图标 */}
          <div
            style={{
              ...styles.iconWrapper,
              background: `linear-gradient(145deg, ${page.iconColor}30, ${page.iconColor}15)`,
              boxShadow: `0 8px 32px ${page.iconColor}30`,
            }}
          >
            <div style={{ color: page.iconColor }}>
              {page.icon}
            </div>
          </div>

          {/* 标题 */}
          <h2 style={styles.title}>{page.title}</h2>

          {/* 描述 */}
          <p style={styles.description}>
            {page.description.split('\n').map((line, i) => (
              <React.Fragment key={i}>
                {line}
                {i < page.description.split('\n').length - 1 && <br />}
              </React.Fragment>
            ))}
          </p>
        </div>

        {/* 底部区域 */}
        <div style={styles.footer}>
          {/* 指示器 */}
          <div style={styles.dots}>
            {pages.map((_, index) => (
              <button
                key={index}
                style={{
                  ...styles.dot,
                  ...(index === currentPage ? styles.dotActive : {}),
                }}
                onClick={() => handleDotClick(index)}
              />
            ))}
          </div>

          {/* 操作按钮 */}
          <button style={styles.nextButton} onClick={handleNext}>
            <span>{isLastPage ? '立即开始' : '下一步'}</span>
            <ArrowRight size={18} weight="bold" />
          </button>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    padding: '20px',
  },

  modal: {
    position: 'relative',
    width: '100%',
    maxWidth: '340px',
    background: colors.bg.card,
    borderRadius: radius.xl,
    border: `1px solid ${colors.border.soft}`,
    boxShadow: `${shadows.xl}, 0 0 60px rgba(107, 207, 255, 0.15)`,
    overflow: 'hidden',
  },

  skipButton: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    background: 'transparent',
    border: 'none',
    color: colors.text.muted,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamilyAlt,
    cursor: 'pointer',
    padding: '8px 12px',
    borderRadius: radius.md,
    transition: animation.transition.fast,
  },

  closeButton: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    width: '36px',
    height: '36px',
    background: colors.bg.tertiary,
    border: `1px solid ${colors.border.soft}`,
    borderRadius: radius.full,
    color: colors.text.secondary,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: animation.transition.fast,
  },

  content: {
    padding: '48px 32px 24px',
    textAlign: 'center',
  },

  beadDecor: {
    display: 'flex',
    justifyContent: 'center',
    gap: '8px',
    marginBottom: '24px',
  },

  beadDot: {
    width: '12px',
    height: '12px',
    borderRadius: radius.full,
    animation: 'bounce 1s ease infinite',
  },

  iconWrapper: {
    width: '120px',
    height: '120px',
    borderRadius: radius.xl,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 24px',
  },

  title: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyAlt,
    background: `linear-gradient(135deg, ${colors.soft.lemon} 0%, ${colors.soft.peach} 50%, ${colors.soft.pink} 100%)`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    margin: '0 0 16px',
  },

  description: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.secondary,
    lineHeight: typography.lineHeight.relaxed,
    margin: 0,
  },

  footer: {
    padding: '16px 32px 32px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px',
  },

  dots: {
    display: 'flex',
    gap: '8px',
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
    width: '24px',
    background: `linear-gradient(90deg, ${colors.bead.cyan}, ${colors.bead.pink})`,
  },

  nextButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%',
    padding: '14px 24px',
    background: `linear-gradient(145deg, ${colors.bead.cyan}, ${colors.pixel.blue})`,
    border: 'none',
    borderRadius: radius.button,
    color: '#ffffff',
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    cursor: 'pointer',
    boxShadow: `${shadows.button}, ${shadows.glow.cyan}`,
    transition: animation.transition.fast,
  },
};

// 添加 CSS 动画
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-4px); }
  }
`;
if (!document.querySelector('#onboarding-styles')) {
  styleSheet.id = 'onboarding-styles';
  document.head.appendChild(styleSheet);
}

export default OnboardingModal;

// 导出工具函数
export const shouldShowOnboarding = (): boolean => {
  return !localStorage.getItem(ONBOARDING_COMPLETED_KEY);
};

export const resetOnboarding = (): void => {
  localStorage.removeItem(ONBOARDING_COMPLETED_KEY);
};
