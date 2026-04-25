import { allBeadColors, BeadColor } from '../data/beadColors';
import { BeadPixelData, findClosestBeadColorLabWithVibrancy } from './colorMatchService';
import { classifyPatternCellConfidence } from '../utils/patternImport.js';

export interface PatternImportOptions {
  rows: number;
  cols: number;
  sampleInsetRatio?: number;
  vibrancyWeight?: number;
}

export interface PatternImportLowConfidenceCell {
  row: number;
  col: number;
  reason: string;
  varianceScore: number;
  matchDistance: number;
}

export interface PatternImportResult {
  beadData: BeadPixelData;
  colorCount: number;
  previewDataUrl: string;
  lowConfidenceCells: PatternImportLowConfidenceCell[];
}

const MIN_GRID_SIZE = 1;
const MAX_GRID_SIZE = 512;

const clampGridSize = (value: number) => {
  if (!Number.isFinite(value)) {
    return MIN_GRID_SIZE;
  }

  return Math.min(MAX_GRID_SIZE, Math.max(MIN_GRID_SIZE, Math.round(value)));
};

const loadImageElement = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('IMAGE_LOAD_FAILED'));
    image.src = src;
  });
};

const getRgbDistance = (left: [number, number, number], right: [number, number, number]) => {
  const red = left[0] - right[0];
  const green = left[1] - right[1];
  const blue = left[2] - right[2];
  return Math.sqrt(red * red + green * green + blue * blue);
};

const analyzeCellColor = (
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  width: number,
  height: number,
  insetRatio: number,
) => {
  const insetX = Math.max(0, Math.floor(width * insetRatio));
  const insetY = Math.max(0, Math.floor(height * insetRatio));
  const sampleX = Math.floor(startX + insetX);
  const sampleY = Math.floor(startY + insetY);
  const sampleWidth = Math.max(1, Math.floor(width - insetX * 2));
  const sampleHeight = Math.max(1, Math.floor(height - insetY * 2));
  const imageData = ctx.getImageData(sampleX, sampleY, sampleWidth, sampleHeight).data;

  let red = 0;
  let green = 0;
  let blue = 0;
  let count = 0;
  const samples: Array<[number, number, number]> = [];

  for (let index = 0; index < imageData.length; index += 4) {
    const alpha = imageData[index + 3];
    if (alpha < 32) {
      continue;
    }

    const sample: [number, number, number] = [
      imageData[index],
      imageData[index + 1],
      imageData[index + 2],
    ];
    samples.push(sample);
    red += sample[0];
    green += sample[1];
    blue += sample[2];
    count += 1;
  }

  if (count === 0) {
    return {
      rgb: [255, 255, 255] as [number, number, number],
      varianceScore: 0,
      sampleCount: 0,
    };
  }

  const average: [number, number, number] = [
    Math.round(red / count),
    Math.round(green / count),
    Math.round(blue / count),
  ];

  const varianceScore = samples.reduce((sum, sample) => sum + getRgbDistance(sample, average), 0) / count;

  return {
    rgb: average,
    varianceScore,
    sampleCount: count,
  };
};

const buildPreviewDataUrl = (beadData: BeadPixelData, lowConfidenceCells: PatternImportLowConfidenceCell[]) => {
  const previewCanvas = document.createElement('canvas');
  const cellSize = Math.max(6, Math.min(24, Math.floor(320 / Math.max(beadData.width, beadData.height))));
  previewCanvas.width = beadData.width * cellSize;
  previewCanvas.height = beadData.height * cellSize;
  const previewContext = previewCanvas.getContext('2d');

  if (!previewContext) {
    throw new Error('PREVIEW_CONTEXT_FAILED');
  }

  for (let row = 0; row < beadData.height; row += 1) {
    for (let col = 0; col < beadData.width; col += 1) {
      const bead = beadData.beads[row * beadData.width + col];
      previewContext.fillStyle = bead?.hex || '#ffffff';
      previewContext.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
    }
  }

  previewContext.strokeStyle = 'rgba(76, 99, 136, 0.22)';
  previewContext.lineWidth = 1;
  for (let row = 0; row <= beadData.height; row += 1) {
    previewContext.beginPath();
    previewContext.moveTo(0, row * cellSize + 0.5);
    previewContext.lineTo(previewCanvas.width, row * cellSize + 0.5);
    previewContext.stroke();
  }
  for (let col = 0; col <= beadData.width; col += 1) {
    previewContext.beginPath();
    previewContext.moveTo(col * cellSize + 0.5, 0);
    previewContext.lineTo(col * cellSize + 0.5, previewCanvas.height);
    previewContext.stroke();
  }

  lowConfidenceCells.forEach((cell) => {
    previewContext.strokeStyle = 'rgba(255, 82, 102, 0.92)';
    previewContext.lineWidth = 2;
    previewContext.strokeRect(cell.col * cellSize + 1, cell.row * cellSize + 1, Math.max(2, cellSize - 2), Math.max(2, cellSize - 2));
  });

  return previewCanvas.toDataURL('image/png');
};

const countUniqueColors = (beads: Array<BeadColor | null>) => {
  return new Set(beads.filter((item): item is BeadColor => Boolean(item)).map((item) => item.id)).size;
};

export const importPatternImageToBeadData = async (
  imageSrc: string,
  options: PatternImportOptions,
): Promise<PatternImportResult> => {
  const rows = clampGridSize(options.rows);
  const cols = clampGridSize(options.cols);
  const insetRatio = options.sampleInsetRatio ?? 0.18;
  const vibrancyWeight = options.vibrancyWeight ?? 0.08;

  if (!imageSrc) {
    throw new Error('EMPTY_IMAGE');
  }

  const image = await loadImageElement(imageSrc);
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d', { willReadFrequently: true });

  if (!context) {
    throw new Error('CANVAS_CONTEXT_FAILED');
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const cellWidth = canvas.width / cols;
  const cellHeight = canvas.height / rows;
  const beads: Array<BeadColor | null> = [];
  const lowConfidenceCells: PatternImportLowConfidenceCell[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const startX = Math.floor(col * cellWidth);
      const startY = Math.floor(row * cellHeight);
      const endX = Math.floor((col + 1) * cellWidth);
      const endY = Math.floor((row + 1) * cellHeight);
      const analysis = analyzeCellColor(
        context,
        startX,
        startY,
        Math.max(1, endX - startX),
        Math.max(1, endY - startY),
        insetRatio,
      );
      const matched = findClosestBeadColorLabWithVibrancy(analysis.rgb, allBeadColors, vibrancyWeight);
      beads.push(matched);

      const matchDistance = getRgbDistance(analysis.rgb, matched.rgb);
      const confidence = classifyPatternCellConfidence({
        varianceScore: analysis.varianceScore,
        matchDistance,
        sampleCount: analysis.sampleCount,
      });

      if (confidence.isLowConfidence) {
        lowConfidenceCells.push({
          row,
          col,
          reason: confidence.reason,
          varianceScore: Number(analysis.varianceScore.toFixed(2)),
          matchDistance: Number(matchDistance.toFixed(2)),
        });
      }
    }
  }

  const beadData: BeadPixelData = {
    width: cols,
    height: rows,
    beads,
  };

  return {
    beadData,
    colorCount: countUniqueColors(beads),
    previewDataUrl: buildPreviewDataUrl(beadData, lowConfidenceCells),
    lowConfidenceCells,
  };
};