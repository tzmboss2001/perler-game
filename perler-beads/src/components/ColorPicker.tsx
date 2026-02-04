/**
 * 颜色选择器组件
 * 从统一色库中选择颜色
 */

import React, { useState, useMemo } from 'react';
import { X, MagnifyingGlass } from '@phosphor-icons/react';
import { BeadColor, allBeadColors } from '../data/beadColors';
import { colors, radius, typography, shadows, animation } from '../styles/designSystem';

interface ColorPickerProps {
  colorCount?: number;  // 可选的颜色数量限制
  selectedColor: BeadColor | null;
  onSelectColor: (color: BeadColor) => void;
  onClose: () => void;
  recentColors?: BeadColor[];
}

const ColorPicker: React.FC<ColorPickerProps> = ({
  colorCount,
  selectedColor,
  onSelectColor,
  onClose,
  recentColors = [],
}) => {
  const [searchText, setSearchText] = useState('');

  // 使用统一色库，最多显示 colorCount 个颜色（如果指定了的话）
  const availableColors = useMemo(() => {
    if (colorCount && colorCount < allBeadColors.length) {
      return allBeadColors.slice(0, colorCount);
    }
    return allBeadColors;
  }, [colorCount]);

  // 过滤颜色
  const filteredColors = searchText
    ? availableColors.filter(c =>
        c.name.toLowerCase().includes(searchText.toLowerCase()) ||
        c.nameCN.includes(searchText) ||
        c.id.toLowerCase().includes(searchText.toLowerCase())
      )
    : availableColors;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.container} onClick={(e) => e.stopPropagation()}>
        {/* 头部 */}
        <div style={styles.header}>
          <h3 style={styles.title}>选择颜色</h3>
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={20} weight="bold" />
          </button>
        </div>

        {/* 搜索框 */}
        <div style={styles.searchBox}>
          <MagnifyingGlass size={16} style={{ color: colors.text.muted }} />
          <input
            type="text"
            placeholder="搜索颜色名称或色号..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        {/* 最近使用 */}
        {recentColors.length > 0 && !searchText && (
          <div style={styles.section}>
            <p style={styles.sectionTitle}>最近使用</p>
            <div style={styles.colorGrid}>
              {recentColors.slice(0, 10).map((color) => (
                <button
                  key={`recent-${color.id}`}
                  style={{
                    ...styles.colorItem,
                    backgroundColor: color.hex,
                    ...(selectedColor?.id === color.id ? styles.colorItemSelected : {}),
                  }}
                  onClick={() => onSelectColor(color)}
                  title={`${color.nameCN} (${color.id})`}
                />
              ))}
            </div>
          </div>
        )}

        {/* 全部颜色 */}
        <div style={styles.section}>
          <p style={styles.sectionTitle}>
            {searchText ? `搜索结果 (${filteredColors.length})` : `全部颜色 (${availableColors.length})`}
          </p>
          <div style={styles.colorGridLarge}>
            {filteredColors.map((color) => (
              <button
                key={color.id}
                style={{
                  ...styles.colorItemLarge,
                  backgroundColor: color.hex,
                  ...(selectedColor?.id === color.id ? styles.colorItemSelected : {}),
                }}
                onClick={() => onSelectColor(color)}
              >
                <span style={{
                  ...styles.colorLabel,
                  color: getBrightness(color.rgb) > 128 ? '#000' : '#fff',
                }}>
                  {color.id}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 当前选中 */}
        {selectedColor && (
          <div style={styles.selectedInfo}>
            <div
              style={{
                ...styles.selectedColorBox,
                backgroundColor: selectedColor.hex,
              }}
            />
            <div style={styles.selectedText}>
              <span style={styles.selectedName}>{selectedColor.nameCN}</span>
              <span style={styles.selectedCode}>{selectedColor.id} · {selectedColor.name}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// 计算颜色亮度
const getBrightness = (rgb: [number, number, number]): number => {
  const [r, g, b] = rgb;
  return (r * 299 + g * 587 + b * 114) / 1000;
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(4px)',
  },

  container: {
    width: '100%',
    maxWidth: '500px',
    maxHeight: '80vh',
    background: colors.bg.secondary,
    borderRadius: `${radius.card}px ${radius.card}px 0 0`,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },

  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    borderBottom: `1px solid ${colors.border.soft}`,
  },

  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.primary,
    margin: 0,
  },

  closeBtn: {
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: colors.bg.tertiary,
    border: 'none',
    borderRadius: radius.full,
    color: colors.text.secondary,
    cursor: 'pointer',
  },

  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    margin: '12px 16px',
    padding: '10px 14px',
    background: colors.bg.tertiary,
    borderRadius: radius.button,
    border: `1px solid ${colors.border.soft}`,
  },

  searchInput: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.primary,
  },

  section: {
    padding: '0 16px 16px',
    overflowY: 'auto',
  },

  sectionTitle: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.muted,
    marginBottom: '10px',
    textTransform: 'uppercase',
  },

  colorGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },

  colorItem: {
    width: '36px',
    height: '36px',
    borderRadius: radius.bead,
    border: '2px solid transparent',
    cursor: 'pointer',
    boxShadow: shadows.sm,
    transition: animation.transition.fast,
  },

  colorGridLarge: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(50px, 1fr))',
    gap: '8px',
    maxHeight: '300px',
    overflowY: 'auto',
    paddingRight: '8px',
  },

  colorItemLarge: {
    aspectRatio: '1',
    borderRadius: radius.bead,
    border: '2px solid transparent',
    cursor: 'pointer',
    boxShadow: shadows.sm,
    transition: animation.transition.fast,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },

  colorItemSelected: {
    borderColor: colors.bead.cyan,
    boxShadow: `0 0 0 2px ${colors.bead.cyan}, ${shadows.sm}`,
  },

  colorLabel: {
    fontSize: '10px',
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyAlt,
    textShadow: '0 1px 2px rgba(0,0,0,0.3)',
  },

  selectedInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    background: colors.bg.card,
    borderTop: `1px solid ${colors.border.soft}`,
  },

  selectedColorBox: {
    width: '48px',
    height: '48px',
    borderRadius: radius.bead,
    boxShadow: shadows.md,
  },

  selectedText: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },

  selectedName: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.primary,
  },

  selectedCode: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.muted,
  },
};

export default ColorPicker;
