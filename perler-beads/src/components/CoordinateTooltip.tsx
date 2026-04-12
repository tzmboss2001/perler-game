import React from 'react';
import { radius, typography, shadows } from '../styles/designSystem';

interface CoordinateTooltipProps {
  visible: boolean;
  row: number;
  col: number;
  boardNumber?: number;
  localRow?: number;
  localCol?: number;
  cellScreenX: number;
  cellScreenY: number;
  containerWidth: number;
  containerHeight: number;
}

const CoordinateTooltip: React.FC<CoordinateTooltipProps> = ({
  visible,
  row,
  col,
  boardNumber,
  localRow,
  localCol,
  cellScreenX,
  cellScreenY,
  containerWidth,
  containerHeight,
}) => {
  if (!visible) return null;

  const compactBoardLabel =
    boardNumber && localRow && localCol ? `${boardNumber}-${localCol},${localRow}` : null;
  const tooltipWidth = compactBoardLabel ? 96 : 80;
  const tooltipHeight = 36;
  const offset = 8;
  const topSafeOffset = 68;

  let left = cellScreenX + offset + 18;
  let top = cellScreenY - tooltipHeight - offset;

  if (left + tooltipWidth > containerWidth - 10) {
    left = cellScreenX - tooltipWidth - offset - 18;
  }

  if (left < 10) {
    left = 10;
  }

  if (top < topSafeOffset) {
    top = cellScreenY + offset + 30;
  }

  left = Math.max(10, Math.min(left, containerWidth - tooltipWidth - 10));
  top = Math.max(topSafeOffset, Math.min(top, containerHeight - tooltipHeight - 10));

  return (
    <div
      style={{
        ...styles.tooltip,
        left,
        top,
      }}
    >
      {compactBoardLabel ? (
        <div style={styles.tooltipTitle}>{compactBoardLabel}</div>
      ) : (
        <div>({row}, {col})</div>
      )}
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
    boxShadow: shadows.md,
  },
  tooltipTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    lineHeight: 1.1,
  },
};

export default CoordinateTooltip;

