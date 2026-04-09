import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Archive, MagnifyingGlass, Minus, Plus, X } from '@phosphor-icons/react';
import { colors, radius, typography, shadows } from '../styles/designSystem';
import { mardColors } from '../data/beadColors';
import { myColorsService } from '../services/myColorsService';
import { beadInventoryService } from '../services/beadInventoryService';

interface BeadInventoryModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved?: () => void;
  onManageColors?: () => void;
}

type FilterType = 'all' | 'inStock' | 'low' | 'out';

const isLightColor = (rgb: [number, number, number]): boolean =>
  (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000 > 180;

const BeadInventoryModal: React.FC<BeadInventoryModalProps> = ({
  visible,
  onClose,
  onSaved,
  onManageColors,
}) => {
  const [selectedColorIds, setSelectedColorIds] = useState<string[]>([]);
  const [draftQuantities, setDraftQuantities] = useState<Record<string, number>>({});
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    if (!visible) return;
    const ids = myColorsService.getSelectedIds();
    setSelectedColorIds(ids);
    setDraftQuantities(beadInventoryService.getQuantities());
    setSearchKeyword('');
    setFilter('all');
  }, [visible]);

  const selectedColors = useMemo(() => {
    const selectedSet = new Set(selectedColorIds);
    return mardColors.filter((color) => selectedSet.has(color.id));
  }, [selectedColorIds]);

  const summary = useMemo(
    () => beadInventoryService.getSummary(selectedColorIds),
    [selectedColorIds, draftQuantities],
  );

  const filteredColors = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();
    return selectedColors.filter((color) => {
      const count = draftQuantities[color.id] || 0;
      const matchedKeyword =
        !keyword ||
        color.id.toLowerCase().includes(keyword) ||
        color.name.toLowerCase().includes(keyword) ||
        color.nameCN.toLowerCase().includes(keyword);

      if (!matchedKeyword) return false;
      if (filter === 'inStock') return count > 0;
      if (filter === 'low') return count > 0 && count < beadInventoryService.getLowStockThreshold();
      if (filter === 'out') return count === 0;
      return true;
    });
  }, [draftQuantities, filter, searchKeyword, selectedColors]);

  const updateQuantity = (colorId: string, nextValue: number) => {
    setDraftQuantities((prev) => ({
      ...prev,
      [colorId]: Math.max(0, Math.round(nextValue) || 0),
    }));
  };

  const handleSave = () => {
    beadInventoryService.bulkUpdate(draftQuantities);
    onSaved?.();
    onClose();
  };

  if (!visible) return null;

  return createPortal(
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={styles.titleWrap}>
            <div style={styles.iconBox}>
              <Archive size={18} weight="fill" />
            </div>
            <div>
              <h2 style={styles.title}>豆仓管理</h2>
              <div style={styles.subtitle}>先管理颜色，再维护每种拼豆的库存数量</div>
            </div>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={18} weight="bold" />
          </button>
        </div>

        <div style={styles.summaryGrid}>
          <div style={styles.summaryCard}>
            <span style={styles.summaryLabel}>已入仓颜色</span>
            <span style={styles.summaryValue}>{summary.managedColorCount}</span>
          </div>
          <div style={styles.summaryCard}>
            <span style={styles.summaryLabel}>总库存</span>
            <span style={styles.summaryValue}>{summary.totalBeadCount.toLocaleString()}</span>
          </div>
          <div style={styles.summaryCard}>
            <span style={styles.summaryLabel}>低库存</span>
            <span style={styles.summaryValue}>{summary.lowStockCount}</span>
          </div>
          <div style={styles.summaryCard}>
            <span style={styles.summaryLabel}>缺货颜色</span>
            <span style={styles.summaryValue}>{summary.outOfStockCount}</span>
          </div>
        </div>

        {selectedColors.length === 0 ? (
          <div style={styles.emptyBox}>
            <span style={styles.emptyTitle}>豆仓里还没有颜色</span>
            <span style={styles.emptyDesc}>先去“我的色板”勾选你拥有的颜色，再回来录入数量。</span>
            <button
              style={styles.manageColorsBtn}
              onClick={() => {
                onClose();
                onManageColors?.();
              }}
            >
              去管理我的色板
            </button>
          </div>
        ) : (
          <>
            <div style={styles.toolbar}>
              <div style={styles.searchBox}>
                <MagnifyingGlass size={16} />
                <input
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="搜色号 / 中文 / 英文名"
                  style={styles.searchInput}
                />
              </div>
              <div style={styles.filterRow}>
                {[
                  { key: 'all', label: '全部' },
                  { key: 'inStock', label: '有货' },
                  { key: 'low', label: '低库存' },
                  { key: 'out', label: '缺货' },
                ].map((item) => (
                  <button
                    key={item.key}
                    style={{
                      ...styles.filterBtn,
                      ...(filter === item.key ? styles.filterBtnActive : {}),
                    }}
                    onClick={() => setFilter(item.key as FilterType)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={styles.content}>
              {filteredColors.map((color) => {
                const count = draftQuantities[color.id] || 0;
                const isLow = count > 0 && count < beadInventoryService.getLowStockThreshold();
                const statusText = count === 0 ? '缺货' : isLow ? '低库存' : '充足';
                return (
                  <div key={color.id} style={styles.colorRow}>
                    <div style={styles.colorInfo}>
                      <div
                        style={{
                          ...styles.colorSwatch,
                          backgroundColor: color.hex,
                          border: isLightColor(color.rgb) ? `1px solid ${colors.border.soft}` : 'none',
                        }}
                      />
                      <div style={styles.colorMeta}>
                        <div style={styles.colorMain}>
                          <span style={styles.colorId}>{color.id}</span>
                          <span style={styles.colorName}>{color.nameCN}</span>
                        </div>
                        <span
                          style={{
                            ...styles.colorStatus,
                            color:
                              count === 0
                                ? colors.bead.red
                                : isLow
                                  ? colors.bead.orange
                                  : colors.bead.green,
                          }}
                        >
                          {statusText}
                        </span>
                      </div>
                    </div>

                    <div style={styles.qtyEditor}>
                      <button
                        style={styles.qtyBtn}
                        onClick={() => updateQuantity(color.id, count - 10)}
                      >
                        <Minus size={14} weight="bold" />
                      </button>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={count}
                        onChange={(e) => updateQuantity(color.id, Number(e.target.value))}
                        style={styles.qtyInput}
                      />
                      <button
                        style={styles.qtyBtn}
                        onClick={() => updateQuantity(color.id, count + 10)}
                      >
                        <Plus size={14} weight="bold" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <div style={styles.footer}>
          <button style={styles.footerGhostBtn} onClick={onClose}>
            关闭
          </button>
          <button style={styles.footerPrimaryBtn} onClick={handleSave}>
            保存豆仓
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.68)',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    zIndex: 1300,
  },
  modal: {
    width: '100%',
    maxWidth: '560px',
    maxHeight: '92vh',
    background: colors.bg.secondary,
    borderRadius: `${radius.card} ${radius.card} 0 0`,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: shadows.lg,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 18px',
    borderBottom: `1px solid ${colors.border.soft}`,
  },
  titleWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: colors.bead.orange,
    background: `${colors.bead.orange}1f`,
  },
  title: {
    margin: 0,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  subtitle: {
    marginTop: 2,
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: radius.bead,
    border: `1px solid ${colors.border.soft}`,
    background: '#fff',
    cursor: 'pointer',
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 10,
    padding: '14px 16px 0',
  },
  summaryCard: {
    background: '#fff',
    border: `1px solid ${colors.border.soft}`,
    borderRadius: radius.card,
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  summaryLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
  },
  summaryValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  emptyBox: {
    margin: '16px',
    background: '#fff',
    border: `1px dashed ${colors.border.soft}`,
    borderRadius: radius.card,
    padding: '24px 18px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  emptyDesc: {
    fontSize: typography.fontSize.sm,
    color: colors.text.muted,
    lineHeight: 1.6,
  },
  manageColorsBtn: {
    marginTop: 6,
    padding: '10px 14px',
    borderRadius: radius.bead,
    border: 'none',
    background: `linear-gradient(135deg, ${colors.bead.orange}, ${colors.bead.pink})`,
    color: '#fff',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    cursor: 'pointer',
  },
  toolbar: {
    padding: '14px 16px 0',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  searchBox: {
    height: 42,
    borderRadius: radius.bead,
    border: `1px solid ${colors.border.soft}`,
    background: '#fff',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '0 12px',
    color: colors.text.muted,
  },
  searchInput: {
    border: 'none',
    outline: 'none',
    flex: 1,
    fontSize: typography.fontSize.sm,
    background: 'transparent',
    color: colors.text.primary,
  },
  filterRow: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  filterBtn: {
    padding: '8px 12px',
    borderRadius: radius.full,
    border: `1px solid ${colors.border.soft}`,
    background: '#fff',
    color: colors.text.muted,
    cursor: 'pointer',
    fontSize: typography.fontSize.xs,
  },
  filterBtnActive: {
    background: `${colors.bead.cyan}18`,
    color: colors.bead.cyan,
    borderColor: `${colors.bead.cyan}66`,
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: '14px 16px 0',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  colorRow: {
    background: '#fff',
    border: `1px solid ${colors.border.soft}`,
    borderRadius: radius.card,
    padding: '12px 14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  colorInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
    flex: 1,
  },
  colorSwatch: {
    width: 30,
    height: 30,
    borderRadius: radius.bead,
    flexShrink: 0,
  },
  colorMeta: {
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  },
  colorMain: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  colorId: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  colorName: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  colorStatus: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
  },
  qtyEditor: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  qtyBtn: {
    width: 30,
    height: 30,
    borderRadius: radius.full,
    border: `1px solid ${colors.border.soft}`,
    background: '#fff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyInput: {
    width: 74,
    height: 34,
    borderRadius: radius.bead,
    border: `1px solid ${colors.border.soft}`,
    textAlign: 'center',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    background: '#fff',
  },
  footer: {
    padding: '14px 16px calc(env(safe-area-inset-bottom, 0px) + 16px)',
    display: 'flex',
    gap: 10,
    borderTop: `1px solid ${colors.border.soft}`,
    background: colors.bg.secondary,
  },
  footerGhostBtn: {
    flex: 1,
    height: 44,
    borderRadius: radius.bead,
    border: `1px solid ${colors.border.soft}`,
    background: '#fff',
    color: colors.text.secondary,
    cursor: 'pointer',
    fontWeight: typography.fontWeight.bold,
  },
  footerPrimaryBtn: {
    flex: 1,
    height: 44,
    borderRadius: radius.bead,
    border: 'none',
    background: `linear-gradient(135deg, ${colors.bead.cyan}, ${colors.bead.purple})`,
    color: '#fff',
    cursor: 'pointer',
    fontWeight: typography.fontWeight.bold,
    boxShadow: shadows.md,
  },
};

export default BeadInventoryModal;
