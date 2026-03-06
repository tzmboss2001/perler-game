import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, CaretDown, CaretRight } from '@phosphor-icons/react';
import { colors, radius, typography, shadows, animation, mixins } from '../styles/designSystem';
import { myColorsService, getMardSeries, ColorSeries } from '../services/myColorsService';
import { BeadColor } from '../data/beadColors';

interface MyColorsModalProps {
  visible: boolean;
  onClose: () => void;
  onSave?: (selectedIds: string[]) => void;
}

/**
 * 我的色板管理弹窗
 * 用户按系列勾选自己拥有的颜色
 */
const MyColorsModal: React.FC<MyColorsModalProps> = ({ visible, onClose, onSave }) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedSeries, setExpandedSeries] = useState<Set<string>>(new Set());
  const series = useMemo(() => getMardSeries(), []);

  // 加载已保存的选择
  useEffect(() => {
    const load = async () => {
      if (!visible) return;

      const saved = await myColorsService.syncFromCloud();
      setSelectedIds(new Set(saved));
      // 默认展开第一个有已选颜色的系列，否则展开第一个系列
      if (saved.length > 0) {
        const firstSelectedSeries = series.find(s =>
          s.colors.some(c => saved.includes(c.id))
        );
        if (firstSelectedSeries) {
          setExpandedSeries(new Set([firstSelectedSeries.key]));
        }
      } else {
        setExpandedSeries(new Set([series[0]?.key]));
      }
    };

    load();
  }, [visible, series]);

  const toggleColor = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSeries = (seriesKey: string) => {
    setExpandedSeries(prev => {
      const next = new Set(prev);
      if (next.has(seriesKey)) {
        next.delete(seriesKey);
      } else {
        next.add(seriesKey);
      }
      return next;
    });
  };

  const selectAllInSeries = (s: ColorSeries) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      s.colors.forEach(c => next.add(c.id));
      return next;
    });
  };

  const clearSeries = (s: ColorSeries) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      s.colors.forEach(c => next.delete(c.id));
      return next;
    });
  };

  const selectAll = () => {
    const allIds = series.flatMap(s => s.colors.map(c => c.id));
    setSelectedIds(new Set(allIds));
  };

  const clearAll = () => {
    setSelectedIds(new Set());
  };

  const handleSave = async () => {
    const ids = Array.from(selectedIds);
    myColorsService.saveSelectedIds(ids);
    await myColorsService.syncToCloud(ids);
    onSave?.(ids);
    onClose();
  };

  const getSeriesSelectedCount = (s: ColorSeries): number => {
    return s.colors.filter(c => selectedIds.has(c.id)).length;
  };

  const totalMard = series.reduce((sum, s) => sum + s.colors.length, 0);

  if (!visible) return null;

  return createPortal(
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        {/* 头部 */}
        <div style={styles.header}>
          <h2 style={styles.title}>我的色板</h2>
          <span style={styles.headerCount}>
            已选 {selectedIds.size}/{totalMard}
          </span>
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={20} weight="bold" />
          </button>
        </div>

        {/* 全局操作 */}
        <div style={styles.globalActions}>
          <button style={styles.actionBtn} onClick={selectAll}>全选</button>
          <button style={styles.actionBtn} onClick={clearAll}>清空</button>
        </div>

        {/* 系列列表 */}
        <div style={styles.content}>
          {series.map(s => {
            const isExpanded = expandedSeries.has(s.key);
            const selectedCount = getSeriesSelectedCount(s);
            const isAllSelected = selectedCount === s.colors.length;

            return (
              <div key={s.key} style={styles.seriesBlock}>
                {/* 系列头部 */}
                <div
                  style={styles.seriesHeader}
                  onClick={() => toggleSeries(s.key)}
                >
                  <div style={styles.seriesLeft}>
                    {isExpanded
                      ? <CaretDown size={14} weight="bold" />
                      : <CaretRight size={14} weight="bold" />
                    }
                    <span style={styles.seriesName}>{s.name}</span>
                    <span style={styles.seriesDesc}>{s.description}</span>
                  </div>
                  <div style={styles.seriesRight}>
                    <span style={{
                      ...styles.seriesStat,
                      color: selectedCount > 0 ? colors.bead.cyan : colors.text.muted,
                    }}>
                      {selectedCount}/{s.colors.length}
                    </span>
                    <button
                      style={styles.seriesToggleBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        isAllSelected ? clearSeries(s) : selectAllInSeries(s);
                      }}
                    >
                      {isAllSelected ? '清空' : '全选'}
                    </button>
                  </div>
                </div>

                {/* 颜色列表 */}
                {isExpanded && (
                  <div style={styles.colorGrid}>
                    {s.colors.map(c => {
                      const isSelected = selectedIds.has(c.id);
                      return (
                        <div
                          key={c.id}
                          style={{
                            ...styles.colorItem,
                            ...(isSelected ? styles.colorItemSelected : {}),
                          }}
                          onClick={() => toggleColor(c.id)}
                        >
                          <div
                            style={{
                              ...styles.colorSwatch,
                              backgroundColor: c.hex,
                              border: isLightColor(c.rgb) ? `1px solid ${colors.border.soft}` : 'none',
                            }}
                          >
                            {isSelected && (
                              <Check size={12} weight="bold" color={isLightColor(c.rgb) ? '#333' : '#fff'} />
                            )}
                          </div>
                          <span style={styles.colorId}>{c.id}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 底部保存按钮 */}
        <div style={styles.footer}>
          <button style={styles.saveBtn} onClick={handleSave}>
            保存 ({selectedIds.size} 色)
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// 判断是否浅色
function isLightColor(rgb: [number, number, number]): boolean {
  return (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000 > 180;
}

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
    maxHeight: '90vh',
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
    padding: '16px 20px',
    borderBottom: `1px solid ${colors.border.soft}`,
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
    margin: 0,
    flex: 1,
  },

  headerCount: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamilyAlt,
    color: colors.bead.cyan,
    fontWeight: typography.fontWeight.semibold,
  },

  closeBtn: {
    ...mixins.iconButton,
    background: colors.bg.tertiary,
  },

  globalActions: {
    display: 'flex',
    gap: '8px',
    padding: '8px 20px',
    borderBottom: `1px solid ${colors.border.soft}`,
  },

  actionBtn: {
    padding: '4px 12px',
    background: colors.bg.tertiary,
    border: `1px solid ${colors.border.soft}`,
    borderRadius: radius.button,
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.secondary,
    cursor: 'pointer',
    transition: animation.transition.fast,
  },

  content: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px 20px',
  },

  seriesBlock: {
    marginBottom: '8px',
  },

  seriesHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px',
    background: colors.bg.card,
    borderRadius: radius.bead,
    cursor: 'pointer',
    transition: animation.transition.fast,
  },

  seriesLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: colors.text.primary,
  },

  seriesName: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.primary,
  },

  seriesDesc: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.muted,
  },

  seriesRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },

  seriesStat: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyAlt,
    fontWeight: typography.fontWeight.semibold,
  },

  seriesToggleBtn: {
    padding: '2px 8px',
    background: 'transparent',
    border: `1px solid ${colors.border.soft}`,
    borderRadius: radius.button,
    fontSize: '10px',
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.muted,
    cursor: 'pointer',
  },

  colorGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    padding: '8px 4px',
  },

  colorItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
    cursor: 'pointer',
    opacity: 0.5,
    transition: animation.transition.fast,
  },

  colorItemSelected: {
    opacity: 1,
  },

  colorSwatch: {
    width: '32px',
    height: '32px',
    borderRadius: radius.bead,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: animation.transition.fast,
  },

  colorId: {
    fontSize: '8px',
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.muted,
    lineHeight: '10px',
  },

  footer: {
    padding: '12px 20px',
    borderTop: `1px solid ${colors.border.soft}`,
  },

  saveBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: '14px',
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

export default MyColorsModal;

