import { BeadColor } from '../data/beadColors';
import { BeadPixelData } from './colorMatchService';

export interface QuickBackgroundRemovalSuggestion {
  primaryColorId: string | null;
  indices: number[];
  borderCoverage: number;
  regionCoverage: number;
  confidence: number;
  aiRecommended: boolean;
  reason: string;
  strength: number;
}

export interface AiBackgroundRemovalPlan {
  mode: 'ai';
  provider: 'aliyun';
  scene: 'complex-background';
  rewardGateRecommended: boolean;
}

interface QuickBackgroundRemovalOptions {
  protectSubject?: boolean;
}

interface BorderColorEntry {
  color: BeadColor;
  count: number;
  coverage: number;
}

const getBorderIndices = (width: number, height: number): number[] => {
  const indices = new Set<number>();

  for (let x = 0; x < width; x += 1) {
    indices.add(x);
    indices.add((height - 1) * width + x);
  }

  for (let y = 0; y < height; y += 1) {
    indices.add(y * width);
    indices.add(y * width + width - 1);
  }

  return Array.from(indices);
};

const collectConnectedBorderRegion = (
  beadData: BeadPixelData,
  targetColorId: string
): number[] => {
  const { width, height, beads } = beadData;
  const queue: number[] = [];
  const visited = new Set<number>();
  const region: number[] = [];

  for (const index of getBorderIndices(width, height)) {
    const bead = beads[index];
    if (bead && bead.id === targetColorId) {
      queue.push(index);
      visited.add(index);
    }
  }

  while (queue.length > 0) {
    const index = queue.shift() as number;
    region.push(index);

    const x = index % width;
    const y = Math.floor(index / width);
    const neighbors = [
      x > 0 ? index - 1 : -1,
      x < width - 1 ? index + 1 : -1,
      y > 0 ? index - width : -1,
      y < height - 1 ? index + width : -1,
    ];

    for (const nextIndex of neighbors) {
      if (nextIndex < 0 || visited.has(nextIndex)) continue;
      const bead = beads[nextIndex];
      if (bead && bead.id === targetColorId) {
        visited.add(nextIndex);
        queue.push(nextIndex);
      }
    }
  }

  return region;
};

const collectAllSameColorIndices = (beadData: BeadPixelData, targetColorId: string): number[] => {
  return beadData.beads
    .map((bead, index) => (bead && bead.id === targetColorId ? index : -1))
    .filter((index) => index >= 0);
};

const collectBorderColorEntries = (beadData: BeadPixelData): BorderColorEntry[] => {
  const borderIndices = getBorderIndices(beadData.width, beadData.height);
  const colorEntries = new Map<string, { color: BeadColor; count: number }>();
  let nonTransparentBorderCount = 0;

  borderIndices.forEach((index) => {
    const bead = beadData.beads[index];
    if (!bead) return;
    nonTransparentBorderCount += 1;
    const existing = colorEntries.get(bead.id);
    if (existing) {
      existing.count += 1;
      return;
    }
    colorEntries.set(bead.id, { color: bead, count: 1 });
  });

  if (nonTransparentBorderCount === 0) {
    return [];
  }

  return Array.from(colorEntries.values())
    .map((entry) => ({
      color: entry.color,
      count: entry.count,
      coverage: entry.count / nonTransparentBorderCount,
    }))
    .sort((a, b) => b.count - a.count);
};

const getNeighborIndices = (index: number, width: number, height: number): number[] => {
  const x = index % width;
  const y = Math.floor(index / width);
  const neighbors: number[] = [];

  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      neighbors.push(ny * width + nx);
    }
  }

  return neighbors;
};

const collectCentralSubjectSeeds = (
  beadData: BeadPixelData,
  backgroundColorId: string
): number[] => {
  const { width, height, beads } = beadData;
  const centerX = (width - 1) / 2;
  const centerY = (height - 1) / 2;
  const radiusX = Math.max(2, width * 0.28);
  const radiusY = Math.max(2, height * 0.28);
  const seeds: number[] = [];

  beads.forEach((bead, index) => {
    if (!bead || bead.id === backgroundColorId) {
      return;
    }

    const x = index % width;
    const y = Math.floor(index / width);
    const normalizedDistance =
      ((x - centerX) * (x - centerX)) / (radiusX * radiusX) +
      ((y - centerY) * (y - centerY)) / (radiusY * radiusY);

    if (normalizedDistance <= 1) {
      seeds.push(index);
    }
  });

  return seeds;
};

const collectProtectedSubjectRegion = (
  beadData: BeadPixelData,
  backgroundColorId: string
): Set<number> => {
  const { width, height, beads } = beadData;
  const seedIndices = collectCentralSubjectSeeds(beadData, backgroundColorId);

  if (seedIndices.length === 0) {
    return new Set<number>();
  }

  const queue = [...seedIndices];
  const protectedSet = new Set<number>(seedIndices);

  while (queue.length > 0) {
    const index = queue.shift() as number;

    for (const neighborIndex of getNeighborIndices(index, width, height)) {
      if (protectedSet.has(neighborIndex)) continue;
      const bead = beads[neighborIndex];
      if (!bead || bead.id === backgroundColorId) continue;
      protectedSet.add(neighborIndex);
      queue.push(neighborIndex);
    }
  }

  return protectedSet;
};

const expandProtectedSubjectBuffer = (
  subjectRegion: Set<number>,
  width: number,
  height: number
): Set<number> => {
  const protectedBuffer = new Set<number>(subjectRegion);

  subjectRegion.forEach((index) => {
    getNeighborIndices(index, width, height).forEach((neighborIndex) => {
      protectedBuffer.add(neighborIndex);
    });
  });

  return protectedBuffer;
};

const unionCandidateIndices = (
  candidateGroups: number[][],
  protectedBuffer: Set<number>
): number[] => {
  const merged = new Set<number>();

  candidateGroups.forEach((group) => {
    group.forEach((index) => {
      if (!protectedBuffer.has(index)) {
        merged.add(index);
      }
    });
  });

  return Array.from(merged);
};

export const suggestQuickBackgroundRemoval = (
  beadData: BeadPixelData,
  strength: number = 55,
  options: QuickBackgroundRemovalOptions = {}
): QuickBackgroundRemovalSuggestion | null => {
  const { beads } = beadData;
  const normalizedStrength = Math.max(0, Math.min(100, Math.round(strength)));
  const protectSubject = options.protectSubject !== false;
  const borderEntries = collectBorderColorEntries(beadData);

  let nonTransparentCellCount = 0;

  beads.forEach((bead) => {
    if (bead) {
      nonTransparentCellCount += 1;
    }
  });

  if (borderEntries.length === 0 || nonTransparentCellCount === 0) {
    return null;
  }

  const primaryEntry = borderEntries[0];
  const primaryColorId = primaryEntry.color.id;
  const borderCoverage = primaryEntry.coverage;
  const connectedIndices = collectConnectedBorderRegion(beadData, primaryColorId);
  const sameColorIndices = collectAllSameColorIndices(beadData, primaryColorId);
  const expandThreshold = 0.88 - normalizedStrength * 0.0053;
  const useFullColorRange = borderCoverage >= expandThreshold;
  const protectedSubjectRegion = protectSubject
    ? collectProtectedSubjectRegion(beadData, primaryColorId)
    : new Set<number>();
  const protectedBuffer = protectSubject
    ? expandProtectedSubjectBuffer(protectedSubjectRegion, beadData.width, beadData.height)
    : new Set<number>();
  const minCandidateCoverage = Math.max(0.03, 0.14 - normalizedStrength * 0.0009);
  const colorSimilarityThreshold = 36 + normalizedStrength * 0.55;

  const candidateEntries = borderEntries.filter((entry, index) => {
    if (index === 0) return true;
    if (entry.coverage < minCandidateCoverage) return false;

    const redDiff = primaryEntry.color.rgb[0] - entry.color.rgb[0];
    const greenDiff = primaryEntry.color.rgb[1] - entry.color.rgb[1];
    const blueDiff = primaryEntry.color.rgb[2] - entry.color.rgb[2];
    const distance = Math.sqrt(redDiff * redDiff + greenDiff * greenDiff + blueDiff * blueDiff);

    return distance <= colorSimilarityThreshold || entry.coverage >= 0.18;
  });

  const candidateGroups = useFullColorRange
    ? [sameColorIndices]
    : candidateEntries
        .map((entry) => collectConnectedBorderRegion(beadData, entry.color.id))
        .filter((group) => group.length > 0);
  const effectiveGroups = candidateGroups.length > 0 ? candidateGroups : [connectedIndices];
  const indices = unionCandidateIndices(effectiveGroups, protectedBuffer);
  const regionCoverage = indices.length / nonTransparentCellCount;
  const candidateCoverage = candidateEntries.reduce((sum, entry) => sum + entry.coverage, 0);

  const confidenceBase =
    Math.min(0.92, candidateCoverage) * 0.62 + Math.min(regionCoverage, 0.55) * 0.38;
  const oversizedPenalty = regionCoverage > 0.82 ? 0.18 : 0;
  const tinyPenalty = regionCoverage < 0.04 ? 0.16 : 0;
  const confidence = Math.max(0, Math.min(1, confidenceBase - oversizedPenalty - tinyPenalty));

  const aiRecommended =
    candidateCoverage < 0.28 ||
    regionCoverage < 0.03 ||
    regionCoverage > 0.78 ||
    confidence < 0.38;

  const reason = aiRecommended
    ? '边缘背景不够稳定，建议使用智能抠图获得更干净的结果。'
    : useFullColorRange
      ? '边缘主色很稳定，已按整片同色背景优先圈选。'
      : candidateEntries.length > 1
        ? '边缘存在多组接近背景色，已把相近区域一起纳入候选。'
        : '已按边缘连通区域圈出主要背景候选。';
  const finalReason =
    protectSubject && protectedSubjectRegion.size > 0
      ? `${reason} 已启用主体保护，中心主体及周边缓冲区不会被一并删除。`
      : reason;

  return {
    primaryColorId,
    indices,
    borderCoverage,
    regionCoverage,
    confidence,
    aiRecommended,
    reason: finalReason,
    strength: normalizedStrength,
  };
};

export const applyTransparentIndices = (
  beadData: BeadPixelData,
  indices: number[]
): BeadPixelData => {
  const nextBeads = [...beadData.beads];
  indices.forEach((index) => {
    nextBeads[index] = null;
  });

  return {
    ...beadData,
    beads: nextBeads,
  };
};

export const getAiBackgroundRemovalPlan = (): AiBackgroundRemovalPlan => ({
  mode: 'ai',
  provider: 'aliyun',
  scene: 'complex-background',
  rewardGateRecommended: true,
});

