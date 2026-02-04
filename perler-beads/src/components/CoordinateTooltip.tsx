/**
 * 坐标提示框组件
 * 点击格子时显示坐标，自动淡出
 */
import React, { useEffect, useState } from 'react';
import { colors, radius, typography, shadows } from '../styles/designSystem';

interface CoordinateTooltipProps {
  visible: boolean;
  row: number;
  col: number;
  // 格子在屏幕上的位置
  cellScreenX: number;
  cellScreenY: number;
  // 容器尺寸
  containerWidth: number;
  containerHeight: number;
  onHide: () => void;
}

const CoordinateTooltip: React.FC<CoordinateTooltipProps> = ({
  visible,
  row,
  col,
  cellScreenX,
  cellScreenY,
  containerWidth,
  containerHeight,
  onHide,
}) => {
  const [opacity, setOpacity] = useState(1);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      setIsVisible(true);
      setOpacity(1);

      // 1.5秒后开始淡出
      const fadeTimer = setTimeout(() => {
        setOpacity(0);
      }, 1500);

      // 淡出动画完成后隐藏
      const hideTimer = setTimeout(() => {
        setIsVisible(false);
        onHide();
      }, 1800);

      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(hideTimer);
      };
    } else {
      setIsVisible(false);
    }
  }, [visible, row, col, onHide]);

  if (!isVisible) return null;

  // 计算提示框位置
  // 优先左上方，避免遮挡右侧和下侧
  const tooltipWidth = 80;
  const tooltipHeight = 36;
  const offset = 8;

  let left = cellScreenX - tooltipWidth - offset;
  let top = cellScreenY - tooltipHeight - offset;

  // 如果左侧空间不够，放右边
  if (left < 10) {
    left = cellScreenX + offset + 30; // 30 是格子大概宽度
  }

  // 如果上侧空间不够，放下边
  if (top < 10) {
    top = cellScreenY + offset + 30;
  }

  // 确保不超出容器
  left = Math.max(10, Math.min(left, containerWidth - tooltipWidth - 10));
  top = Math.max(10, Math.min(top, containerHeight - tooltipHeight - 10));

  return (
    <div
      style={{
        ...styles.tooltip,
        left,
        top,
        opacity,
      }}
    >
      ({row}, {col})
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  tooltip: {
    position: 'absolute',
    padding: '8px 12px',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    backdropFilter: 'blur(8px)',
    borderRadius: radius.bead,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: '#ffffff',
    whiteSpace: 'nowrap',
    zIndex: 100,
    pointerEvents: 'none',
    transition: 'opacity 0.3s ease',
    boxShadow: shadows.md,
  },
};

export default CoordinateTooltip;
