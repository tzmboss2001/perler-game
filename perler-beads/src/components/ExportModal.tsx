import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Download, FileImage, Image, X } from '@phosphor-icons/react';
import { colors, radius, shadows, typography } from '../styles/designSystem';
import {
  BeadPixelData,
  renderBeadsPaginated,
  renderBeadsToCanvas,
  renderBeadsToCanvasWithList,
} from '../services/colorMatchService';
import { getAllBoardOptions, recommendBoard } from '../services/boardService';
import { adService } from '../services/adService';

interface ExportModalProps {
  visible: boolean;
  onClose: () => void;
  beadData: BeadPixelData;
  onNeedRewardUnlock?: (reason: 'premium_export', onUnlocked?: () => void) => void;
}

interface ExportOption {
  id: 'small' | 'standard' | 'hd' | 'ultra' | 'max';
  label: string;
  description: string;
  cellSize: number;
  icon: React.ElementType;
  color: string;
  recommended?: boolean;
}

const ExportModal: React.FC<ExportModalProps> = ({
  visible,
  onClose,
  beadData,
  onNeedRewardUnlock,
}) => {
  const [selectedOption, setSelectedOption] = useState<ExportOption['id']>('hd');
  const [isExporting, setIsExporting] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showCoords, setShowCoords] = useState(true);
  const [showMajorGrid, setShowMajorGrid] = useState(true);
  const [showBeadList, setShowBeadList] = useState(true);
  const [paginateMode, setPaginateMode] = useState(false);

  const smartBoard = useMemo(
    () => recommendBoard(beadData.width, beadData.height),
    [beadData.width, beadData.height]
  );
  const [boardSize, setBoardSize] = useState(smartBoard.boardSize);

  const patternWidth = beadData.width;
  const patternHeight = beadData.height;

  const exportOptions: ExportOption[] = [
    {
      id: 'small',
      label: '小图',
      description: `${patternWidth * 10}x${patternHeight * 10}px · 快速分享`,
      cellSize: 10,
      icon: Image,
      color: colors.bead.green,
    },
    {
      id: 'standard',
      label: '标准',
      description: `${patternWidth * 20}x${patternHeight * 20}px · 日常使用`,
      cellSize: 20,
      icon: FileImage,
      color: colors.bead.cyan,
    },
    {
      id: 'hd',
      label: '高清',
      description: `${patternWidth * 40}x${patternHeight * 40}px · 适合打印`,
      cellSize: 40,
      icon: FileImage,
      color: colors.bead.purple,
      recommended: true,
    },
    {
      id: 'ultra',
      label: '超高清',
      description: `${patternWidth * 80}x${patternHeight * 80}px · 高质量打印`,
      cellSize: 80,
      icon: FileImage,
      color: colors.bead.pink,
    },
    {
      id: 'max',
      label: '极清',
      description: `${patternWidth * 100}x${patternHeight * 100}px · 海报级输出`,
      cellSize: 100,
      icon: FileImage,
      color: colors.bead.orange,
    },
  ];

  const currentOption = exportOptions.find((opt) => opt.id === selectedOption) || exportOptions[1];

  const estimateFileSize = (cellSize: number): string => {
    const pixels = patternWidth * cellSize * patternHeight * cellSize;
    const estimatedBytes = pixels * 0.5;
    if (estimatedBytes < 1024) return `${Math.round(estimatedBytes)} B`;
    if (estimatedBytes < 1024 * 1024) return `${Math.round(estimatedBytes / 1024)} KB`;
    return `${(estimatedBytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const paginatedPageCount = paginateMode
    ? Math.ceil(patternWidth / boardSize) * Math.ceil(patternHeight / boardSize)
    : 0;

  const handleExport = async () => {
    const needsPremiumUnlock =
      selectedOption === 'hd' ||
      selectedOption === 'ultra' ||
      selectedOption === 'max' ||
      paginateMode;

    if (needsPremiumUnlock) {
      const decision = adService.getPremiumExportDecision();
      if (!decision.allowed) {
        onNeedRewardUnlock?.('premium_export', () => {
          window.setTimeout(() => {
            void handleExport();
          }, 0);
        });
        return;
      }
      adService.recordPremiumExportOpened(decision.channel);
    }

    setIsExporting(true);
    try {
      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      if (paginateMode) {
        const pages = renderBeadsPaginated(beadData, currentOption.cellSize, boardSize, {
          showGrid,
          showCoords,
          showMajorGrid,
        });

        for (const page of pages) {
          const link = document.createElement('a');
          link.download = `perler-${patternWidth}x${patternHeight}-p${page.pageIndex + 1}of${page.totalPages}-${timestamp}.png`;
          link.href = page.canvas.toDataURL('image/png');
          link.click();
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      } else {
        const canvas = document.createElement('canvas');
        if (showBeadList) {
          renderBeadsToCanvasWithList(
            beadData,
            canvas,
            currentOption.cellSize,
            showGrid,
            showCoords,
            showMajorGrid,
            true
          );
        } else {
          renderBeadsToCanvas(
            beadData,
            canvas,
            currentOption.cellSize,
            showGrid,
            showCoords,
            showMajorGrid
          );
        }

        const link = document.createElement('a');
        link.download = `perler-${patternWidth}x${patternHeight}-${currentOption.id}-${timestamp}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      }

      setTimeout(() => {
        setIsExporting(false);
        onClose();
      }, 300);
    } catch (error) {
      console.error('导出失败:', error);
      setIsExporting(false);
    }
  };

  if (!visible) return null;

  return createPortal(
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>导出图案</h2>
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={18} weight="bold" />
          </button>
        </div>

        <div style={styles.content}>
          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>选择分辨率</h3>
            <div style={styles.optionList}>
              {exportOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  style={{
                    ...styles.optionItem,
                    ...(selectedOption === option.id ? styles.optionItemActive : {}),
                    borderColor: selectedOption === option.id ? option.color : colors.border.soft,
                  }}
                  onClick={() => setSelectedOption(option.id)}
                >
                  <div
                    style={{
                      ...styles.optionIcon,
                      background: `linear-gradient(145deg, ${option.color}30, ${option.color}12)`,
                    }}
                  >
                    <option.icon size={18} weight="fill" style={{ color: option.color }} />
                  </div>
                  <div style={styles.optionTextWrap}>
                    <div style={styles.optionLabelRow}>
                      <span style={styles.optionLabel}>{option.label}</span>
                      {option.recommended ? <span style={styles.recommendTag}>推荐</span> : null}
                    </div>
                    <span style={styles.optionDesc}>{option.description}</span>
                    <span style={styles.optionMeta}>预计文件大小：{estimateFileSize(option.cellSize)}</span>
                  </div>
                  {selectedOption === option.id ? (
                    <span style={{ ...styles.checkedIcon, background: option.color }}>
                      <Check size={12} weight="bold" color="#fff" />
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </section>

          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>导出选项</h3>
            <div style={styles.switchList}>
              <label style={styles.switchItem}>
                <span style={styles.switchLabel}>显示网格线</span>
                <input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} />
              </label>
              <label style={styles.switchItem}>
                <span style={styles.switchLabel}>显示坐标刻度</span>
                <input type="checkbox" checked={showCoords} onChange={(e) => setShowCoords(e.target.checked)} />
              </label>
              <label style={styles.switchItem}>
                <span style={styles.switchLabel}>显示大网格线（5x5/10x10）</span>
                <input
                  type="checkbox"
                  checked={showMajorGrid}
                  onChange={(e) => setShowMajorGrid(e.target.checked)}
                />
              </label>
              <label style={styles.switchItem}>
                <span style={styles.switchLabel}>显示豆子清单</span>
                <input
                  type="checkbox"
                  checked={showBeadList}
                  onChange={(e) => setShowBeadList(e.target.checked)}
                />
              </label>
              <label style={styles.switchItem}>
                <span style={styles.switchLabel}>按拼豆板分页导出</span>
                <input
                  type="checkbox"
                  checked={paginateMode}
                  onChange={(e) => setPaginateMode(e.target.checked)}
                />
              </label>
            </div>
          </section>

          {paginateMode ? (
            <section style={styles.section}>
              <h3 style={styles.sectionTitle}>分页设置</h3>
              <div style={styles.pageSetting}>
                <label style={styles.pageSettingLabel}>拼豆板规格</label>
                <select
                  value={boardSize}
                  onChange={(e) => setBoardSize(Number(e.target.value))}
                  style={styles.select}
                >
                  {getAllBoardOptions().map((item) => (
                    <option key={item.size} value={item.size}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <div style={styles.pageHint}>
                  预计导出 {paginatedPageCount} 页（当前图案 {patternWidth}x{patternHeight}）
                </div>
              </div>
            </section>
          ) : null}
        </div>

        <div style={styles.footer}>
          <button style={styles.exportBtn} onClick={handleExport} disabled={isExporting}>
            <Download size={16} weight="bold" />
            <span>{isExporting ? '导出中...' : '导出图片'}</span>
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
    inset: 0,
    zIndex: 12000,
    background: 'rgba(0, 0, 0, 0.72)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  modal: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '92vh',
    background: colors.bg.card,
    border: `1px solid ${colors.border.soft}`,
    borderRadius: radius.card,
    boxShadow: shadows.xl,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 14px 10px',
    borderBottom: `1px solid ${colors.border.soft}`,
  },
  title: {
    margin: 0,
    color: colors.text.primary,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
  },
  closeBtn: {
    width: 30,
    height: 30,
    border: 'none',
    borderRadius: radius.bead,
    background: colors.bg.tertiary,
    color: colors.text.secondary,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    overflowY: 'auto',
    padding: 14,
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  sectionTitle: {
    margin: 0,
    color: colors.text.primary,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },
  optionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  optionItem: {
    border: `1px solid ${colors.border.soft}`,
    borderRadius: radius.md,
    background: colors.bg.secondary,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 12px',
    color: colors.text.primary,
    cursor: 'pointer',
    textAlign: 'left',
  },
  optionItemActive: {
    background: 'linear-gradient(145deg, rgba(107,154,212,0.18), rgba(108,200,173,0.10))',
  },
  optionIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  optionTextWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    minWidth: 0,
  },
  optionLabelRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  optionLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
  },
  recommendTag: {
    fontSize: 11,
    padding: '1px 6px',
    borderRadius: 999,
    background: `${colors.bead.green}25`,
    color: colors.bead.green,
  },
  optionDesc: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  optionMeta: {
    fontSize: 11,
    color: colors.text.muted,
  },
  checkedIcon: {
    marginLeft: 'auto',
    width: 18,
    height: 18,
    borderRadius: 999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    padding: 10,
    borderRadius: radius.md,
    background: colors.bg.secondary,
    border: `1px solid ${colors.border.soft}`,
  },
  switchItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    gap: 10,
  },
  switchLabel: {
    lineHeight: 1.4,
  },
  pageSetting: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    padding: 10,
    borderRadius: radius.md,
    background: colors.bg.secondary,
    border: `1px solid ${colors.border.soft}`,
  },
  pageSettingLabel: {
    fontSize: 12,
    color: colors.text.muted,
  },
  select: {
    borderRadius: 8,
    border: `1px solid ${colors.border.soft}`,
    background: colors.bg.card,
    color: colors.text.primary,
    padding: '8px 10px',
  },
  pageHint: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  footer: {
    borderTop: `1px solid ${colors.border.soft}`,
    padding: 12,
  },
  exportBtn: {
    width: '100%',
    border: 'none',
    borderRadius: radius.button,
    background: `linear-gradient(145deg, ${colors.bead.cyan}, ${colors.bead.cyan}cc)`,
    color: '#fff',
    padding: '11px 14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    fontWeight: typography.fontWeight.bold,
    cursor: 'pointer',
  },
};

export default ExportModal;
