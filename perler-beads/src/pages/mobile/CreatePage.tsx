import React, { useState, useRef } from 'react';
import { Camera, Image, ArrowLeft, Lightbulb, Palette, Gear } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { colors, radius, typography, shadows, animation, mixins } from '../../styles/designSystem';
import { colorCountOptions, defaultColorCount } from '../../data/beadColors';
import ImageCropper from '../../components/ImageCropper';
import { analyzeImage } from '../../services/imageAnalysisService';
import MyColorsModal from '../../components/MyColorsModal';
import { myColorsService } from '../../services/myColorsService';

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
  // 自定义色板
  const [useMyColors, setUseMyColors] = useState(false);
  const [showMyColorsModal, setShowMyColorsModal] = useState(false);
  const [myColorCount, setMyColorCount] = useState(() => myColorsService.getSelectedIds().length);

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

            {/* 颜色数量选择 - 3×2卡片网格 */}
            <div style={styles.colorCountSection}>
              <div style={styles.colorCountHeader}>
                <Palette size={16} weight="fill" style={{ color: colors.bead.purple }} />
                <span style={styles.colorCountTitle}>颜色数量</span>
                <span style={styles.colorCountHint}>越多越细腻</span>
              </div>
              <div style={styles.colorCountGrid}>
                {colorCountOptions.map((opt) => (
                  <div
                    key={opt.count}
                    style={{
                      ...styles.colorCountCard,
                      ...(colorCount === opt.count ? styles.colorCountCardActive : {}),
                    }}
                    onClick={() => setColorCount(opt.count)}
                  >
                    {opt.recommended && (
                      <span style={styles.recommendTag}>推荐</span>
                    )}
                    <span style={styles.cardIcon}>{opt.icon}</span>
                    <span style={{
                      ...styles.cardCount,
                      ...(colorCount === opt.count ? { color: colors.bead.cyan } : {}),
                    }}>{opt.label}</span>
                    <span style={styles.cardDesc}>{opt.description}</span>
                    <span style={styles.cardDetail}>{opt.detailDesc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 自定义色板开关 */}
            <div style={styles.myColorsSection}>
              <div style={styles.myColorsRow}>
                <div style={styles.myColorsLeft}>
                  <span style={styles.myColorsLabel}>只用我的颜色</span>
                  {myColorCount > 0 && useMyColors && (
                    <span style={styles.myColorsBadge}>{myColorCount}色</span>
                  )}
                </div>
                <div style={styles.myColorsRight}>
                  <button
                    style={styles.myColorsManageBtn}
                    onClick={() => setShowMyColorsModal(true)}
                  >
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
                    <span style={{
                      ...styles.switchTrack,
                      background: useMyColors
                        ? `linear-gradient(145deg, ${colors.bead.cyan}, ${colors.bead.cyan}cc)`
                        : colors.bg.tertiary,
                    }} className="toggle-slider" />
                  </label>
                </div>
              </div>
              {useMyColors && myColorCount > 0 && (
                <span style={styles.myColorsHint}>
                  生成图案时仅使用你拥有的 {myColorCount} 种颜色
                </span>
              )}
            </div>

            {/* 操作按钮 */}
            <div style={styles.actions}>
              <button style={styles.secondaryBtn} onClick={handleReselect}>
                重新选择
              </button>
              <button
                style={styles.primaryBtn}
                onClick={() => {
                  const customColorIds = useMyColors ? myColorsService.getSelectedIds() : undefined;
                  navigate('/mobile/editor', {
                    state: { imageData: croppedImage, colorCount, gridWidth, customColorIds }
                  });
                }}
              >
                开始生成 →
              </button>
            </div>

            {/* 我的色板管理弹窗 */}
            <MyColorsModal
              visible={showMyColorsModal}
              onClose={() => setShowMyColorsModal(false)}
              onSave={(ids) => {
                setMyColorCount(ids.length);
                if (ids.length > 0) setUseMyColors(true);
              }}
            />
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

  // 颜色数量选择样式 - 3×2卡片网格
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

  colorCountGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
  },

  colorCountCard: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '10px 4px 8px',
    background: colors.bg.tertiary,
    border: `2px solid ${colors.border.soft}`,
    borderRadius: radius.card,
    cursor: 'pointer',
    transition: animation.transition.fast,
    gap: '2px',
  } as React.CSSProperties,

  colorCountCardActive: {
    background: `linear-gradient(145deg, ${colors.bead.cyan}20, ${colors.bead.cyan}08)`,
    borderColor: colors.bead.cyan,
    boxShadow: `0 0 12px ${colors.bead.cyan}25`,
  },

  recommendTag: {
    position: 'absolute',
    top: '-1px',
    right: '-1px',
    padding: '1px 6px',
    fontSize: '9px',
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyAlt,
    color: '#fff',
    background: `linear-gradient(135deg, ${colors.bead.pink}, ${colors.bead.orange})`,
    borderRadius: `0 ${radius.card} 0 8px`,
    lineHeight: '16px',
  } as React.CSSProperties,

  cardIcon: {
    fontSize: '20px',
    lineHeight: '24px',
  },

  cardCount: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.primary,
    lineHeight: '18px',
  },

  cardDesc: {
    fontSize: '10px',
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.secondary,
    lineHeight: '14px',
  },

  cardDetail: {
    fontSize: '9px',
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.muted,
    lineHeight: '12px',
  },

  // 自定义色板样式
  myColorsSection: {
    marginBottom: '16px',
    padding: '12px',
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
  } as React.CSSProperties,

  myColorsHint: {
    display: 'block',
    marginTop: '8px',
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyAlt,
    color: colors.bead.cyan,
  },

  };

export default CreatePage;
