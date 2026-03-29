import { BeadColor } from '../data/beadColors';
import { BeadPixelData } from './colorMatchService';

export interface QuickBackgroundRemovalSuggestion {
  primaryColorId: string | null;
  indices: number[];
  borderCoverage: number;
  regionCoverage: number;
  confidence: number;
  reason: string;
  strength: number;
}

interface QuickBackgroundRemovalOptions {
  protectSubject?: boolean;
}

interface BorderColorEntry {
  color: BeadColor;
  count: number;
  coverage: number;
  sideHits: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

interface SimilarColorRule {
  colorIds: Set<string>;
  primaryColor: BeadColor;
  maxDistance: number;
}

interface SimilarRegionComponent {
  indices: number[];
  touchesEdge: boolean;
  minEdgeDistance: number;
}

interface AdaptiveSeedRegion {
  indices: number[];
  touchesTop: boolean;
  topHalfRatio: number;
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

const getCornerIndices = (width: number, height: number, depth: number = 2): number[] => {
  const indices = new Set<number>();
  const maxDepthX = Math.min(depth, width);
  const maxDepthY = Math.min(depth, height);

  for (let y = 0; y < maxDepthY; y += 1) {
    for (let x = 0; x < maxDepthX; x += 1) {
      indices.add(y * width + x);
      indices.add(y * width + (width - 1 - x));
      indices.add((height - 1 - y) * width + x);
      indices.add((height - 1 - y) * width + (width - 1 - x));
    }
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

const collectConnectedSimilarBorderRegion = (
  beadData: BeadPixelData,
  seedIndices: number[],
  protectedBuffer: Set<number>,
  similarColorRule: SimilarColorRule
): number[] => {
  const { width, height, beads } = beadData;
  const queue: number[] = [];
  const visited = new Set<number>();
  const region: number[] = [];

  seedIndices.forEach((index) => {
    if (visited.has(index) || protectedBuffer.has(index)) return;
    const bead = beads[index];
    if (!isBeadSimilarToBackground(bead, similarColorRule)) return;
    queue.push(index);
    visited.add(index);
  });

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
      if (nextIndex < 0 || visited.has(nextIndex) || protectedBuffer.has(nextIndex)) continue;
      const bead = beads[nextIndex];
      if (!isBeadSimilarToBackground(bead, similarColorRule)) continue;
      visited.add(nextIndex);
      queue.push(nextIndex);
    }
  }

  return region;
};

const collectBorderColorEntries = (beadData: BeadPixelData): BorderColorEntry[] => {
  const { width, height } = beadData;
  const borderIndices = getBorderIndices(width, height);
  const colorEntries = new Map<string, { color: BeadColor; count: number; sideHits: BorderColorEntry['sideHits'] }>();
  let nonTransparentBorderCount = 0;

  borderIndices.forEach((index) => {
    const bead = beadData.beads[index];
    if (!bead) return;
    nonTransparentBorderCount += 1;

    const x = index % width;
    const y = Math.floor(index / width);
    const isTop = y === 0;
    const isBottom = y === height - 1;
    const isLeft = x === 0;
    const isRight = x === width - 1;

    const existing = colorEntries.get(bead.id);
    if (existing) {
      existing.count += 1;
      if (isTop) existing.sideHits.top += 1;
      if (isRight) existing.sideHits.right += 1;
      if (isBottom) existing.sideHits.bottom += 1;
      if (isLeft) existing.sideHits.left += 1;
      return;
    }
    colorEntries.set(bead.id, {
      color: bead,
      count: 1,
      sideHits: {
        top: isTop ? 1 : 0,
        right: isRight ? 1 : 0,
        bottom: isBottom ? 1 : 0,
        left: isLeft ? 1 : 0,
      },
    });
  });

  if (nonTransparentBorderCount === 0) {
    return [];
  }

  return Array.from(colorEntries.values())
    .map((entry) => ({
      color: entry.color,
      count: entry.count,
      coverage: entry.count / nonTransparentBorderCount,
      sideHits: entry.sideHits,
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

const createSimilarColorRule = (
  primaryEntry: BorderColorEntry,
  candidateEntries: BorderColorEntry[],
  normalizedStrength: number
): SimilarColorRule => ({
  colorIds: new Set(candidateEntries.map((entry) => entry.color.id)),
  primaryColor: primaryEntry.color,
  maxDistance: 18 + normalizedStrength * 0.28,
});

const createBackgroundClusterRules = (
  candidateEntries: BorderColorEntry[],
  normalizedStrength: number
): SimilarColorRule[] => {
  if (candidateEntries.length === 0) {
    return [];
  }

  return candidateEntries.map((entry) => {
    const clusterEntries = candidateEntries.filter((candidate) => {
      const redDiff = entry.color.rgb[0] - candidate.color.rgb[0];
      const greenDiff = entry.color.rgb[1] - candidate.color.rgb[1];
      const blueDiff = entry.color.rgb[2] - candidate.color.rgb[2];
      const distance = Math.sqrt(redDiff * redDiff + greenDiff * greenDiff + blueDiff * blueDiff);

      return distance <= 22 + normalizedStrength * 0.38;
    });

    return createSimilarColorRule(
      entry,
      clusterEntries.length > 0 ? clusterEntries : [entry],
      normalizedStrength
    );
  });
};

const isBeadSimilarToBackground = (
  bead: BeadColor | null,
  rule: SimilarColorRule
): boolean => {
  if (!bead) return false;
  if (rule.colorIds.has(bead.id)) return true;

  const redDiff = rule.primaryColor.rgb[0] - bead.rgb[0];
  const greenDiff = rule.primaryColor.rgb[1] - bead.rgb[1];
  const blueDiff = rule.primaryColor.rgb[2] - bead.rgb[2];
  const distance = Math.sqrt(redDiff * redDiff + greenDiff * greenDiff + blueDiff * blueDiff);

  return distance <= rule.maxDistance;
};

const expandBackgroundHalo = (
  beadData: BeadPixelData,
  initialIndices: number[],
  protectedBuffer: Set<number>,
  similarColorRule: SimilarColorRule
): number[] => {
  const { beads, width, height } = beadData;
  const expanded = new Set<number>(initialIndices);
  const queue = [...initialIndices];

  const hasStraightBridge = (index: number): boolean => {
    const x = index % width;
    const y = Math.floor(index / width);

    const left = x > 0 ? index - 1 : -1;
    const right = x < width - 1 ? index + 1 : -1;
    const top = y > 0 ? index - width : -1;
    const bottom = y < height - 1 ? index + width : -1;

    const horizontalBridge =
      left >= 0 &&
      right >= 0 &&
      expanded.has(left) &&
      expanded.has(right);

    const verticalBridge =
      top >= 0 &&
      bottom >= 0 &&
      expanded.has(top) &&
      expanded.has(bottom);

    return horizontalBridge || verticalBridge;
  };

  while (queue.length > 0) {
    const index = queue.shift() as number;

    for (const neighborIndex of getNeighborIndices(index, width, height)) {
      if (expanded.has(neighborIndex) || protectedBuffer.has(neighborIndex)) continue;

      const bead = beads[neighborIndex];
      if (!isBeadSimilarToBackground(bead, similarColorRule)) continue;

      const neighborCandidates = getNeighborIndices(neighborIndex, width, height);
      const adjacentCandidateCount = neighborCandidates.reduce((count, nextIndex) => (
        expanded.has(nextIndex) ? count + 1 : count
      ), 0);

      if (adjacentCandidateCount < 3 && !hasStraightBridge(neighborIndex)) continue;

      expanded.add(neighborIndex);
      queue.push(neighborIndex);
    }
  }

  return Array.from(expanded);
};

const collectSimilarRegionComponents = (
  beadData: BeadPixelData,
  protectedBuffer: Set<number>,
  similarColorRule: SimilarColorRule
): SimilarRegionComponent[] => {
  const { width, height, beads } = beadData;
  const visited = new Set<number>();
  const components: SimilarRegionComponent[] = [];

  for (let index = 0; index < beads.length; index += 1) {
    if (visited.has(index) || protectedBuffer.has(index)) continue;
    const bead = beads[index];
    if (!isBeadSimilarToBackground(bead, similarColorRule)) continue;

    const queue = [index];
    const componentIndices: number[] = [];
    let touchesEdge = false;
    let minEdgeDistance = Number.POSITIVE_INFINITY;
    visited.add(index);

    while (queue.length > 0) {
      const current = queue.shift() as number;
      componentIndices.push(current);

      const x = current % width;
      const y = Math.floor(current / width);
      const edgeDistance = Math.min(x, y, width - 1 - x, height - 1 - y);
      minEdgeDistance = Math.min(minEdgeDistance, edgeDistance);
      if (edgeDistance === 0) {
        touchesEdge = true;
      }

      const neighbors = [
        x > 0 ? current - 1 : -1,
        x < width - 1 ? current + 1 : -1,
        y > 0 ? current - width : -1,
        y < height - 1 ? current + width : -1,
      ];

      neighbors.forEach((nextIndex) => {
        if (nextIndex < 0 || visited.has(nextIndex) || protectedBuffer.has(nextIndex)) return;
        const nextBead = beads[nextIndex];
        if (!isBeadSimilarToBackground(nextBead, similarColorRule)) return;
        visited.add(nextIndex);
        queue.push(nextIndex);
      });
    }

    components.push({
      indices: componentIndices,
      touchesEdge,
      minEdgeDistance,
    });
  }

  return components;
};

const absorbSmallBackgroundComponents = (
  beadData: BeadPixelData,
  initialIndices: number[],
  protectedBuffer: Set<number>,
  clusterRules: SimilarColorRule[],
  nonTransparentCellCount: number
): number[] => {
  if (clusterRules.length === 0 || initialIndices.length === 0) {
    return initialIndices;
  }

  const { width, height } = beadData;
  const backgroundSet = new Set<number>(initialIndices);
  const maxComponentSize = Math.max(8, Math.min(64, Math.round(nonTransparentCellCount * 0.012)));

  clusterRules.forEach((rule) => {
    const components = collectSimilarRegionComponents(beadData, protectedBuffer, rule);

    components.forEach((component) => {
      if (component.indices.length === 0 || component.indices.length > maxComponentSize) {
        return;
      }

      const alreadyCovered = component.indices.some((index) => backgroundSet.has(index));
      if (alreadyCovered) {
        return;
      }

      if (!component.touchesEdge && component.minEdgeDistance > 2) {
        return;
      }

      let adjacentBackgroundCount = 0;

      component.indices.forEach((index) => {
        const x = index % width;
        const y = Math.floor(index / width);
        const neighbors = [
          x > 0 ? index - 1 : -1,
          x < width - 1 ? index + 1 : -1,
          y > 0 ? index - width : -1,
          y < height - 1 ? index + width : -1,
        ];

        neighbors.forEach((neighborIndex) => {
          if (neighborIndex >= 0 && backgroundSet.has(neighborIndex)) {
            adjacentBackgroundCount += 1;
          }
        });
      });

      const minAdjacency = component.indices.length <= 16 ? 2 : 3;
      if (adjacentBackgroundCount < minAdjacency) {
        return;
      }

      component.indices.forEach((index) => {
        backgroundSet.add(index);
      });
    });
  });

  return Array.from(backgroundSet);
};

const collectAdaptiveSeedRegion = (
  beadData: BeadPixelData,
  seedIndex: number,
  protectedBuffer: Set<number>,
  seedDistanceThreshold: number,
  averageDistanceThreshold: number,
  brightnessTolerance: number
): AdaptiveSeedRegion => {
  const { width, height, beads } = beadData;
  const seedBead = beads[seedIndex];

  if (!seedBead) {
    return {
      indices: [],
      touchesTop: false,
      topHalfRatio: 0,
    };
  }

  const calcDistance = (source: [number, number, number], target: [number, number, number]) => {
    const redDiff = source[0] - target[0];
    const greenDiff = source[1] - target[1];
    const blueDiff = source[2] - target[2];
    return Math.sqrt(redDiff * redDiff + greenDiff * greenDiff + blueDiff * blueDiff);
  };

  const seedBrightness = (seedBead.rgb[0] + seedBead.rgb[1] + seedBead.rgb[2]) / 3;
  const visited = new Set<number>([seedIndex]);
  const queue: number[] = [seedIndex];
  const result: number[] = [];

  let avgR = seedBead.rgb[0];
  let avgG = seedBead.rgb[1];
  let avgB = seedBead.rgb[2];
  let acceptedCount = 1;
  let touchesTop = false;
  let topHalfCount = 0;

  while (queue.length > 0) {
    const index = queue.shift();
    if (index === undefined) break;

    const bead = beads[index];
    if (!bead) continue;

    result.push(index);

    const x = index % width;
    const y = Math.floor(index / width);
    if (y === 0) {
      touchesTop = true;
    }
    if (y <= Math.floor(height * 0.5)) {
      topHalfCount += 1;
    }

    avgR = (avgR * acceptedCount + bead.rgb[0]) / (acceptedCount + 1);
    avgG = (avgG * acceptedCount + bead.rgb[1]) / (acceptedCount + 1);
    avgB = (avgB * acceptedCount + bead.rgb[2]) / (acceptedCount + 1);
    acceptedCount += 1;

    const neighbors = getNeighborIndices(index, width, height);
    neighbors.forEach((nextIndex) => {
      if (visited.has(nextIndex)) return;
      visited.add(nextIndex);

      const nextBead = beads[nextIndex];
      if (!nextBead) return;

      const distanceToSeed = calcDistance(seedBead.rgb, nextBead.rgb);
      const distanceToAverage = calcDistance([avgR, avgG, avgB], nextBead.rgb);
      const nextBrightness = (nextBead.rgb[0] + nextBead.rgb[1] + nextBead.rgb[2]) / 3;
      const brightnessDiff = Math.abs(seedBrightness - nextBrightness);

      if (
        (distanceToSeed <= seedDistanceThreshold || distanceToAverage <= averageDistanceThreshold) &&
        brightnessDiff <= brightnessTolerance
      ) {
        queue.push(nextIndex);
      }
    });
  }

  return {
    indices: result.filter((index) => !protectedBuffer.has(index)),
    touchesTop,
    topHalfRatio: result.length > 0 ? topHalfCount / result.length : 0,
  };
};

const collectTopEdgeFallbackIndices = (
  beadData: BeadPixelData,
  protectedBuffer: Set<number>,
  nonTransparentCellCount: number
): number[] => {
  const { width, height, beads } = beadData;
  const topBandDepth = Math.min(3, height);
  const step = width <= 96 ? 2 : 3;
  const seedIndices: number[] = [];

  for (let y = 0; y < topBandDepth; y += 1) {
    for (let x = 0; x < width; x += step) {
      const index = y * width + x;
      if (!beads[index] || protectedBuffer.has(index)) continue;
      seedIndices.push(index);
    }
  }

  const minRegionSize = Math.max(24, Math.round(nonTransparentCellCount * 0.004));
  const acceptedRegions: number[][] = [];

  const shouldMergeRegion = (region: number[]) => {
    const regionSet = new Set(region);
    return acceptedRegions.some((existing) => {
      const overlap = existing.reduce((count, index) => (
        regionSet.has(index) ? count + 1 : count
      ), 0);
      return overlap / Math.min(existing.length, region.length) >= 0.6;
    });
  };

  seedIndices.forEach((seedIndex) => {
    const strictRegion = collectAdaptiveSeedRegion(beadData, seedIndex, protectedBuffer, 46, 38, 36);
    const relaxedRegion = strictRegion.indices.length >= minRegionSize
      ? strictRegion
      : collectAdaptiveSeedRegion(beadData, seedIndex, protectedBuffer, 70, 58, 54);
    const finalRegion = relaxedRegion.indices.length > strictRegion.indices.length
      ? relaxedRegion
      : strictRegion;

    if (
      !finalRegion.touchesTop ||
      finalRegion.indices.length < minRegionSize ||
      finalRegion.topHalfRatio < 0.32
    ) {
      return;
    }

    if (shouldMergeRegion(finalRegion.indices)) {
      return;
    }

    acceptedRegions.push(finalRegion.indices);
  });

  const merged = new Set<number>();
  acceptedRegions
    .sort((a, b) => b.length - a.length)
    .slice(0, 4)
    .forEach((region) => {
      region.forEach((index) => merged.add(index));
    });

  return Array.from(merged);
};

const countActiveSides = (entry: BorderColorEntry, sideThreshold: number): number => (
  Number(entry.sideHits.top >= sideThreshold) +
  Number(entry.sideHits.right >= sideThreshold) +
  Number(entry.sideHits.bottom >= sideThreshold) +
  Number(entry.sideHits.left >= sideThreshold)
);

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
  const protectedSubjectRegion = protectSubject
    ? collectProtectedSubjectRegion(beadData, primaryColorId)
    : new Set<number>();
  const protectedBuffer = protectSubject
    ? expandProtectedSubjectBuffer(protectedSubjectRegion, beadData.width, beadData.height)
    : new Set<number>();
  const minCandidateCoverage = Math.max(0.03, 0.14 - normalizedStrength * 0.0009);
  const colorSimilarityThreshold = 36 + normalizedStrength * 0.55;
  const sideThreshold = Math.max(2, Math.round(Math.min(beadData.width, beadData.height) * 0.015));
  const clusterSimilarityThreshold = 30 + normalizedStrength * 0.45;

  const getColorDistance = (source: BeadColor, target: BeadColor) => {
    const redDiff = source.rgb[0] - target.rgb[0];
    const greenDiff = source.rgb[1] - target.rgb[1];
    const blueDiff = source.rgb[2] - target.rgb[2];
    return Math.sqrt(redDiff * redDiff + greenDiff * greenDiff + blueDiff * blueDiff);
  };

  const clusterCoverageMap = new Map<string, number>();
  const clusterActiveSidesMap = new Map<string, number>();

  borderEntries.forEach((entry) => {
    const clusterEntries = borderEntries.filter((candidate) => (
      getColorDistance(entry.color, candidate.color) <= clusterSimilarityThreshold
    ));
    const clusterCoverage = clusterEntries.reduce((sum, candidate) => sum + candidate.coverage, 0);
    const aggregatedSideHits = clusterEntries.reduce(
      (acc, candidate) => ({
        top: acc.top + candidate.sideHits.top,
        right: acc.right + candidate.sideHits.right,
        bottom: acc.bottom + candidate.sideHits.bottom,
        left: acc.left + candidate.sideHits.left,
      }),
      { top: 0, right: 0, bottom: 0, left: 0 }
    );
    const clusterActiveSides = (
      Number(aggregatedSideHits.top >= sideThreshold) +
      Number(aggregatedSideHits.right >= sideThreshold) +
      Number(aggregatedSideHits.bottom >= sideThreshold) +
      Number(aggregatedSideHits.left >= sideThreshold)
    );

    clusterCoverageMap.set(entry.color.id, clusterCoverage);
    clusterActiveSidesMap.set(entry.color.id, clusterActiveSides);
  });

  const candidateEntries = borderEntries.filter((entry, index) => {
    if (index === 0) return true;
    const activeSides = countActiveSides(entry, sideThreshold);
    const clusterCoverage = clusterCoverageMap.get(entry.color.id) || entry.coverage;
    const clusterActiveSides = clusterActiveSidesMap.get(entry.color.id) || activeSides;
    const strongMultiSideBackground = activeSides >= 2 && entry.coverage >= Math.max(0.02, minCandidateCoverage * 0.6);
    const strongSingleSideBackground = activeSides >= 1 && entry.coverage >= Math.max(0.08, minCandidateCoverage * 1.4);
    const clusteredMultiSideBackground =
      clusterActiveSides >= 2 && clusterCoverage >= Math.max(0.04, minCandidateCoverage * 0.9);
    const clusteredWideBackground =
      clusterActiveSides >= 3 && clusterCoverage >= Math.max(0.025, minCandidateCoverage * 0.55);

    if (
      entry.coverage < minCandidateCoverage &&
      !strongMultiSideBackground &&
      !strongSingleSideBackground &&
      !clusteredMultiSideBackground &&
      !clusteredWideBackground
    ) {
      return false;
    }

    const distance = getColorDistance(primaryEntry.color, entry.color);

    return (
      distance <= colorSimilarityThreshold ||
      entry.coverage >= 0.18 ||
      strongMultiSideBackground ||
      clusteredMultiSideBackground ||
      clusteredWideBackground
    );
  });

  const similarColorRule = createSimilarColorRule(primaryEntry, candidateEntries, normalizedStrength);
  const clusterRules = createBackgroundClusterRules(candidateEntries, normalizedStrength);
  const borderSeedColorIds = new Set(candidateEntries.map((entry) => entry.color.id));
  const cornerIndices = new Set(getCornerIndices(beadData.width, beadData.height, 2));
  const similarConnectedRegions = clusterRules
    .map((rule) => {
      const borderSeedIndices = getBorderIndices(beadData.width, beadData.height).filter((index) => {
        const bead = beadData.beads[index];
        if (!bead) return false;
        return borderSeedColorIds.has(bead.id) || (cornerIndices.has(index) && isBeadSimilarToBackground(bead, rule));
      });

      return collectConnectedSimilarBorderRegion(
        beadData,
        borderSeedIndices,
        protectedBuffer,
        rule
      );
    })
    .filter((region) => region.length > 0);
  const candidateGroups = candidateEntries
    .map((entry) => collectConnectedBorderRegion(beadData, entry.color.id))
    .filter((group) => group.length > 0);
  const effectiveGroups = similarConnectedRegions.length > 0
    ? [...similarConnectedRegions, ...candidateGroups]
    : candidateGroups;
  const initialIndices = unionCandidateIndices(effectiveGroups, protectedBuffer);
  const expandedIndices = expandBackgroundHalo(
    beadData,
    initialIndices,
    protectedBuffer,
    similarColorRule
  );
  const indices = absorbSmallBackgroundComponents(
    beadData,
    expandedIndices,
    protectedBuffer,
    clusterRules,
    nonTransparentCellCount
  );
  const tinyRegionThreshold = Math.max(12, Math.round(nonTransparentCellCount * 0.0025));
  const fallbackIndices = indices.length <= tinyRegionThreshold
    ? collectTopEdgeFallbackIndices(beadData, protectedBuffer, nonTransparentCellCount)
    : [];
  const finalIndexSet = new Set<number>([...indices, ...fallbackIndices]);
  const finalIndices = Array.from(finalIndexSet);
  const regionCoverage = finalIndices.length / nonTransparentCellCount;
  const candidateCoverage = candidateEntries.reduce((sum, entry) => sum + entry.coverage, 0);

  const confidenceBase =
    Math.min(0.92, candidateCoverage) * 0.62 + Math.min(regionCoverage, 0.55) * 0.38;
  const oversizedPenalty = regionCoverage > 0.82 ? 0.18 : 0;
  const tinyPenalty = regionCoverage < 0.04 ? 0.16 : 0;
  const confidence = Math.max(0, Math.min(1, confidenceBase - oversizedPenalty - tinyPenalty));

  const manualRefineRecommended =
    candidateCoverage < 0.28 ||
    regionCoverage < 0.03 ||
    regionCoverage > 0.78 ||
    confidence < 0.38;

  const reason = manualRefineRecommended
    ? '边缘背景不够稳定，建议继续用连片选背景、点格擦除和补回误删逐步修干净。'
    : candidateEntries.length > 1
      ? '已按外边界连通的相近背景区域圈选，并自动吃掉贴边细残留和小片背景碎块，内部被图案包住的同色区域不会被当成背景。'
      : '已按外边界连通的背景区域圈选，并自动吃掉贴边细残留和小片背景碎块，内部被图案包住的同色区域不会被当成背景。';
  const finalReason =
    protectSubject && protectedSubjectRegion.size > 0
      ? `${reason} 已启用主体保护，中心主体及周边缓冲区不会被一起删除。`
      : reason;
  return {
    primaryColorId,
    indices: finalIndices,
    borderCoverage,
    regionCoverage,
    confidence,
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


