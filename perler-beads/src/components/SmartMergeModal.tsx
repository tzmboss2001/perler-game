import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowRight, MagicWand } from '@phosphor-icons/react';
import { colors, radius, typography, shadows, animation, mixins } from '../styles/designSystem';
import { BeadPixelData, smartMergeColors, SmartMergeResult } from '../services/colorMatchService';

interface SmartMergeModalProps {
  visible: boolean;
  onClose: () => void;
  beadData: BeadPixelData;
  onConfirm: (mergedData: BeadPixelData) => void;
}

/**
 * 智能合并预览弹窗
 * 阈值滑块 + 合并预览列表 + 确认
 */
const SmartMergeModal: React.FC<SmartMergeModalProps> = ({
  visible,
  onClose,
  beadData,
  onConfirm,
}) => {
  const [threshold, setThreshold] = useState(5);

  // 计算合并结果
  const mergeResult: SmartMergeResult = useMemo(() => {
    return smartMergeColors(beadData, threshold);
  }, [beadData, threshold]);

  const handleConfirm = () => {
    onConfirm(mergeResult.mergedData);
    onClose();
  };

  if (!visible) return null;

  return createPortal(
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        {/* 头部 */}
        <div style={styles.header}>
          <MagicWand size={20} weight="fill" style={{ color: colors.bead.purple }} />
          <h2 style={styles.title}>智能合并</h2>
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={20} weight="bold" />
          </button>
        </div>

        {/* 阈值滑块 */}
        <div style={styles.sliderSection}>
          <div style={styles.sliderHeader}>
            <span style={styles.sliderLabel}>合并阈值</span>
            <span style={styles.sliderValue}>
              ≤ {threshold} 颗
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="20"
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            style={styles.slider}
          />
          <span style={styles.sliderHint}>
            使用量不超过 {threshold} 颗的颜色将被合并到最相近的颜色
          </span>
        </div>

        {/* 统计信息 */}
        <div style={styles.statsRow}>
          <div style={styles.statItem}>
            <span style={styles.statNumber}>{mergeResult.beforeCount}</span>
            <span style={styles.statLabel}>当前颜色</span>
          </div>
          <ArrowRight size={16} style={{ color: colors.text.muted }} />
          <div style={styles.statItem}>
            <span style={{
              ...styles.statNumber,
              color: mergeResult.mergeReport.length > 0 ? colors.bead.green : colors.text.primary,
            }}>{mergeResult.afterCount}</span>
            <span style={styles.statLabel}>合并后</span>
          </div>
          <div style={styles.statItem}>
            <span style={{
              ...styles.statNumber,
              color: mergeResult.mergeReport.length > 0 ? colors.bead.orange : colors.text.muted,
            }}>{mergeResult.mergeReport.length}</span>
            <span style={styles.statLabel}>将合并</span>
          </div>
        </div>

        {/* 合并预览列表 */}
        <div style={styles.content}>
          {mergeResult.mergeReport.length === 0 ? (
            <div style={styles.emptyBox}>
              <span style={styles.emptyText}>
                没有使用量 ≤ {threshold} 颗的颜色可合并
              </span>
              <span style={styles.emptyHint}>请增大阈值</span>
            </div>
          ) : (
            <div style={styles.mergeList}>
              {mergeResult.mergeReport.map((item, i) => (
                <div key={i} style={styles.mergeItem}>
                  <div style={styles.mergeFrom}>
                    <div style={{
                      ...styles.colorDot,
                      backgroundColor: item.fromColor.hex,
                    }} />
                    <span style={styles.mergeColorId}>{item.fromColor.id}</span>
                    <span style={styles.mergeCount}>{item.count}颗</span>
                  </div>
                  <ArrowRight size={12} style={{ color: colors.text.muted, flexShrink: 0 }} />
                  <div style={styles.mergeTo}>
                    <div style={{
                      ...styles.colorDot,
                      backgroundColor: item.toColor.hex,
                    }} />
                    <span style={styles.mergeColorId}>{item.toColor.id}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div style={styles.footer}>
          <button style={styles.cancelBtn} onClick={onClose}>取消</button>
          <button
            style={{
              ...styles.confirmBtn,
              opacity: mergeResult.mergeReport.length === 0 ? 0.5 : 1,
            }}
            onClick={handleConfirm}
            disabled={mergeResult.mergeReport.length === 0}
          >
            确认合并 ({mergeResult.mergeReport.length} 色)
          </button>
        </div>
      </div>
    </div>,
    document.body
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
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    zIndex: 1200,
    animation: 'fadeIn 0.2s ease-out',
  },

  modal: {
    width: '100%',
    maxWidth: '500px',
    maxHeight: '80vh',
    background: colors.bg.secondary,
    borderRadius: `${radius.card} ${radius.card} 0 0`,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    animation: 'slideUp 0.3s ease-out',
  },

  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '16px 20px',
    borderBottom: `1px solid ${colors.border.soft}`,
  },

  title: {
    flex: 1,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyAlt,
    background: colors.gradients.primary,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    margin: 0,
  },

  closeBtn: {
    ...mixins.iconButton,
    background: colors.bg.tertiary,
  },

  sliderSection: {
    padding: '16px 20px',
    borderBottom: `1px solid ${colors.border.soft}`,
  },

  sliderHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },

  sliderLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.primary,
  },

  sliderValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyAlt,
    color: colors.bead.purple,
  },

  slider: {
    width: '100%',
    height: '4px',
    borderRadius: '2px',
    outline: 'none',
    appearance: 'auto' as 'auto',
    cursor: 'pointer',
  },

  sliderHint: {
    display: 'block',
    marginTop: '6px',
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.muted,
  },

  statsRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    padding: '12px 20px',
    background: colors.bg.card,
  },

  statItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
  },

  statNumber: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.primary,
  },

  statLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.muted,
  },

  content: {
    flex: 1,
    overflowY: 'auto',
    padding: '12px 20px',
  },

  emptyBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '24px',
    gap: '4px',
  },

  emptyText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.secondary,
  },

  emptyHint: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.muted,
  },

  mergeList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },

  mergeItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 10px',
    background: colors.bg.card,
    borderRadius: radius.bead,
  },

  mergeFrom: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flex: 1,
  },

  mergeTo: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flex: 1,
  },

  colorDot: {
    width: '20px',
    height: '20px',
    borderRadius: radius.full,
    flexShrink: 0,
    border: `1px solid ${colors.border.soft}`,
  },

  mergeColorId: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.primary,
    fontWeight: typography.fontWeight.medium,
  },

  mergeCount: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.muted,
  },

  footer: {
    display: 'flex',
    gap: '10px',
    padding: '12px 20px',
    borderTop: `1px solid ${colors.border.soft}`,
  },

  cancelBtn: {
    flex: 1,
    padding: '12px',
    background: colors.bg.tertiary,
    border: `1px solid ${colors.border.soft}`,
    borderRadius: radius.button,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.secondary,
    cursor: 'pointer',
  },

  confirmBtn: {
    flex: 2,
    padding: '12px',
    background: `linear-gradient(145deg, ${colors.bead.purple}, ${colors.bead.purple}cc)`,
    border: 'none',
    borderRadius: radius.button,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    color: '#ffffff',
    cursor: 'pointer',
    boxShadow: `0 4px 12px ${colors.bead.purple}40`,
  },
};

export default SmartMergeModal;
