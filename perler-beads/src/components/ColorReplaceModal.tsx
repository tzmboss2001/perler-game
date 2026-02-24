/**
 * 颜色替换弹窗
 * 用于替换图纸中的某个颜色
 */
import React, { useState, useMemo } from 'react';
import { X, Check, MagnifyingGlass } from '@phosphor-icons/react';
import { colors, radius, typography, shadows, animation } from '../styles/designSystem';
import { BeadColor, allBeadColors } from '../data/beadColors';
import { deltaE, getContrastColor } from '../utils/colorUtils';

interface ColorReplaceModalProps {
  visible: boolean;
  onClose: () => void;
  currentColor: BeadColor;
  totalCount: number;  // 整个作品中该颜色的数量
  onReplace: (newColor: BeadColor) => void;
}

const ColorReplaceModal: React.FC<ColorReplaceModalProps> = ({
  visible,
  onClose,
  currentColor,
  totalCount,
  onReplace,
}) => {
  const [searchText, setSearchText] = useState('');
  const [selectedColor, setSelectedColor] = useState<BeadColor | null>(null);

  // 计算推荐颜色（按色差排序）
  const recommendedColors = useMemo(() => {
    return allBeadColors
      .filter(c => c.id !== currentColor.id)
      .map(c => ({
        color: c,
        delta: deltaE(currentColor.hex, c.hex),
      }))
      .sort((a, b) => a.delta - b.delta)
      .slice(0, 6);  // 取前6个最相近的
  }, [currentColor]);

  // 搜索过滤
  const filteredColors = useMemo(() => {
    if (!searchText.trim()) return [];
    const search = searchText.toLowerCase();
    return allBeadColors
      .filter(c =>
        c.id !== currentColor.id &&
        (c.name.toLowerCase().includes(search) ||
         c.id.toLowerCase().includes(search) ||
         c.hex.toLowerCase().includes(search))
      )
      .slice(0, 20);
  }, [searchText, currentColor]);

  const handleConfirm = () => {
    if (selectedColor) {
      onReplace(selectedColor);
      onClose();
    }
  };

  if (!visible) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        {/* 头部 */}
        <div style={styles.header}>
          <h3 style={styles.title}>替换颜色</h3>
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* 当前颜色 */}
        <div style={styles.currentSection}>
          <span style={styles.label}>当前颜色：</span>
          <div style={styles.colorPreview}>
            <div
              style={{
                ...styles.colorSwatch,
                backgroundColor: currentColor.hex,
              }}
            >
              <span style={{ color: getContrastColor(currentColor.hex), fontSize: 10 }}>
                {currentColor.id}
              </span>
            </div>
            <div style={styles.colorInfo}>
              <span style={styles.colorName}>{currentColor.name}</span>
              <span style={styles.colorHex}>{currentColor.hex}</span>
            </div>
          </div>
        </div>

        {/* 警告提示 */}
        <div style={styles.warning}>
          ⚠️ 将替换整个作品中的 <strong>{totalCount}</strong> 颗珠子
        </div>

        {/* 推荐颜色 */}
        <div style={styles.section}>
          <span style={styles.label}>推荐替换（相近色）：</span>
          <div style={styles.colorGrid}>
            {recommendedColors.map(({ color, delta }) => (
              <button
                key={color.id}
                style={{
                  ...styles.colorOption,
                  ...(selectedColor?.id === color.id ? styles.colorOptionSelected : {}),
                }}
                onClick={() => setSelectedColor(color)}
              >
                <div
                  style={{
                    ...styles.colorSwatch,
                    backgroundColor: color.hex,
                  }}
                >
                  <span style={{ color: getContrastColor(color.hex), fontSize: 9 }}>
                    {color.id}
                  </span>
                </div>
                <span style={styles.colorDelta}>差异: {delta.toFixed(1)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 搜索框 */}
        <div style={styles.section}>
          <span style={styles.label}>或搜索其他颜色：</span>
          <div style={styles.searchBox}>
            <MagnifyingGlass size={16} style={{ color: colors.text.muted }} />
            <input
              type="text"
              placeholder="输入色号或颜色名称..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              style={styles.searchInput}
            />
          </div>
          {filteredColors.length > 0 && (
            <div style={styles.searchResults}>
              {filteredColors.map(color => (
                <button
                  key={color.id}
                  style={{
                    ...styles.searchResultItem,
                    ...(selectedColor?.id === color.id ? styles.colorOptionSelected : {}),
                  }}
                  onClick={() => setSelectedColor(color)}
                >
                  <div
                    style={{
                      ...styles.colorSwatchSmall,
                      backgroundColor: color.hex,
                    }}
                  />
                  <span style={styles.searchResultText}>
                    {color.id} - {color.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 已选择的颜色 */}
        {selectedColor && (
          <div style={styles.selectedSection}>
            <span style={styles.label}>替换为：</span>
            <div style={styles.colorPreview}>
              <div
                style={{
                  ...styles.colorSwatch,
                  backgroundColor: selectedColor.hex,
                }}
              >
                <span style={{ color: getContrastColor(selectedColor.hex), fontSize: 10 }}>
                  {selectedColor.id}
                </span>
              </div>
              <div style={styles.colorInfo}>
                <span style={styles.colorName}>{selectedColor.name}</span>
                <span style={styles.colorHex}>{selectedColor.hex}</span>
              </div>
            </div>
          </div>
        )}

        {/* 底部按钮 */}
        <div style={styles.footer}>
          <button style={styles.cancelBtn} onClick={onClose}>
            取消
          </button>
          <button
            style={{
              ...styles.confirmBtn,
              ...(selectedColor ? {} : styles.confirmBtnDisabled),
            }}
            onClick={handleConfirm}
            disabled={!selectedColor}
          >
            <Check size={16} />
            确认替换
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 16,
  },
  modal: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '85vh',
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.card,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: `1px solid ${colors.border.soft}`,
  },
  title: {
    margin: 0,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    borderRadius: radius.bead,
    color: colors.text.muted,
    cursor: 'pointer',
  },
  currentSection: {
    padding: '16px 20px',
    borderBottom: `1px solid ${colors.border.soft}`,
  },
  label: {
    display: 'block',
    fontSize: typography.fontSize.sm,
    color: colors.text.muted,
    marginBottom: 8,
  },
  colorPreview: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  colorSwatch: {
    width: 48,
    height: 48,
    borderRadius: radius.bead,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: `2px solid ${colors.border.soft}`,
  },
  colorInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  colorName: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  colorHex: {
    fontSize: typography.fontSize.sm,
    color: colors.text.muted,
  },
  warning: {
    margin: '0 20px',
    padding: '10px 12px',
    backgroundColor: 'rgba(255, 180, 0, 0.15)',
    borderRadius: radius.bead,
    fontSize: typography.fontSize.sm,
    color: '#ffb400',
    marginTop: 12,
  },
  section: {
    padding: '12px 20px',
    overflowY: 'auto',
  },
  colorGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 8,
  },
  colorOption: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    padding: 8,
    background: colors.bg.tertiary,
    border: `2px solid transparent`,
    borderRadius: radius.bead,
    cursor: 'pointer',
    transition: animation.transition.fast,
  },
  colorOptionSelected: {
    borderColor: colors.bead.cyan,
    background: `${colors.bead.cyan}20`,
  },
  colorDelta: {
    fontSize: 10,
    color: colors.text.muted,
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    background: colors.bg.tertiary,
    borderRadius: radius.bead,
    border: `1px solid ${colors.border.soft}`,
  },
  searchInput: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
  },
  searchResults: {
    marginTop: 8,
    maxHeight: 150,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  searchResultItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    background: colors.bg.tertiary,
    border: `2px solid transparent`,
    borderRadius: radius.bead,
    cursor: 'pointer',
    textAlign: 'left',
  },
  colorSwatchSmall: {
    width: 24,
    height: 24,
    borderRadius: 4,
    border: `1px solid ${colors.border.soft}`,
  },
  searchResultText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
  },
  selectedSection: {
    padding: '12px 20px',
    backgroundColor: `${colors.bead.green}10`,
    borderTop: `1px solid ${colors.border.soft}`,
  },
  footer: {
    display: 'flex',
    gap: 12,
    padding: '16px 20px',
    borderTop: `1px solid ${colors.border.soft}`,
  },
  cancelBtn: {
    flex: 1,
    padding: '12px',
    background: colors.bg.tertiary,
    border: `1px solid ${colors.border.soft}`,
    borderRadius: radius.button,
    color: colors.text.secondary,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    cursor: 'pointer',
  },
  confirmBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '12px',
    background: `linear-gradient(145deg, ${colors.bead.green}, ${colors.bead.green}cc)`,
    border: 'none',
    borderRadius: radius.button,
    color: '#ffffff',
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    cursor: 'pointer',
    boxShadow: shadows.button,
  },
  confirmBtnDisabled: {
    background: colors.bg.tertiary,
    color: colors.text.muted,
    boxShadow: 'none',
    cursor: 'not-allowed',
  },
};

export default ColorReplaceModal;
