import React, { useState, useRef } from 'react';
import { Camera, Image, ArrowLeft, Lightbulb, Palette } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { colors, radius, typography, shadows, animation, mixins } from '../../styles/designSystem';
import { colorCountOptions, defaultColorCount } from '../../data/beadColors';
import ImageCropper from '../../components/ImageCropper';
import { analyzeImage } from '../../services/imageAnalysisService';

/**
 * 创建页 - 上传图片
 * 柔和像素风格设计
 *
 * 流程：选择图片/拍照 → 裁剪页面 → 预览+颜色选择 → 开始生成
 */
const CreatePage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  // 原始图片 (未裁剪)
  const [rawImage, setRawImage] = useState<string | null>(null);
  // 裁剪后的图片
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [colorCount, setColorCount] = useState<number>(defaultColorCount);
  // 网格宽度（由系统自动分析决定）
  const [gridWidth, setGridWidth] = useState<number>(52);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        // 设置原始图片，进入裁剪流程
        setRawImage(e.target?.result as string);
        setCroppedImage(null); // 重置裁剪后的图片
      };
      reader.readAsDataURL(file);
    }
  };

  // 裁剪完成回调
  const handleCropComplete = async (croppedImg: string) => {
    setCroppedImage(croppedImg);

    // 自动分析图片复杂度，决定网格宽度
    setIsAnalyzing(true);
    try {
      const result = await analyzeImage(croppedImg);
      setGridWidth(result.recommendedWidth);
    } catch (error) {
      console.error('Image analysis failed:', error);
      // 分析失败时使用默认值
      setGridWidth(52);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 取消裁剪回调
  const handleCropCancel = () => {
    setRawImage(null);
    setCroppedImage(null);
  };

  // 重新选择图片
  const handleReselect = () => {
    setRawImage(null);
    setCroppedImage(null);
    setGridWidth(52);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleCameraClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute('capture', 'environment');
      fileInputRef.current.click();
      fileInputRef.current.removeAttribute('capture');
    }
  };

  return (
    <div style={styles.container}>
      {/* 固定头部导航 */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate(-1)}>
          <ArrowLeft size={20} weight="bold" />
        </button>
        <h1 style={styles.title}>创建图案</h1>
        <div style={styles.placeholder} />
      </div>
      {/* Header占位 */}
      <div style={styles.headerSpacer} />

      {/* 裁剪页面 - 全屏覆盖 */}
      {rawImage && !croppedImage && (
        <ImageCropper
          imageSrc={rawImage}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}

      {/* 主内容区 */}
      <div style={styles.content}>
        {!rawImage ? (
          <>
            {/* 上传框 */}
            <div style={styles.uploadBox} onClick={handleUploadClick}>
              <div style={styles.uploadIconBox}>
                <Image size={40} weight="duotone" />
              </div>
              <p style={styles.uploadText}>点击选择图片</p>
              <p style={styles.uploadHint}>支持 JPG、PNG，最大 10MB</p>
            </div>

            {/* 拍照按钮 */}
            <button style={styles.cameraBtn} onClick={handleCameraClick}>
              <Camera size={22} weight="fill" />
              <span>拍照</span>
            </button>

            {/* 隐藏的文件输入 */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />
          </>
        ) : croppedImage ? (
          <>
            {/* 预览框 - 显示裁剪后的图片 */}
            <div style={styles.previewBox}>
              <img src={croppedImage} alt="Preview" style={styles.previewImage} />
            </div>

            {/* 颜色数量选择 - 紧凑横向布局 */}
            <div style={styles.colorCountSection}>
              <div style={styles.colorCountHeader}>
                <Palette size={16} weight="fill" style={{ color: colors.bead.purple }} />
                <span style={styles.colorCountTitle}>颜色数量</span>
                <span style={styles.colorCountHint}>越多越细腻</span>
              </div>
              <div style={styles.colorCountTabs}>
                {colorCountOptions.map((opt) => (
                  <button
                    key={opt.count}
                    style={{
                      ...styles.colorCountTab,
                      ...(colorCount === opt.count ? styles.colorCountTabActive : {}),
                    }}
                    onClick={() => setColorCount(opt.count)}
                  >
                    {opt.count}
                  </button>
                ))}
              </div>
            </div>

            {/* 操作按钮 */}
            <div style={styles.actions}>
              <button style={styles.secondaryBtn} onClick={handleReselect}>
                重新选择
              </button>
              <button
                style={styles.primaryBtn}
                onClick={() => navigate('/mobile/editor', {
                  state: { imageData: croppedImage, colorCount, gridWidth }
                })}
              >
                开始生成 →
              </button>
            </div>
          </>
        ) : null}

        {/* 提示卡片 - 仅在上传阶段和预览阶段显示 */}
        {(!rawImage || croppedImage) && (
        <div style={styles.tips}>
          <div style={styles.tipsHeader}>
            <Lightbulb size={18} weight="fill" style={{ color: colors.bead.yellow }} />
            <h3 style={styles.tipsTitle}>小贴士</h3>
          </div>
          <ul style={styles.tipsList}>
            <li><span style={styles.tipBullet}>●</span> 选择清晰、背景简单的图片效果更好</li>
            <li><span style={styles.tipBullet}>●</span> 人像照片建议裁剪到只保留面部</li>
            <li><span style={styles.tipBullet}>●</span> 卡通图案和像素画转换效果最佳</li>
          </ul>
        </div>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100%',
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
    padding: '20px 16px',
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
    marginBottom: '24px',
    transition: animation.transition.fast,
  },

  previewBox: {
    position: 'relative',
    width: '100%',
    aspectRatio: '1',
    borderRadius: radius.card,
    overflow: 'hidden',
    background: colors.bg.tertiary,
    marginBottom: '20px',
    boxShadow: shadows.md,
    border: `2px solid ${colors.bead.cyan}40`,
  },

  previewImage: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },

  actions: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
  },

  secondaryBtn: {
    flex: 1,
    padding: '14px',
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
    padding: '14px',
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

  tips: {
    padding: '16px',
    background: colors.bg.card,
    borderRadius: radius.card,
    border: `1px solid ${colors.bead.yellow}30`,
    boxShadow: `${shadows.sm}, 0 4px 20px ${colors.bead.yellow}10`,
  },

  tipsHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
  },

  tipsTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    color: colors.bead.yellow,
    margin: 0,
  },

  tipsList: {
    margin: 0,
    padding: 0,
    listStyle: 'none',
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.secondary,
    lineHeight: 2,
  },

  tipBullet: {
    color: colors.bead.cyan,
    marginRight: '8px',
    fontSize: '8px',
  },

  // 颜色数量选择样式 - 紧凑横向布局
  colorCountSection: {
    marginBottom: '16px',
    padding: '12px',
    background: colors.bg.card,
    borderRadius: radius.card,
    boxShadow: shadows.sm,
  },

  colorCountHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '10px',
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

  colorCountTabs: {
    display: 'flex',
    gap: '8px',
  },

  colorCountTab: {
    flex: 1,
    padding: '10px 4px',
    background: colors.bg.tertiary,
    border: `1px solid ${colors.border.soft}`,
    borderRadius: radius.button,
    cursor: 'pointer',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.secondary,
    transition: animation.transition.fast,
  },

  colorCountTabActive: {
    background: `linear-gradient(145deg, ${colors.bead.cyan}30, ${colors.bead.cyan}15)`,
    borderColor: colors.bead.cyan,
    color: colors.bead.cyan,
    boxShadow: `0 0 8px ${colors.bead.cyan}30`,
  },

  };

export default CreatePage;
