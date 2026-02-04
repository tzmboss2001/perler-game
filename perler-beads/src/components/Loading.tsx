import React from 'react';
import { colors, radius, typography, animation } from '../styles/designSystem';

interface LoadingProps {
  text?: string;
  fullScreen?: boolean;
  size?: 'small' | 'medium' | 'large';
}

/**
 * Loading 组件 - 加载状态显示
 */
const Loading: React.FC<LoadingProps> = ({
  text = '加载中...',
  fullScreen = false,
  size = 'medium',
}) => {
  const sizeConfig = {
    small: { spinner: 24, beads: 4, gap: 3 },
    medium: { spinner: 40, beads: 6, gap: 4 },
    large: { spinner: 56, beads: 8, gap: 5 },
  };

  const config = sizeConfig[size];
  const beadColors = [
    colors.bead.pink,
    colors.bead.orange,
    colors.bead.yellow,
    colors.bead.green,
    colors.bead.cyan,
    colors.bead.blue,
  ];

  const content = (
    <div style={styles.wrapper}>
      {/* 珠子旋转动画 */}
      <div
        style={{
          ...styles.spinner,
          width: config.spinner,
          height: config.spinner,
        }}
      >
        {beadColors.slice(0, config.beads).map((color, index) => {
          const angle = (360 / config.beads) * index;
          const delay = index * 0.1;
          return (
            <div
              key={index}
              style={{
                ...styles.bead,
                width: config.gap * 2,
                height: config.gap * 2,
                background: `linear-gradient(145deg, ${color}, ${color}bb)`,
                boxShadow: `0 2px 8px ${color}50`,
                transform: `rotate(${angle}deg) translateY(-${config.spinner / 2 - config.gap}px)`,
                animationDelay: `${delay}s`,
              }}
            />
          );
        })}
      </div>
      {text && (
        <p
          style={{
            ...styles.text,
            fontSize: size === 'small' ? typography.fontSize.xs : typography.fontSize.sm,
          }}
        >
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return <div style={styles.fullScreen}>{content}</div>;
  }

  return content;
};

/**
 * 全屏 Loading 遮罩
 */
export const LoadingOverlay: React.FC<{ visible: boolean; text?: string }> = ({
  visible,
  text,
}) => {
  if (!visible) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.overlayContent}>
        <Loading size="large" text={text} />
      </div>
    </div>
  );
};

// 添加 CSS 动画
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes beadPulse {
    0%, 100% {
      opacity: 0.4;
      transform: rotate(var(--angle)) translateY(var(--translate)) scale(0.8);
    }
    50% {
      opacity: 1;
      transform: rotate(var(--angle)) translateY(var(--translate)) scale(1.2);
    }
  }

  @keyframes spinnerRotate {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
if (!document.querySelector('[data-loading-styles]')) {
  styleSheet.setAttribute('data-loading-styles', 'true');
  document.head.appendChild(styleSheet);
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
  },

  fullScreen: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: colors.bg.primary,
    zIndex: 9998,
  },

  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9998,
    backdropFilter: 'blur(4px)',
  },

  overlayContent: {
    background: colors.bg.card,
    padding: '32px 48px',
    borderRadius: radius.lg,
    border: `1px solid ${colors.border.soft}`,
  },

  spinner: {
    position: 'relative',
    animation: 'spinnerRotate 2s linear infinite',
  },

  bead: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: '-4px',
    marginTop: '-4px',
    borderRadius: radius.full,
    animation: 'beadPulse 1.2s ease-in-out infinite',
  },

  text: {
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.secondary,
    margin: 0,
    textAlign: 'center',
  },
};

export default Loading;
