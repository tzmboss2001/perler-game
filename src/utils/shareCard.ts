/**
 * 分享卡片生成工具
 * 使用 Canvas 绘制分享图片（作品图 + 评分 + 失败类型 + 水印）
 */

import type { Bead, FailureType } from '@/types/game';

const CARD_WIDTH = 600;
const CARD_HEIGHT = 800;

const FAILURE_TITLES: Record<FailureType, string> = {
  undercooked: '半生不熟 🥶',
  partial_melt: '局部融化 🫠',
  collapse: '整体塌陷 💀',
  burned: '颜色烧焦 🔥',
  sticky: '粘连拉扯 🧲',
};

const FAILURE_COLORS: Record<FailureType, [string, string]> = {
  undercooked: ['#667eea', '#764ba2'],
  partial_melt: ['#f093fb', '#f5576c'],
  collapse: ['#434343', '#000000'],
  burned: ['#f12711', '#f5af19'],
  sticky: ['#fc5c7d', '#6a82fb'],
};

interface ShareCardOptions {
  beads: Bead[];
  boardWidth: number;
  boardHeight: number;
  score: number;
  success: boolean;
  failureType?: FailureType;
  failureTitle: string;
}

/** 生成分享卡片（返回 data URL） */
export function generateShareCard(options: ShareCardOptions): string {
  const { beads, boardWidth, boardHeight, score, success, failureType, failureTitle } = options;

  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // 背景渐变
  let c1 = '#11998e', c2 = '#38ef7d';
  if (!success && failureType) {
    [c1, c2] = FAILURE_COLORS[failureType];
  }
  const grad = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
  grad.addColorStop(0, c1);
  grad.addColorStop(1, c2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // 半透明叠加层
  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // 标题
  ctx.fillStyle = 'white';
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'center';
  const title = success ? '完美融合!' : failureTitle;
  ctx.fillText(title, CARD_WIDTH / 2, 60);

  // 作品图区域
  const artSize = 360;
  const artX = (CARD_WIDTH - artSize) / 2;
  const artY = 90;

  // 作品图背景
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  roundRect(ctx, artX - 10, artY - 10, artSize + 20, artSize + 20, 12);
  ctx.fill();

  ctx.fillStyle = '#1a1a3e';
  roundRect(ctx, artX, artY, artSize, artSize, 8);
  ctx.fill();

  // 绘制拼豆
  const maxDim = Math.max(boardWidth, boardHeight);
  const cellSize = (artSize - 20) / maxDim;
  const offX = artX + (artSize - boardWidth * cellSize) / 2;
  const offY = artY + (artSize - boardHeight * cellSize) / 2;

  for (const bead of beads) {
    const cx = offX + bead.x * cellSize + cellSize / 2;
    const cy = offY + bead.y * cellSize + cellSize / 2;
    ctx.fillStyle = bead.color;
    ctx.beginPath();
    ctx.arc(cx, cy, cellSize * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  // 评分区域
  const scoreY = artY + artSize + 40;
  ctx.fillStyle = 'white';
  ctx.font = 'bold 72px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${score}`, CARD_WIDTH / 2, scoreY + 10);

  ctx.font = '20px sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.fillText('分', CARD_WIDTH / 2 + 50, scoreY + 10);

  // 失败类型
  if (!success && failureType) {
    ctx.font = '24px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillText(FAILURE_TITLES[failureType], CARD_WIDTH / 2, scoreY + 50);
  }

  // 分割线
  const lineY = scoreY + 80;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(100, lineY);
  ctx.lineTo(CARD_WIDTH - 100, lineY);
  ctx.stroke();

  // 水印 + 品牌
  ctx.font = 'bold 28px sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.fillText('云拼豆', CARD_WIDTH / 2, lineY + 45);

  ctx.font = '16px sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.fillText('失败不是惩罚，是内容', CARD_WIDTH / 2, lineY + 75);

  return canvas.toDataURL('image/png');
}

/** 生成分享卡片为 Blob */
export async function generateShareCardBlob(options: ShareCardOptions): Promise<Blob | null> {
  const dataUrl = generateShareCard(options);
  if (!dataUrl) return null;

  const res = await fetch(dataUrl);
  return res.blob();
}

/** 下载分享卡片 */
export function downloadShareCard(options: ShareCardOptions, filename = 'perler-share.png') {
  const dataUrl = generateShareCard(options);
  if (!dataUrl) return;

  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  link.click();
}

/** 圆角矩形辅助函数 */
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
