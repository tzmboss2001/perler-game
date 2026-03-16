import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { ArrowLeft, Check } from '@phosphor-icons/react';
import { colors, radius, typography, shadows, animation, mixins } from '../styles/designSystem';

interface ImageCropperProps {
  imageSrc: string;
  onCropComplete: (croppedImage: string) => void;
  onCancel: () => void;
}

// 姣斾緥閫夐」閰嶇疆
interface AspectOption {
  label: string;
  key: string;
  aspect: number | undefined;  // undefined 琛ㄧず鑷敱姣斾緥
  isOriginal?: boolean;        // 鏄惁涓哄師鍥炬ā寮?
  recommended?: boolean;
}

const aspectOptions: AspectOption[] = [
  { label: '原图', key: 'original', aspect: undefined, isOriginal: true },
  { label: '1:1', key: '1:1', aspect: 1 },
  { label: '4:3', key: '4:3', aspect: 4 / 3 },
  { label: '3:4', key: '3:4', aspect: 3 / 4 },
];

const createMaxAspectCrop = (imgWidth: number, imgHeight: number, targetAspect: number): Crop => {
  const imageAspect = imgWidth / imgHeight;

  if (imageAspect >= targetAspect) {
    // 原图更宽：用满高度，按目标比例裁宽度
    const widthPercent = (targetAspect / imageAspect) * 100;
    return {
      unit: '%',
      width: widthPercent,
      height: 100,
      x: (100 - widthPercent) / 2,
      y: 0,
    };
  }

  // 原图更高：用满宽度，按目标比例裁高度
  const heightPercent = (imageAspect / targetAspect) * 100;
  return {
    unit: '%',
    width: 100,
    height: heightPercent,
    x: 0,
    y: (100 - heightPercent) / 2,
  };
};

/**
 * 鍥剧墖瑁佸壀缁勪欢
 * 绠€鍖栭€昏緫锛歛spect prop 鐩存帴鎺у埗瑁佸壀妗嗘瘮渚?
 * - 1:1 = 姝ｆ柟褰㈣鍓
 * - 4:3 = 4:3 鐭╁舰瑁佸壀妗?
 * - 涓嶉渶瑕佸鏉傝绠楋紝璁?react-image-crop 澶勭悊
 */
const ImageCropper: React.FC<ImageCropperProps> = ({
  imageSrc,
  onCropComplete,
  onCancel,
}) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  // 褰撳墠閫夋嫨鐨勬瘮渚?key锛堥粯璁や负鑷敱瑁佸壀锛屼笉鍦ㄩ€夐」鍒楄〃涓級
  const [selectedKey, setSelectedKey] = useState<string>('free');
  const [isProcessing, setIsProcessing] = useState(false);
  // 杩借釜鍥剧墖鏄惁宸插姞杞?
  const [imageLoaded, setImageLoaded] = useState(false);

  // 鑾峰彇褰撳墠閫変腑鐨勯€夐」锛?free' 鏄粯璁ょ殑鑷敱瑁佸壀妯″紡锛屼笉鍦ㄩ€夐」鍒楄〃涓級
  const selectedOption = aspectOptions.find(opt => opt.key === selectedKey);
  const isOriginalMode = selectedOption?.isOriginal === true;
  const isFreeMode = selectedKey === 'free' || (!selectedOption && !isOriginalMode);
  const aspect = isOriginalMode ? undefined : (selectedOption?.aspect ?? undefined);

  // 褰撳浘鐗囧姞杞藉畬鎴愬悗锛屾爣璁板姞杞藉畬鎴?
  const onImageLoad = useCallback(() => {
    setImageLoaded(true);
  }, []);

  // 鍒囨崲姣斾緥鏃讹紝浣跨敤 makeAspectCrop 璁＄畻姝ｇ‘鐨勫垵濮嬭鍓尯鍩?
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

    // 鑾峰彇鍥剧墖鐨勬樉绀哄昂瀵?
    const { width: imgWidth, height: imgHeight } = imgRef.current;

    if (currentAspect) {
      const newCrop = createMaxAspectCrop(imgWidth, imgHeight, currentAspect);
      setCrop(newCrop);
    } else if (currentIsFree) {
      // 鑷敱瑁佸壀妯″紡锛氳鍓瑕嗙洊鏁翠釜鍘熷浘
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

  // 浣跨敤 Canvas 鐢熸垚瑁佸壀鍚庣殑鍥剧墖
  const getCroppedImg = async (): Promise<string> => {
    // 鍘熷浘妯″紡鐩存帴杩斿洖鍘熷浘
    if (isOriginalMode) {
      return imageSrc;
    }

    if (!imgRef.current) {
      return imageSrc;
    }

    const image = imgRef.current;

    // 鑾峰彇瑁佸壀鍖哄煙鐨勫儚绱犲€?
    // 浼樺厛浣跨敤 completedCrop锛堢敤鎴锋嫋鍔ㄥ悗鐨勫€硷級锛屽鏋滄病鏈夊垯浠?crop 鐧惧垎姣旇绠?
    let pixelCrop: PixelCrop;

    if (completedCrop && completedCrop.width > 0 && completedCrop.height > 0) {
      // 浣跨敤鐢ㄦ埛浜や簰浜х敓鐨?completedCrop
      pixelCrop = completedCrop;
    } else if (crop && crop.width && crop.height) {
      // 浠庣櫨鍒嗘瘮 crop 璁＄畻鍍忕礌鍊?
      // 娉ㄦ剰锛歝rop 鐧惧垎姣旀槸鐩稿浜庢樉绀哄昂瀵哥殑锛岄渶瑕佽浆鎹负鍍忕礌
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

    } else {
      // 娌℃湁鏈夋晥鐨勮鍓尯鍩燂紝杩斿洖鍘熷浘
      return imageSrc;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    // 璁＄畻缂╂斁姣斾緥 (鏄剧ず灏哄 vs 瀹為檯灏哄)
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    // 璁剧疆 canvas 灏哄涓鸿鍓尯鍩熺殑瀹為檯鍍忕礌灏哄
    canvas.width = pixelCrop.width * scaleX;
    canvas.height = pixelCrop.height * scaleY;

    // 缁樺埗瑁佸壀鍖哄煙
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

    // 杞崲涓?base64
    return canvas.toDataURL('image/jpeg', 0.92);
  };

  // 纭
  const handleConfirm = async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    try {
      const resultImage = await getCroppedImg();
      onCropComplete(resultImage);
    } catch (error) {
      console.error('处理裁剪结果失败:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // 浣跨敤 Portal 娓叉煋鍒?body锛岄伩鍏嶅眰鍙犱笂涓嬫枃闂
  return createPortal(
    <div style={styles.container}>
      {/* 澶撮儴 - 宸︿笂瑙掕繑鍥炴寜閽氨鏄彇娑?*/}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={onCancel}>
          <ArrowLeft size={20} weight="bold" />
        </button>
        <h1 style={styles.title}>裁剪图片</h1>
        <div style={styles.placeholder} />
      </div>

      {/* 瑁佸壀鍖哄煙 */}
      <div style={styles.cropArea}>
        {isOriginalMode ? (
          // 鍘熷浘妯″紡锛氱洿鎺ユ樉绀哄浘鐗囷紝鏃犺鍓
          <img
            ref={imgRef}
            src={imageSrc}
            alt="Original"
            style={styles.image}
            onLoad={onImageLoad}
          />
        ) : (
          // 瑁佸壀妯″紡锛氭樉绀鸿鍓
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

      {/* 姣斾緥閫夋嫨锛?涓€夐」锛?*/}
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

      {/* 鎿嶄綔鎸夐挳 - 鍙湁涓€涓‘璁ゆ寜閽?*/}
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
    minHeight: 0, // 閲嶈锛氬厑璁竑lex瀛愬厓绱犳敹缂?
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

