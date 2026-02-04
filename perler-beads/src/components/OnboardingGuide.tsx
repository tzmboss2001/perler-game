import React, { useState, useEffect } from 'react';
import { X, ArrowRight, Camera, PaintBrush, Sparkle } from '@phosphor-icons/react';
import { colors, radius, typography, shadows, animation } from '../styles/designSystem';

const ONBOARDING_KEY = 'perler_beads_onboarding_completed';

interface OnboardingGuideProps {
  onComplete?: () => void;
}

/**
 * 新手引导组件
 * 首次使用时显示，介绍核心功能
 */
const OnboardingGuide: React.FC<OnboardingGuideProps> = ({ onComplete }) => {
  const [visible, setVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // 引导步骤
  const steps = [
    {
      icon: <Camera size={48} weight="duotone" />,
      color: colors.bead.cyan,
      title: '上传或拍照',
      desc: '选择一张你喜欢的图片，可以是照片、卡通人物或任何图案',
    },
    {
      icon: <PaintBrush size={48} weight="duotone" />,
      color: colors.bead.yellow,
      title: '编辑调整',
      desc: '调节图案大小、选择珠子色板、手动修改颜色，让作品更完美',
    },
    {
      icon: <Sparkle size={48} weight="duotone" />,
      color: colors.bead.pink,
      title: '对照制作',
      desc: '逐行高亮显示，像游戏攻略一样带你完成拼豆作品',
    },
  ];

  useEffect(() => {
    // 检查是否首次访问
    const completed = localStorage.getItem(ONBOARDING_KEY);
    if (!completed) {
      setVisible(true);
    }
  }, []);

  const handleComplete = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setVisible(false);
    onComplete?.();
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  if (!visible) return null;

  const step = steps[currentStep];

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* 关闭按钮 */}
        <button style={styles.closeBtn} onClick={handleSkip}>
          <X size={20} />
        </button>

        {/* 步骤指示器 */}
        <div style={styles.indicators}>
          {steps.map((_, index) => (
            <div
              key={index}
              style={{
                ...styles.indicator,
                background: index === currentStep
                  ? colors.bead.cyan
                  : index < currentStep
                    ? colors.bead.green
                    : colors.border.soft,
              }}
            />
          ))}
        </div>

        {/* 内容区 */}
        <div style={styles.content}>
          {/* 图标 */}
          <div style={{
            ...styles.iconBox,
            background: `linear-gradient(145deg, ${step.color}30, ${step.color}15)`,
            boxShadow: `0 8px 32px ${step.color}30`,
          }}>
            <div style={{ color: step.color }}>{step.icon}</div>
          </div>

          {/* 标题 */}
          <h2 style={styles.title}>{step.title}</h2>

          {/* 描述 */}
          <p style={styles.desc}>{step.desc}</p>
        </div>

        {/* 操作按钮 */}
        <div style={styles.actions}>
          {currentStep < steps.length - 1 ? (
            <>
              <button style={styles.skipBtn} onClick={handleSkip}>
                跳过
              </button>
              <button style={styles.nextBtn} onClick={handleNext}>
                下一步
                <ArrowRight size={18} weight="bold" />
              </button>
            </>
          ) : (
            <button style={styles.startBtn} onClick={handleComplete}>
              开始使用
              <Sparkle size={18} weight="fill" />
            </button>
          )}
        </div>

        {/* 底部提示 */}
        <p style={styles.hint}>
          {currentStep + 1} / {steps.length}
        </p>
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
    background: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '20px',
  },

  modal: {
    background: colors.bg.card,
    borderRadius: radius.lg,
    padding: '24px',
    width: '100%',
    maxWidth: '340px',
    position: 'relative',
    boxShadow: shadows.lg,
    border: `1px solid ${colors.border.soft}`,
  },

  closeBtn: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    background: 'transparent',
    border: 'none',
    color: colors.text.muted,
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  indicators: {
    display: 'flex',
    justifyContent: 'center',
    gap: '8px',
    marginBottom: '24px',
  },

  indicator: {
    width: '32px',
    height: '4px',
    borderRadius: radius.full,
    transition: animation.transition.normal,
  },

  content: {
    textAlign: 'center',
    marginBottom: '24px',
  },

  iconBox: {
    width: '100px',
    height: '100px',
    borderRadius: radius.bead,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px',
  },

  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.primary,
    margin: '0 0 12px',
  },

  desc: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.secondary,
    margin: 0,
    lineHeight: 1.6,
  },

  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
  },

  skipBtn: {
    flex: 1,
    padding: '12px 20px',
    background: 'transparent',
    border: `1px solid ${colors.border.soft}`,
    borderRadius: radius.md,
    color: colors.text.secondary,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    cursor: 'pointer',
    transition: animation.transition.fast,
  },

  nextBtn: {
    flex: 1,
    padding: '12px 20px',
    background: `linear-gradient(145deg, ${colors.bead.cyan}, ${colors.pixel.blue})`,
    border: 'none',
    borderRadius: radius.md,
    color: '#ffffff',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    boxShadow: shadows.glow.cyan,
    transition: animation.transition.fast,
  },

  startBtn: {
    width: '100%',
    padding: '14px 24px',
    background: `linear-gradient(145deg, ${colors.bead.pink}, ${colors.bead.purple})`,
    border: 'none',
    borderRadius: radius.md,
    color: '#ffffff',
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyAlt,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    boxShadow: shadows.glow.pink,
    transition: animation.transition.fast,
  },

  hint: {
    textAlign: 'center',
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.muted,
    margin: '16px 0 0',
  },
};

export default OnboardingGuide;
