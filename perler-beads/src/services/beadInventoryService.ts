/**
 * 豆仓服务
 * 负责管理用户的拼豆库存数量。
 * 当前版本先基于本地存储；后续可以在此基础上补云同步和作品扣减。
 */

const BEAD_INVENTORY_KEY = 'perler_beads_inventory';
const LOW_STOCK_THRESHOLD = 200;

export interface BeadInventoryData {
  quantities: Record<string, number>;
  updatedAt: string;
}

export interface BeadInventorySummary {
  managedColorCount: number;
  stockedColorCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalBeadCount: number;
}

const normalizeCount = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
};

export const beadInventoryService = {
  getData(): BeadInventoryData {
    try {
      const raw = localStorage.getItem(BEAD_INVENTORY_KEY);
      if (!raw) {
        return { quantities: {}, updatedAt: new Date(0).toISOString() };
      }
      const parsed = JSON.parse(raw) as Partial<BeadInventoryData>;
      const quantities = Object.fromEntries(
        Object.entries(parsed.quantities || {}).map(([id, count]) => [id, normalizeCount(Number(count))]),
      );
      return {
        quantities,
        updatedAt:
          typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date(0).toISOString(),
      };
    } catch (error) {
      console.error('[beadInventoryService] 读取失败:', error);
      return { quantities: {}, updatedAt: new Date(0).toISOString() };
    }
  },

  saveData(quantities: Record<string, number>): void {
    const normalized = Object.fromEntries(
      Object.entries(quantities)
        .map(([id, count]) => [id, normalizeCount(count)])
        .filter(([, count]) => count >= 0),
    );

    const data: BeadInventoryData = {
      quantities: normalized,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(BEAD_INVENTORY_KEY, JSON.stringify(data));
  },

  getQuantities(): Record<string, number> {
    return beadInventoryService.getData().quantities;
  },

  getQuantity(colorId: string): number {
    return beadInventoryService.getQuantities()[colorId] || 0;
  },

  setQuantity(colorId: string, count: number): void {
    const next = beadInventoryService.getQuantities();
    next[colorId] = normalizeCount(count);
    beadInventoryService.saveData(next);
  },

  bulkUpdate(quantities: Record<string, number>): void {
    const next = beadInventoryService.getQuantities();
    Object.entries(quantities).forEach(([id, count]) => {
      next[id] = normalizeCount(count);
    });
    beadInventoryService.saveData(next);
  },

  applyConsumption(usage: Record<string, number>): void {
    const next = beadInventoryService.getQuantities();
    Object.entries(usage).forEach(([id, count]) => {
      const current = next[id] || 0;
      next[id] = Math.max(0, current - normalizeCount(count));
    });
    beadInventoryService.saveData(next);
  },

  getSummary(colorIds: string[]): BeadInventorySummary {
    const quantities = beadInventoryService.getQuantities();
    const managedIds = Array.from(new Set(colorIds));

    let stockedColorCount = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let totalBeadCount = 0;

    managedIds.forEach((id) => {
      const count = quantities[id] || 0;
      totalBeadCount += count;
      if (count > 0) {
        stockedColorCount += 1;
        if (count < LOW_STOCK_THRESHOLD) {
          lowStockCount += 1;
        }
      } else {
        outOfStockCount += 1;
      }
    });

    return {
      managedColorCount: managedIds.length,
      stockedColorCount,
      lowStockCount,
      outOfStockCount,
      totalBeadCount,
    };
  },

  clear(): void {
    localStorage.removeItem(BEAD_INVENTORY_KEY);
  },

  getLowStockThreshold(): number {
    return LOW_STOCK_THRESHOLD;
  },
};

export default beadInventoryService;
