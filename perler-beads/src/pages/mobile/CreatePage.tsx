import React, { useState, useRef } from 'react';
import { Camera, Image, ArrowLeft, Palette, Gear, Lightning } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { colors, radius, typography, shadows, animation, mixins } from '../../styles/designSystem';
import { colorCountOptions, defaultColorCount } from '../../data/beadColors';
import ImageCropper from '../../components/ImageCropper';
import { analyzeImage } from '../../services/imageAnalysisService';
import MyColorsModal from '../../components/MyColorsModal';
import { myColorsService } from '../../services/myColorsService';
import BannerAd from '../../components/ads/BannerAd';

const CreatePage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [rawImage, setRawImage] = useState<string | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [colorCount, setColorCount] = useState<number>(defaultColorCount);
  const [gridWidth, setGridWidth] = useState<number>(52);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [useMyColors, setUseMyColors] = useState(false);
  const [showMyColorsModal, setShowMyColorsModal] = useState(false);
  const [myColorCount, setMyColorCount] = useState(() => myColorsService.getSelectedIds().length);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alert(`图片太大（${(file.size / 1024 / 1024).toFixed(1)}MB），请选择 10MB 以内的图片`);
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setRawImage(e.target?.result as string);
      setCroppedImage(null);
      setShowAdvanced(false);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (croppedImg: string) => {
    setCroppedImage(croppedImg);
    setIsAnalyzing(true);

    try {
      const result = await analyzeImage(croppedImg);
      setGridWidth(result.recommendedWidth);
    } catch (error) {
      console.error('Image analysis failed:', error);
      setGridWidth(52);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCropCancel = () => {
    setRawImage(null);
    setCroppedImage(null);
  };

  const handleReselect = () => {
    setRawImage(null);
    setCroppedImage(null);
    setGridWidth(52);
    setShowAdvanced(false);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleCameraClick = () => {
    if (!fileInputRef.current) return;
    fileInputRef.current.setAttribute('capture', 'environment');
    fileInputRef.current.click();
    fileInputRef.current.removeAttribute('capture');
  };

  const navigateToEditor = (opts?: { fastMode?: boolean }) => {
    if (!croppedImage) return;

    const isFastMode = opts?.fastMode ?? false;
    const nextColorCount = isFastMode ? defaultColorCount : colorCount;
    const customColorIds = !isFastMode && useMyColors ? myColorsService.getSelectedIds() : undefined;

    navigate('/mobile/editor', {
      state: {
        imageData: croppedImage,
        colorCount: nextColorCount,
        gridWidth,
        customColorIds,
      },
    });
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate(-1)}>
          <ArrowLeft size={20} weight="bold" />
        </button>
        <h1 style={styles.title}>创建图案</h1>
        <div style={styles.placeholder} />
      </div>
      <div style={styles.headerSpacer} />

      {rawImage && !croppedImage && (
        <ImageCropper imageSrc={rawImage} onCropComplete={handleCropComplete} onCancel={handleCropCancel} />
      )}

      <div style={styles.content}>
        {!rawImage ? (
          <div style={styles.uploadPhase}>
            <div style={styles.uploadBox} onClick={handleUploadClick}>
              <div style={styles.uploadIconBox}>
                <Image size={40} weight="duotone" />
              </div>
              <p style={styles.uploadText}>点击选择图片</p>
              <p style={styles.uploadHint}>支持 JPG、PNG，最大 10MB</p>
            </div>

            <button style={styles.cameraBtn} onClick={handleCameraClick}>
              <Camera size={22} weight="fill" />
              <span>拍照</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />

            <div style={styles.tipsCard}>
              <p style={styles.tipsCardTitle}>选图建议</p>
              <div style={styles.tipsCardBody}>
                <p style={styles.tipItem}><span style={styles.tipDot} />背景简单、光线充足，效果更好</p>
                <p style={styles.tipItem}><span style={styles.tipDot} />人像建议裁剪到主体区域</p>
                <p style={styles.tipItem}><span style={styles.tipDot} />卡通图案和像素风通常转换更稳定</p>
                <p style={styles.tipItem}><span style={styles.tipDot} />对比度高的图片更容易还原细节</p>
              </div>
            </div>
          </div>
        ) : croppedImage ? (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />

            <div style={styles.previewBox}>
              <img src={croppedImage} alt="预览图" style={styles.previewImage} />
            </div>

            <p style={styles.analysisLine}>
              {isAnalyzing ? '正在分析图片复杂度...' : `系统建议网格宽度：${gridWidth}`}
            </p>

            <BannerAd placement="create_inline" />

            <div style={styles.actionsPrimary}>
              <button style={styles.quickBtn} onClick={() => navigateToEditor({ fastMode: true })}>
                <Lightning size={16} weight="fill" />
                <span>快速开始（推荐）</span>
              </button>
            </div>

            <div style={styles.actionsSecondary}>
              <button style={styles.secondaryBtn} onClick={handleReselect}>重新选图</button>
              <button style={styles.secondaryBtn} onClick={() => setShowAdvanced((v) => !v)}>
                {showAdvanced ? '收起高级设置' : '打开高级设置'}
              </button>
            </div>

            {showAdvanced && (
              <>
                <div style={styles.colorCountSection}>
                  <div style={styles.colorCountHeader}>
                    <Palette size={14} weight="fill" style={{ color: colors.bead.purple }} />
                    <span style={styles.colorCountTitle}>颜色数量</span>
                    <span style={styles.colorCountHint}>
                      {colorCountOptions.find((o) => o.count === colorCount)?.description}
                      {' · '}
                      {colorCountOptions.find((o) => o.count === colorCount)?.detailDesc}
                    </span>
                  </div>
                  <div style={styles.colorCountRow}>
                    {colorCountOptions.map((opt) => (
                      <button
                        key={opt.count}
                        style={{
                          ...styles.colorCountPill,
                          ...(colorCount === opt.count ? styles.colorCountPillActive : {}),
                        }}
                        onClick={() => setColorCount(opt.count)}
                      >
                        <span>{opt.label}</span>
                        {opt.recommended && <span style={styles.recommendDot} />}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={styles.myColorsSection}>
                  <div style={styles.myColorsRow}>
                    <div style={styles.myColorsLeft}>
                      <span style={styles.myColorsLabel}>只用我的颜色</span>
                      {myColorCount > 0 && useMyColors && (
                        <span style={styles.myColorsBadge}>{myColorCount} 色</span>
                      )}
                    </div>
                    <div style={styles.myColorsRight}>
                      <button style={styles.myColorsManageBtn} onClick={() => setShowMyColorsModal(true)}>
                        <Gear size={14} />
                        <span>管理</span>
                      </button>
                      <label style={styles.switchLabel}>
                        <input
                          type="checkbox"
                          checked={useMyColors}
                          onChange={(e) => {
                            if (e.target.checked && myColorCount === 0) {
                              setShowMyColorsModal(true);
                              return;
                            }
                            setUseMyColors(e.target.checked);
                          }}
                          style={{ display: 'none' }}
                        />
                        <span
                          style={{
                            ...styles.switchTrack,
                            background: useMyColors
                              ? `linear-gradient(145deg, ${colors.bead.cyan}, ${colors.bead.cyan}cc)`
                              : colors.bg.tertiary,
                          }}
                        />
                      </label>
                    </div>
                  </div>
                  {useMyColors && myColorCount > 0 && (
                    <span style={styles.myColorsHint}>生成时仅使用你已选择的 {myColorCount} 种颜色</span>
                  )}
                </div>

                <div style={styles.actionsPrimary}>
                  <button style={styles.primaryBtn} onClick={() => navigateToEditor()}>
                    按高级设置生成
                  </button>
                </div>

                <p style={styles.tipsLine}>颜色越多越细腻，但制作难度也会更高</p>
              </>
            )}

            <MyColorsModal
              visible={showMyColorsModal}
              onClose={() => setShowMyColorsModal(false)}
              onSave={(ids) => {
                setMyColorCount(ids.length);
                if (ids.length > 0) {
                  setUseMyColors(true);
                }
              }}
            />
          </>
        ) : null}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: 'calc(100vh - 65px)',
    display: 'flex',
    flexDirection: 'column',
    background: colors.bg.primary,
  },

  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    background: colors.bg.secondary,
    borderBottom: `1px solid ${colors.border.soft}`,
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },

  headerSpacer: {
    height: '56px',
  },

  backBtn: {
    ...mixins.backButton,
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

  placeholder: {
    width: 40,
  },

  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: '12px 16px',
  },

  uploadPhase: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },

  uploadBox: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 24px',
    background: colors.bg.card,
    border: `2px dashed ${colors.bead.cyan}50`,
    borderRadius: radius.card,
    cursor: 'pointer',
    marginBottom: '16px',
    boxShadow: shadows.sm,
    transition: animation.transition.fast,
  },

  uploadIconBox: {
    width: '80px',
    height: '80px',
    background: `linear-gradient(145deg, ${colors.bead.cyan}30, ${colors.bead.cyan}15)`,
    borderRadius: radius.bead,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '16px',
    color: colors.bead.cyan,
    boxShadow: `0 4px 20px ${colors.bead.cyan}20`,
  },

  uploadText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.primary,
    margin: '0 0 8px',
  },

  uploadHint: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.muted,
    margin: 0,
  },

  cameraBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    width: '100%',
    padding: '14px',
    background: `linear-gradient(145deg, ${colors.bead.green}, ${colors.bead.green}cc)`,
    border: 'none',
    borderRadius: radius.button,
    color: '#ffffff',
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    cursor: 'pointer',
    boxShadow: `${shadows.button}, ${shadows.glow.green}`,
    marginBottom: '16px',
    transition: animation.transition.fast,
  },

  previewBox: {
    position: 'relative',
    width: '100%',
    flex: 1,
    minHeight: '200px',
    borderRadius: radius.card,
    overflow: 'hidden',
    background: colors.bg.tertiary,
    marginBottom: '10px',
    boxShadow: shadows.md,
    border: `2px solid ${colors.bead.cyan}40`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  previewImage: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },

  analysisLine: {
    margin: '0 0 10px',
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.muted,
    textAlign: 'center',
  },

  actionsPrimary: {
    display: 'flex',
    marginBottom: '8px',
  },

  actionsSecondary: {
    display: 'flex',
    gap: '10px',
    marginBottom: '10px',
  },

  quickBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px',
    background: `linear-gradient(145deg, ${colors.bead.orange}, ${colors.bead.red})`,
    border: 'none',
    borderRadius: radius.button,
    color: '#ffffff',
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyAlt,
    cursor: 'pointer',
    boxShadow: `${shadows.button}, ${shadows.glow.orange}`,
    transition: animation.transition.fast,
  },

  secondaryBtn: {
    flex: 1,
    padding: '12px',
    background: colors.bg.tertiary,
    border: `1px solid ${colors.border.soft}`,
    borderRadius: radius.button,
    color: colors.text.primary,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    cursor: 'pointer',
    boxShadow: shadows.sm,
    transition: animation.transition.fast,
  },

  primaryBtn: {
    flex: 1,
    padding: '12px',
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

  colorCountSection: {
    marginBottom: '12px',
    padding: '10px 12px',
    background: colors.bg.card,
    borderRadius: radius.card,
    boxShadow: shadows.sm,
  },

  colorCountHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '8px',
  },

  colorCountTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.primary,
    margin: 0,
  },

  colorCountHint: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.muted,
    marginLeft: 'auto',
  },

  colorCountRow: {
    display: 'flex',
    gap: '8px',
  },

  colorCountPill: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    padding: '6px 0',
    background: colors.bg.tertiary,
    border: `1.5px solid ${colors.border.soft}`,
    borderRadius: radius.button,
    cursor: 'pointer',
    transition: animation.transition.fast,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.secondary,
  },

  colorCountPillActive: {
    background: `linear-gradient(145deg, ${colors.bead.cyan}20, ${colors.bead.cyan}08)`,
    borderColor: colors.bead.cyan,
    color: colors.bead.cyan,
    boxShadow: `0 0 8px ${colors.bead.cyan}20`,
  },

  recommendDot: {
    position: 'absolute',
    top: '3px',
    right: '3px',
    width: '5px',
    height: '5px',
    borderRadius: '50%',
    background: `linear-gradient(135deg, ${colors.bead.pink}, ${colors.bead.orange})`,
  },

  myColorsSection: {
    marginBottom: '10px',
    padding: '10px 12px',
    background: colors.bg.card,
    borderRadius: radius.card,
    boxShadow: shadows.sm,
  },

  myColorsRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  myColorsLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },

  myColorsLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.primary,
  },

  myColorsBadge: {
    padding: '1px 8px',
    background: `linear-gradient(145deg, ${colors.bead.cyan}30, ${colors.bead.cyan}15)`,
    borderRadius: radius.full,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    color: colors.bead.cyan,
  },

  myColorsRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },

  myColorsManageBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    background: colors.bg.tertiary,
    border: `1px solid ${colors.border.soft}`,
    borderRadius: radius.button,
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.secondary,
    cursor: 'pointer',
    transition: animation.transition.fast,
  },

  switchLabel: {
    display: 'inline-flex',
    cursor: 'pointer',
  },

  switchTrack: {
    width: '44px',
    height: '24px',
    borderRadius: radius.full,
    position: 'relative',
    transition: animation.transition.fast,
    border: `1px solid ${colors.border.soft}`,
  },

  myColorsHint: {
    display: 'block',
    marginTop: '8px',
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyAlt,
    color: colors.bead.cyan,
  },

  tipsLine: {
    margin: 0,
    padding: 0,
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.muted,
    textAlign: 'center',
  },

  tipsCard: {
    padding: '14px 16px',
    background: colors.bg.card,
    borderRadius: radius.card,
    border: `1px solid ${colors.border.soft}`,
  },

  tipsCardTitle: {
    margin: '0 0 10px',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.primary,
  },

  tipsCardBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },

  tipItem: {
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.secondary,
    lineHeight: '1.5',
  },

  tipDot: {
    width: '4px',
    height: '4px',
    minWidth: '4px',
    borderRadius: '50%',
    background: colors.bead.cyan,
  },
};

export default CreatePage;
