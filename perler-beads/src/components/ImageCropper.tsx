import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import ReactCrop, { Crop, PixelCrop, makeAspectCrop, centerCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { ArrowLeft, Check } from '@phosphor-icons/react';
import { colors, radius, typography, shadows, animation, mixins } from '../styles/designSystem';

interface ImageCropperProps {
  imageSrc: string;
  onCropComplete: (croppedImage: string) => void;
  onCancel: () => void;
}

// 比例选项配置
interface AspectOption {
  label: string;
  key: string;
  aspect: number | undefined;  // undefined 表示自由比例
  isOriginal?: boolean;        // 是否为原图模式
  recommended?: boolean;
}

const aspectOptions: AspectOption[] = [
  { label: '原图', key: 'original', aspect: undefined, isOriginal: true },
  { label: '1:1', key: '1:1', aspect: 1 },
  { label: '4:3', key: '4:3', aspect: 4 / 3 },
  { label: '3:4', key: '3:4', aspect: 3 / 4 },
];

/**
 * 图片裁剪组件
 * 简化逻辑：aspect prop 直接控制裁剪框比例
 * - 1:1 = 正方形裁剪框
 * - 4:3 = 4:3 矩形裁剪框
 * - 不需要复杂计算，让 react-image-crop 处理
 */
const ImageCropper: React.FC<ImageCropperProps> = ({
  imageSrc,
  onCropComplete,
  onCancel,
}) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  // 当前选择的比例 key（默认为自由裁剪，不在选项列表中）
  const [selectedKey, setSelectedKey] = useState<string>('free');
  const [isProcessing, setIsProcessing] = useState(false);
  // 追踪图片是否已加载
  const [imageLoaded, setImageLoaded] = useState(false);

  // 获取当前选中的选项（'free' 是默认的自由裁剪模式，不在选项列表中）
  const selectedOption = aspectOptions.find(opt => opt.key === selectedKey);
  const isOriginalMode = selectedOption?.isOriginal === true;
  const isFreeMode = selectedKey === 'free' || (!selectedOption && !isOriginalMode);
  const aspect = isOriginalMode ? undefined : (selectedOption?.aspect ?? undefined);

  // 当图片加载完成后，标记加载完成
  const onImageLoad = useCallback(() => {
    setImageLoaded(true);
  }, []);

  // 切换比例时，使用 makeAspectCrop 计算正确的初始裁剪区域
  useEffect(() => {
    if (!imageLoaded || !imgRef.current) return;

    const currentOption = aspectOptions.find(opt => opt.key === selectedKey);
    const currentIsOriginal = currentOption?.isOriginal === true;
    const currentAspect = currentOption?.aspect;
    const currentIsFree = selectedKey === 'free' || !currentOption;

    if (currentIsOriginal) {
      setCrop(undefined);
      setCompletedCrop(undefined);
      return;
    }

    // 获取图片的显示尺寸
    const { width: imgWidth, height: imgHeight } = imgRef.current;

    // 使用 makeAspectCrop 计算符合宽高比的裁剪区域
    // 然后用 centerCrop 将其居中
    if (currentAspect) {
      // 有固定宽高比（1:1, 4:3, 3:4）
      const newCrop = centerCrop(
        makeAspectCrop(
          {
            unit: '%',
            width: 80, // 起始宽度为图片的80%
          },
          currentAspect,
          imgWidth,
          imgHeight
        ),
        imgWidth,
        imgHeight
      );
      setCrop(newCrop);
    } else if (currentIsFree) {
      // 自由裁剪模式：裁剪框覆盖整个原图
      const newCrop: Crop = {
        unit: '%',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      };
      setCrop(newCrop);
    }

    setCompletedCrop(undefined);
  }, [imageLoaded, selectedKey]);

  // 使用 Canvas 生成裁剪后的图片
  const getCroppedImg = async (): Promise<string> => {
    // 原图模式直接返回原图
    if (isOriginalMode) {
      return imageSrc;
    }

    if (!imgRef.current) {
      return imageSrc;
    }

    const image = imgRef.current;

    // 获取裁剪区域的像素值
    // 优先使用 completedCrop（用户拖动后的值），如果没有则从 crop 百分比计算
    let pixelCrop: PixelCrop;

    if (completedCrop && completedCrop.width > 0 && completedCrop.height > 0) {
      // 使用用户交互产生的 completedCrop
      pixelCrop = completedCrop;
    } else if (crop && crop.width && crop.height) {
      // 从百分比 crop 计算像素值
      // 注意：crop 百分比是相对于显示尺寸的，需要转换为像素
      const displayWidth = image.width;
      const displayHeight = image.height;

      if (crop.unit === '%') {
        pixelCrop = {
          unit: 'px',
          x: (crop.x / 100) * displayWidth,
          y: (crop.y / 100) * displayHeight,
          width: (crop.width / 100) * displayWidth,
          height: (crop.height / 100) * displayHeight,
        };
      } else {
        pixelCrop = crop as PixelCrop;
      }

      console.log('Calculated pixelCrop from crop:', {
        crop,
        displayWidth,
        displayHeight,
        pixelCrop
      });
    } else {
      // 没有有效的裁剪区域，返回原图
      return imageSrc;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    // 计算缩放比例 (显示尺寸 vs 实际尺寸)
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    // 设置 canvas 尺寸为裁剪区域的实际像素尺寸
    canvas.width = pixelCrop.width * scaleX;
    canvas.height = pixelCrop.height * scaleY;

    console.log('Canvas size:', {
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      aspectRatio: canvas.width / canvas.height
    });

    // 绘制裁剪区域
    ctx.drawImage(
      image,
      pixelCrop.x * scaleX,
      pixelCrop.y * scaleY,
      pixelCrop.width * scaleX,
      pixelCrop.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    );

    // 转换为 base64
    return canvas.toDataURL('image/jpeg', 0.92);
  };

  // 确认
  const handleConfirm = async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    try {
      const resultImage = await getCroppedImg();
      onCropComplete(resultImage);
    } catch (error) {
      console.error('处理失败:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // 使用 Portal 渲染到 body，避免层叠上下文问题
  return createPortal(
    <div style={styles.container}>
      {/* 头部 - 左上角返回按钮就是取消 */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={onCancel}>
          <ArrowLeft size={20} weight="bold" />
        </button>
        <h1 style={styles.title}>裁剪图片</h1>
        <div style={styles.placeholder} />
      </div>

      {/* 裁剪区域 */}
      <div style={styles.cropArea}>
        {isOriginalMode ? (
          // 原图模式：直接显示图片，无裁剪框
          <img
            ref={imgRef}
            src={imageSrc}
            alt="Original"
            style={styles.image}
            onLoad={onImageLoad}
          />
        ) : (
          // 裁剪模式：显示裁剪框
          <ReactCrop
            crop={crop}
            onChange={(_, percentCrop) => setCrop(percentCrop)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={aspect}
          >
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Crop"
              style={{
                display: 'block',
                maxWidth: '100%',
                maxHeight: 'calc(100vh - 280px)',
                objectFit: 'contain',
              }}
              onLoad={onImageLoad}
            />
          </ReactCrop>
        )}
      </div>

      {/* 比例选择（5个选项） */}
      <div style={styles.aspectSection}>
        <div style={styles.aspectHeader}>
          <span style={styles.aspectTitle}>宽高比</span>
        </div>
        <div style={styles.aspectOptions}>
          {aspectOptions.map((opt) => (
            <button
              key={opt.key}
              style={{
                ...styles.aspectBtn,
                ...(selectedKey === opt.key ? styles.aspectBtnActive : {}),
              }}
              onClick={() => setSelectedKey(opt.key)}
            >
              {opt.label}
              {opt.recommended && selectedKey !== opt.key && (
                <span style={styles.recommendBadge}>推荐</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 操作按钮 - 只有一个确认按钮 */}
      <div style={styles.actions}>
        <button
          style={{
            ...styles.confirmBtn,
            ...(isProcessing ? styles.btnDisabled : {}),
          }}
          onClick={handleConfirm}
          disabled={isProcessing}
        >
          <Check size={20} weight="bold" />
          <span>{isProcessing ? '处理中...' : '确认'}</span>
        </button>
      </div>
    </div>,
    document.body
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    flexDirection: 'column',
    background: colors.bg.primary,
    zIndex: 11001,
  },

  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    background: colors.bg.secondary,
    borderBottom: `1px solid ${colors.border.soft}`,
    flexShrink: 0,
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

  cropArea: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    overflow: 'auto',
    background: colors.bg.tertiary,
    minHeight: 0, // 重要：允许flex子元素收缩
  },

  image: {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
    display: 'block',
  },

  aspectSection: {
    padding: '16px',
    background: colors.bg.secondary,
    borderTop: `1px solid ${colors.border.soft}`,
    flexShrink: 0,
  },

  aspectHeader: {
    marginBottom: '12px',
  },

  aspectTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.secondary,
  },

  aspectOptions: {
    display: 'flex',
    gap: '8px',
  },

  aspectBtn: {
    flex: 1,
    position: 'relative',
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

  aspectBtnActive: {
    background: `linear-gradient(145deg, ${colors.bead.cyan}30, ${colors.bead.cyan}15)`,
    borderColor: colors.bead.cyan,
    color: colors.bead.cyan,
    boxShadow: `0 0 12px ${colors.bead.cyan}30`,
  },

  recommendBadge: {
    position: 'absolute',
    top: '-6px',
    right: '-6px',
    fontSize: '9px',
    padding: '2px 5px',
    background: colors.bead.pink,
    color: '#fff',
    borderRadius: radius.full,
    fontWeight: typography.fontWeight.medium,
  },

  actions: {
    padding: '16px',
    background: colors.bg.secondary,
    borderTop: `1px solid ${colors.border.soft}`,
    flexShrink: 0,
  },

  confirmBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
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

  btnDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
};

export default ImageCropper;
