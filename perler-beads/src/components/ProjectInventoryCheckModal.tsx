import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ShoppingCart, WarningCircle, X } from '@phosphor-icons/react';
import { colors, radius, typography, shadows } from '../styles/designSystem';
import { BeadUsageSummary } from '../services/beadUsageService';
import { beadInventoryService } from '../services/beadInventoryService';

interface ProjectInventoryCheckModalProps {
  visible: boolean;
  projectName: string;
  usageSummary: BeadUsageSummary | null;
  onClose: () => void;
  onAppliedConsumption?: () => void;
}

const TEXT = {
  title: '\u5e93\u5b58\u68c0\u67e5',
  totalUsage: '\u4f5c\u54c1\u603b\u7528\u91cf',
  colorCount: '\u7528\u8272\u6570\u91cf',
  shortageColors: '\u7f3a\u8d27\u989c\u8272',
  shortageTotal: '\u603b\u7f3a\u53e3',
  notice: '\u5e93\u5b58\u57fa\u4e8e\u201c\u6211\u7684\u8c46\u4ed3\u201d\u5f53\u524d\u6570\u91cf\u5bf9\u6bd4\uff0c\u672a\u5f55\u5165\u7684\u989c\u8272\u4f1a\u6309 0 \u5e93\u5b58\u5904\u7406\u3002',
  inStock: '\u5e93\u5b58\u5145\u8db3',
  shortagePrefix: '\u8fd8\u5dee ',
  shortageSuffix: ' \u9897',
  need: '\u9700\u8981',
  stock: '\u5e93\u5b58',
  close: '\u5173\u95ed',
  deducting: '\u6263\u51cf\u4e2d...',
  deduct: '\u4e00\u952e\u6263\u51cf\u8c46\u4ed3',
  restockFirst: '\u5e93\u5b58\u4e0d\u8db3\uff0c\u5148\u8865\u4ed3',
  deductedPrefix: '\u5df2\u4ece\u8c46\u4ed3\u6263\u51cf\u672c\u4f5c\u54c1\u6240\u9700 ',
  deductedSuffix: ' \u9897\u62fc\u8c46\u3002',
};

const isLightColor = (rgb: [number, number, number]): boolean =>
  (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000 > 180;

const ProjectInventoryCheckModal: React.FC<ProjectInventoryCheckModalProps> = ({
  visible,
  projectName,
  usageSummary,
  onClose,
  onAppliedConsumption,
}) => {
  const [inventoryVersion, setInventoryVersion] = useState(0);
  const [applying, setApplying] = useState(false);
  const [applyMessage, setApplyMessage] = useState('');

  const inventory = useMemo(() => beadInventoryService.getQuantities(), [inventoryVersion]);

  useEffect(() => {
    if (!visible) return;
    setApplyMessage('');
    setInventoryVersion((prev) => prev + 1);
  }, [visible]);

  const comparison = useMemo(() => {
    if (!usageSummary) return [];
    return usageSummary.usageList
      .map((item) => {
        const stock = inventory[item.color.id] || 0;
        const shortage = Math.max(0, item.count - stock);
        return {
          ...item,
          stock,
          shortage,
          isEnough: shortage === 0,
        };
      })
      .sort((a, b) => {
        if (a.shortage !== b.shortage) return b.shortage - a.shortage;
        return b.count - a.count;
      });
  }, [inventory, usageSummary]);

  const shortageColorCount = comparison.filter((item) => item.shortage > 0).length;
  const shortageBeadCount = comparison.reduce((sum, item) => sum + item.shortage, 0);
  const canApplyConsumption = !!usageSummary && usageSummary.totalBeads > 0 && shortageColorCount === 0;

  const handleApplyConsumption = async () => {
    if (!usageSummary || !canApplyConsumption || applying) return;

    try {
      setApplying(true);
      beadInventoryService.applyConsumption(
        Object.fromEntries(usageSummary.usageList.map((item) => [item.color.id, item.count])),
      );
      setInventoryVersion((prev) => prev + 1);
      setApplyMessage(`${TEXT.deductedPrefix}${usageSummary.totalBeads.toLocaleString()}${TEXT.deductedSuffix}`);
      onAppliedConsumption?.();
    } finally {
      setApplying(false);
    }
  };

  if (!visible || !usageSummary) return null;

  return createPortal(
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.iconBox}>
              <ShoppingCart size={18} weight="fill" />
            </div>
            <div>
              <h2 style={styles.title}>{TEXT.title}</h2>
              <div style={styles.subtitle}>{projectName}</div>
            </div>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={18} weight="bold" />
          </button>
        </div>

        <div style={styles.summaryGrid}>
          <div style={styles.summaryCard}>
            <span style={styles.summaryLabel}>{TEXT.totalUsage}</span>
            <span style={styles.summaryValue}>{usageSummary.totalBeads.toLocaleString()}</span>
          </div>
          <div style={styles.summaryCard}>
            <span style={styles.summaryLabel}>{TEXT.colorCount}</span>
            <span style={styles.summaryValue}>{usageSummary.colorCount}</span>
          </div>
          <div style={styles.summaryCard}>
            <span style={styles.summaryLabel}>{TEXT.shortageColors}</span>
            <span style={styles.summaryValue}>{shortageColorCount}</span>
          </div>
          <div style={styles.summaryCard}>
            <span style={styles.summaryLabel}>{TEXT.shortageTotal}</span>
            <span style={styles.summaryValue}>{shortageBeadCount.toLocaleString()}</span>
          </div>
        </div>

        <div style={styles.noticeBox}>
          <WarningCircle size={16} weight="fill" />
          <span>{TEXT.notice}</span>
        </div>

        {applyMessage ? <div style={styles.feedbackBox}>{applyMessage}</div> : null}

        <div style={styles.content}>
          {comparison.map((item) => (
            <div key={item.color.id} style={styles.row}>
              <div style={styles.colorInfo}>
                <div
                  style={{
                    ...styles.colorSwatch,
                    backgroundColor: item.color.hex,
                    border: isLightColor(item.color.rgb) ? `1px solid ${colors.border.soft}` : 'none',
                  }}
                />
                <div style={styles.colorText}>
                  <div style={styles.colorMain}>
                    <span style={styles.colorId}>{item.color.id}</span>
                    <span style={styles.colorName}>{item.color.nameCN}</span>
                  </div>
                  <div
                    style={{
                      ...styles.statusText,
                      color: item.isEnough ? colors.bead.green : colors.bead.red,
                    }}
                  >
                    {item.isEnough ? TEXT.inStock : `${TEXT.shortagePrefix}${item.shortage}${TEXT.shortageSuffix}`}
                  </div>
                </div>
              </div>

              <div style={styles.metrics}>
                <div style={styles.metricBox}>
                  <span style={styles.metricLabel}>{TEXT.need}</span>
                  <span style={styles.metricValue}>{item.count}</span>
                </div>
                <div style={styles.metricBox}>
                  <span style={styles.metricLabel}>{TEXT.stock}</span>
                  <span style={styles.metricValue}>{item.stock}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={styles.footer}>
          <div style={styles.footerActions}>
            <button style={styles.secondaryBtn} onClick={onClose}>{TEXT.close}</button>
            <button
              style={{
                ...styles.footerBtn,
                opacity: canApplyConsumption ? 1 : 0.58,
                cursor: canApplyConsumption && !applying ? 'pointer' : 'not-allowed',
              }}
              onClick={handleApplyConsumption}
              disabled={!canApplyConsumption || applying}
            >
              {applying ? TEXT.deducting : canApplyConsumption ? TEXT.deduct : TEXT.restockFirst}
            </button>
          </div>
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
  headerLeft: {
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
    color: colors.bead.green,
    background: `${colors.bead.green}1f`,
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
  noticeBox: {
    margin: '14px 16px 0',
    padding: '10px 12px',
    borderRadius: radius.card,
    background: `${colors.bead.yellow}18`,
    color: colors.text.secondary,
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    fontSize: typography.fontSize.xs,
    lineHeight: 1.6,
  },
  feedbackBox: {
    margin: '12px 16px 0',
    padding: '10px 12px',
    borderRadius: radius.card,
    background: `${colors.bead.green}16`,
    color: colors.bead.green,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    lineHeight: 1.6,
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: '14px 16px 0',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  row: {
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
  colorText: {
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
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
  statusText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
  },
  metrics: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  metricBox: {
    minWidth: 60,
    padding: '8px 10px',
    borderRadius: radius.bead,
    background: `${colors.bg.secondary}`,
    border: `1px solid ${colors.border.soft}`,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
  },
  metricValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  footer: {
    padding: '14px 16px calc(env(safe-area-inset-bottom, 0px) + 16px)',
    borderTop: `1px solid ${colors.border.soft}`,
    background: colors.bg.secondary,
  },
  footerActions: {
    display: 'flex',
    gap: 10,
  },
  secondaryBtn: {
    flex: 1,
    height: 44,
    borderRadius: radius.bead,
    border: `1px solid ${colors.border.soft}`,
    background: '#fff',
    color: colors.text.secondary,
    cursor: 'pointer',
    fontWeight: typography.fontWeight.medium,
  },
  footerBtn: {
    flex: 1.2,
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

export default ProjectInventoryCheckModal;
