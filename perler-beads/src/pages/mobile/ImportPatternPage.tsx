import React, { useMemo, useRef, useState } from 'react';
import { ArrowLeft, GridFour, Image, SpinnerGap, WarningCircle } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { colors, radius, typography, shadows, animation, mixins } from '../../styles/designSystem';
import {
  guessPatternGridCandidates,
  summarizeLowConfidenceCells,
} from '../../utils/patternImport.js';
import {
  importPatternImageToBeadData,
  PatternImportLowConfidenceCell,
} from '../../services/patternImportService';
import { BeadPixelData } from '../../services/colorMatchService';

type GridCandidate = {
  rows: number;
  cols: number;
};

const EDITOR_RESUME_DRAFT_KEY = 'editorResumeDraft';

const ImportPatternPage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  const [rows, setRows] = useState(58);
  const [cols, setCols] = useState(58);
  const [gridCandidates, setGridCandidates] = useState<GridCandidate[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resultBeadData, setResultBeadData] = useState<BeadPixelData | null>(null);
  const [resultColorCount, setResultColorCount] = useState(0);
  const [lowConfidenceCells, setLowConfidenceCells] = useState<PatternImportLowConfidenceCell[]>([]);

  const canGenerate = Boolean(imageData) && rows > 0 && cols > 0 && !isProcessing;
  const summaryText = useMemo(() => {
    if (!resultBeadData) {
      return null;
    }

    return `${resultBeadData.width} x ${resultBeadData.height} · ${resultColorCount} 色`;
  }, [resultBeadData, resultColorCount]);

  const lowConfidenceSummary = useMemo(() => summarizeLowConfidenceCells(lowConfidenceCells), [lowConfidenceCells]);

  const handleBack = () => {
    navigate(-1);
  };

  const handleSelectFile = () => {
    fileInputRef.current?.click();
  };

  const handleApplyCandidate = (candidate: GridCandidate) => {
    setRows(candidate.rows);
    setCols(candidate.cols);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('请选择图片文件');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const nextImageData = typeof reader.result === 'string' ? reader.result : null;
      setImageData(nextImageData);
      setPreviewUrl(null);
      setResultBeadData(null);
      setResultColorCount(0);
      setLowConfidenceCells([]);
      setErrorMessage(null);

      if (!nextImageData) {
        setGridCandidates([]);
        return;
      }

      const image = new Image();
      image.onload = () => {
        const candidates = guessPatternGridCandidates({
          imageWidth: image.naturalWidth,
          imageHeight: image.naturalHeight,
        }) as GridCandidate[];
        setGridCandidates(candidates);
        if (candidates.length > 0) {
          setRows(candidates[0].rows);
          setCols(candidates[0].cols);
        }
      };
      image.onerror = () => {
        setGridCandidates([]);
      };
      image.src = nextImageData;
    };
    reader.onerror = () => {
      setErrorMessage('图片读取失败，请重试');
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!imageData) {
      setErrorMessage('请先上传图纸图片');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const result = await importPatternImageToBeadData(imageData, {
        rows,
        cols,
      });

      setPreviewUrl(result.previewDataUrl);
      setResultBeadData(result.beadData);
      setResultColorCount(result.colorCount);
      setLowConfidenceCells(result.lowConfidenceCells);
    } catch (error) {
      console.error('[ImportPatternPage] generate bead data failed:', error);
      setErrorMessage('识别失败，请确认图片清晰，并重新设置行列');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImportToEditor = () => {
    if (!imageData || !resultBeadData) {
      setErrorMessage('请先生成可用预览');
      return;
    }

    const draftPayload = {
      imageData,
      gridWidth: resultBeadData.width,
      colorCount: resultColorCount,
      beadData: resultBeadData,
      initialBeadData: resultBeadData,
      regeneratedBaseData: resultBeadData,
      importSource: 'external-pattern-import',
      lowConfidenceCells,
    };

    sessionStorage.setItem(EDITOR_RESUME_DRAFT_KEY, JSON.stringify(draftPayload));
    navigate('/mobile/editor');
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={handleBack}>
          <ArrowLeft size={20} weight="bold" />
        </button>
        <h1 style={styles.title}>导入现成图纸</h1>
        <div style={styles.headerSpacer} />
      </div>

      <div style={styles.content}>
        <div style={styles.heroCard}>
          <div style={styles.heroIconBox}>
            <GridFour size={28} weight="duotone" />
          </div>
          <p style={styles.heroTitle}>上传彩色拼豆图纸截图</p>
          <p style={styles.heroText}>v1 适合彩色图纸、预览图、截图。系统会先猜一组常见尺寸，再按格取色导入编辑器。</p>
        </div>

        <button style={styles.uploadCard} onClick={handleSelectFile}>
          <div style={styles.uploadIconBox}>
            <Image size={36} weight="duotone" />
          </div>
          <span style={styles.uploadTitle}>{imageData ? '重新选择图纸图片' : '选择图纸图片'}</span>
          <span style={styles.uploadHint}>支持 JPG、PNG、WEBP</span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        {imageData && (
          <div style={styles.previewBlock}>
            <p style={styles.blockTitle}>原图预览</p>
            <img src={imageData} alt="外部图纸原图" style={styles.previewImage} />
          </div>
        )}

        <div style={styles.gridCard}>
          <p style={styles.blockTitle}>网格设置</p>
          {gridCandidates.length > 0 && (
            <div style={styles.candidateGroup}>
              <p style={styles.candidateTitle}>推荐尺寸</p>
              <div style={styles.candidateList}>
                {gridCandidates.map((candidate) => {
                  const isActive = candidate.rows === rows && candidate.cols === cols;
                  return (
                    <button
                      key={`${candidate.rows}x${candidate.cols}`}
                      style={{
                        ...styles.candidateChip,
                        ...(isActive ? styles.candidateChipActive : null),
                      }}
                      onClick={() => handleApplyCandidate(candidate)}
                    >
                      {candidate.rows} x {candidate.cols}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div style={styles.gridRow}>
            <label style={styles.field}>
              <span style={styles.fieldLabel}>行数</span>
              <input
                style={styles.input}
                type="number"
                min={1}
                max={512}
                value={rows}
                onChange={(event) => setRows(Math.max(1, Number(event.target.value) || 1))}
              />
            </label>
            <label style={styles.field}>
              <span style={styles.fieldLabel}>列数</span>
              <input
                style={styles.input}
                type="number"
                min={1}
                max={512}
                value={cols}
                onChange={(event) => setCols(Math.max(1, Number(event.target.value) || 1))}
              />
            </label>
          </div>
          <p style={styles.fieldHint}>建议先点推荐尺寸；如果你知道精确规格，比如 58x58、104x58，也可以手动改。</p>
          <button style={styles.primaryButton} onClick={handleGenerate} disabled={!canGenerate}>
            {isProcessing ? <SpinnerGap size={18} weight="bold" /> : null}
            <span>{isProcessing ? '正在识别图纸...' : '生成识别预览'}</span>
          </button>
        </div>

        {errorMessage && <div style={styles.errorCard}>{errorMessage}</div>}

        {previewUrl && resultBeadData && (
          <div style={styles.previewBlock}>
            <p style={styles.blockTitle}>识别结果预览</p>
            <img src={previewUrl} alt="识别结果预览" style={styles.previewImage} />
            {summaryText && <p style={styles.summaryText}>{summaryText}</p>}
            {lowConfidenceSummary.count > 0 && (
              <div style={styles.warningCard}>
                <div style={styles.warningHeader}>
                  <WarningCircle size={18} weight="fill" />
                  <span>检测到 {lowConfidenceSummary.count} 格高风险位置</span>
                </div>
                <p style={styles.warningText}>
                  建议进编辑器后先检查
                  {lowConfidenceSummary.preview ? `：${lowConfidenceSummary.preview}` : '这些位置'}
                </p>
              </div>
            )}
            <button style={styles.importButton} onClick={handleImportToEditor}>
              导入编辑器校对
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: colors.bg.primary,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    background: colors.bg.secondary,
    borderBottom: `1px solid ${colors.border.soft}`,
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  backBtn: {
    ...mixins.backButton,
  },
  title: {
    margin: 0,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.primary,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    padding: '16px',
  },
  heroCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    padding: '18px',
    background: colors.bg.card,
    borderRadius: radius.card,
    border: `1px solid ${colors.border.soft}`,
    boxShadow: shadows.sm,
  },
  heroIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: colors.bead.cyan,
    background: `${colors.bead.cyan}18`,
  },
  heroTitle: {
    margin: 0,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  heroText: {
    margin: 0,
    fontSize: typography.fontSize.sm,
    lineHeight: 1.6,
    color: colors.text.secondary,
  },
  uploadCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '28px 20px',
    borderRadius: radius.card,
    border: `2px dashed ${colors.bead.cyan}50`,
    background: colors.bg.card,
    boxShadow: shadows.sm,
    cursor: 'pointer',
  },
  uploadIconBox: {
    width: 72,
    height: 72,
    borderRadius: radius.bead,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: colors.bead.cyan,
    background: `${colors.bead.cyan}18`,
  },
  uploadTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    fontFamily: typography.fontFamilyAlt,
  },
  uploadHint: {
    fontSize: typography.fontSize.sm,
    color: colors.text.muted,
    fontFamily: typography.fontFamilyAlt,
  },
  gridCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    padding: '16px',
    borderRadius: radius.card,
    background: colors.bg.card,
    border: `1px solid ${colors.border.soft}`,
  },
  blockTitle: {
    margin: 0,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  candidateGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  candidateTitle: {
    margin: 0,
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
  },
  candidateList: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  candidateChip: {
    padding: '8px 12px',
    borderRadius: radius.full,
    border: `1px solid ${colors.border.soft}`,
    background: colors.bg.secondary,
    color: colors.text.secondary,
    cursor: 'pointer',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
  },
  candidateChipActive: {
    border: `1px solid ${colors.bead.cyan}`,
    background: `${colors.bead.cyan}18`,
    color: colors.bead.cyan,
    boxShadow: shadows.sm,
  },
  gridRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  fieldLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: radius.button,
    border: `1px solid ${colors.border.soft}`,
    background: colors.bg.secondary,
    color: colors.text.primary,
    fontSize: typography.fontSize.md,
    outline: 'none',
    boxSizing: 'border-box',
  },
  fieldHint: {
    margin: 0,
    fontSize: typography.fontSize.xs,
    lineHeight: 1.6,
    color: colors.text.muted,
  },
  primaryButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    padding: '14px',
    borderRadius: radius.button,
    border: 'none',
    cursor: 'pointer',
    color: '#ffffff',
    background: `linear-gradient(145deg, ${colors.bead.cyan}, ${colors.bead.cyan}cc)`,
    boxShadow: `${shadows.button}, ${shadows.glow.cyan}`,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    transition: animation.transition.fast,
  },
  errorCard: {
    padding: '12px 14px',
    borderRadius: radius.button,
    background: 'rgba(244, 99, 99, 0.14)',
    border: `1px solid ${colors.border.soft}`,
    color: colors.text.primary,
    fontSize: typography.fontSize.sm,
  },
  warningCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    padding: '12px 14px',
    borderRadius: radius.button,
    background: 'rgba(255, 191, 71, 0.14)',
    border: '1px solid rgba(255, 191, 71, 0.32)',
  },
  warningHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    color: colors.bead.orange,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
  },
  warningText: {
    margin: 0,
    fontSize: typography.fontSize.xs,
    lineHeight: 1.6,
    color: colors.text.secondary,
  },
  previewBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    padding: '16px',
    borderRadius: radius.card,
    background: colors.bg.card,
    border: `1px solid ${colors.border.soft}`,
  },
  previewImage: {
    width: '100%',
    borderRadius: radius.md,
    border: `1px solid ${colors.border.soft}`,
    imageRendering: 'pixelated',
  },
  summaryText: {
    margin: 0,
    fontSize: typography.fontSize.sm,
    color: colors.bead.yellow,
    fontFamily: typography.fontFamilyAlt,
  },
  importButton: {
    width: '100%',
    padding: '14px',
    borderRadius: radius.button,
    border: 'none',
    cursor: 'pointer',
    color: '#ffffff',
    background: `linear-gradient(145deg, ${colors.bead.green}, ${colors.bead.green}cc)`,
    boxShadow: `${shadows.button}, ${shadows.glow.green}`,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
  },
};

export default ImportPatternPage;