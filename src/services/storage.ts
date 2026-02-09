/**
 * 本地存档系统
 * 使用 localStorage 管理作品存档
 */

const STORAGE_KEY = 'perler-game-saves';
const MAX_SAVES = 20;

export interface SaveData {
  id: string;
  name: string;
  createdAt: number;
  boardJson: string;  // BeadBoard.serialize() 的结果
  thumbnail: string;  // data URL 缩略图
  templateId?: string;
  beadCount: number;
  boardWidth: number;
  boardHeight: number;
}

/** 获取所有存档 */
export function listSaves(): SaveData[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SaveData[];
  } catch {
    return [];
  }
}

/** 保存作品 */
export function savework(data: Omit<SaveData, 'id' | 'createdAt'>): SaveData {
  const saves = listSaves();
  const newSave: SaveData = {
    ...data,
    id: `save_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    createdAt: Date.now(),
  };

  // 最多保存 MAX_SAVES 个
  saves.unshift(newSave);
  if (saves.length > MAX_SAVES) {
    saves.length = MAX_SAVES;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(saves));
  return newSave;
}

/** 加载存档 */
export function loadSave(id: string): SaveData | undefined {
  const saves = listSaves();
  return saves.find(s => s.id === id);
}

/** 删除存档 */
export function deleteSave(id: string): boolean {
  const saves = listSaves();
  const filtered = saves.filter(s => s.id !== id);
  if (filtered.length === saves.length) return false;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return true;
}

/** 生成画板缩略图 (data URL) */
export function generateThumbnail(
  beads: { x: number; y: number; color: string }[],
  boardWidth: number,
  boardHeight: number,
  size = 80,
): string {
  const canvas = document.createElement('canvas');
  const dpr = 1;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // 背景
  ctx.fillStyle = '#1a1a3e';
  ctx.fillRect(0, 0, size, size);

  // 计算缩放
  const maxDim = Math.max(boardWidth, boardHeight);
  const cellSize = (size - 4) / maxDim;
  const offsetX = (size - boardWidth * cellSize) / 2;
  const offsetY = (size - boardHeight * cellSize) / 2;

  // 绘制拼豆
  for (const bead of beads) {
    const cx = offsetX + bead.x * cellSize + cellSize / 2;
    const cy = offsetY + bead.y * cellSize + cellSize / 2;
    ctx.fillStyle = bead.color;
    ctx.beginPath();
    ctx.arc(cx, cy, cellSize * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  return canvas.toDataURL('image/png', 0.8);
}
