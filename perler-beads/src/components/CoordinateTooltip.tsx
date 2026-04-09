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

  const tooltipWidth = boardNumber ? 132 : 80;
  const tooltipHeight = boardNumber ? 54 : 36;
  const offset = 8;

  let left = cellScreenX - tooltipWidth - offset;
  let top = cellScreenY - tooltipHeight - offset;

  if (left < 10) {
    left = cellScreenX + offset + 30;
  }

  if (top < 10) {
    top = cellScreenY + offset + 30;
  }

  left = Math.max(10, Math.min(left, containerWidth - tooltipWidth - 10));
  top = Math.max(10, Math.min(top, containerHeight - tooltipHeight - 10));

  return (
    <div
      style={{
        ...styles.tooltip,
        left,
        top,
      }}
    >
      {boardNumber && localRow && localCol ? (
        <>
          <div style={styles.tooltipTitle}>板{boardNumber}</div>
          <div style={styles.tooltipMeta}>列{localCol} 行{localRow}</div>
        </>
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
  tooltipMeta: {
    marginTop: 4,
    fontSize: typography.fontSize.sm,
    opacity: 0.92,
    lineHeight: 1.1,
  },
};

export default CoordinateTooltip;

