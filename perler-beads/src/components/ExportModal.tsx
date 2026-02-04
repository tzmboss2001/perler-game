import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, Image, FileImage, Check } from '@phosphor-icons/react';
import { colors, radius, typography, shadows, animation, mixins } from '../styles/designSystem';
import { BeadPixelData, renderBeadsToCanvas, renderBeadsToCanvasWithList } from '../services/colorMatchService';

interface ExportModalProps {
  visible: boolean;
  onClose: () => void;
  beadData: BeadPixelData;
}

interface ExportOption {
  id: string;
  label: string;
  description: string;
  cellSize: number;
  icon: React.ElementType;
  color: string;
  recommended?: boolean;
}

/**
 * 导出选项弹窗
 * 让用户选择导出分辨率
 */
const ExportModal: React.FC<ExportModalProps> = ({
  visible,
  onClose,
  beadData,
}) => {
  const [selectedOption, setSelectedOption] = useState<string>('hd');
  const [isExporting, setIsExporting] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showCoords, setShowCoords] = useState(true);
  const [showMajorGrid, setShowMajorGrid] = useState(true); // 显示大网格线（5×5 + 10×10）
  const [showBeadList, setShowBeadList] = useState(true); // 显示珠子清单

  // 计算图案尺寸
  const patternWidth = beadData.width;
  const patternHeight = beadData.height;

  // 导出选项配置
  const exportOptions: ExportOption[] = [
    {
      id: 'small',
      label: '小图',
      description: `${patternWidth * 10}×${patternHeight * 10}px · 快速分享`,
      cellSize: 10,
      icon: Image,
      color: colors.bead.green,
    },
    {
      id: 'standard',
      label: '标准',
      description: `${patternWidth * 20}×${patternHeight * 20}px · 日常使用`,
      cellSize: 20,
      icon: FileImage,
      color: colors.bead.cyan,
    },
    {
      id: 'hd',
      label: '高清',
      description: `${patternWidth * 40}×${patternHeight * 40}px · 适合打印`,
      cellSize: 40,
      icon: FileImage,
      color: colors.bead.purple,
      recommended: true,
    },
    {
      id: 'ultra',
      label: '超高清',
      description: `${patternWidth * 80}×${patternHeight * 80}px · 高质量打印`,
      cellSize: 80,
      icon: FileImage,
      color: colors.bead.pink,
    },
    {
      id: 'max',
      label: '极清',
      description: `${patternWidth * 100}×${patternHeight * 100}px · 专业海报`,
      cellSize: 100,
      icon: FileImage,
      color: colors.bead.orange,
    },
  ];

  // 获取当前选中的选项
  const currentOption = exportOptions.find(opt => opt.id === selectedOption) || exportOptions[1];

  // 预估文件大小
  const estimateFileSize = (cellSize: number): string => {
    const pixels = patternWidth * cellSize * patternHeight * cellSize;
    // PNG 压缩比大约 1:10 到 1:20，像素图压缩效果好
    const estimatedBytes = pixels * 0.5; // 粗略估算
    if (estimatedBytes < 1024) {
      return `${Math.round(estimatedBytes)} B`;
    } else if (estimatedBytes < 1024 * 1024) {
      return `${Math.round(estimatedBytes / 1024)} KB`;
    } else {
      return `${(estimatedBytes / 1024 / 1024).toFixed(1)} MB`;
    }
  };

  // 执行导出
  const handleExport = async () => {
    setIsExporting(true);

    try {
      // 创建画布并渲染
      const canvas = document.createElement('canvas');

      // 根据是否显示清单选择渲染函数
      if (showBeadList) {
        renderBeadsToCanvasWithList(beadData, canvas, currentOption.cellSize, showGrid, showCoords, showMajorGrid, true);
      } else {
        renderBeadsToCanvas(beadData, canvas, currentOption.cellSize, showGrid, showCoords, showMajorGrid);
      }

      // 生成下载链接
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      link.download = `perler-${patternWidth}x${patternHeight}-${currentOption.id}-${timestamp}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      // 短暂延迟后关闭
      setTimeout(() => {
        setIsExporting(false);
        onClose();
      }, 500);
    } catch (error) {
      console.error('导出失败:', error);
      setIsExporting(false);
    }
  };

  if (!visible) return null;

  return createPortal(
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        {/* 头部 */}
        <div style={styles.header}>
          <h2 style={styles.title}>导出图案</h2>
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={20} weight="bold" />
          </button>
        </div>

        {/* 可滚动内容区域 */}
        <div style={styles.content}>
          {/* 分辨率选项 */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>选择分辨率</h3>
            <div style={styles.optionList}>
              {exportOptions.map((option) => (
                <div
                  key={option.id}
                  style={{
                    ...styles.optionItem,
                    ...(selectedOption === option.id ? {
                      borderColor: option.color,
                      background: `linear-gradient(145deg, ${option.color}15, ${option.color}08)`,
                    } : {}),
                  }}
                  onClick={() => setSelectedOption(option.id)}
                >
                  <div style={{
                    ...styles.optionIcon,
                    background: `linear-gradient(145deg, ${option.color}30, ${option.color}15)`,
                  }}>
                    <option.icon size={20} weight="fill" style={{ color: option.color }} />
                  </div>
                  <div style={styles.optionContent}>
                    <div style={styles.optionHeader}>
                      <span style={styles.optionLabel}>{option.label}</span>
                      {option.recommended && (
                        <span style={styles.recommendBadge}>推荐</span>
                      )}
                    </div>
                    <span style={styles.optionDesc}>{option.description}</span>
                    <span style={styles.optionSize}>
                      预估大小: ~{estimateFileSize(option.cellSize)}
                    </span>
                  </div>
                  {selectedOption === option.id && (
                    <div style={{
                      ...styles.checkIcon,
                      background: option.color,
                    }}>
                      <Check size={14} weight="bold" color="#fff" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 导出选项 */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>导出选项</h3>
            <div style={styles.toggleList}>
              <label style={styles.toggleItem}>
                <span style={styles.toggleLabel}>显示网格线</span>
                <input
                  type="checkbox"
                  checked={showGrid}
                  onChange={(e) => setShowGrid(e.target.checked)}
                  style={styles.checkbox}
                />
                <span style={{
                  ...styles.toggleSlider,
                  background: showGrid
                    ? `linear-gradient(145deg, ${colors.bead.cyan}, ${colors.bead.cyan}cc)`
                    : colors.bg.tertiary,
                }} />
              </label>
              <label style={styles.toggleItem}>
                <span style={styles.toggleLabel}>显示坐标刻度</span>
                <input
                  type="checkbox"
                  checked={showCoords}
                  onChange={(e) => setShowCoords(e.target.checked)}
                  style={styles.checkbox}
                />
                <span style={{
                  ...styles.toggleSlider,
                  background: showCoords
                    ? `linear-gradient(145deg, ${colors.bead.cyan}, ${colors.bead.cyan}cc)`
                    : colors.bg.tertiary,
                }} />
              </label>
              <label style={styles.toggleItem}>
                <div style={styles.toggleLabelGroup}>
                  <span style={styles.toggleLabel}>显示大网格线</span>
                  <span style={styles.toggleHint}>5×5蓝线 + 10×10黑线</span>
                </div>
                <input
                  type="checkbox"
                  checked={showMajorGrid}
                  onChange={(e) => setShowMajorGrid(e.target.checked)}
                  style={styles.checkbox}
                />
                <span style={{
                  ...styles.toggleSlider,
                  background: showMajorGrid
                    ? `linear-gradient(145deg, ${colors.bead.orange}, ${colors.bead.orange}cc)`
                    : colors.bg.tertiary,
                }} />
              </label>
              <label style={styles.toggleItem}>
                <div style={styles.toggleLabelGroup}>
                  <span style={styles.toggleLabel}>显示珠子清单</span>
                  <span style={styles.toggleHint}>在图纸右侧显示颜色列表</span>
                </div>
                <input
                  type="checkbox"
                  checked={showBeadList}
                  onChange={(e) => setShowBeadList(e.target.checked)}
                  style={styles.checkbox}
                />
                <span style={{
                  ...styles.toggleSlider,
                  background: showBeadList
                    ? `linear-gradient(145deg, ${colors.bead.purple}, ${colors.bead.purple}cc)`
                    : colors.bg.tertiary,
                }} />
              </label>
            </div>
          </div>

          {/* 预览信息 */}
          <div style={styles.previewInfo}>
            <div style={styles.previewRow}>
              <span style={styles.previewLabel}>图案尺寸</span>
              <span style={styles.previewValue}>{patternWidth} × {patternHeight} 珠子</span>
            </div>
            <div style={styles.previewRow}>
              <span style={styles.previewLabel}>导出尺寸</span>
              <span style={styles.previewValue}>
                {patternWidth * currentOption.cellSize} × {patternHeight * currentOption.cellSize} px
              </span>
            </div>
          </div>
        </div>

        {/* 固定底部导出按钮 */}
        <div style={styles.footer}>
          <button
            style={{
              ...styles.exportBtn,
              ...(isExporting ? styles.exportBtnDisabled : {}),
            }}
            onClick={handleExport}
            disabled={isExporting}
          >
            <Download size={20} weight="bold" />
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
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    zIndex: 1100,
    animation: 'fadeIn 0.2s ease-out',
  },

  modal: {
    width: '100%',
    maxWidth: '500px',
    maxHeight: '85vh',
    background: colors.bg.secondary,
    borderRadius: `${radius.card} ${radius.card} 0 0`,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    animation: 'slideUp 0.3s ease-out',
  },

  content: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
  },

  footer: {
    flexShrink: 0,
    padding: '16px 20px',
    paddingTop: '0',
    background: colors.bg.secondary,
  },

  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: `1px solid ${colors.border.soft}`,
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
  },

  closeBtn: {
    ...mixins.iconButton,
    background: colors.bg.tertiary,
  },

  section: {
    padding: '16px 20px',
  },

  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.secondary,
    margin: '0 0 12px',
  },

  optionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },

  optionItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    background: colors.bg.card,
    borderRadius: radius.card,
    border: `2px solid ${colors.border.soft}`,
    cursor: 'pointer',
    transition: animation.transition.fast,
  },

  optionIcon: {
    width: '44px',
    height: '44px',
    borderRadius: radius.bead,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  optionContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },

  optionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },

  optionLabel: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.primary,
  },

  recommendBadge: {
    fontSize: '10px',
    padding: '2px 6px',
    background: colors.bead.pink,
    color: '#fff',
    borderRadius: radius.full,
    fontWeight: typography.fontWeight.medium,
  },

  optionDesc: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.muted,
  },

  optionSize: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.secondary,
  },

  checkIcon: {
    width: '24px',
    height: '24px',
    borderRadius: radius.full,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  toggleList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },

  toggleItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    background: colors.bg.card,
    borderRadius: radius.bead,
    cursor: 'pointer',
  },

  toggleLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.primary,
  },

  toggleLabelGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },

  toggleHint: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.muted,
  },

  checkbox: {
    display: 'none',
  },

  toggleSlider: {
    width: '44px',
    height: '24px',
    borderRadius: radius.full,
    position: 'relative',
    transition: animation.transition.fast,
  },

  previewInfo: {
    margin: '0 20px 16px',
    padding: '12px 16px',
    background: colors.bg.tertiary,
    borderRadius: radius.bead,
  },

  previewRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '4px 0',
  },

  previewLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.muted,
  },

  previewValue: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.primary,
    fontWeight: typography.fontWeight.medium,
  },

  exportBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%',
    padding: '16px',
    background: `linear-gradient(145deg, ${colors.bead.green}, ${colors.bead.green}cc)`,
    border: 'none',
    borderRadius: radius.button,
    color: '#ffffff',
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    cursor: 'pointer',
    boxShadow: `${shadows.button}, ${shadows.glow.green}`,
    transition: animation.transition.fast,
  },

  exportBtnDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
};

// 添加动画样式
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes slideUp {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }

  /* Toggle slider thumb */
  .toggle-slider::before {
    content: "";
    position: absolute;
    width: 20px;
    height: 20px;
    left: 2px;
    top: 2px;
    background: white;
    border-radius: 50%;
    transition: 0.3s;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  }

  input:checked + .toggle-slider::before {
    transform: translateX(20px);
  }
`;
if (!document.querySelector('#export-modal-styles')) {
  styleSheet.id = 'export-modal-styles';
  document.head.appendChild(styleSheet);
}

export default ExportModal;
