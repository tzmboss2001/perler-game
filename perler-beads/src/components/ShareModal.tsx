import React, { useState, useRef, useEffect } from 'react';
import { X, Download, Link, Image, CheckCircle } from '@phosphor-icons/react';
import { colors, radius, typography, shadows, animation } from '../styles/designSystem';
import { useToast } from './Toast';

interface ShareModalProps {
  visible: boolean;
  onClose: () => void;
  imageData: string; // 图案图片 base64
  title: string;
  stats: { color: string; count: number; name: string }[];
  gridSize: { width: number; height: number };
}

/**
 * 分享弹窗组件
 * 支持：生成海报、保存图片、复制链接
 */
const ShareModal: React.FC<ShareModalProps> = ({
  visible,
  onClose,
  imageData,
  title,
  stats,
  gridSize,
}) => {
  const toast = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [posterUrl, setPosterUrl] = useState<string>('');
  const [generating, setGenerating] = useState(false);

  // 生成分享海报
  useEffect(() => {
    if (!visible || !imageData) return;

    setGenerating(true);
    generatePoster().then(url => {
      setPosterUrl(url);
      setGenerating(false);
    });
  }, [visible, imageData]);

  const generatePoster = async (): Promise<string> => {
    const canvas = canvasRef.current;
    if (!canvas) return '';

    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // 海报尺寸
    const posterWidth = 360;
    const posterHeight = 520;
    canvas.width = posterWidth;
    canvas.height = posterHeight;

    // 背景
    ctx.fillStyle = colors.bg.primary;
    ctx.fillRect(0, 0, posterWidth, posterHeight);

    // 顶部装饰条
    const gradient = ctx.createLinearGradient(0, 0, posterWidth, 0);
    gradient.addColorStop(0, colors.bead.pink);
    gradient.addColorStop(0.25, colors.bead.orange);
    gradient.addColorStop(0.5, colors.bead.yellow);
    gradient.addColorStop(0.75, colors.bead.green);
    gradient.addColorStop(1, colors.bead.cyan);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, posterWidth, 6);

    // 标题
    ctx.fillStyle = colors.text.primary;
    ctx.font = `bold 20px "PingFang SC", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(title || '我的拼豆作品', posterWidth / 2, 40);

    // 图案
    const img = new window.Image();
    img.src = imageData;
    await new Promise(resolve => {
      img.onload = resolve;
      img.onerror = resolve;
    });

    const imgSize = 280;
    const imgX = (posterWidth - imgSize) / 2;
    const imgY = 60;

    // 图案背景框
    ctx.fillStyle = colors.bg.card;
    ctx.strokeStyle = colors.border.soft;
    ctx.lineWidth = 1;
    roundRect(ctx, imgX - 10, imgY - 10, imgSize + 20, imgSize + 20, 12);
    ctx.fill();
    ctx.stroke();

    // 绘制图案
    ctx.drawImage(img, imgX, imgY, imgSize, imgSize);

    // 尺寸信息
    ctx.fillStyle = colors.text.secondary;
    ctx.font = `14px "PingFang SC", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`${gridSize.width} x ${gridSize.height} 颗珠子`, posterWidth / 2, imgY + imgSize + 30);

    // 颜色统计（前6种）
    const topStats = stats.slice(0, 6);
    const statY = imgY + imgSize + 50;
    const statItemWidth = 50;
    const totalWidth = topStats.length * statItemWidth;
    const startX = (posterWidth - totalWidth) / 2;

    topStats.forEach((stat, index) => {
      const x = startX + index * statItemWidth + statItemWidth / 2;

      // 颜色圆点
      ctx.beginPath();
      ctx.arc(x, statY, 10, 0, Math.PI * 2);
      ctx.fillStyle = stat.color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // 数量
      ctx.fillStyle = colors.text.secondary;
      ctx.font = `12px "PingFang SC", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(`${stat.count}`, x, statY + 28);
    });

    // 底部信息
    ctx.fillStyle = colors.text.muted;
    ctx.font = `12px "PingFang SC", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('拼豆工坊 - 让创意变成作品', posterWidth / 2, posterHeight - 30);

    // 底部装饰条
    ctx.fillStyle = gradient;
    ctx.fillRect(0, posterHeight - 6, posterWidth, 6);

    return canvas.toDataURL('image/png');
  };

  // 圆角矩形辅助函数
  const roundRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    r: number
  ) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };

  // 保存到相册
  const handleSaveImage = () => {
    if (!posterUrl) return;

    const link = document.createElement('a');
    link.download = `${title || '拼豆作品'}_${Date.now()}.png`;
    link.href = posterUrl;
    link.click();

    toast.success('图片已保存');
  };

  // 复制链接
  const handleCopyLink = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('链接已复制');
    } catch {
      // fallback
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      toast.success('链接已复制');
    }
  };

  if (!visible) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        {/* 头部 */}
        <div style={styles.header}>
          <h3 style={styles.title}>分享作品</h3>
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* 海报预览 */}
        <div style={styles.posterBox}>
          {generating ? (
            <div style={styles.loading}>生成中...</div>
          ) : posterUrl ? (
            <img src={posterUrl} alt="分享海报" style={styles.posterImage} />
          ) : (
            <div style={styles.loading}>加载失败</div>
          )}
        </div>

        {/* 隐藏的 Canvas */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* 操作按钮 */}
        <div style={styles.actions}>
          <button style={styles.actionBtn} onClick={handleSaveImage} disabled={!posterUrl}>
            <Download size={22} weight="duotone" />
            <span>保存图片</span>
          </button>
          <button style={styles.actionBtn} onClick={handleCopyLink}>
            <Link size={22} weight="duotone" />
            <span>复制链接</span>
          </button>
        </div>

        {/* 提示 */}
        <p style={styles.hint}>长按图片可保存到相册</p>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '20px',
  },

  modal: {
    background: colors.bg.card,
    borderRadius: radius.lg,
    padding: '20px',
    width: '100%',
    maxWidth: '380px',
    maxHeight: '90vh',
    overflow: 'auto',
    border: `1px solid ${colors.border.soft}`,
  },

  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },

  title: {
    margin: 0,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.primary,
  },

  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: colors.text.muted,
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
  },

  posterBox: {
    background: colors.bg.primary,
    borderRadius: radius.md,
    padding: '12px',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '300px',
  },

  posterImage: {
    maxWidth: '100%',
    maxHeight: '400px',
    borderRadius: radius.sm,
  },

  loading: {
    color: colors.text.muted,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamilyAlt,
  },

  actions: {
    display: 'flex',
    gap: '12px',
    marginBottom: '12px',
  },

  actionBtn: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    padding: '16px 12px',
    background: colors.bg.secondary,
    border: `1px solid ${colors.border.soft}`,
    borderRadius: radius.md,
    color: colors.text.primary,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamilyAlt,
    cursor: 'pointer',
    transition: animation.transition.fast,
  },

  hint: {
    textAlign: 'center',
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.muted,
    margin: 0,
  },
};

export default ShareModal;
