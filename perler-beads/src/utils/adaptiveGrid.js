export const DEFAULT_ADAPTIVE_GRID_VISIBILITY = {
  smallGrid: false,
  crossGuide: false,
  adaptive: false,
  workingBoost: false,
};

const clamp01 = (value) => Math.max(0, Math.min(1, value));

const luminanceFromRgb = (rgb) => {
  if (!Array.isArray(rgb) || rgb.length < 3) return null;
  const [r, g, b] = rgb;
  if (![r, g, b].every((v) => Number.isFinite(v))) return null;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
};

const toTone = (avg) => {
  if (!Number.isFinite(avg)) return "mixed";
  if (avg >= 0.68) return "light";
  if (avg <= 0.32) return "dark";
  return "mixed";
};

export function getAdaptiveGridRegionTone({
  beads,
  width,
  height,
  startX,
  startY,
  endX,
  endY,
}) {
  const safeWidth = Math.max(0, Math.floor(width || 0));
  const safeHeight = Math.max(0, Math.floor(height || 0));
  const x1 = Math.max(0, Math.floor(startX || 0));
  const y1 = Math.max(0, Math.floor(startY || 0));
  const x2 = Math.min(safeWidth, Math.ceil(endX || 0));
  const y2 = Math.min(safeHeight, Math.ceil(endY || 0));

  let total = 0;
  let count = 0;
  for (let y = y1; y < y2; y += 1) {
    for (let x = x1; x < x2; x += 1) {
      const bead = beads?.[y * safeWidth + x];
      const lum = luminanceFromRgb(bead?.rgb);
      if (lum === null) continue;
      total += lum;
      count += 1;
    }
  }
  return count > 0 ? toTone(total / count) : "mixed";
}

const STYLE_TABLE = {
  small: {
    width: 0.76,
    darkTop: 0.34,
    lightTop: 0.08,
    mixedDark: 0.34,
    mixedLight: 0.06,
  },
  cross: {
    width: 0.94,
    darkTop: 0.46,
    lightTop: 0.1,
    mixedDark: 0.46,
    mixedLight: 0.08,
  },
  guide: {
    width: 1.18,
    darkTop: 0.58,
    lightTop: 0.11,
    mixedDark: 0.58,
    mixedLight: 0.08,
  },
};

const BOOST = {
  none: 1,
  viewport: 1.08,
  currentBoard: 1.18,
};

function rgba(r, g, b, alpha) {
  return `rgba(${r},${g},${b},${Number(clamp01(alpha).toFixed(3))})`;
}

export function getAdaptiveGridVisualLayers({
  tone,
  lineKind,
  boostLevel = "none",
  dpr = 1,
  displayScale = 1,
}) {
  const table = STYLE_TABLE[lineKind] || STYLE_TABLE.cross;
  const boost = BOOST[boostLevel] || 1;
  const safeDpr = Math.max(1, Number.isFinite(dpr) ? dpr : 1);
  const safeDisplayScale = Math.max(
    0.0001,
    Number.isFinite(displayScale) ? displayScale : 1,
  );
  const minCanvasWidth = 0.5 / safeDpr;
  const width = Math.min(
    1.5,
    Math.max(minCanvasWidth, table.width / safeDisplayScale),
  );

  if (tone === "dark") {
    return [
      {
        strokeStyle: rgba(248, 250, 252, table.lightTop * boost),
        lineWidth: Math.max(minCanvasWidth, width * 0.72),
        alpha: Number((table.lightTop * boost).toFixed(3)),
      },
      {
        strokeStyle: rgba(15, 23, 42, table.darkTop * 0.78 * boost),
        lineWidth: Math.max(minCanvasWidth, width * 0.9),
        alpha: Number((table.darkTop * 0.78 * boost).toFixed(3)),
      },
    ];
  }

  if (tone === "light") {
    return [
      {
        strokeStyle: rgba(248, 250, 252, table.mixedLight * 0.72 * boost),
        lineWidth: Math.max(minCanvasWidth, width * 0.68),
        alpha: Number((table.mixedLight * 0.72 * boost).toFixed(3)),
      },
      {
        strokeStyle: rgba(15, 23, 42, table.darkTop * boost),
        lineWidth: width,
        alpha: Number((table.darkTop * boost).toFixed(3)),
      },
    ];
  }

  return [
    {
      strokeStyle: rgba(248, 250, 252, table.mixedLight * boost),
      lineWidth: Math.max(minCanvasWidth, width * 0.68),
      alpha: Number((table.mixedLight * boost).toFixed(3)),
    },
    {
      strokeStyle: rgba(15, 23, 42, table.mixedDark * boost),
      lineWidth: width,
      alpha: Number((table.mixedDark * boost).toFixed(3)),
    },
  ];
}

function hysteresisFlag({ previous, value, showAt, hideBelow }) {
  if (previous) return value >= hideBelow;
  return value >= showAt;
}

export function resolveAdaptiveGridVisibility({
  enabled,
  drawCellSize,
  previous = DEFAULT_ADAPTIVE_GRID_VISIBILITY,
}) {
  const size = Number.isFinite(drawCellSize) ? drawCellSize : 0;
  const smallGrid = hysteresisFlag({
    previous: previous.smallGrid,
    value: size,
    showAt: 7,
    hideBelow: 6,
  });
  const crossGuide = hysteresisFlag({
    previous: previous.crossGuide,
    value: size,
    showAt: 10,
    hideBelow: 8.5,
  });

  if (!enabled) {
    return {
      smallGrid,
      crossGuide,
      adaptive: false,
      workingBoost: false,
    };
  }

  return {
    smallGrid,
    crossGuide,
    adaptive: hysteresisFlag({
      previous: previous.adaptive,
      value: size,
      showAt: 9,
      hideBelow: 7.5,
    }),
    workingBoost: hysteresisFlag({
      previous: previous.workingBoost,
      value: size,
      showAt: 8,
      hideBelow: 6.5,
    }),
  };
}

function intersects(a, b) {
  if (!a || !b) return false;
  return (
    a.startX < b.endX &&
    a.endX > b.startX &&
    a.startY < b.endY &&
    a.endY > b.startY
  );
}

export function getAdaptiveGridBoostLevel({
  regionRect,
  currentBoardRect,
  viewportCenterRect,
}) {
  if (intersects(regionRect, currentBoardRect)) return "currentBoard";
  if (intersects(regionRect, viewportCenterRect)) return "viewport";
  return "none";
}

export function getViewportCenterGridRect({
  displayStartX,
  displayStartY,
  displayWidth,
  displayHeight,
  artworkWidth,
  artworkHeight,
  physicalBoardSize,
}) {
  const radius = Math.max(10, Math.floor((physicalBoardSize || 54) / 2));
  const centerX = displayStartX + displayWidth / 2;
  const centerY = displayStartY + displayHeight / 2;
  return {
    startX: Math.max(0, Math.floor(centerX - radius)),
    startY: Math.max(0, Math.floor(centerY - radius)),
    endX: Math.min(artworkWidth, Math.ceil(centerX + radius)),
    endY: Math.min(artworkHeight, Math.ceil(centerY + radius)),
  };
}
