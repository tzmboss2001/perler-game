export const createSyntheticDetection = ({
  qualityLevel = "good",
  variant = "perfect",
} = {}) => {
  const target = { id: "A1", hex: "#111111" };
  const wrong = { id: "B2", hex: "#222222" };
  const detectedCells = [];

  for (let index = 0; index < 16; index += 1) {
    const x = index % 4;
    const y = Math.floor(index / 4);
    let state = "matched";
    let detectedColor = target;
    let detectedDistance = 24;

    if (variant === "missing" && index < 4) {
      state = "missing";
      detectedColor = null;
      detectedDistance = null;
    }

    if (variant === "wrong" && index < 2) {
      state = "wrong";
      detectedColor = wrong;
      detectedDistance = 40;
    }

    if (variant === "single-wrong" && index === 5) {
      state = "wrong";
      detectedColor = wrong;
      detectedDistance = 40;
    }

    detectedCells.push({
      index,
      x,
      y,
      target,
      detectedColor,
      detectedDistance,
      state,
      sample: [20, 20, 20],
      center: { x: x * 10 + 5, y: y * 10 + 5 },
    });
  }

  return {
    totalTargetCells: 16,
    matchedCells: detectedCells.filter((cell) => cell.state === "matched")
      .length,
    missingCells: detectedCells.filter((cell) => cell.state === "missing")
      .length,
    wrongCells: detectedCells.filter((cell) => cell.state === "wrong").length,
    extraFilledCells: 0,
    progress: 1,
    activeColorId: "A1",
    activeColorMatched: 0,
    activeColorRemaining: 0,
    colors: [],
    guideCells: [],
    matchedGuideCells: [],
    wrongGuideCells: [],
    wrongCellsDetail: [],
    wrongColorSuggestions: [],
    markerRadius: 4,
    quality: {
      level: qualityLevel,
      brightness: qualityLevel === "poor" ? 245 : 128,
      tint: qualityLevel === "poor" ? 30 : 0,
      glareRatio: qualityLevel === "poor" ? 0.3 : 0,
      issues: qualityLevel === "poor" ? ["glare"] : [],
    },
    detectedCells,
  };
};
