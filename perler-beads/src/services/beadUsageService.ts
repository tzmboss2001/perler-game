import { BeadColor } from '../data/beadColors';
import { BeadPixelData } from './colorMatchService';

export interface BeadUsageItem {
  color: BeadColor;
  count: number;
}

export interface BeadUsageSummary {
  totalBeads: number;
  colorCount: number;
  usageMap: Record<string, BeadUsageItem>;
  usageList: BeadUsageItem[];
}

export function countBeadUsage(data: BeadPixelData): BeadUsageSummary {
  const usageMap = new Map<string, BeadUsageItem>();
  let totalBeads = 0;

  for (const bead of data.beads) {
    if (!bead) continue;
    totalBeads += 1;
    const existing = usageMap.get(bead.id);
    if (existing) {
      existing.count += 1;
    } else {
      usageMap.set(bead.id, {
        color: bead,
        count: 1,
      });
    }
  }

  const usageList = Array.from(usageMap.values()).sort((a, b) => b.count - a.count);
  return {
    totalBeads,
    colorCount: usageList.length,
    usageMap: Object.fromEntries(usageList.map((item) => [item.color.id, item])),
    usageList,
  };
}

export default countBeadUsage;
