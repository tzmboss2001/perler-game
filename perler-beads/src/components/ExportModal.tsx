import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Download, FileImage, Image, X } from '@phosphor-icons/react';
import { colors, radius, shadows, typography } from '../styles/designSystem';
import { useToast } from './Toast';
import {
  BeadPixelData,
  renderBeadsOverviewCanvas,
  renderBeadsPaginated,
  renderBeadsToCanvas,
  renderBeadsToCanvasWithList,
} from '../services/colorMatchService';
import { BOARD_SPECS, recommendBoard } from '../services/boardService';
import { adService } from '../services/adService';
import {
  buildOverviewExportFilename,
  buildPaginatedBoardExportFilename,
} from '../utils/singleBoardInteraction.js';
import {
  buildPaginatedZipFilename,
  createStoredZipBlob,
} from '../utils/zipExport.js';

const EXPORT_MAX_DIMENSION = 32767;
const EXPORT_MAX_AREA = 268000000;

const getSafeExportCellSize = (
  width: number,
  height: number,
  requestedCellSize: number,
) => {
  const maxByDimension = Math.floor(
    EXPORT_MAX_DIMENSION / Math.max(1, Math.max(width, height)),
  );
  const maxByArea = Math.floor(
    Math.sqrt(EXPORT_MAX_AREA / Math.max(1, width * height)),
  );
  return Math.max(
    4,
    Math.min(requestedCellSize, maxByDimension || requestedCellSize, maxByArea || requestedCellSize),
  );
};

const canvasToPngBlob = async (canvas: HTMLCanvasElement) => {
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((nextBlob) => resolve(nextBlob), 'image/png');
  });
  if (!blob) {
    throw new Error('导出失败：浏览器未能生成图片数据');
  }
  return blob;
};

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement('a');
    link.download = filename;
    link.href = url;
    link.click();
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
};

const downloadCanvasAsPng = async (canvas: HTMLCanvasElement, filename: string) => {
  const blob = await canvasToPngBlob(canvas);
  downloadBlob(blob, filename);
};

const buildExportRetryCellSizes = (
  width: number,
  height: number,
  requestedCellSize: number,
) => {
  const safeCellSize = getSafeExportCellSize(width, height, requestedCellSize);
  const retryFactors = [1, 0.92, 0.85, 0.75, 0.65, 0.55, 0.45, 0.35];
  const sizes = retryFactors
    .map((factor) => Math.max(4, Math.floor(safeCellSize * factor)))
    .filter((size, index, list) => list.indexOf(size) === index)
    .sort((a, b) => b - a);
  if (sizes[sizes.length - 1] !== 4) {
    sizes.push(4);
  }
  return sizes;
};

interface ExportModalProps {
  visible: boolean;
  onClose: () => void;
  beadData: BeadPixelData;
  defaultPaginateMode?: boolean;
  defaultBoardSize?: number;
  includeOverview?: boolean;
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
  defaultPaginateMode = false,
  defaultBoardSize,
  includeOverview = false,
  onNeedRewardUnlock,
}) => {
  const toast = useToast();
  const [selectedOption, setSelectedOption] = useState<ExportOption['id']>('hd');
  const [isExporting, setIsExporting] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showCoords, setShowCoords] = useState(true);
  const [showMajorGrid, setShowMajorGrid] = useState(true);
  const [showBeadList, setShowBeadList] = useState(true);
  const [paginateMode, setPaginateMode] = useState(defaultPaginateMode);

  const smartBoard = useMemo(
    () => recommendBoard(beadData.width, beadData.height),
    [beadData.width, beadData.height],
  );
  const [boardSize, setBoardSize] = useState(defaultBoardSize ?? smartBoard.boardSize);

  useEffect(() => {
    if (!visible) return;
    setPaginateMode(defaultPaginateMode);
    setBoardSize(defaultBoardSize ?? smartBoard.boardSize);
  }, [defaultBoardSize, defaultPaginateMode, smartBoard.boardSize, visible]);

  const patternWidth = beadData.width;
  const patternHeight = beadData.height;

  const exportOptions: ExportOption[] = [
    {
      id: 'small',
      label: '小图',
      description: `${patternWidth * 10}x${patternHeight * 10}px · 快速预览或临时分享`,
      cellSize: 10,
      icon: Image,
      color: colors.bead.green,
    },
    {
      id: 'standard',
      label: '标准',
      description: `${patternWidth * 20}x${patternHeight * 20}px · 日常查看与普通保存`,
      cellSize: 20,
      icon: FileImage,
      color: colors.bead.cyan,
    },
    {
      id: 'hd',
      label: '高清',
      description: `${patternWidth * 40}x${patternHeight * 40}px · 适合打印与精细对照`,
      cellSize: 40,
      icon: FileImage,
      color: colors.bead.purple,
      recommended: true,
    },
    {
      id: 'ultra',
      label: '超高清',
      description: `${patternWidth * 80}x${patternHeight * 80}px · 高质量打印版`,
      cellSize: 80,
      icon: FileImage,
      color: colors.bead.pink,
    },
    {
      id: 'max',
      label: '极清',
      description: `${patternWidth * 100}x${patternHeight * 100}px · 超大图纸输出`,
      cellSize: 100,
      icon: FileImage,
      color: colors.bead.orange,
    },
  ];

  const currentOption = exportOptions.find((opt) => opt.id === selectedOption) || exportOptions[2];

  const estimateFileSize = (cellSize: number): string => {
    const safeCellSize = getSafeExportCellSize(patternWidth, patternHeight, cellSize);
    const pixels = patternWidth * safeCellSize * patternHeight * safeCellSize;
    const estimatedBytes = pixels * 0.5;
    if (estimatedBytes < 1024) return `${Math.round(estimatedBytes)} B`;
    if (estimatedBytes < 1024 * 1024) return `${Math.round(estimatedBytes / 1024)} KB`;
    return `${(estimatedBytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const getEffectiveCellSize = (cellSize: number) =>
    getSafeExportCellSize(patternWidth, patternHeight, cellSize);

  const ultraEffectiveCellSize = getEffectiveCellSize(
    exportOptions.find((item) => item.id === 'ultra')?.cellSize ?? 80,
  );
  const maxEffectiveCellSize = getEffectiveCellSize(
    exportOptions.find((item) => item.id === 'max')?.cellSize ?? 100,
  );
  const ultraAndMaxEquivalent = ultraEffectiveCellSize === maxEffectiveCellSize;

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
      const retryCellSizes = buildExportRetryCellSizes(
        patternWidth,
        patternHeight,
        currentOption.cellSize,
      );
      let successfulCellSize: number | null = null;
      if (paginateMode) {
        let lastError: unknown = null;
        for (const cellSize of retryCellSizes) {
          try {
            const zipFiles: Array<{ name: string; blob: Blob }> = [];
            if (includeOverview) {
              const overviewCanvas = document.createElement('canvas');
              const overviewCellSize = Math.max(
                4,
                Math.min(14, Math.floor(1800 / Math.max(patternWidth, patternHeight))),
              );
              renderBeadsOverviewCanvas(beadData, overviewCanvas, overviewCellSize, boardSize);
              zipFiles.push({
                name: buildOverviewExportFilename({
                  width: patternWidth,
                  height: patternHeight,
                  timestamp,
                }),
                blob: await canvasToPngBlob(overviewCanvas),
              });
            }

            const pages = renderBeadsPaginated(beadData, cellSize, boardSize, {
              showGrid,
              showCoords,
              showMajorGrid,
              showColorCode: true,
            });

            for (const page of pages) {
              zipFiles.push({
                name: buildPaginatedBoardExportFilename({
                  width: patternWidth,
                  height: patternHeight,
                  boardNumber: page.boardNumber,
                  pageIndex: page.pageIndex,
                  totalPages: page.totalPages,
                  timestamp,
                }),
                blob: await canvasToPngBlob(page.canvas),
              });
            }

            const zipBlob = await createStoredZipBlob(zipFiles);
            downloadBlob(
              zipBlob,
              buildPaginatedZipFilename({
                width: patternWidth,
                height: patternHeight,
                timestamp,
              }),
            );
            successfulCellSize = cellSize;
            break;
          } catch (error) {
            lastError = error;
          }
        }
        if (!successfulCellSize) {
          throw lastError || new Error('导出失败：浏览器无法生成分页图纸');
        }
      } else {
        let lastError: unknown = null;
        for (const cellSize of retryCellSizes) {
          try {
            const canvas = document.createElement('canvas');
            if (showBeadList) {
              renderBeadsToCanvasWithList(
                beadData,
                canvas,
                cellSize,
                showGrid,
                true,
                showMajorGrid,
                true,
                { showCoords, boardSize },
              );
            } else {
              renderBeadsToCanvas(
                beadData,
                canvas,
                cellSize,
                showGrid,
                true,
                showMajorGrid,
                { showCoords, boardSize },
              );
            }
            await downloadCanvasAsPng(
              canvas,
              `perler-${patternWidth}x${patternHeight}-${currentOption.id}-${timestamp}.png`,
            );
            successfulCellSize = cellSize;
            break;
          } catch (error) {
            lastError = error;
          }
        }
        if (!successfulCellSize) {
          throw lastError || new Error('导出失败：浏览器无法生成图片');
        }
      }

      const declaredCellSize = getEffectiveCellSize(currentOption.cellSize);
      if (successfulCellSize && successfulCellSize < declaredCellSize) {
        toast.warning(
          `当前图案过大，已自动按每格 ${successfulCellSize}px 安全导出。若需要更清楚的图纸，建议使用分页打印版。`,
          5000,
        );
      }

      setTimeout(() => {
        setIsExporting(false);
        onClose();
      }, 300);
    } catch (error) {
      console.error('导出失败:', error);
      const message =
        error instanceof Error && error.message
          ? error.message
          : '导出失败：当前图案过大，请尝试降低清晰度或改用分页打印版。';
      toast.error(message, 5000);
      setIsExporting(false);
    }
  };

  if (!visible) return null;

  return createPortal(
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>导出图纸</h2>
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={18} weight="bold" />
          </button>
        </div>

        <div style={styles.content}>
          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>导出清晰度</h3>
            <p style={styles.sectionDesc}>高清和分页打印版更适合真正照着做，普通导出适合临时查看。</p>
            {ultraAndMaxEquivalent ? (
              <p style={styles.precisionHint}>
                当前图案尺寸较大，`超高清` 与 `极清` 的实际导出精度相同，继续提高档位不会再增加清晰度。
              </p>
            ) : null}
            <div style={styles.optionList}>
              {exportOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  style={{
                    ...styles.optionItem,
                    ...(selectedOption === option.id ? styles.optionItemActive : {}),
                    border: `1px solid ${selectedOption === option.id ? option.color : colors.border.soft}`,
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
                    <span style={styles.optionMeta}>
                      实际导出精度：每格 {getEffectiveCellSize(option.cellSize)} px · 预计文件大小：{estimateFileSize(option.cellSize)}
                    </span>
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
            <h3 style={styles.sectionTitle}>导出内容</h3>
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
                <span style={styles.switchLabel}>显示现实豆板分区线</span>
                <input
                  type="checkbox"
                  checked={showMajorGrid}
                  onChange={(e) => setShowMajorGrid(e.target.checked)}
                />
              </label>
              <label style={styles.switchItem}>
                <span style={styles.switchLabel}>附带珠子清单</span>
                <input
                  type="checkbox"
                  checked={showBeadList}
                  onChange={(e) => setShowBeadList(e.target.checked)}
                />
              </label>
              <label style={styles.switchItem}>
                <span style={styles.switchLabel}>按拼豆板分页导出（打印版）</span>
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
              <h3 style={styles.sectionTitle}>分页打印设置</h3>
              <div style={styles.pageSetting}>
                <label style={styles.pageSettingLabel}>拼豆板规格</label>
                <select
                  value={boardSize}
                  onChange={(e) => setBoardSize(Number(e.target.value))}
                  style={styles.select}
                >
                  {BOARD_SPECS.map((item) => (
                    <option key={item.size} value={item.size}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <div style={styles.pageHint}>
                  将下载 1 个 ZIP 压缩包，内含 {paginatedPageCount} 张分板图纸
                  {includeOverview ? '和 1 张总览图' : ''}（当前图案 {patternWidth}x{patternHeight}）
                </div>
              </div>
            </section>
          ) : null}
        </div>

        <div style={styles.footer}>
          <button style={styles.exportBtn} onClick={handleExport} disabled={isExporting}>
            <Download size={16} weight="bold" />
            <span>{isExporting ? '导出中...' : paginateMode ? '导出打印版图纸' : '导出图片'}</span>
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
  sectionDesc: {
    margin: '2px 0 0',
    fontSize: 12,
    color: colors.text.secondary,
    lineHeight: 1.5,
  },
  precisionHint: {
    margin: '2px 0 0',
    fontSize: 12,
    color: colors.bead.orange,
    lineHeight: 1.5,
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
