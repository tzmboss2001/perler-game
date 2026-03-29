import React, { useRef, useState } from 'react';
import { Camera, Image, ArrowLeft, SpinnerGap } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { colors, radius, typography, shadows, animation, mixins } from '../../styles/designSystem';
import { defaultColorCount } from '../../data/beadColors';
import ImageCropper from '../../components/ImageCropper';
import { analyzeImage } from '../../services/imageAnalysisService';
import { imageOptimizationConfig, prepareImageForCreation } from '../../services/imageOptimizationService';
import EditorPage, { EditorStateData } from './EditorPage';
import BannerAd from '../../components/ads/BannerAd';

const CreatePage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [rawImage, setRawImage] = useState<string | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [colorCount, setColorCount] = useState<number>(defaultColorCount);
  const [gridWidth, setGridWidth] = useState<number>(52);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isHdOptimizeFlow, setIsHdOptimizeFlow] = useState(false);
  const [optimizationSummary, setOptimizationSummary] = useState<string | null>(null);

  const [editorState, setEditorState] = useState<EditorStateData | null>(null);

  const resetInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const applySelectedFile = async (file: File) => {
    const useHdOptimizeFlow = file.size > imageOptimizationConfig.quickUploadMaxBytes;
    setIsHdOptimizeFlow(useHdOptimizeFlow);
    setIsOptimizing(true);
    setOptimizationSummary(null);

    try {
      const result = await prepareImageForCreation(file);
      setRawImage(result.optimizedDataUrl);
      setCroppedImage(null);

      if (result.optimized) {
        const beforeMb = (result.originalSizeBytes / 1024 / 1024).toFixed(1);
        const afterMb = (result.optimizedSizeBytes / 1024 / 1024).toFixed(1);
        setOptimizationSummary(
          `已自动优化：${beforeMb}MB -> ${afterMb}MB，${result.originalWidth}x${result.originalHeight} -> ${result.optimizedWidth}x${result.optimizedHeight}`
        );
      }
    } catch (error) {
      console.error('Image preparation failed:', error);
      alert('图片优化失败，请换一张图片再试');
      resetInput();
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await applySelectedFile(file);
  };

  const handleCropComplete = async (croppedImg: string) => {
    setCroppedImage(croppedImg);
    setIsAnalyzing(true);
    let nextGridWidth = 52;
    let nextColorCount = defaultColorCount;

    try {
      const result = await analyzeImage(croppedImg);
      nextGridWidth = result.recommendedWidth;
      nextColorCount = result.recommendedColorCount;
    } catch (error) {
      console.error('Image analysis failed:', error);
    }

    setGridWidth(nextGridWidth);
    setColorCount(nextColorCount);
    setEditorState({
      imageData: croppedImg,
      colorCount: nextColorCount,
      gridWidth: nextGridWidth,
    });
    setIsAnalyzing(false);
  };

  const handleCropCancel = () => {
    setRawImage(null);
    setCroppedImage(null);
    setIsHdOptimizeFlow(false);
    setOptimizationSummary(null);
  };

  const handleReselect = () => {
    setRawImage(null);
    setCroppedImage(null);
    setGridWidth(52);
    setColorCount(defaultColorCount);
    setIsHdOptimizeFlow(false);
    setOptimizationSummary(null);
    resetInput();
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

  const handleHeaderBack = () => {
    if (rawImage && croppedImage) {
      setCroppedImage(null);
      return;
    }
    if (rawImage && !croppedImage) {
      setRawImage(null);
      setCroppedImage(null);
      setIsHdOptimizeFlow(false);
      setOptimizationSummary(null);
      return;
    }
    navigate(-1);
  };

  const currentStepTitle = !rawImage ? '上传图片' : !croppedImage ? '裁剪图片' : '生成图案';
  const uploadLimitMb = (imageOptimizationConfig.quickUploadMaxBytes / 1024 / 1024).toFixed(0);

  if (editorState) {
    return (
      <EditorPage
        embeddedStateData={editorState}
        onBack={() => {
          setEditorState(null);
          setCroppedImage(null);
        }}
      />
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={handleHeaderBack}>
          <ArrowLeft size={20} weight="bold" />
        </button>
        <h1 style={styles.title}>{currentStepTitle}</h1>
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
              <p style={styles.uploadHint}>支持 JPG、PNG，{uploadLimitMb}MB 内快速导入，超大图会自动优化后继续</p>
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

            {isOptimizing && (
              <div style={styles.optimizingNotice}>
                <SpinnerGap size={18} weight="bold" />
                <span>{isHdOptimizeFlow ? '正在自动优化高清原图，请稍候…' : '正在读取图片，请稍候…'}</span>
              </div>
            )}

            {optimizationSummary && <div style={styles.optimizedSummary}>{optimizationSummary}</div>}

            <div style={styles.tipsCard}>
              <p style={styles.tipsCardTitle}>选图建议</p>
              <div style={styles.tipsCardBody}>
                <p style={styles.tipItem}><span style={styles.tipDot} />背景简单、光线充足，效果更好</p>
                <p style={styles.tipItem}><span style={styles.tipDot} />人像建议裁剪到主体区域</p>
                <p style={styles.tipItem}><span style={styles.tipDot} />卡通图案和像素风通常转换更稳定</p>
                <p style={styles.tipItem}><span style={styles.tipDot} />高清大图会先自动优化，再进入裁剪和编辑</p>
              </div>
            </div>

            <BannerAd placement="create_inline" />
          </div>
        ) : croppedImage ? (
          <div style={styles.generatingCard}>
            <div style={styles.generatingIcon}>
              <SpinnerGap size={26} weight="bold" />
            </div>
            <p style={styles.generatingTitle}>正在生成推荐方案</p>
            <p style={styles.generatingText}>
              系统会根据图案复杂度自动推荐网格宽度和颜色数量，然后直接进入编辑。
            </p>
            <p style={styles.generatingMeta}>当前推荐：{gridWidth} 宽 / {colorCount} 色</p>
            <button style={styles.secondaryBtn} onClick={handleReselect} disabled={isAnalyzing}>
              重新选图
            </button>
          </div>
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
    gap: 12,
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
    textAlign: 'center',
    lineHeight: 1.5,
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
    transition: animation.transition.fast,
  },

  optimizingNotice: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '12px 14px',
    borderRadius: radius.button,
    background: 'rgba(107, 200, 255, 0.12)',
    color: colors.text.primary,
    border: `1px solid ${colors.border.soft}`,
  },

  optimizedSummary: {
    padding: '12px 14px',
    borderRadius: radius.button,
    background: 'rgba(126, 214, 165, 0.12)',
    border: `1px solid ${colors.border.soft}`,
    color: colors.text.secondary,
    fontSize: typography.fontSize.sm,
    lineHeight: 1.5,
  },

  generatingCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '40px 24px',
    borderRadius: radius.xl,
    background: colors.bg.secondary,
    border: `1px solid ${colors.border.soft}`,
    boxShadow: shadows.card,
    textAlign: 'center',
  },

  generatingIcon: {
    width: '56px',
    height: '56px',
    borderRadius: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: colors.bead.cyan,
    background: `${colors.bead.cyan}18`,
    animation: 'spin 1s linear infinite',
  },

  generatingTitle: {
    margin: 0,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },

  generatingText: {
    margin: 0,
    fontSize: typography.fontSize.sm,
    lineHeight: 1.6,
    color: colors.text.secondary,
  },

  generatingMeta: {
    margin: 0,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamilyAlt,
    color: colors.bead.yellow,
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
