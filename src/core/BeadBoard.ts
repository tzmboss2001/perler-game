/**
 * BeadBoard - 拼豆画布核心类
 * 管理网格数据结构、拼豆增删改查
 */

import type { Bead, BeadState } from '@/types/game';

export const beadKey = (x: number, y: number) => `${x},${y}`;

export class BeadBoard {
  width: number;
  height: number;
  beads: Map<string, Bead>;
  templateId?: string;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.beads = new Map();
  }

  /** 检查坐标是否在画布范围内 */
  isInBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  /** 获取指定位置的拼豆 */
  getBead(x: number, y: number): Bead | undefined {
    return this.beads.get(beadKey(x, y));
  }

  /** 放置拼豆 */
  placeBead(x: number, y: number, color: string, colorId: string): boolean {
    if (!this.isInBounds(x, y)) return false;
    this.beads.set(beadKey(x, y), {
      x, y, color, colorId, state: 'raw',
    });
    return true;
  }

  /** 删除拼豆 */
  removeBead(x: number, y: number): boolean {
    return this.beads.delete(beadKey(x, y));
  }

  /** 更新拼豆状态 */
  setBeadState(x: number, y: number, state: BeadState): void {
    const bead = this.getBead(x, y);
    if (bead) {
      bead.state = state;
    }
  }

  /** 清空画布 */
  clear(): void {
    this.beads.clear();
  }

  /** 获取拼豆数量 */
  get count(): number {
    return this.beads.size;
  }

  /** 获取画布填充率 */
  get fillRate(): number {
    return this.beads.size / (this.width * this.height);
  }

  /** 克隆（用于撤销/重做快照） */
  cloneBeads(): Map<string, Bead> {
    const clone = new Map<string, Bead>();
    for (const [key, bead] of this.beads) {
      clone.set(key, { ...bead });
    }
    return clone;
  }

  /** 从快照恢复 */
  restoreBeads(snapshot: Map<string, Bead>): void {
    this.beads = new Map();
    for (const [key, bead] of snapshot) {
      this.beads.set(key, { ...bead });
    }
  }

  /** 序列化（用于存档） */
  serialize(): string {
    const data = {
      width: this.width,
      height: this.height,
      templateId: this.templateId,
      beads: Array.from(this.beads.values()),
    };
    return JSON.stringify(data);
  }

  /** 反序列化（用于读档） */
  static deserialize(json: string): BeadBoard {
    const data = JSON.parse(json);
    const board = new BeadBoard(data.width, data.height);
    board.templateId = data.templateId;
    for (const bead of data.beads) {
      board.beads.set(beadKey(bead.x, bead.y), bead);
    }
    return board;
  }

  /** 获取指定区域的拼豆 */
  getBeadsInRect(x1: number, y1: number, x2: number, y2: number): Bead[] {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    const result: Bead[] = [];
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        const bead = this.getBead(x, y);
        if (bead) result.push(bead);
      }
    }
    return result;
  }

  /** 获取所有拼豆（数组形式） */
  getAllBeads(): Bead[] {
    return Array.from(this.beads.values());
  }
}
