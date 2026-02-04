import React, { useRef, useState } from 'react';
import { X, Copy, Image, ShoppingCart, ShareNetwork } from '@phosphor-icons/react';
import { colors, radius, typography, shadows, animation } from '../styles/designSystem';
import { useToast } from './Toast';

interface ShoppingItem {
  id: string;
  name: string;
  nameCN: string;
  hex: string;
  count: number;
  percentage: number;
}

/**
 * 转换显示色号
 * Perler: 80-19001 → P01, 80-15265 → P265
 * 其他品牌保持原样
 */
const getDisplayColorId = (id: string): string => {
  if (id.startsWith('80-19') || id.startsWith('80-15')) {
    const numPart = id.slice(5); // 取最后3位数字
    return 'P' + parseInt(numPart, 10).toString(); // 去掉前导零
  }
  return id;
};

interface ShoppingListModalProps {
  visible: boolean;
  onClose: () => void;
  items: ShoppingItem[];
  gridSize: { width: number; height: number };
  brand: string;
}

/**
 * 珠子采购清单弹窗
 * 显示需要购买的珠子列表，支持复制和导出
 */
const ShoppingListModal: React.FC<ShoppingListModalProps> = ({
  visible,
  onClose,
  items,
  gridSize,
  brand,
}) => {
  const toast = useToast();
  const listRef = useRef<HTMLDivElement>(null);
  const [isSharing, setIsSharing] = useState(false);

  // 检查是否支持 Web Share API
  const canShare = typeof navigator !== 'undefined' && !!navigator.share;
  const canShareFiles = typeof navigator !== 'undefined' && !!navigator.canShare;

  // 总珠子数
  const totalBeads = items.reduce((sum, item) => sum + item.count, 0);

  // 生成文本清单
  const generateTextList = () => {
    const lines: string[] = [];
    lines.push(`拼豆采购清单`);
    lines.push(`品牌: ${brand}`);
    lines.push(`尺寸: ${gridSize.width} x ${gridSize.height}`);
    lines.push(`总计: ${totalBeads} 颗 (${items.length} 种颜色)`);
    lines.push('');
    lines.push('序号 | 色号 | 颜色名 | 数量');
    lines.push('-----|------|--------|------');
    items.forEach((item, index) => {
      lines.push(`${index + 1} | ${getDisplayColorId(item.id)} | ${item.nameCN} | ${item.count}`);
    });
    lines.push('');
    lines.push('---');
    lines.push('由拼豆工坊生成');
    return lines.join('\n');
  };

  // 复制清单
  const handleCopyList = async () => {
    const text = generateTextList();
    try {
      await navigator.clipboard.writeText(text);
      toast.success('清单已复制');
    } catch {
      // fallback
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      toast.success('清单已复制');
    }
  };

  // 导出为图片
  const handleExportImage = async () => {
    if (!listRef.current) return;

    try {
      // 使用 html2canvas 的简易替代方案
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 设置画布尺寸
      const padding = 24;
      const rowHeight = 36;
      const headerHeight = 100;
      const footerHeight = 40;
      const width = 400;
      const height = headerHeight + items.length * rowHeight + footerHeight + padding * 2;

      canvas.width = width;
      canvas.height = height;

      // 背景
      ctx.fillStyle = colors.bg.primary;
      ctx.fillRect(0, 0, width, height);

      // 顶部装饰条
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, colors.bead.pink);
      gradient.addColorStop(0.25, colors.bead.orange);
      gradient.addColorStop(0.5, colors.bead.yellow);
      gradient.addColorStop(0.75, colors.bead.green);
      gradient.addColorStop(1, colors.bead.cyan);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, 6);

      // 标题
      ctx.fillStyle = colors.text.primary;
      ctx.font = `bold 18px "PingFang SC", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('珠子采购清单', width / 2, 36);

      // 信息行
      ctx.fillStyle = colors.text.secondary;
      ctx.font = `14px "PingFang SC", sans-serif`;
      ctx.fillText(`${brand} | ${gridSize.width}x${gridSize.height} | ${totalBeads}颗 (${items.length}种)`, width / 2, 60);

      // 表头
      const tableY = 80;
      ctx.fillStyle = colors.bg.secondary;
      ctx.fillRect(padding, tableY, width - padding * 2, 28);
      ctx.fillStyle = colors.text.primary;
      ctx.font = `bold 12px "PingFang SC", sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText('色号', padding + 50, tableY + 18);
      ctx.fillText('颜色', padding + 110, tableY + 18);
      ctx.textAlign = 'right';
      ctx.fillText('数量', width - padding - 10, tableY + 18);

      // 列表项
      items.forEach((item, index) => {
        const y = tableY + 28 + index * rowHeight;

        // 斑马纹背景
        if (index % 2 === 0) {
          ctx.fillStyle = colors.bg.card;
          ctx.fillRect(padding, y, width - padding * 2, rowHeight);
        }

        // 颜色块
        ctx.fillStyle = item.hex;
        ctx.beginPath();
        ctx.arc(padding + 20, y + rowHeight / 2, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // 色号
        ctx.fillStyle = colors.text.muted;
        ctx.font = `12px "PingFang SC", sans-serif`;
        ctx.textAlign = 'left';
        ctx.fillText(getDisplayColorId(item.id), padding + 50, y + rowHeight / 2 + 4);

        // 颜色名
        ctx.fillStyle = colors.text.primary;
        ctx.fillText(item.nameCN, padding + 110, y + rowHeight / 2 + 4);

        // 数量
        ctx.fillStyle = colors.text.primary;
        ctx.font = `bold 14px "PingFang SC", sans-serif`;
        ctx.textAlign = 'right';
        ctx.fillText(`${item.count}`, width - padding - 10, y + rowHeight / 2 + 4);
      });

      // 底部信息
      const footerY = tableY + 28 + items.length * rowHeight + 20;
      ctx.fillStyle = colors.text.muted;
      ctx.font = `12px "PingFang SC", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('拼豆工坊 - 让创意变成作品', width / 2, footerY);

      // 底部装饰条
      ctx.fillStyle = gradient;
      ctx.fillRect(0, height - 6, width, 6);

      // 下载
      const link = document.createElement('a');
      link.download = `采购清单_${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      toast.success('清单图片已保存');
    } catch (error) {
      console.error('导出图片失败:', error);
      toast.error('导出失败');
    }
  };

  // 生成图片 Blob（用于分享）
  const generateImageBlob = (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }

        const padding = 24;
        const rowHeight = 36;
        const headerHeight = 100;
        const footerHeight = 40;
        const width = 400;
        const height = headerHeight + items.length * rowHeight + footerHeight + padding * 2;

        canvas.width = width;
        canvas.height = height;

        // 背景
        ctx.fillStyle = colors.bg.primary;
        ctx.fillRect(0, 0, width, height);

        // 顶部装饰条
        const gradient = ctx.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, colors.bead.pink);
        gradient.addColorStop(0.25, colors.bead.orange);
        gradient.addColorStop(0.5, colors.bead.yellow);
        gradient.addColorStop(0.75, colors.bead.green);
        gradient.addColorStop(1, colors.bead.cyan);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, 6);

        // 标题
        ctx.fillStyle = colors.text.primary;
        ctx.font = `bold 24px "PingFang SC", sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('珠子采购清单', width / 2, 36);

        // 统计信息
        ctx.font = `14px "PingFang SC", sans-serif`;
        ctx.fillStyle = colors.text.secondary;
        ctx.fillText(`${brand} | ${gridSize.width}×${gridSize.height} | ${totalBeads}颗 ${items.length}色`, width / 2, 60);

        // 表格
        const tableY = 80;
        ctx.font = `12px "PingFang SC", sans-serif`;
        ctx.textAlign = 'left';

        items.forEach((item, index) => {
          const y = tableY + 28 + index * rowHeight;
          if (index % 2 === 0) {
            ctx.fillStyle = colors.bg.card;
            ctx.fillRect(padding, y - 14, width - padding * 2, rowHeight);
          }

          // 色块
          ctx.fillStyle = item.hex;
          ctx.fillRect(padding + 8, y - 8, 20, 20);
          ctx.strokeStyle = 'rgba(255,255,255,0.3)';
          ctx.strokeRect(padding + 8, y - 8, 20, 20);

          // 色号
          ctx.fillStyle = colors.text.primary;
          ctx.fillText(getDisplayColorId(item.id), padding + 40, y + 5);

          // 名称
          ctx.fillText(item.nameCN, padding + 100, y + 5);

          // 数量
          ctx.textAlign = 'right';
          ctx.fillText(`${item.count}`, width - padding - 8, y + 5);
          ctx.textAlign = 'left';
        });

        // 底部信息
        const footerY = tableY + 28 + items.length * rowHeight + 20;
        ctx.fillStyle = colors.text.muted;
        ctx.font = `12px "PingFang SC", sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('拼豆工坊 - 让创意变成作品', width / 2, footerY);

        // 底部装饰条
        ctx.fillStyle = gradient;
        ctx.fillRect(0, height - 6, width, 6);

        canvas.toBlob((blob) => {
          resolve(blob);
        }, 'image/png');
      } catch {
        resolve(null);
      }
    });
  };

  // 分享功能
  const handleShare = async () => {
    if (!canShare) {
      toast.error('当前浏览器不支持分享');
      return;
    }

    setIsSharing(true);

    try {
      // 尝试分享图片
      const imageBlob = await generateImageBlob();

      if (imageBlob && canShareFiles) {
        const file = new File([imageBlob], `采购清单_${Date.now()}.png`, { type: 'image/png' });
        const shareData = { files: [file] };

        if (navigator.canShare && navigator.canShare(shareData)) {
          await navigator.share(shareData);
          toast.success('分享成功');
          setIsSharing(false);
          return;
        }
      }

      // 降级：分享文本
      const text = generateTextList();
      await navigator.share({
        title: '拼豆采购清单',
        text: text,
      });
      toast.success('分享成功');
    } catch (error: any) {
      // 用户取消分享不算错误
      if (error?.name !== 'AbortError') {
        console.error('分享失败:', error);
        toast.error('分享失败');
      }
    } finally {
      setIsSharing(false);
    }
  };

  if (!visible) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        {/* 头部 */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <ShoppingCart size={20} weight="fill" style={{ color: colors.bead.green }} />
            <h3 style={styles.title}>采购清单</h3>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* 统计信息 */}
        <div style={styles.summary}>
          <div style={styles.summaryItem}>
            <span style={styles.summaryLabel}>品牌</span>
            <span style={styles.summaryValue}>{brand}</span>
          </div>
          <div style={styles.summaryItem}>
            <span style={styles.summaryLabel}>尺寸</span>
            <span style={styles.summaryValue}>{gridSize.width} x {gridSize.height}</span>
          </div>
          <div style={styles.summaryItem}>
            <span style={styles.summaryLabel}>总计</span>
            <span style={styles.summaryValue}>{totalBeads} 颗</span>
          </div>
          <div style={styles.summaryItem}>
            <span style={styles.summaryLabel}>颜色</span>
            <span style={styles.summaryValue}>{items.length} 种</span>
          </div>
        </div>

        {/* 清单列表 */}
        <div ref={listRef} style={styles.listContainer}>
          <div style={styles.listHeader}>
            <span style={styles.listHeaderCell}>颜色</span>
            <span style={styles.listHeaderCell}>名称</span>
            <span style={{ ...styles.listHeaderCell, textAlign: 'right' }}>数量</span>
          </div>
          <div style={styles.list}>
            {items.map((item, index) => (
              <div
                key={item.id}
                style={{
                  ...styles.listItem,
                  background: index % 2 === 0 ? colors.bg.card : 'transparent',
                }}
              >
                <div style={styles.colorInfo}>
                  <div style={{ ...styles.colorDot, backgroundColor: item.hex }} />
                  <span style={styles.colorId}>{getDisplayColorId(item.id)}</span>
                </div>
                <span style={styles.colorName}>{item.nameCN}</span>
                <span style={styles.colorCount}>{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 操作按钮 */}
        <div style={styles.actions}>
          {canShare && (
            <button
              style={{...styles.actionBtn, ...styles.shareBtn}}
              onClick={handleShare}
              disabled={isSharing}
            >
              <ShareNetwork size={20} weight="duotone" />
              <span>{isSharing ? '分享中...' : '分享'}</span>
            </button>
          )}
          <button style={styles.actionBtn} onClick={handleCopyList}>
            <Copy size={20} weight="duotone" />
            <span>复制</span>
          </button>
          <button style={styles.actionBtn} onClick={handleExportImage}>
            <Image size={20} weight="duotone" />
            <span>保存图片</span>
          </button>
        </div>
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
    padding: '16px',
    width: '100%',
    maxWidth: '400px',
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
    border: `1px solid ${colors.border.soft}`,
  },

  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px',
  },

  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
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

  summary: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '8px',
    padding: '12px',
    background: colors.bg.primary,
    borderRadius: radius.md,
    marginBottom: '12px',
  },

  summaryItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },

  summaryLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.muted,
  },

  summaryValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.primary,
  },

  listContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    overflow: 'hidden',
  },

  listHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 12px',
    background: colors.bg.secondary,
    borderRadius: `${radius.sm} ${radius.sm} 0 0`,
    gap: '8px',
  },

  listHeaderCell: {
    flex: 1,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.muted,
  },

  list: {
    flex: 1,
    overflowY: 'auto',
    border: `1px solid ${colors.border.soft}`,
    borderTop: 'none',
    borderRadius: `0 0 ${radius.sm} ${radius.sm}`,
  },

  listItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 12px',
    gap: '8px',
    borderBottom: `1px solid ${colors.border.soft}`,
  },

  colorInfo: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },

  colorDot: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    flexShrink: 0,
    border: '2px solid rgba(255,255,255,0.2)',
  },

  colorId: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.muted,
    minWidth: '36px',
  },

  colorName: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.primary,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  colorCount: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyAlt,
    color: colors.bead.cyan,
    minWidth: '40px',
    textAlign: 'right',
  },

  actions: {
    display: 'flex',
    gap: '12px',
    marginTop: '12px',
  },

  actionBtn: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    padding: '12px',
    background: colors.bg.secondary,
    border: `1px solid ${colors.border.soft}`,
    borderRadius: radius.md,
    color: colors.text.primary,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamilyAlt,
    cursor: 'pointer',
    transition: animation.transition.fast,
  },

  shareBtn: {
    background: `linear-gradient(145deg, ${colors.bead.cyan}, ${colors.bead.green})`,
    border: 'none',
    color: '#ffffff',
  },
};

export default ShoppingListModal;
