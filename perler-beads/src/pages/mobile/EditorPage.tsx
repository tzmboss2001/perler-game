import React, { useState, useEffect, useRef, useCallback } from 'react';

import { ArrowLeft, GridFour, Palette, ArrowCounterClockwise, Play, ArrowsClockwise, ShoppingCart } from '@phosphor-icons/react';
import { useNavigate, useLocation } from 'react-router-dom';

import { colors, radius, typography, shadows, animation, mixins } from '../../styles/designSystem';

import { pixelizeImage, PixelData } from '../../services/pixelizeService';

import { matchPixelsToBead, calculateBeadStatistics, renderBeadsToCanvas, BeadPixelData, BeadStatistics, reduceColors } from '../../services/colorMatchService';

import {
  defaultColorCount,
  allBeadColors,
  BeadColor,
  PaletteMode,
  SimplifyPreset,
  normalizePaletteSelection,
  getPaletteColorsForMode,
  officialPaletteOptions,
  simplifyPresetOptions,
  normalizeSimplifyPresetFromLegacy,
  resolveSimplifyColorLimit,
} from '../../data/beadColors';

import { useEditorStore, EditorTool } from '../../store/editorStore';

import EditorToolbar from '../../components/EditorToolbar';

import ColorPicker from '../../components/ColorPicker';

import InteractiveCanvas, { InteractiveCanvasHandle } from '../../components/InteractiveCanvas';
import SaveProjectModal from '../../components/SaveProjectModal';


import ShoppingListModal from '../../components/ShoppingListModal';

import LoginModal from '../../components/LoginModal';

import MyColorsModal from '../../components/MyColorsModal';

import { useUserStore } from '../../store/userStore';

import { projectApi } from '../../services/api/projectApi';

import { uploadApi } from '../../services/api/uploadApi';

import { useToast } from '../../components/Toast';

import Modal, { useModal } from '../../components/Modal';

import { localStorageService } from '../../services/localStorageService';


import { myColorsService } from '../../services/myColorsService';
import { applyTransparentIndices, suggestQuickBackgroundRemoval } from '../../services/backgroundRemovalService';
import { normalizeProjectSaveFailure } from '../../utils/projectSaveAuthFlow';
import {
  collectLowConfidenceIndices,
  getNextLowConfidenceReviewIndex,
  mergeImportReviewDraftFields,
  summarizeLowConfidenceCells,
} from '../../utils/patternImport.js';



/**
 * 移动端编辑图案页面。
 * 支持预览、调参、色系设置、豆子统计和背景处理。
 */

export interface EditorStateData {

  imageData?: string;

  colorCount?: number;
  simplifyPreset?: SimplifyPreset;

  paletteMode?: PaletteMode;

  gridWidth?: number;

  customColorIds?: string[];

}

interface EditorResumeDraft extends EditorStateData {
  beadData?: BeadPixelData;
  initialBeadData?: BeadPixelData | null;
  regeneratedBaseData?: BeadPixelData | null;
  saturationBoost?: number;
  vibrancyPreference?: number;
  isHorizontallyMirrored?: boolean;
  pendingAction?: 'startMaking';
  importSource?: 'external-pattern-import';
  lowConfidenceCells?: Array<{ row: number; col: number; reason?: string }>;
}

type RemovedBackgroundCell = {
  index: number;
  bead: NonNullable<BeadPixelData['beads'][number]>;
};

type ManualEditPatch = {
  index: number;
  bead: BeadPixelData['beads'][number];
};

type BackgroundManualSelection = {
  seedIndex: number;
  colorId: string;
};

type BackgroundEditMode = 'select' | 'view' | 'erase' | 'restore';

const applyHorizontalMirrorToBeadData = (data: BeadPixelData): BeadPixelData => {
  const { width, height, beads } = data;
  const nextBeads = new Array(beads.length).fill(null);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const sourceIndex = y * width + x;
      const targetIndex = y * width + (width - 1 - x);
      nextBeads[targetIndex] = beads[sourceIndex];
    }
  }

  return {
    ...data,
    beads: nextBeads,
  };
};



interface EditorPageProps {

  embeddedStateData?: EditorStateData;

  onBack?: () => void;

}

const GRID_SIZE_MIN = 10;

const GRID_SIZE_MAX = 240;

const GRID_SIZE_STEP = 2;

const BACKGROUND_DETECTION_MIN_WIDTH = 208;

const COMMON_BOARD_WIDTHS = [54, 78, 104, 208];

const SATURATION_PRESETS = [

  { label: '原图', value: 0 },

  { label: '推荐', value: 8 },

  { label: '鲜亮', value: 16 },

];

const EDITOR_RESUME_DRAFT_KEY = 'editorResumeDraft';
const BACKGROUND_MODE_HINT_DISMISSED_KEY = 'editorBackgroundModeHintDismissed';

const normalizeGridSize = (value: number) => {

  const safeValue = Number.isFinite(value) ? value : 52;

  const clamped = Math.min(GRID_SIZE_MAX, Math.max(GRID_SIZE_MIN, Math.round(safeValue)));

  const snapped = Math.round(clamped / GRID_SIZE_STEP) * GRID_SIZE_STEP;

  return Math.min(GRID_SIZE_MAX, Math.max(GRID_SIZE_MIN, snapped));

};

const mapIndicesFromReferenceGrid = (
  referenceData: BeadPixelData,
  targetData: BeadPixelData,
  referenceIndices: number[],
  threshold: number = 0.18
): number[] => {
  if (
    referenceData.width === targetData.width &&
    referenceData.height === targetData.height
  ) {
    return referenceIndices;
  }

  const referenceSet = new Set(referenceIndices);
  const mappedIndices: number[] = [];

  for (let targetY = 0; targetY < targetData.height; targetY += 1) {
    const refYStart = Math.floor((targetY / targetData.height) * referenceData.height);
    const refYEnd = Math.max(
      refYStart + 1,
      Math.ceil(((targetY + 1) / targetData.height) * referenceData.height)
    );

    for (let targetX = 0; targetX < targetData.width; targetX += 1) {
      const targetIndex = targetY * targetData.width + targetX;
      if (!targetData.beads[targetIndex]) {
        continue;
      }

      const refXStart = Math.floor((targetX / targetData.width) * referenceData.width);
      const refXEnd = Math.max(
        refXStart + 1,
        Math.ceil(((targetX + 1) / targetData.width) * referenceData.width)
      );

      let total = 0;
      let matched = 0;

      for (let refY = refYStart; refY < refYEnd; refY += 1) {
        for (let refX = refXStart; refX < refXEnd; refX += 1) {
          const refIndex = refY * referenceData.width + refX;
          if (!referenceData.beads[refIndex]) {
            continue;
          }
          total += 1;
          if (referenceSet.has(refIndex)) {
            matched += 1;
          }
        }
      }

      if (total > 0 && matched / total >= threshold) {
        mappedIndices.push(targetIndex);
      }
    }
  }

  return mappedIndices;
};

const mapTransparentIndicesBetweenGrids = (
  referenceData: BeadPixelData,
  targetData: BeadPixelData,
  referenceIndices: number[],
  threshold: number = 0.18
): number[] => {
  if (
    referenceData.width === targetData.width &&
    referenceData.height === targetData.height
  ) {
    return referenceIndices;
  }

  const referenceSet = new Set(referenceIndices);
  const mappedIndices: number[] = [];

  for (let targetY = 0; targetY < targetData.height; targetY += 1) {
    const refYStart = Math.floor((targetY / targetData.height) * referenceData.height);
    const refYEnd = Math.max(
      refYStart + 1,
      Math.ceil(((targetY + 1) / targetData.height) * referenceData.height)
    );

    for (let targetX = 0; targetX < targetData.width; targetX += 1) {
      const targetIndex = targetY * targetData.width + targetX;
      const refXStart = Math.floor((targetX / targetData.width) * referenceData.width);
      const refXEnd = Math.max(
        refXStart + 1,
        Math.ceil(((targetX + 1) / targetData.width) * referenceData.width)
      );

      let total = 0;
      let matched = 0;

      for (let refY = refYStart; refY < refYEnd; refY += 1) {
        for (let refX = refXStart; refX < refXEnd; refX += 1) {
          const refIndex = refY * referenceData.width + refX;
          total += 1;
          if (referenceSet.has(refIndex)) {
            matched += 1;
          }
        }
      }

      if (total > 0 && matched / total >= threshold) {
        mappedIndices.push(targetIndex);
      }
    }
  }

  return mappedIndices;
};

const areBeadsEquivalent = (
  left: BeadPixelData['beads'][number],
  right: BeadPixelData['beads'][number]
): boolean => {
  if (!left && !right) return true;
  if (!left || !right) return false;
  return left.id === right.id && left.hex === right.hex;
};

const collectManualEditPatches = (
  currentData: BeadPixelData,
  baseData: BeadPixelData | null
): ManualEditPatch[] => {
  if (!baseData) return [];

  return currentData.beads
    .map((bead, index) => {
      const baseBead = baseData.beads[index];
      if (areBeadsEquivalent(bead, baseBead)) {
        return null;
      }

      return {
        index,
        bead,
      };
    })
    .filter((item): item is ManualEditPatch => Boolean(item));
};

const applyMappedManualEditPatches = (
  referenceData: BeadPixelData,
  targetData: BeadPixelData,
  patches: ManualEditPatch[]
): BeadPixelData => {
  if (patches.length === 0) {
    return targetData;
  }

  const nextBeads = [...targetData.beads];

  patches.forEach(({ index, bead }) => {
    const mappedIndices = mapTransparentIndicesBetweenGrids(referenceData, targetData, [index], 0.22);
    mappedIndices.forEach((mappedIndex) => {
      nextBeads[mappedIndex] = bead ? { ...bead } : null;
    });
  });

  return {
    ...targetData,
    beads: nextBeads,
  };
};

const collectManualLikeBackgroundRegion = (
  beadData: BeadPixelData,
  seedIndex: number,
  strictThresholds: { seed: number; average: number; brightness: number } = { seed: 42, average: 34, brightness: 30 },
  relaxedThresholds: { seed: number; average: number; brightness: number } = { seed: 60, average: 48, brightness: 42 },
  minStrictRegionSize: number = 24
): number[] => {
  const seedBead = beadData.beads[seedIndex];
  if (!seedBead) return [];

  const { width, height, beads } = beadData;
  const seedX = seedIndex % width;
  const seedY = Math.floor(seedIndex / width);
  const edgeDistance = Math.min(seedX, width - 1 - seedX, seedY, height - 1 - seedY);
  const isInteriorSeed = edgeDistance > 3;
  const effectiveStrictThresholds = isInteriorSeed
    ? { seed: 28, average: 22, brightness: 22 }
    : strictThresholds;
  const effectiveRelaxedThresholds = isInteriorSeed
    ? { seed: 38, average: 30, brightness: 26 }
    : relaxedThresholds;
  const effectiveMinStrictRegionSize = isInteriorSeed ? 10 : minStrictRegionSize;

  const calcDistance = (source: [number, number, number], target: [number, number, number]) => {
    const redDiff = source[0] - target[0];
    const greenDiff = source[1] - target[1];
    const blueDiff = source[2] - target[2];
    return Math.sqrt(redDiff * redDiff + greenDiff * greenDiff + blueDiff * blueDiff);
  };

  const seedBrightness = (seedBead.rgb[0] + seedBead.rgb[1] + seedBead.rgb[2]) / 3;

  const runFloodFill = (
    seedDistanceThreshold: number,
    averageDistanceThreshold: number,
    brightnessTolerance: number,
    useDiagonalNeighbors: boolean
  ): number[] => {
    const visited = new Set<number>([seedIndex]);
    const queue: number[] = [seedIndex];
    const result: number[] = [];

    let avgR = seedBead.rgb[0];
    let avgG = seedBead.rgb[1];
    let avgB = seedBead.rgb[2];
    let acceptedCount = 1;

    while (queue.length > 0) {
      const index = queue.shift();
      if (index === undefined) break;

      const bead = beads[index];
      if (!bead) continue;
      result.push(index);

      avgR = (avgR * acceptedCount + bead.rgb[0]) / (acceptedCount + 1);
      avgG = (avgG * acceptedCount + bead.rgb[1]) / (acceptedCount + 1);
      avgB = (avgB * acceptedCount + bead.rgb[2]) / (acceptedCount + 1);
      acceptedCount += 1;

      const x = index % width;
      const y = Math.floor(index / width);
      const orthogonalNeighbors = [
        x > 0 ? index - 1 : -1,
        x < width - 1 ? index + 1 : -1,
        y > 0 ? index - width : -1,
        y < height - 1 ? index + width : -1,
      ];
      const diagonalNeighbors = useDiagonalNeighbors
        ? [
            x > 0 && y > 0 ? index - width - 1 : -1,
            x < width - 1 && y > 0 ? index - width + 1 : -1,
            x > 0 && y < height - 1 ? index + width - 1 : -1,
            x < width - 1 && y < height - 1 ? index + width + 1 : -1,
          ]
        : [];
      const neighbors = [...orthogonalNeighbors, ...diagonalNeighbors];

      neighbors.forEach((nextIndex) => {
        if (nextIndex < 0 || visited.has(nextIndex)) return;
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

    return result;
  };

  const strictResult = runFloodFill(
    effectiveStrictThresholds.seed,
    effectiveStrictThresholds.average,
    effectiveStrictThresholds.brightness,
    !isInteriorSeed
  );

  if (strictResult.length >= effectiveMinStrictRegionSize) {
    return strictResult;
  }

  if (isInteriorSeed && strictResult.length > 0) {
    return strictResult;
  }

  return runFloodFill(
    effectiveRelaxedThresholds.seed,
    effectiveRelaxedThresholds.average,
    effectiveRelaxedThresholds.brightness,
    !isInteriorSeed
  );
};

const collectEdgeSeedBackgroundFallback = (beadData: BeadPixelData): number[] => {
  const { width, height, beads } = beadData;
  const activeCellCount = beads.reduce((count, bead) => (bead ? count + 1 : count), 0);
  if (activeCellCount === 0) return [];

  const edgeDepth = Math.min(3, height, width);
  const horizontalStep = width <= 96 ? 3 : 4;
  const verticalStep = height <= 160 ? 4 : 6;
  const minRegionSize = Math.max(24, Math.round(activeCellCount * 0.006));
  const acceptedRegions: number[][] = [];

  const shouldMergeRegion = (region: number[]) => {
    const regionSet = new Set(region);
    return acceptedRegions.some((existing) => {
      const overlap = existing.reduce((count, index) => (
        regionSet.has(index) ? count + 1 : count
      ), 0);
      return overlap / Math.min(existing.length, region.length) >= 0.55;
    });
  };

  const tryAddSeed = (index: number) => {
    const bead = beads[index];
    if (!bead) return;
    const region = collectManualLikeBackgroundRegion(beadData, index);
    if (region.length < minRegionSize) return;
    if (shouldMergeRegion(region)) return;
    acceptedRegions.push(region);
  };

  for (let y = 0; y < edgeDepth; y += 1) {
    for (let x = 0; x < width; x += horizontalStep) {
      tryAddSeed(y * width + x);
      tryAddSeed((height - 1 - y) * width + x);
    }
  }

  for (let x = 0; x < edgeDepth; x += 1) {
    for (let y = 0; y < height; y += verticalStep) {
      tryAddSeed(y * width + x);
      tryAddSeed(y * width + (width - 1 - x));
    }
  }

  const merged = new Set<number>();
  acceptedRegions
    .sort((a, b) => b.length - a.length)
    .slice(0, 6)
    .forEach((region) => {
      region.forEach((index) => merged.add(index));
    });

  return Array.from(merged);
};



const EditorPage: React.FC<EditorPageProps> = ({ embeddedStateData, onBack }) => {

  const navigate = useNavigate();

  const location = useLocation();

  const toast = useToast();

  const { isLoggedIn, initUser, logout } = useUserStore();

  const { modalProps, showAlert, showConfirm } = useModal();

  const downloadCanvasRef = useRef<HTMLCanvasElement>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const interactiveCanvasRef = useRef<InteractiveCanvasHandle>(null);
  const bgInteractiveCanvasRef = useRef<InteractiveCanvasHandle>(null);
  const saveAbortControllerRef = useRef<AbortController | null>(null);

  const savedScrollPosition = useRef<number>(0);

  const initializedImageDataRef = useRef<string | undefined>(undefined);
  const restoredImportNoticeRef = useRef(false);




  const navigationState = (location.state as (EditorStateData & { resumeStartMaking?: boolean }) | null) || {};
  const stateData: EditorStateData = navigationState;

  const sessionData = React.useMemo<EditorStateData>(() => {

    try {

      const stored = sessionStorage.getItem('editorData');

      if (stored) {

        return JSON.parse(stored);

      }

    } catch (e) {}

    return {};

  }, []);

  const pendingResumeDraft = React.useMemo<EditorResumeDraft | null>(() => {

    try {

      const stored = sessionStorage.getItem(EDITOR_RESUME_DRAFT_KEY);

      if (stored) {

        return JSON.parse(stored) as EditorResumeDraft;

      }

    } catch (e) {}

    return null;

  }, []);

  const mergedStateData = embeddedStateData ?? (stateData.imageData ? stateData : pendingResumeDraft?.imageData ? pendingResumeDraft : sessionData);

  const {
    imageData,
    colorCount: initialColorCount,
    simplifyPreset: initialSimplifyPresetFromState,
    paletteMode: initialPaletteMode,
    gridWidth: initialGridWidth,
    customColorIds,
  } = mergedStateData;

  const normalizedPaletteSelection = React.useMemo(() => (
    normalizePaletteSelection({
      paletteMode: initialPaletteMode,
      colorCount: initialColorCount,
      customColorIds,
      myColorCount: customColorIds?.length,
    })
  ), [customColorIds, initialColorCount, initialPaletteMode]);

  const initialSimplifyPreset = React.useMemo(() => (
    initialSimplifyPresetFromState
      ?? normalizeSimplifyPresetFromLegacy(normalizedPaletteSelection.colorLimit)
  ), [initialSimplifyPresetFromState, normalizedPaletteSelection.colorLimit]);

  const importReviewSummary = React.useMemo(() => summarizeLowConfidenceCells(pendingResumeDraft?.lowConfidenceCells || []), [pendingResumeDraft]);
  const shouldShowImportReviewNotice = pendingResumeDraft?.importSource === 'external-pattern-import';
  const [activeImportReviewIndex, setActiveImportReviewIndex] = useState<number | null>(null);
  const importReviewIndices = React.useMemo(() => {
    if (!pendingResumeDraft?.beadData) {
      return [];
    }

    return collectLowConfidenceIndices(
      pendingResumeDraft.lowConfidenceCells || [],
      pendingResumeDraft.beadData.width,
      pendingResumeDraft.beadData.height
    );
  }, [pendingResumeDraft]);
  const activeImportReviewPosition = React.useMemo(() => (
    activeImportReviewIndex === null ? -1 : importReviewIndices.indexOf(activeImportReviewIndex)
  ), [activeImportReviewIndex, importReviewIndices]);
  const activeImportReviewCellLabel = React.useMemo(() => {
    if (activeImportReviewIndex === null || !pendingResumeDraft?.beadData) {
      return null;
    }

    const row = Math.floor(activeImportReviewIndex / pendingResumeDraft.beadData.width);
    const col = activeImportReviewIndex % pendingResumeDraft.beadData.width;
    return `${row + 1}行${col + 1}列`;
  }, [activeImportReviewIndex, pendingResumeDraft]);



  const [gridSize, setGridSize] = useState(normalizeGridSize(initialGridWidth || 52));
  const [currentImageData, setCurrentImageData] = useState(imageData);
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 390
  );
  const [isCoarsePointer, setIsCoarsePointer] = useState(
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(pointer: coarse)').matches
      : false
  );

  const [gridSizeInput, setGridSizeInput] = useState(String(normalizeGridSize(initialGridWidth || 52)));

  const [paletteMode, setPaletteMode] = useState<PaletteMode>(normalizedPaletteSelection.paletteMode);
  const [simplifyPreset, setSimplifyPreset] = useState<SimplifyPreset>(initialSimplifyPreset);
  const [colorCount, setColorCount] = useState<number>(() => resolveSimplifyColorLimit(
    initialSimplifyPreset,
    normalizedPaletteSelection.paletteMode,
    customColorIds?.length || 0,
  ));

  const [simplifyLevel, setSimplifyLevel] = useState<number>(0);

  const [saturationBoost, setSaturationBoost] = useState<number>(pendingResumeDraft?.saturationBoost || 0);

  const [vibrancyPreference, setVibrancyPreference] = useState<number>(pendingResumeDraft?.vibrancyPreference || 0);

  const [isProcessing, setIsProcessing] = useState(false);


  const [showColorPicker, setShowColorPicker] = useState(false);

  const [showPaletteSettings, setShowPaletteSettings] = useState(false);
  const [showColorStyleSettings, setShowColorStyleSettings] = useState(false);

  const [showMyColorsModal, setShowMyColorsModal] = useState(false);

  const [myColorCount, setMyColorCount] = useState(() => myColorsService.getSelectedIds().length);

  const [activeCustomColorIds, setActiveCustomColorIds] = useState<string[] | undefined>(customColorIds);
  const useMyColors = paletteMode === 'my-colors';
  const activePaletteColors = React.useMemo(
    () => getPaletteColorsForMode(paletteMode, activeCustomColorIds || []),
    [activeCustomColorIds, paletteMode]
  );
  const effectiveColorLimit = React.useMemo(
    () => resolveSimplifyColorLimit(simplifyPreset, paletteMode, myColorCount),
    [myColorCount, paletteMode, simplifyPreset]
  );
  const activeSimplifyOption = React.useMemo(
    () => simplifyPresetOptions.find((item) => item.id === simplifyPreset),
    [simplifyPreset]
  );

  useEffect(() => {
    if (colorCount !== effectiveColorLimit) {
      setColorCount(effectiveColorLimit);
    }
  }, [colorCount, effectiveColorLimit]);

  const [cellSize, setCellSize] = useState(12);
  const [showImportRiskOverlay, setShowImportRiskOverlay] = useState(true);
  const [recentColors, setRecentColors] = useState<BeadColor[]>([]);

  const [isEditMode, setIsEditMode] = useState(false);
  const [isEditPanelClosing, setIsEditPanelClosing] = useState(false);
  const [initialBeadData, setInitialBeadData] = useState<BeadPixelData | null>(null);
  const [regeneratedBaseData, setRegeneratedBaseData] = useState<BeadPixelData | null>(null);
  const processRequestIdRef = useRef(0);

  const [showSaveModal, setShowSaveModal] = useState(false); // 闂傚倸鍊搁崐鎼佸磹瀹勬噴褰掑炊瑜夐弸鏍煛閸ャ儱鐏╃紒鎰殜閺岀喖鎮ч崼鐔哄嚒闂佸憡鍨规慨鎾煘閹达附鍋愰悗鍦Т椤ユ繄绱撴担鍝勵€岄柛銊ョ埣瀵鏁愭径濠勵吅闂佹寧绻傞幉娑㈠箻缂佹鍘搁梺鍛婁緱閸犳宕愰幇鐗堢厸閻忕偠顕ч埀顒佺箞閻涱喗绗熼埀顒勭嵁閹烘绠ｆ繝闈涙－濞笺儵姊婚崒娆戭槮闁圭⒈鍋婇幆澶嬬附缁嬭法鐛ラ梺鍝勭▉閸樺ジ鎷戦悢鍏肩厪濠电偟鍋撳▍鍡涙煕鐎ｎ亜顏柡灞剧☉閳藉顫滈崼婵嗩潬濠电偛顕崢褏鈧碍婢橀～蹇斻偊鐟併倓姹楅梺鍦劋缁诲啴藟閺嶎厽鈷戠紒瀣硶缁犳煡鏌ㄩ弴妯虹仼妞ゆ洩缍侀、鏇㈡晝閳ь剛绮绘繝姘仯闁搞儜鍐獓濡炪們鍎茬换鍫濐潖濞差亝顥堟繛鎴炶壘椤ｅ搫鈹戦埥鍡椾簼妞ゃ劌锕妴渚€寮崼婵嬪敹闂佸搫娲ㄩ崯鍧楀箯濞差亝鐓熼柣妯哄帠閼割亪鏌涢弬璺ㄧ劯鐎殿喗鎮傞獮瀣晜閻ｅ苯骞愰梺璇插嚱缂嶅棙绂嶉崼鏇熷亗闁稿繒鈷堝▓?
  const [isSaving, setIsSaving] = useState(false); // 闂傚倸鍊搁崐鎼佸磹瀹勬噴褰掑炊瑜夐弸鏍煛閸ャ儱鐏╃紒鎰殜閺岀喖鎮ч崼鐔哄嚒闂佸憡鍨规慨鎾煘閹达附鍋愰悗鍦Т椤ユ繄绱撴担鍝勵€岄柛銊ョ埣瀵鏁愭径濠勵吅闂佹寧绻傞幉娑㈠箻缂佹鍘搁梺鍛婁緱閸犳宕愰幇鐗堢厸鐎光偓鐎ｎ剛鐦堥悗瑙勬礃鐢帟鐏掗柣鐐寸▓閳ь剙鍘栨竟鏇㈡⒑閸濆嫮鈻夐柛瀣у亾闂佺顑嗛幐鎼侊綖濠靛鏁嗛柛灞剧敖閵娾晜鈷戦柛婵嗗椤箓鏌涢弮鈧崹鍧楃嵁閸愵喖顫呴柕鍫濇噹缁愭稒绻濋悽闈浶㈤悗姘间簽濡叉劙寮撮姀鈾€鎷绘繛杈剧到閹诧紕鎷归敓鐘崇厱闊洦妫戦懓鍧楁寠閻斿吋鐓欓柟顖嗗懏鎲奸梺??

  const [showShoppingList, setShowShoppingList] = useState(false); // 闂傚倸鍊搁崐鎼佸磹瀹勬噴褰掑炊瑜夐弸鏍煛閸ャ儱鐏╃紒鎰殜閺岀喖骞戦幇闈涙缂佺虎鍘搁崑鎾绘⒒娴ｇ瓔娼愰柛搴″悑閹便劑濡舵径濠勶紵閻庡厜鍋撻柛鏇ㄥ墰閸樺崬鈹戦悙鏉戠仸闁挎洦鍋勯蹇涘Ψ閿旇桨绨婚棅顐㈡处閹搁箖宕洪敐鍡樺弿濠电姴鎳忛鐘绘煙閻熸澘顏┑鈩冩倐婵＄兘鏁傞崣銉ф晼婵犵數濮烽。钘壩ｉ崨鏉戠；闁告洦鍘搁崑鎾愁潩椤撶喓鍑￠梺浼欑悼閸忔﹢寮幘缁樺亹闁圭粯甯掔粊顕€姊绘笟鈧褏鎹㈤崱娑樼婵犻潧妫岄弸宥夋煏韫囧鈧牠鍩涢幋锔界厱婵犻潧妫楅鈺呮煃瑜滈崜娆撴偉閻撳海鏆﹂柟鐗堟緲閸愨偓濡炪倖鍔楅崰搴㈢閻愵剚鍙忔慨妤€妫楁晶鎵磼婢跺銇濋柡宀嬬磿娴狅妇鎷犻幓鎺濇綆闂備浇顕栭崰鎾诲垂閽樺鏆﹂柕濠忓缁♀偓闂佸憡娲︽禍鐐靛閸ф鈷?

  const [showLoginModal, setShowLoginModal] = useState(false); // 闂傚倸鍊搁崐鎼佸磹瀹勬噴褰掑炊瑜夐弸鏍煛閸ャ儱鐏╃紒鎰殜閺岀喖鎮ч崼鐔哄嚒闂佸憡鍨规慨鎾煘閹达附鍋愰悗鍦Т椤ユ繄绱撴担鍝勵€岄柛銊﹀▕閸┾偓妞ゆ帒鍊归崵鈧柣搴㈠嚬閸樼晫绮╅悢鐓庡耿婵炲棙鍨归悡瀣⒑缁夊棗瀚峰▓鏇㈡煃闁垮鐏撮柟顔肩秺楠炰線骞掗幋婵愮€抽梻浣告惈椤戝棝宕归崸妤€钃熼柨娑樺閸嬫捇鏁愭惔婵囧枤闂佺粯鎸搁崥瀣€冮妷鈺傚€烽柤纰卞墰椤旀帡姊虹拠鈥虫灍缂侇喗鎹囬獮濠囨倷閸濆嫀銊╂煥閺冨倻鎽傚ù鐘欏洦鈷掗柛灞剧懅椤︼箓鏌熺喊鍗炰喊鐎规洘鍔欏畷濂稿即閻愮绱梻浣告惈缁嬩線宕戦埀顒勬煕?


  const [previewZoom, setPreviewZoom] = useState({ scale: 1, minScale: 1, maxScale: 1, fitScale: 1 });



  const [isBackgroundMode, setIsBackgroundMode] = useState(false); // 闂傚倸鍊搁崐鎼佸磹瀹勬噴褰掑炊瑜夐弸鏍煛閸ャ儱鐏╃紒鎰殜閺岋繝宕堕懜鐢电獧缂傚倸绉甸悧妤佺┍婵犲洤围闁告侗鍠栧▍锝囩磽娴ｆ彃浜鹃梺鍛婃处閸ㄩ亶鎮¤箛娑欑厱妞ゆ劧绲跨粻鏍ㄣ亜閵夛妇鐭嬮柕鍥у缁犳盯骞樼捄铏瑰幗婵犳鍠栭敃銊モ枍閿濆绠查柛鏇ㄥ灠鎯熼梺闈涱檧婵″洦绂嶉悙娴嬫斀闁绘ɑ顔栭弳顖涗繆閹绘帗鍤囩€规洩缍佸畷姗€顢欓幆褏銈﹀┑鐘灱濞夋稒寰勯崶顒€纾婚柟鍓х帛閺呮煡骞栫划鍏夊亾閼碱剛娉垮┑锛勫亼閸婃洜鎹㈤幇鐗堝亯闁绘挸瀵掑鏍煣韫囨凹娼愮€规洖顦甸弻鏇熺箾閸喖濮曢梺璇查叄缁犳牕顫忓ú顏勪紶闁告洟娼ч崜鏉款渻閵堝骸骞橀柛蹇旓耿閹即顢欑捄銊ф澑濠电偞鍨堕悷銉╁焵椤掆偓椤兘寮婚妶澶婄畳闁圭儤鍨垫慨鏇炩攽閻愬弶鍣烽柛銊ㄦ椤繐煤椤忓嫪绱堕梺鍛婃处閸嬧偓闁稿鎹囧畷濂稿即閻愮绱梻浣告惈缁嬩線宕戦埀顒勬煕鐎ｎ偅灏い顐ｇ箞椤㈡宕掑┃鐐姂濮婃椽宕崟顕呮蕉闂佸憡姊归崹鍧楃嵁閸愵喖顫呴柕鍫濇噹缁愭稒绻濋悽闈浶㈤悗姘间簽濡叉劙寮撮姀鈾€鎷绘繛杈剧到閹诧紕鎷归敓鐘崇厱闊洦妫戦懓璺ㄢ偓娈垮枔閸斿秴顭囪箛娑辨晝闁靛繆鍓濋澶愭⒒?
  const [bgSelectedColorId, setBgSelectedColorId] = useState<string | null>(null); // 闂傚倸鍊搁崐鎼佸磹瀹勬噴褰掑炊瑜夐弸鏍煛閸ャ儱鐏╃紒鎰殜閺岀喖鎮ч崼鐔哄嚒闂佸憡鍨规慨鎾煘閹达附鍋愰悗鍦Т椤ユ繄绱撴担鍝勵€岄柛銊ョ埣瀵鏁愭径濠勵吅闂佹寧绻傞幉娑㈠箻缂佹鍘搁梺鍛婁緱閸犳宕愰幇鐗堢厸鐎光偓鐎ｎ剛鐦堥悗瑙勬礃鐢帟鐏掗柣鐐寸▓閳ь剙鍘栨竟鏇㈡⒑閸濆嫮鈻夐柛瀣у亾闂佺顑嗛幐鎼侊綖濠靛洦缍囬柕濞垮劜閻ｎ剟姊洪崣銉т覆缂傚秳绶氬璇差吋婢跺á銊╂煏婢诡垰绉剁粈濠勭磽娴ｉ缚妾搁柛妯绘倐瀹曟垿骞樼紒妯锋嫽闂佺鏈悷褏鎷规导瀛樼厱閻庯綆浜滈顓㈡寠濠靛鐓熼柕蹇嬪焺閻掗箖鏌＄€ｂ晝绐旈柡宀€鍠栭獮鎴﹀箛闂堟稒顔勯梻浣规た閸樹粙銆冮崱娑樜﹂柛鏇ㄥ灠缁犳盯鏌嶆潪鎷岊唹闁稿鎹囨俊鑸靛緞婵犲啳绶㈡繝鐢靛Т閿曘倝鎮ф繝鍥ㄥ亗婵炲棗娴氬〒濠氭倵閿濆簼閭い搴㈩殜閺屾稑螣缂佹ê鍞夐梺鍝勫閸撴繈骞忛崨顖涘枂闁告洦鍋嗛敍鎾绘煟鎼淬埄鍟忛柛锝庡櫍瀹曟粓鎮㈤梹鎰畾闂佸壊鍋呭ú鏍嵁閵忊€茬箚闁靛牆鎷戝妤冪磼閹插鐣垫慨濠勭帛閹峰懘宕崟顐＄帛婵犵數濮崑鎾绘煕濡ゅ啫鍓遍柣鏂挎閳?
  const [bgSelectedSeedIndex, setBgSelectedSeedIndex] = useState<number | null>(null);
  const [bgManualSelections, setBgManualSelections] = useState<BackgroundManualSelection[]>([]);

  const [bgExcludedIndices, setBgExcludedIndices] = useState<Set<number>>(new Set()); // 闂傚倸鍊搁崐鎼佸磹瀹勬噴褰掑炊瑜夐弸鏍煛閸ャ儱鐏╃紒鎰殜閺岀喖鎮ч崼鐔哄嚒闂佸憡鍨规慨鎾煘閹达附鍋愰悗鍦Т椤ユ繄绱撴担鍝勵€岄柛銊ョ埣瀵鏁愭径濠勵吅闂佹寧绻傞幉娑㈠箻缂佹鍘搁梺鍛婁緱閸犳宕愰幇鐗堢厸鐎光偓鐎ｎ剛鐦堥悗瑙勬礃鐢帟鐏掗柣鐐寸▓閳ь剙鍘栨竟鏇㈡⒑閸濆嫮鈻夐柛瀣у亾闂佺顑嗛幐鎼侊綖濠靛洦缍囬柕濞垮劜閻ｎ剟姊洪崣銉т覆缂傚秳绶氬璇差吋婢跺á銊╂煏婢诡垰绉剁粈濠勭磽娴ｉ缚妾搁柛妯绘倐瀹曟垿骞樼紒妯锋嫽闂佺鏈悷锔剧矈閻楀牏绠惧璺侯儐缁€瀣偓瑙勬磻閸楀啿顕ｉ幘顔碱潊闁绘ɑ顔栧Σ鍫曟⒒娴ｇ鎮戠紒浣规尦瀵彃鈹戦崶銉ょ泊闂佽鍎兼慨銈夊磻閳╁啰绠鹃柛鈩冾殘缁犵増銇勮箛濠冩珕闁靛洤瀚粻娑㈠箻鐠鸿櫣鍘芥繝娈垮枛閿曘劌鈻嶉敐澶婄闁告洦鍨版儫闂侀潧顧€婵″洭鍩€椤掑嫮鐣烘慨濠冩そ瀹曨偊宕熼棃娑樺婵＄偑鍊ら崢楣冨礂濮椻偓閹即顢欑捄銊ф澑濠电偞鍨堕悷銉╁焵椤掆偓椤兘寮婚妶澶婄畳闁圭儤鍨垫慨鏇炩攽閻愬弶鍣烽柛銊ㄦ椤繐煤椤忓嫪绱堕梺鍛婃处閸嬧偓闁稿鎹囧畷濂稿即閻愮绱梻浣告惈缁嬩線宕戦埀顒勬煕鐎ｎ偅灏い顐ｇ箞椤㈡宕掑┃鐐姂濮婃椽宕崟顕呮蕉闂佸憡姊归崹鍧楃嵁閸愵喖顫呴柕鍫濇噹缁愭稒绻濋悽闈浶㈤悗姘间簽濡叉劙寮撮姀鈾€鎷绘繛杈剧到閹芥粎绮旈悜妯镐簻闁靛闄勫畷宀€鈧娲橀〃鍛达綖濠婂牆鐒垫い鎺嗗亾妞ゆ洩缍侀、鏇㈡晝閳ь剛绮绘繝姘仯闁搞儜鍐獓濡炪們鍎茬换鍫濐潖濞差亝顥堟繛鎴炶壘椤ｅ搫鈹戦埥鍡椾簼妞ゃ劌锕妴??
  const [bgViewMode, setBgViewMode] = useState<BackgroundEditMode>('select');
  const [bgAutoIndices, setBgAutoIndices] = useState<number[]>([]);
  const [bgSelectionSource, setBgSelectionSource] = useState<'manual' | 'auto' | null>(null);
  const [bgDetectionMessage, setBgDetectionMessage] = useState('');
  const [bgAutoStrength, setBgAutoStrength] = useState(55);
  const [bgProtectSubject, setBgProtectSubject] = useState(true);
  const [bgLastRemoval, setBgLastRemoval] = useState<RemovedBackgroundCell[]>([]);
  const [bgCandidateOnly, setBgCandidateOnly] = useState(false);
  const [bgBaselineData, setBgBaselineData] = useState<BeadPixelData | null>(null);
  const [bgCompareMode, setBgCompareMode] = useState<'current' | 'before'>('current');
  const [bgPanMode, setBgPanMode] = useState(false);
  const [isHorizontallyMirrored, setIsHorizontallyMirrored] = useState(false);
  const [resumeStartMakingAfterLogin, setResumeStartMakingAfterLogin] = useState(
    pendingResumeDraft?.pendingAction === 'startMaking' || Boolean(navigationState.resumeStartMaking)
  );
  const restoredResumeDraftRef = useRef(false);




  const {

    currentTool,

    setCurrentTool,

    currentColor,

    setCurrentColor,

    beadData,

    initializeBeadData,

    setBeadData,

    applyBeadDataChange,

    saveToHistory,

    undo,

    redo,

    setBeadAt,

    floodFill,

    history,

    historyIndex,

  } = useEditorStore();




  const canUndo = historyIndex > 0;

  const canRedo = historyIndex < history.length - 1;




  const [statistics, setStatistics] = useState<BeadStatistics[]>([]);




  const processImage = useCallback(async (

    isRegenerate: boolean = false,

    overrides?: {

      gridSize?: number;

      saturationBoost?: number;

      vibrancyPreference?: number;

      colorCount?: number;
      simplifyPreset?: SimplifyPreset;

      paletteMode?: PaletteMode;

      customColorIds?: string[] | undefined;

    }

  ) => {

    if (!currentImageData) return;
    const requestId = ++processRequestIdRef.current;
    setIsProcessing(true);

    const currentTransparentIndices = beadData
      ? beadData.beads
          .map((bead, index) => (bead ? -1 : index))
          .filter((index) => index >= 0)
      : [];
    const currentManualEditPatches =
      isRegenerate && beadData
        ? collectManualEditPatches(beadData, regeneratedBaseData)
        : [];



    try {

      const nextGridSize = overrides?.gridSize ?? gridSize;

      const nextSaturationBoost = overrides?.saturationBoost ?? saturationBoost;

      const nextVibrancyPreference = overrides?.vibrancyPreference ?? vibrancyPreference;

      const nextSimplifyPreset = overrides?.simplifyPreset ?? simplifyPreset;
      const nextPaletteMode = overrides?.paletteMode ?? paletteMode;

      const nextCustomColorIds = overrides?.customColorIds ?? activeCustomColorIds;
      const nextPaletteColors = getPaletteColorsForMode(nextPaletteMode, nextCustomColorIds || []);
      const nextColorLimit = resolveSimplifyColorLimit(
        nextSimplifyPreset,
        nextPaletteMode,
        nextCustomColorIds?.length || 0
      );

      const pixels = await pixelizeImage(currentImageData, {

        gridWidth: nextGridSize,

        keepAspectRatio: true,

      });

      let beads = matchPixelsToBead(pixels, {

        colorCount: nextColorLimit,
        paletteColors: nextPaletteColors,

        useLabSpace: true,           // 婵犵數濮烽弫鎼佸磻閻樿绠垫い蹇撴缁躲倝鏌﹀Ο渚▓闁绘帊绮欓弻銊╂偄閸濆嫅銏ゆ煛鐎ｂ晝绐旈柡宀€鍠栭獮鎴﹀箛闂堟稒顔勬繝纰樻閸嬪懘鏁冮姀銈呰摕闁哄洢鍨归柋鍥ㄧ節闂堟稒绁╂俊顐ゅ仜椤?Lab 闂傚倸鍊搁崐宄懊归崶銊х彾闁割偁鍎荤紞鏍ь熆閼搁潧濮堥柛瀣€块弻銊╂偄閸濆嫅銏ゆ煛鐎ｂ晝绐旈柡宀€鍠栭獮鍡氼槻妞わ絽纾惀顏堝箚瑜嬮崑銏ゆ煛瀹€瀣М妤犵偛娲、姘跺川椤旂晫妲ｉ梻鍌欐祰濡椼劎绮堟担琛″亾濮橆厽绶叉い顐㈢箲缁绘繂顫濋鍌︾床婵犵數濞€濞佳兠洪妶鍛鐟滃繒妲愰幘瀛樺濞寸姴顑呴幗鐢电磽娴ｇ瓔鍤欓柣妤佹尭椤曪絾绻濆顑┾晠鏌嶉崫鍕偓鍛婄濠婂牊鈷戦柛娑橈功閳藉鏌ㄩ弴顏堟閻庨潧銈稿畷鐔碱敍濞戞帗瀚奸柣鐔哥矌婢ф鏁埡浣勬盯骞嬮敂鐣屽幈闂婎偄娲﹀Λ鎴︽嚀鐠恒劉鍋撳▓鍨珮闁稿锕悰顔嘉熼崗鐓庣彴闂佸憡鐟ラˇ钘壩涢悢鍏尖拻濞撴埃鍋撴繛浣冲洦鍋嬮柛鈩冦亗濞戞鏃堝椽娴ｈ娅嗛梻浣稿閸嬪懎煤濮椻偓閸╂盯骞嬮敂钘変化闂佽鍘界敮鎺撲繆婵傚憡鐓涢悗锝庡亜閻忔挳鏌″畝瀣？闁逞屽墾缂嶅棙绂嶉崼鏇熷亗闁稿繒鈷堝▓浠嬫煟閹邦垰鐨虹紒鐘差煼閺岀喖顢欓悾宀€鐓夐梺鐟扮－閸嬨倖淇婇悜鑺ユ櫆缂佹稑顑勯幋鐑芥⒒閸屾艾鈧绮堟笟鈧獮鏍敃閿曗偓绾惧綊鏌涢锝嗙缁炬儳缍婇弻鈥愁吋鎼粹€茬爱闂佺顑嗛幐鎼侊綖濠靛鏁嗛柛灞剧敖閵娾晜鈷戦柛婵嗗椤箓鏌涢弮鈧崹鍧楃嵁閸愵喖顫呴柕鍫濇噽椤︻參姊洪崨濠勬噧妞わ附婢橀埢宥夊箻缂佹ǚ鎷婚梺绋挎湰閼归箖鍩€椤掍焦鍊愰柟顔ㄥ洤绀冩い鏃囧亹閺屟冣攽閻樿宸ラ柟鍐差樀瀹曟垿骞橀幇浣瑰兊濡炪倖甯掗崐缁橆殭闂?
        saturationBoost: nextSaturationBoost,             // 闂傚倸鍊搁崐鎼佸磹瀹勬噴褰掑炊瑜夐弸鏍煛閸ャ儱鐏╃紒鎰殜閺岀喖鎮ч崼鐔哄嚒闂佸憡鍨规慨鎾煘閹达附鍋愰悗鍦Т椤ユ繄绱撴担鍝勵€岄柛銊ョ埣瀵鏁愭径濠勵吅闂佹寧绻傞幉娑㈠箻缂佹鍘搁梺鍛婁緱閸犳宕愰幇顓熷弿濠电姴瀚崝瀣煥濞戞瑥濮堥柟宄版嚇閹煎綊鐛崹顔荤敾婵犵绱曢崑鎴﹀磹閺嵮屾綎鐟滅増甯掔粈澶嬬箾閸℃ɑ灏电€规挷绶氶悡顐﹀炊閵娧€濮囬梺绋匡工椤兘寮婚妶澶婄畳闁圭儤鍨垫慨鏇炩攽閻愬弶鍣烽柛銊ㄦ椤繐煤椤忓嫪绱堕梺鍛婃处閸嬧偓闁稿鎹囧畷濂稿即閻愮绱梻浣告惈缁嬩線宕戦埀顒勬煕??
        vibrancyPreference: nextVibrancyPreference,          // 闂傚倸鍊搁崐鎼佸磹瀹勬噴褰掑炊瑜夐弸鏍煛閸ャ儱鐏╃紒鎰殜閺岀喖鎮ч崼鐔哄嚒闂佸憡鍨规慨鎾煘閹达附鍋愰悗鍦Т椤ユ繄绱撴担鍝勵€岄柛銊ョ埣瀵鏁愭径濠勵吅闂佹寧绻傞幉娑㈠箻缂佹鍘搁梺鍛婁緱閸犳宕愰幇鐗堢厸鐎光偓鐎ｎ剛袦濡炪們鍨哄ú鐔笺€侀弴顫稏妞ゆ挾鍋涘В鎰攽閿涘嫬浜奸柛濠冪墪椤繗銇愰幒鎴狀槷濠电偛妫欓幐鎯х暤娓氣偓閻擃偊宕堕妸锕€鏆楅梺鍝勬椤戝懓鐏嬫俊顐︻暒濞村洭宕楀畝鍕厱??
      });




      if (simplifyLevel > 0) {

        const stats = calculateBeadStatistics(beads);

        const currentColorCount = stats.length;

        const minColors = 5;

        const targetColors = Math.max(

          minColors,

          Math.round(currentColorCount * (1 - simplifyLevel / 120))

        );

        if (targetColors < currentColorCount) {

          beads = reduceColors(beads, targetColors, nextPaletteColors);

        }

      }




      if (requestId !== processRequestIdRef.current) {
        return;
      }

      if (isHorizontallyMirrored) {
        beads = applyHorizontalMirrorToBeadData(beads);
      }

      if (isRegenerate && beadData && currentTransparentIndices.length > 0) {
        const remappedTransparentIndices = mapTransparentIndicesBetweenGrids(
          beadData,
          beads,
          currentTransparentIndices,
          0.22
        );

        if (remappedTransparentIndices.length > 0) {
          beads = applyTransparentIndices(beads, remappedTransparentIndices);
        }
      }

      const nextBaseData = JSON.parse(JSON.stringify(beads)) as BeadPixelData;

      if (isRegenerate && beadData && currentManualEditPatches.length > 0) {
        beads = applyMappedManualEditPatches(beadData, beads, currentManualEditPatches);
      }

      initializeBeadData(beads);
      setRegeneratedBaseData(nextBaseData);
      setBgLastRemoval([]);



      if (!isRegenerate) {

        setInitialBeadData(JSON.parse(JSON.stringify(beads)));

      }




      const stats = calculateBeadStatistics(beads);

      setStatistics(stats);




      if (!currentColor && stats.length > 0) {

        setCurrentColor(stats[0].color);

      }



    } catch (error) {

      console.error('生成图案失败:', error);

    } finally {

      if (requestId === processRequestIdRef.current) {
        setIsProcessing(false);

        requestAnimationFrame(() => {

          requestAnimationFrame(() => {

            if (containerRef.current && savedScrollPosition.current > 0) {

              containerRef.current.scrollTop = savedScrollPosition.current;

            }

          });

        });
      }

    }

  }, [activeCustomColorIds, colorCount, currentColor, currentImageData, gridSize, initializeBeadData, isHorizontallyMirrored, paletteMode, setCurrentColor, simplifyLevel, simplifyPreset, saturationBoost, vibrancyPreference, beadData, regeneratedBaseData]);

  const buildBackgroundDetectionData = useCallback(async (): Promise<BeadPixelData | null> => {
    if (!currentImageData || !beadData) {
      return beadData ?? null;
    }

    const detectionGridWidth = Math.max(
      beadData.width,
      Math.min(GRID_SIZE_MAX, BACKGROUND_DETECTION_MIN_WIDTH)
    );

    if (detectionGridWidth <= beadData.width) {
      return beadData;
    }

    const pixels = await pixelizeImage(currentImageData, {
      gridWidth: detectionGridWidth,
      keepAspectRatio: true,
    });

    let detectionBeads = matchPixelsToBead(pixels, {
      colorCount: effectiveColorLimit,
      paletteColors: activePaletteColors,
      useLabSpace: true,
      saturationBoost,
      vibrancyPreference,
    });

    if (simplifyLevel > 0) {
      const stats = calculateBeadStatistics(detectionBeads);
      const currentColorCount = stats.length;
      const minColors = 5;
      const targetColors = Math.max(
        minColors,
        Math.round(currentColorCount * (1 - simplifyLevel / 120))
      );

      if (targetColors < currentColorCount) {
        detectionBeads = reduceColors(detectionBeads, targetColors, activePaletteColors);
      }
    }

    return detectionBeads;
  }, [activePaletteColors, beadData, currentImageData, effectiveColorLimit, simplifyLevel, saturationBoost, vibrancyPreference]);

  const detectQuickBackgroundSuggestion = useCallback(async () => {
    if (!beadData) return null;

    const detectionData = await buildBackgroundDetectionData();
    if (!detectionData) return null;

    const suggestion = suggestQuickBackgroundRemoval(detectionData, bgAutoStrength, {
      protectSubject: bgProtectSubject,
    });

    if (!suggestion || suggestion.indices.length === 0) {
      return null;
    }

    const mappedIndices = mapIndicesFromReferenceGrid(detectionData, beadData, suggestion.indices);
    const activeCellCount = beadData.beads.reduce(
      (count, bead) => (bead ? count + 1 : count),
      0
    );
    const tinyMappedRegionThreshold = Math.max(12, Math.round(activeCellCount * 0.0025));
    const effectiveIndices =
      mappedIndices.length <= tinyMappedRegionThreshold
        ? collectEdgeSeedBackgroundFallback(beadData)
        : mappedIndices;

    if (effectiveIndices.length === 0) {
      return null;
    }

    const regionCoverage = activeCellCount > 0 ? effectiveIndices.length / activeCellCount : 0;

    return {
      ...suggestion,
      indices: effectiveIndices,
      regionCoverage,
      reason:
        effectiveIndices !== mappedIndices
          ? '已按边缘背景色自动扩张候选背景，适合先去掉大面积外部背景，再手动补剩余边角。'
          : suggestion.reason,
    };
  }, [beadData, bgAutoStrength, bgProtectSubject, buildBackgroundDetectionData]);



  useEffect(() => {

    initUser();

  }, [initUser]);



  useEffect(() => {

    if (restoredResumeDraftRef.current || !pendingResumeDraft?.beadData || beadData) {

      return;

    }

    restoredResumeDraftRef.current = true;
    initializedImageDataRef.current = pendingResumeDraft.imageData;
    initializeBeadData(pendingResumeDraft.beadData);

    if (pendingResumeDraft.initialBeadData) {

      setInitialBeadData(JSON.parse(JSON.stringify(pendingResumeDraft.initialBeadData)));

    } else {

      setInitialBeadData(JSON.parse(JSON.stringify(pendingResumeDraft.beadData)));

    }

    setIsHorizontallyMirrored(Boolean(pendingResumeDraft.isHorizontallyMirrored));
    setRegeneratedBaseData(
      pendingResumeDraft.regeneratedBaseData
        ? JSON.parse(JSON.stringify(pendingResumeDraft.regeneratedBaseData))
        : pendingResumeDraft.beadData
          ? JSON.parse(JSON.stringify(pendingResumeDraft.beadData))
          : null
    );

  }, [beadData, initializeBeadData, pendingResumeDraft]);



  useEffect(() => {

    if (
      restoredImportNoticeRef.current ||
      !shouldShowImportReviewNotice ||
      !pendingResumeDraft?.beadData ||
      !beadData
    ) {

      return;

    }

    restoredImportNoticeRef.current = true;
    if (importReviewSummary.count > 0) {
      const suffix = importReviewSummary.preview ? `\uFF0C\u5EFA\u8BAE\u5148\u68C0\u67E5 ${importReviewSummary.preview}` : '';
      toast.warning(`\u8FD9\u662F\u4ECE\u5916\u90E8\u56FE\u7EB8\u8BC6\u522B\u5BFC\u5165\u7684\u7ED3\u679C\uFF0C\u68C0\u6D4B\u5230 ${importReviewSummary.count} \u683C\u9AD8\u98CE\u9669\u4F4D\u7F6E${suffix}`);
      return;
    }

    toast.info('\u8FD9\u662F\u4ECE\u5916\u90E8\u56FE\u7EB8\u8BC6\u522B\u5BFC\u5165\u7684\u7ED3\u679C\uFF0C\u5EFA\u8BAE\u5148\u5FEB\u901F\u68C0\u67E5\u5173\u952E\u533A\u57DF\u540E\u518D\u5F00\u59CB\u5236\u4F5C\u3002');

  }, [beadData, importReviewSummary, pendingResumeDraft, shouldShowImportReviewNotice, toast]);

  useEffect(() => {
    if (importReviewIndices.length === 0) {
      setActiveImportReviewIndex(null);
      return;
    }

    setActiveImportReviewIndex((current) => (
      current !== null && importReviewIndices.includes(current)
        ? current
        : importReviewIndices[0]
    ));
  }, [importReviewIndices]);

  const focusImportReviewIndex = useCallback((index: number | null) => {
    if (index === null) {
      return;
    }

    setShowImportRiskOverlay(true);
    setActiveImportReviewIndex(index);
    interactiveCanvasRef.current?.focusCell(index);
  }, []);

  const handleCycleImportReview = useCallback((direction: 1 | -1) => {
    const nextIndex = getNextLowConfidenceReviewIndex(importReviewIndices, activeImportReviewIndex, direction);
    focusImportReviewIndex(nextIndex);
  }, [activeImportReviewIndex, focusImportReviewIndex, importReviewIndices]);

  useEffect(() => {

    if (!isLoggedIn || !resumeStartMakingAfterLogin || !beadData || showSaveModal) {

      return;

    }

    setResumeStartMakingAfterLogin(false);
    setShowSaveModal(true);

    try {

      sessionStorage.removeItem(EDITOR_RESUME_DRAFT_KEY);

    } catch (e) {

      console.warn('清理编辑器恢复草稿失败:', e);

    }

  }, [beadData, isLoggedIn, resumeStartMakingAfterLogin, showSaveModal]);




  useEffect(() => {

    if (currentImageData) {

      if (initializedImageDataRef.current === currentImageData) {

        return;

      }

      initializedImageDataRef.current = currentImageData;

      processImage();

    } else if (onBack) {

      onBack();

    } else {

      navigate('/mobile/create');

    }

  }, [currentImageData, navigate, onBack, processImage]);



  useEffect(() => {

    if (beadData) {

      const stats = calculateBeadStatistics(beadData);

      setStatistics(stats);

    }

  }, [beadData]);




  useEffect(() => {

    if (beadData) {

      const containerWidth = window.innerWidth - 64;

      const newCellSize = Math.floor(containerWidth / beadData.width);

      setCellSize(Math.max(8, Math.min(16, newCellSize)));

    }

  }, [beadData]);




  useEffect(() => {

    const styleId = 'slide-panel-keyframes';

    if (!document.getElementById(styleId)) {

      const style = document.createElement('style');

      style.id = styleId;

      style.textContent = `

        @keyframes slideInFromLeft {

          from { transform: translateX(-100%); opacity: 0; }

          to { transform: translateX(0); opacity: 1; }

        }

        @keyframes slideOutToLeft {

          from { transform: translateX(0); opacity: 1; }

          to { transform: translateX(-100%); opacity: 0; }

        }

      `;

      document.head.appendChild(style);

    }

  }, []);



  const handleCloseEditPanel = useCallback(() => {

    setIsEditPanelClosing(true);

    setTimeout(() => {

      setIsEditMode(false);

      setIsEditPanelClosing(false);

    }, 200); // 闂傚倸鍊搁崐鎼佸磹瀹勬噴褰掑炊瑜夐弸鏍煛閸ャ儱鐏╃紒鎰殜閺岀喖鎮ч崼鐔哄嚒闂佸憡鍨规慨鎾煘閹达附鍋愰悗鍦Т椤ユ繄绱撴担鍝勵€岄柛銊ョ埣瀵鏁愭径濠勵吅闂佹寧绻傞幉娑㈠箻缂佹鍘搁梺鍛婁緱閸犳宕愰幇鐗堢厸鐎光偓鐎ｎ剛鐦堥悗瑙勬礃鐢帟鐏掗柣鐐寸▓閳ь剙鍘栨竟鏇㈡⒑閸濆嫮鈻夐柛瀣у亾闂佺顑嗛幐鎼侊綖濠靛鏁嗛柛灞剧敖閵娾晜鍊垫繛鍫濈仢濞呮﹢鏌涢敐蹇曞埌闁伙綁鏀辩缓鐣岀矙閸喖绁梻浣虹帛閺屻劑骞夐敓鐙€鏁傞柣鏂垮悑閳锋帒霉閿濆懏鍟為柟顖氱墦閺屾稒绻濋崒婊冪厽閻庤娲橀崝娆忣嚕娴犲鏁冮柣鏃囨腹婢?

  }, []);



  const getEraserColor = useCallback(() => {

    return activePaletteColors.find(c => c.name.toLowerCase().includes('white')) || activePaletteColors[0] || allBeadColors[0];

  }, [activePaletteColors]);



  const handleBeadClick = useCallback((x: number, y: number) => {

    if (!beadData) return;



    if (currentTool === 'fill') {

      const fillColor = currentColor || getEraserColor();

      floodFill(x, y, fillColor);

      saveToHistory();

    } else if (currentTool === 'brush') {

      if (currentColor) {

        setBeadAt(x, y, currentColor);

      }

    } else if (currentTool === 'eraser') {

      setBeadAt(x, y, getEraserColor());

    }

  }, [beadData, currentTool, currentColor, floodFill, setBeadAt, getEraserColor, saveToHistory]);




  const handleBeadDrag = useCallback((x: number, y: number) => {

    if (!beadData) return;



    if (currentTool === 'brush' && currentColor) {

      setBeadAt(x, y, currentColor);

    } else if (currentTool === 'eraser') {

      setBeadAt(x, y, getEraserColor());

    }

  }, [beadData, currentTool, currentColor, setBeadAt, getEraserColor]);



  const handleDragEnd = useCallback(() => {

    if (currentTool === 'brush' || currentTool === 'eraser') {

      saveToHistory();

    }

  }, [currentTool, saveToHistory]);




  const handlePickColor = useCallback((color: BeadColor) => {

    setCurrentColor(color);

    setCurrentTool('brush'); // 闂傚倸鍊搁崐鎼佸磹瀹勬噴褰掑炊瑜夐弸鏍煛閸ャ儱鐏╃紒鎰殜閺岀喖鎮ч崼鐔哄嚒闂佸憡鍨规慨鎾煘閹达附鍋愰悗鍦Т椤ユ繄绱撴担鍝勵€岄柛銊ョ埣瀵鏁愭径濞⒀囧箹鏉堝墽纾垮ù鐘櫅椤啴濡堕崘銊ュ缂備胶绮敋妞ゎ偄绻橀幖鍦喆閸曨偆锛忛梻渚€娼ч…鍫ュ磿閺屻儲鍊靛Δ锝呭暞閳锋垿鏌涘┑鍡楊伌闁稿骸绻戦妵鍕敇閻樻彃骞嬮梺缁樹緱閸犳稓绮诲☉妯锋婵炲棗绻嗛崑鎾寸節濮橆厾鍘鹃梺璇″幗鐢帡宕濆鍕闁告侗鍋勯悘鍙夋叏婵犲倹鎯堥弫鍫ユ煕閵夋垵鍠氶悗铏節绾版ɑ顫婇柛瀣噽閸掓帡骞樺Ч鍥ｅ亾娴ｇ硶鏋庨柟鎯х－閻も偓闂備礁鎼ˇ鍐测枖閺囥埄鏁婇柛鈩冪⊕閳锋垹绱撴担濮戭亪鎮橀崡鐐╂斀妞ゆ柨鎼埀顒佺箓椤曪綁寮婚妷銉ь啇婵炶揪绲藉﹢閬嶅储閸楃偐鏀介柣鎰级椤ョ偤鏌ㄥ顑炵懓顭ㄩ崟鍨暭缂備浇椴哥敮妤咃綖閹达箑鍐€鐟滃酣鎮靛┑鍠棃鎮╅棃娑楃捕缂備胶绮敃銏ょ嵁閸愵煈鐓ラ柛顐ゅ枎濞堢喖姊洪棃娑辨闂傚嫬瀚伴、鏃堟偄閸忓皷鎷绘繛杈剧到閹诧繝骞嗛崼銉︾厱濠电姴鍊婚崺锝団偓瑙勬礃閸旀瑥顕ｆ禒瀣垫晝闁绘棁娓规竟鏇炩攽椤旀枻渚涢柛鎾寸〒缁柨煤椤忓懐鍘搁柣蹇曞仩椤曆勬叏閸岀偞鐓欐い鏂挎惈閻忚尙鈧娲忛崝宥囨崲濠靛绀嬫い蹇撴閿涚喖姊婚崒姘偓椋庣矆娴ｈ櫣绀婂┑鐘叉硽婢舵劕绠婚悹鍥皺椤ρ冣攽椤斿浠滈柛瀣尵閳ь剚顔栭崳顕€宕戞繝鍥╁祦婵☆垰鍚嬬€氭岸鏌涘▎蹇ｆ▓婵☆偆鍠栧缁樼瑹閳ь剙顭囪閹囧幢濡炪垺绋戣灃闁告粈鐒﹂弲?

    addToRecentColors(color);

  }, [setCurrentColor, setCurrentTool]);



  const addToRecentColors = (color: BeadColor) => {

    setRecentColors(prev => {

      const filtered = prev.filter(c => c.id !== color.id);

      return [color, ...filtered].slice(0, 10);

    });

  };




  const handleSelectColor = (color: BeadColor) => {

    setCurrentColor(color);

    addToRecentColors(color);

    setShowColorPicker(false);

  };











  const openBackgroundMode = useCallback(() => {

    if (beadData) {
      setBgBaselineData(JSON.parse(JSON.stringify(beadData)));
    }
    setIsBackgroundMode(true);

    setBgSelectedColorId(null);
    setBgSelectedSeedIndex(null);
    setBgManualSelections([]);

    setBgExcludedIndices(new Set());
    setBgAutoIndices([]);
    setBgSelectionSource(null);
    setBgDetectionMessage('');
    setBgAutoStrength(55);
    setBgProtectSubject(true);
    setBgCandidateOnly(false);
    setBgCompareMode('current');
    setBgPanMode(false);

    setBgViewMode('select'); // 婵犵數濮甸鏍窗濡ゅ啯鏆滄俊銈呭暟閻瑩鏌熼悜姗嗘畷闁哄懏绻堥弻鏇＄疀鐎ｎ亖鍋撻弴銏犲嚑濞撴埃鍋撻柡宀€鍠栭獮鎴﹀箛闂堟稒顔勬繝纰樻閸嬪懘鏁冮姀銈呰摕闁哄洢鍨归柋鍥ㄧ節闂堟稒绁╂俊顐ゅ仜椤啴濡堕崨顖滎唶闂佺粯鐗滈崢褔锝炶箛鎾佹椽顢斿鍡樻珖闂備線娼х换鍡涘疾濠婂牆鐓濋柛顐犲劜閳锋垿寮堕悙鏉戭棆闁告柨绉归弻鐔兼偡閻楀牊鎮欏銈嗘穿缂嶄線銆佸Δ鍛妞ゆ劕鐟崶銊у幈闂佹枼鏅涢崰姘枔閵忕妴褰掑礂閸忕厧纰嶉梺瀹狀潐閸ㄥ潡宕洪妷鈺佸耿婵°倕鍟╃划鎾⒒娓氣偓閳ь剛鍋涢懟顖涙櫠椤斿墽妫紓浣靛灩楠炴ɑ绻涢幋鐘虫毈闁糕斁鍋?

  }, [beadData]);

  const handleEnterBackgroundMode = useCallback(() => {
    const dismissed = localStorage.getItem(BACKGROUND_MODE_HINT_DISMISSED_KEY) === '1';
    if (!dismissed) {
      localStorage.setItem(BACKGROUND_MODE_HINT_DISMISSED_KEY, '1');
      toast.info('去背景会先处理明显背景，复杂边缘仍可能需要手动补几下。');
    }
    openBackgroundMode();
  }, [openBackgroundMode]);



  const handleExitBackgroundMode = useCallback(() => {

    setIsBackgroundMode(false);

    setBgSelectedColorId(null);
    setBgSelectedSeedIndex(null);
    setBgManualSelections([]);

    setBgExcludedIndices(new Set());
    setBgAutoIndices([]);
    setBgSelectionSource(null);
    setBgDetectionMessage('');
    setBgAutoStrength(55);
    setBgProtectSubject(true);
    setBgCandidateOnly(false);
    setBgCompareMode('current');
    setBgBaselineData(null);
    setBgPanMode(false);

    setBgViewMode('select');

  }, []);



  const handleBgSelectColor = useCallback((index: number) => {

    if (!beadData) return;

    const bead = beadData.beads[index];

    if (!bead) return; // 闂傚倸鍊搁崐鎼佸磹瀹勬噴褰掑炊瑜夐弸鏍煛閸ャ儱鐏╃紒鎰殜閺岀喖鎮ч崼鐔哄嚒闂佸憡鍨规慨鎾煘閹达附鍋愰悗鍦Т椤ユ繄绱撴担鍝勵€岄柛銊ョ埣瀵鏁愭径濠勵吅闂佹寧绋撴晶妤冩暜閳ュ磭鏆﹂柟杈剧畱缁犲鏌涢敂璇插箻闁哄顭堥埞鎴︽倷閺夋垹浠搁梺鑽ゅ櫐缁犳垿鍩㈠澶婎潊闁靛牆妫岄幏娲⒑閸涘﹦绠撻悗姘煎墴閸┾偓妞ゆ巻鍋撻柣鏍帶閻ｇ兘骞囬弶鍨敤濡炪倖鍔楅崰搴㈢閻愵剚鍙忔慨妤€妫楁晶鎵磼婢跺銇濋柡宀嬬磿娴狅妇鎷犻幓鎺濇綆闂備浇顕栭崰鎾诲垂閽樺鏆﹂柕濠忓缁♀偓闂佸憡娲︽禍鐐靛閸ф鈷掗柛灞剧懅椤︼妇绱撳鍜冭含閽樼喖鏌熼幑鎰靛殭缂佲偓閸屾稒鍙忔俊鐐额嚙娴滈箖鎮楀▓鍨珮闁稿锕悰顔嘉熼崗鐓庣彴闂佸憡鐟ラˇ钘壩涢悢鍏尖拻濞撴埃鍋撴繛浣冲洦鍋嬮柛鈩冦亗濞戞鏃堝椽娴ｈ娅嗛梻浣稿閸嬪懎煤濮椻偓閸╂盯骞嬮敂钘変化闂佽鍘界敮鎺撲繆婵傚憡鐓涢悗锝庡亜閻忔挳鏌″畝瀣？闁逞屽墾缂嶅棙绂嶉崼鏇熷亗闁稿繒鈷堝▓??
    setBgSelectedColorId(bead.id);
    setBgSelectedSeedIndex(index);
    setBgManualSelections((prev) => {
      if (prev.some((item) => item.seedIndex === index)) {
        return prev;
      }
      return [...prev, { seedIndex: index, colorId: bead.id }];
    });
    setBgSelectionSource('manual');
    setBgAutoIndices([]);
    setBgDetectionMessage('');
    setBgPanMode(false);

    setBgExcludedIndices(new Set()); // 闂傚倸鍊搁崐鎼佸磹瀹勬噴褰掑炊瑜夐弸鏍煛閸ャ儱鐏╃紒鎰殜閺岀喖鎮ч崼鐔哄嚒闂佸憡鍨规慨鎾煘閹达附鍋愰悗鍦Т椤ユ繄绱撴担鍝勵€岄柛銊ョ埣瀵鏁愭径濠勵吅闂佹寧绻傞幉娑㈠箻缂佹鍘搁梺鍛婁緱閸犳宕愰幇鐗堢厸鐎光偓鐎ｎ剛鐦堥悗瑙勬礃鐢帟鐏掗柣鐐寸▓閳ь剙鍘栨竟鏇㈡⒑閸濆嫮鈻夐柛瀣у亾闂佺顑嗛幐鎼侊綖濠靛鏁嗛柛灞剧敖閵娿儙鏃堟偐闂堟稐绮堕梺鎸庢处娴滎亜顕ｉ锕€绀冩い鏃囧亹閿涙粌鈹戦悙鏉戠仸闁荤噦绠撻、鏃堟偄閸忓皷鎷绘繛杈剧到閹诧繝骞嗛崼銉︾厱濠电姴鍊婚崺锝団偓瑙勬礃閸旀瑥顕ｆ禒瀣垫晝闁绘棁娓规竟鏇炩攽椤旀枻渚涢柛鎾寸〒缁棃鎼归崗澶婁壕婵炲牆鐏濆▍姗€鏌涢幘瀵告噰闁炽儻绠撴俊鎼佸煛娓氣偓閸炲爼姊虹紒妯荤叆闁硅绻濋、?
  }, [beadData]);




  const handleBgToggleExclude = useCallback((index: number) => {

    setBgExcludedIndices(prev => {

      const next = new Set(prev);

      if (next.has(index)) {

        next.delete(index);

      } else {

        next.add(index);

      }

      return next;

    });

  }, []);




  const collectConnectedManualBgIndices = useCallback((seedIndex: number, colorId: string): number[] => {

    if (!beadData) return [];

    const seedBead = beadData.beads[seedIndex];
    if (!seedBead || seedBead.id !== colorId) return [];

    return collectManualLikeBackgroundRegion(beadData, seedIndex);

  }, [beadData]);



  const getBgHighlightedIndices = useCallback((): number[] => {

    if (!beadData) return [];

    if (bgSelectionSource === 'auto') {
      return bgAutoIndices.filter((index) => !bgExcludedIndices.has(index));
    }

    if (bgSelectionSource === 'manual' && bgManualSelections.length > 0) {
      const merged = new Set<number>();
      bgManualSelections.forEach(({ seedIndex, colorId }) => {
        collectConnectedManualBgIndices(seedIndex, colorId).forEach((index) => {
          if (!bgExcludedIndices.has(index)) {
            merged.add(index);
          }
        });
      });
      return Array.from(merged);
    }

    if (!bgSelectedColorId) return [];

    return beadData.beads

      .map((bead, index) => ({ bead, index }))

      .filter(({ bead, index }) =>

        bead &&

        bead.id === bgSelectedColorId &&

        !bgExcludedIndices.has(index)

      )

      .map(({ index }) => index);

  }, [beadData, bgSelectedColorId, bgSelectedSeedIndex, bgExcludedIndices, bgAutoIndices, bgSelectionSource, bgManualSelections, collectConnectedManualBgIndices]);



  const handleBgConfirmTransparent = useCallback(() => {

    if (!beadData) return;

    const indices = getBgHighlightedIndices();

    if (indices.length === 0) return;

    const removedCells = indices
      .map((index) => {
        const bead = beadData.beads[index];
        return bead ? { index, bead } : null;
      })
      .filter((item): item is RemovedBackgroundCell => Boolean(item));

    setBgLastRemoval(removedCells);



    setBeadData(applyTransparentIndices(beadData, indices));

    saveToHistory();



    setBgSelectedColorId(null);
    setBgSelectedSeedIndex(null);
    setBgManualSelections([]);

    setBgExcludedIndices(new Set());
    setBgAutoIndices([]);
    setBgSelectionSource(null);
    setBgDetectionMessage('');
    setBgPanMode(false);
    setBgCompareMode('current');
    setBgBaselineData(null);
    setBgViewMode('select');
    setIsBackgroundMode(false);

  }, [beadData, getBgHighlightedIndices, setBeadData, saveToHistory]);



  const handleBgClearSelection = useCallback(() => {

    setBgSelectedColorId(null);
    setBgSelectedSeedIndex(null);
    setBgManualSelections([]);

    setBgExcludedIndices(new Set());
    setBgAutoIndices([]);
    setBgSelectionSource(null);
    setBgDetectionMessage('');
    setBgPanMode(false);

  }, []);

  const handleBgSwitchMode = useCallback((mode: BackgroundEditMode) => {
    const nextMode = bgViewMode === mode ? 'select' : mode;
    setBgPanMode(false);
    setBgViewMode(nextMode);

    if (nextMode === 'erase') {
      setBgSelectedColorId(null);
      setBgSelectedSeedIndex(null);
      setBgManualSelections([]);
      setBgExcludedIndices(new Set());
      setBgAutoIndices([]);
      setBgSelectionSource(null);
      setBgDetectionMessage('已开启点格擦除，点哪一格就会删掉哪一格。');
      return;
    }

    if (nextMode === 'restore') {
      setBgSelectedColorId(null);
      setBgSelectedSeedIndex(null);
      setBgManualSelections([]);
      setBgExcludedIndices(new Set());
      setBgAutoIndices([]);
      setBgSelectionSource(null);
      setBgDetectionMessage('已开启补回误删，点击透明格即可恢复。');
      return;
    }

    if (nextMode === 'view') {
      setBgDetectionMessage('');
      return;
    }

    setBgDetectionMessage('');
  }, [bgViewMode]);

  const handleBgUndoStep = useCallback(() => {
    setBgPanMode(false);

    if (bgSelectionSource === 'manual' && bgManualSelections.length > 0) {
      setBgManualSelections((prev) => {
        if (prev.length === 0) {
          return prev;
        }

        const next = prev.slice(0, -1);
        const last = next[next.length - 1] ?? null;
        setBgSelectedSeedIndex(last?.seedIndex ?? null);
        setBgSelectedColorId(last?.colorId ?? null);
        setBgSelectionSource(next.length > 0 ? 'manual' : null);
        setBgDetectionMessage('');
        return next;
      });
      return;
    }

    if (bgSelectionSource === 'auto' && bgAutoIndices.length > 0) {
      setBgSelectedColorId(null);
      setBgSelectedSeedIndex(null);
      setBgManualSelections([]);
      setBgExcludedIndices(new Set());
      setBgAutoIndices([]);
      setBgSelectionSource(null);
      setBgDetectionMessage('');
      return;
    }

    if (canUndo) {
      undo();
      setBgSelectedColorId(null);
      setBgSelectedSeedIndex(null);
      setBgManualSelections([]);
      setBgExcludedIndices(new Set());
      setBgAutoIndices([]);
      setBgSelectionSource(null);
      setBgDetectionMessage('');
      setBgLastRemoval([]);
    }
  }, [bgSelectionSource, bgManualSelections, bgAutoIndices, canUndo, undo]);

  const handleBgTogglePanMode = useCallback(() => {
    setBgPanMode((prev) => {
      const next = !prev;
      setBgDetectionMessage(
        next
          ? '已开启移动视图，可直接拖动画面查看别的位置。'
          : ''
      );
      return next;
    });
  }, []);

  const handleBgQuickRemove = useCallback(async () => {

    if (!beadData) return;

    const suggestion = await detectQuickBackgroundSuggestion();

    if (!suggestion || suggestion.indices.length === 0) {
      toast.warning('这张图暂时没有识别到可一键去掉的简单背景，可尝试手动选择或点格擦除。');
      return;
    }

    if (suggestion.confidence < 0.38 || suggestion.regionCoverage < 0.03 || suggestion.regionCoverage > 0.78) {
      setBgSelectionSource('auto');
      setBgAutoIndices(suggestion.indices);
      setBgExcludedIndices(new Set());
      setBgSelectedColorId(suggestion.primaryColorId);
      setBgSelectedSeedIndex(null);
      setBgDetectionMessage(`已圈出候选背景 ${suggestion.indices.length} 格。${suggestion.reason}`);
      setBgPanMode(false);
      setBgViewMode('select');
      toast.info('这张图背景较复杂，建议直接继续手动微调。');
      return;
    }

    const removedCells = suggestion.indices
      .map((index) => {
        const bead = beadData.beads[index];
        return bead ? { index, bead } : null;
      })
      .filter((item): item is RemovedBackgroundCell => Boolean(item));

    setBgLastRemoval(removedCells);
    setBeadData(applyTransparentIndices(beadData, suggestion.indices));
    saveToHistory();
    setBgSelectionSource(null);
    setBgAutoIndices([]);
    setBgExcludedIndices(new Set());
    setBgSelectedColorId(null);
    setBgSelectedSeedIndex(null);
    setBgDetectionMessage(`已自动去掉 ${suggestion.indices.length} 格背景。`);
    setBgPanMode(false);
    toast.success(`已自动去掉 ${suggestion.indices.length} 格背景。`);

  }, [beadData, detectQuickBackgroundSuggestion, saveToHistory, setBeadData, toast]);

  const handleBgRestoreLastRemoval = useCallback(() => {
    if (!beadData || bgLastRemoval.length === 0) return;

    const nextBeads = [...beadData.beads];
    bgLastRemoval.forEach(({ index, bead }) => {
      nextBeads[index] = bead;
    });

    setBeadData({
      ...beadData,
      beads: nextBeads,
    });
    saveToHistory();
    setBgLastRemoval([]);
    setBgDetectionMessage(`已恢复 ${bgLastRemoval.length} 格到去背景前状态。`);
    toast.success(`已恢复 ${bgLastRemoval.length} 格背景。`);
  }, [beadData, bgLastRemoval, saveToHistory, setBeadData, toast]);

  const handleBgRestoreSingleCell = useCallback((index: number) => {
    if (!beadData || !bgBaselineData) return;

    const baselineBead = bgBaselineData.beads[index];
    if (!baselineBead) return;

    const nextBeads = [...beadData.beads];
    nextBeads[index] = baselineBead;

    setBeadData({
      ...beadData,
      beads: nextBeads,
    });
    saveToHistory();
    setBgLastRemoval((prev) => prev.filter((item) => item.index !== index));
    setBgDetectionMessage('已恢复 1 格背景，可继续点击其他透明格补回。');
  }, [beadData, bgBaselineData, saveToHistory, setBeadData]);

  const handleBgManualEraseCell = useCallback((index: number) => {
    if (!beadData) return;

    const bead = beadData.beads[index];
    if (!bead) return;

    setBgLastRemoval([{ index, bead }]);
    setBeadData(applyTransparentIndices(beadData, [index]));
    saveToHistory();
    setBgDetectionMessage('已手动擦除 1 格背景，可继续点击其他格子细修。');
  }, [beadData, saveToHistory, setBeadData]);

  const applyMirrorTransform = useCallback((direction: 'horizontal' | 'vertical') => {
    if (!beadData) return;
    if (isProcessing) {
      toast.info('当前编辑结果还在更新，请稍候再镜像。');
      return;
    }

    if (direction === 'horizontal') {
      applyBeadDataChange(applyHorizontalMirrorToBeadData(beadData));
      setIsHorizontallyMirrored((prev) => !prev);
      return;
    }

    const { width, height, beads } = beadData;
    const nextBeads = new Array(beads.length).fill(null);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const sourceIndex = y * width + x;
        const targetIndex = (height - 1 - y) * width + x;
        nextBeads[targetIndex] = beads[sourceIndex];
      }
    }

    applyBeadDataChange({
      ...beadData,
      beads: nextBeads,
    });
  }, [applyBeadDataChange, beadData, isProcessing, toast]);

  const bgRecoverableIndices = React.useMemo(
    () => {
      const recoverable = new Set<number>();
      if (!beadData || !bgBaselineData) return recoverable;

      beadData.beads.forEach((bead, index) => {
        if (!bead && bgBaselineData.beads[index]) {
          recoverable.add(index);
        }
      });

      return recoverable;
    },
    [beadData, bgBaselineData]
  );
  const bgPreviewBeadData = bgCompareMode === 'before' && bgBaselineData ? bgBaselineData : beadData;
  const isBgComparingBefore = bgCompareMode === 'before' && !!bgBaselineData;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => setViewportWidth(window.innerWidth);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia('(pointer: coarse)');
    const updatePointerMode = () => setIsCoarsePointer(mediaQuery.matches);
    updatePointerMode();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updatePointerMode);
      return () => mediaQuery.removeEventListener('change', updatePointerMode);
    }

    mediaQuery.addListener(updatePointerMode);
    return () => mediaQuery.removeListener(updatePointerMode);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    if (isBackgroundMode) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    }

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isBackgroundMode]);

  useEffect(() => {
    if (!beadData || !isBackgroundMode || bgSelectionSource !== 'auto') {
      return;
    }

    let cancelled = false;

    const run = async () => {
      const suggestion = await detectQuickBackgroundSuggestion();
      if (cancelled) return;

      if (!suggestion || suggestion.indices.length === 0) {
        setBgAutoIndices([]);
        setBgSelectedColorId(null);
        setBgSelectedSeedIndex(null);
        setBgDetectionMessage('当前强度下没有找到稳定背景候选区，可调高强度或改用手动选择。');
        return;
      }

      setBgAutoIndices(suggestion.indices);
      setBgSelectedColorId(suggestion.primaryColorId);
      setBgSelectedSeedIndex(null);
      setBgDetectionMessage(`重新圈出 ${suggestion.indices.length} 格背景候选区。${suggestion.reason}`);
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [beadData, detectQuickBackgroundSuggestion, isBackgroundMode, bgSelectionSource]);




  const saveEditorStateToSession = useCallback(() => {

    if (!currentImageData) return;

    try {

      const editorState: EditorStateData = {

        imageData: currentImageData,

        colorCount,
        simplifyPreset,

        paletteMode,

        gridWidth: gridSize,

        customColorIds: activeCustomColorIds,

      };

      sessionStorage.setItem('editorData', JSON.stringify(editorState));

    } catch (e) {

      console.warn('保存编辑器状态到会话失败:', e);

    }

  }, [activeCustomColorIds, colorCount, currentImageData, gridSize, paletteMode, simplifyPreset]);

  const serializeBeadDataForSave = useCallback((data: BeadPixelData) => {

    return {

      width: data.width,

      height: data.height,

      beads: data.beads.map((b) => b ? {

        id: b.id,

        name: b.name,

        nameCN: b.nameCN,

        rgb: b.rgb,

        hex: b.hex,

        brand: b.brand,

      } : { id: '', name: '', nameCN: '', rgb: [0, 0, 0] as [number, number, number], hex: '#00000000', brand: 'transparent' }),

    };

  }, []);

  const saveEditorResumeDraftToSession = useCallback((pendingAction?: 'startMaking') => {

    if (!currentImageData || !beadData) return;

    try {

      const draft: EditorResumeDraft = mergeImportReviewDraftFields(pendingResumeDraft, {

        imageData: currentImageData,

        colorCount,
        simplifyPreset,

        paletteMode,

        gridWidth: gridSize,

        customColorIds: activeCustomColorIds,

        saturationBoost,

        vibrancyPreference,

        beadData: JSON.parse(JSON.stringify(beadData)),

        initialBeadData: initialBeadData ? JSON.parse(JSON.stringify(initialBeadData)) : null,

        regeneratedBaseData: regeneratedBaseData ? JSON.parse(JSON.stringify(regeneratedBaseData)) : null,

        isHorizontallyMirrored,

        pendingAction,

      }) as EditorResumeDraft;

      sessionStorage.setItem(EDITOR_RESUME_DRAFT_KEY, JSON.stringify(draft));

    } catch (e) {

      console.warn('保存编辑器恢复草稿到会话失败:', e);

    }

  }, [activeCustomColorIds, beadData, colorCount, currentImageData, gridSize, initialBeadData, isHorizontallyMirrored, paletteMode, pendingResumeDraft, regeneratedBaseData, saturationBoost, simplifyPreset, vibrancyPreference]);

  const handleReauthAndResumeCloudSave = useCallback((message?: string) => {
    setShowSaveModal(false);
    saveEditorStateToSession();
    saveEditorResumeDraftToSession('startMaking');
    logout();
    toast.info(message || '登录状态已失效，请重新登录后继续云端保存。');
    navigate('/mobile/login', { state: { from: '/mobile/editor', resumeStartMaking: true } });
  }, [logout, navigate, saveEditorResumeDraftToSession, saveEditorStateToSession, toast]);



  const handleStartMakingClick = (e?: React.MouseEvent) => {

    if (!beadData) return;

    const e2eBypassLogin = import.meta.env.DEV && typeof window !== 'undefined' && Boolean((window as any).__E2E_BYPASS_LOGIN__);

    if (!isLoggedIn && !e2eBypassLogin) {

      showConfirm('登录后可保存方案并同步进度，现在去登录吗？', {

        title: '需要先登录',

        type: 'info',

        confirmText: '去登录',

        onConfirm: () => {

          saveEditorStateToSession();
          saveEditorResumeDraftToSession('startMaking');

          navigate('/mobile/login', { state: { from: '/mobile/editor', resumeStartMaking: true } });

        },

      });

      return;

    }

    if (e?.shiftKey || e2eBypassLogin) {

      navigate('/mobile/making', {

        state: { beadData, colorCount: effectiveColorLimit, backTarget: '/mobile/create' },

      });

      return;

    }

    setShowSaveModal(true);

  };



  const getColorDisplayInfo = useCallback((color: BeadColor) => {

    const nameCN = (color.nameCN || '').trim();

    const nameEN = (color.name || '').trim();

    if (nameCN && nameCN.toLowerCase() !== color.id.toLowerCase()) {

      return { name: nameCN, showCode: true };

    }

    if (nameEN && nameEN.toLowerCase() !== color.id.toLowerCase()) {

      return { name: nameEN, showCode: true };

    }

    return { name: `色号 ${color.id}`, showCode: false };

  }, []);





  const handleLoginSuccess = () => {

    setShowLoginModal(false);


    setShowSaveModal(true);

  };



  const generateThumbnail = useCallback(() => {

    if (!beadData) return '';

    const canvas = document.createElement('canvas');

    renderBeadsToCanvas(beadData, canvas, 4, false, false);

    return canvas.toDataURL('image/jpeg', 0.7);

  }, [beadData]);

  const handleCancelSave = useCallback(() => {
    if (isSaving) {
      saveAbortControllerRef.current?.abort();
      saveAbortControllerRef.current = null;
      setIsSaving(false);
      setShowSaveModal(false);
      toast.info('已取消保存。');
      return;
    }
    setShowSaveModal(false);
  }, [isSaving, toast]);



  const handleSaveProject = async (name: string) => {

    if (!beadData) {

      toast.error('没有可保存的图案数据');

      return;

    }


    saveAbortControllerRef.current?.abort();
    const abortController = new AbortController();
    saveAbortControllerRef.current = abortController;
    setIsSaving(true);
    const thumbnail = generateThumbnail();
    const originalImage = imageData || thumbnail;

    try {



      if (isLoggedIn) {

        let thumbnailUrl = '';

        let originalImageUrl = '';

        try {

          const [thumbUrl, origUrl] = await Promise.all([

            uploadApi.uploadImage(thumbnail, 'thumbnails', abortController.signal),

            uploadApi.uploadImage(originalImage, 'originals', abortController.signal),

          ]);

          thumbnailUrl = thumbUrl;

          originalImageUrl = origUrl;

        } catch (uploadError) {
          if (abortController.signal.aborted) {
            return;
          }

          console.error('上传图片失败:', uploadError);

          toast.error('图片上传失败，已取消本次云端保存。');

          return;

        }



        const response = await projectApi.create({

          name,

          thumbnail_url: thumbnailUrl,

          original_image: originalImageUrl,

          bead_data: serializeBeadDataForSave(beadData),

          settings: {

            gridSize,

            gridHeight: beadData.height,

            colorCount: effectiveColorLimit,

            saturationBoost,

            vibrancyPreference,

          },

        }, abortController.signal);



        if (response.code === 0) {

          toast.success('方案已保存，正在进入制作模式。');

          setShowSaveModal(false);

          navigate('/mobile/making', {

            state: { beadData, colorCount: effectiveColorLimit, projectId: response.data.id, backTarget: '/mobile/create' },

          });

        } else {
          console.error('创建方案失败:', response.msg);
          const failure = normalizeProjectSaveFailure({ response });
          if (failure.kind === 'reauth') {
            handleReauthAndResumeCloudSave(failure.message);
            return;
          }
          saveToLocal(name, thumbnail, originalImage, { fromCloudFallback: true });

        }

      } else {

        saveToLocal(name, thumbnail, originalImage);

      }

    } catch (error) {

      if (abortController.signal.aborted) {
        return;
      }

      console.error('保存方案异常:', error);
      const failure = normalizeProjectSaveFailure({ error });
      if (failure.kind === 'reauth') {
        handleReauthAndResumeCloudSave(failure.message);
        return;
      }
      saveToLocal(name, thumbnail, originalImage, { fromCloudFallback: true });

    } finally {
      if (saveAbortControllerRef.current === abortController) {
        saveAbortControllerRef.current = null;
      }
      setIsSaving(false);

    }

  };




  const saveToLocal = (
    name: string,
    thumbnail: string,
    originalImage: string,
    options?: { fromCloudFallback?: boolean }
  ) => {

    if (!beadData) return;

    try {
      setShowSaveModal(false);

      const projectPayload = {

        name,

        thumbnail,

        originalImage: originalImage.length > 2_000_000 ? thumbnail : originalImage,

        beadData: serializeBeadDataForSave(beadData),

        settings: {

          gridSize,

          gridHeight: beadData.height,

          colorCount: effectiveColorLimit,

          saturationBoost,

          vibrancyPreference,

        },

      };



      let result: { id: number };

      try {

        result = localStorageService.createProject(projectPayload);

      } catch {

        result = localStorageService.createProject({ ...projectPayload, originalImage: thumbnail });

      }

      toast.success(
        options?.fromCloudFallback
          ? '已自动保存到本地方案，正在进入制作模式。'
          : '本地方案已保存，正在进入制作模式。'
      );

      navigate('/mobile/making', {

        state: { beadData, colorCount: effectiveColorLimit, localProjectId: result.id, backTarget: '/mobile/create' },

      });

    } catch (e) {

      console.error('本地保存失败:', e);

      toast.error('保存失败，将直接进入制作模式。');

      navigate('/mobile/making', {

        state: { beadData, colorCount: effectiveColorLimit, backTarget: '/mobile/create' },

      });

    }

  };



  const lastAppliedParamsRef = useRef({ gridSize, saturationBoost, vibrancyPreference, colorCount, simplifyPreset });




  const handleRegenerate = () => {

    if (canUndo) {

      if (!window.confirm('重新生成会按新的参数重新计算图案。已去背景区域会尽量保留，但其他手动编辑可能被覆盖，确定继续吗？')) {

        setGridSize(lastAppliedParamsRef.current.gridSize);

        setSaturationBoost(lastAppliedParamsRef.current.saturationBoost);

        setVibrancyPreference(lastAppliedParamsRef.current.vibrancyPreference);

        setColorCount(lastAppliedParamsRef.current.colorCount);
        setSimplifyPreset(lastAppliedParamsRef.current.simplifyPreset);

        return;

      }

    }


    lastAppliedParamsRef.current = { gridSize, saturationBoost, vibrancyPreference, colorCount, simplifyPreset };

    if (containerRef.current) {

      savedScrollPosition.current = containerRef.current.scrollTop;

    }

    processImage(true); // true 闂傚倸鍊搁崐鎼佸磹瀹勬噴褰掑炊瑜夐弸鏍煛閸ャ儱鐏╃紒鎰殜閺岀喖鎮ч崼鐔哄嚒闂佸憡鍨规慨鎾煘閹达附鍋愰悗鍦Т椤ユ繄绱撴担鍝勵€岄柛銊ゅ嵆閳ユ棃宕橀浣镐壕闁挎繂绨肩花浠嬫煛閸曨偄鈧悂婀侀梺缁樏壕顓灻虹€涙ɑ鍙忓┑鐘叉噺椤忕娀鏌熼悷鏉款伃濠碘剝鎮傛俊鐑芥晜闁款垰浜惧Δ锝呭暞閳锋垿鏌涘┑鍡楊伌闁稿骸绻戦妵鍕敇閻樻彃骞嬮梺缁樹緱閸犳稓绮诲☉妯锋婵炲棗绻嗛崑鎾寸節濮橆厾鍘鹃梺璇″幗鐢帡宕濆鍕闁告侗鍋勯悘鍙夋叏婵犲啯銇濈€规洦鍋婂畷鐔碱敃閻旇渹澹曢梺鍓插亝濞叉牜澹曡ぐ鎺撶厸鐎广儱楠告禍鎰版煕鐎ｎ偅灏い顐ｇ箞椤㈡宕掑┃鐐姂濮婃椽宕崟顕呮蕉闂佸憡姊归崹鍧楃嵁閸愵喖顫呴柕鍫濇噹缁愭稒绻濋悽闈浶㈤悗姘间簽濡叉劙寮撮姀鈾€鎷绘繛杈剧到閹芥粎绮旈悜妯镐簻闁靛闄勫畷宀€鈧娲橀〃鍛达綖濠婂牆鐒垫い鎺嗗亾妞ゆ洩缍侀、鏇㈡晝閳ь剛绮绘繝姘仯闁搞儜鍐獓濡炪們鍎茬换鍫濐潖濞差亝顥堟繛鎴炶壘椤ｅ搫鈹戦埥鍡椾簼妞ゃ劌锕妴渚€寮崼婵嬪敹闂佸搫娲ㄩ崯鍧楀箯濞差亝鐓熼柣妯哄帠閼割亪鏌涢弬璺ㄧ劯鐎殿喗鎮傚顕€宕奸悢鍝勫箞婵犲痉鏉库偓鎾剁矆娓氣偓閸┿垽寮撮姀锛勫幐婵炶揪绲块幊鎾存叏瀹€鈧槐鎺楁偐瀹曞洦鍒涢悗娈垮櫘閸撴瑩鍩㈡惔銊ョ煑闁靛／鍐炬П闂傚倸鍊搁崐鎼佸磹瀹勬噴褰掑炊瑜夐弸鏍煛閸ャ儱鐏╃紒鎰殜閺岀喖鎮ч崼鐔哄嚒闂佸憡鍨规慨鎾煘閹达附鍋愰悗鍦Т椤ユ繄绱撴担鍝勵€岄柛銊ョ埣瀵鏁愭径濠勵吅闂佹寧绻傞幉娑㈠箻缂佹鍘搁梺鍛婁緱閸犳宕愰幇鐗堢厸鐎光偓鐎ｎ剛鐦堥悗瑙勬礃鐢帟鐏掗柣鐐寸▓閳ь剙鍘栨竟鏇㈡⒑閸濆嫮鈻夐柛瀣у亾闂佺顑嗛幐鎼侊綖濠靛鏁嗛柛灞剧敖閵娾晜鈷戦柛婵嗗椤箓鏌涢弮鈧崹鍧楃嵁閸愵喖顫呴柕鍫濇閸庮亪姊洪懡銈呮瀾婵犮垺顭囧濠囨嚃閳哄啰锛濋梺绋挎湰閻熝囧礉瀹ュ洨纾奸悗锝庡亞婢х敻鏌ㄥ┑鍫濅沪鐎垫澘瀚禒锔剧矙婢剁顥氭繝娈垮枟钃遍柛鎾磋壘椤洭骞囬悧鍫㈠幍婵炴挻鑹鹃悘婵囦繆閸ф鐓冪憸婊堝礈閵娧呯闁糕剝绋戠粣妤佷繆閵堝懏鍣归柣銈夌畺閺岀喖姊荤€电濡介梺缁樻尰閻╊垶寮诲☉姘勃濞戞柨鎷嬫禍顏堝春閳ь剚銇勯幒宥堝厡濠⒀囦憾閺屽秷顧侀柛鎾村哺閹虫繈宕滆缁€濠傗攽閻樺弶鎼愰柦鍐枛閺屾洘绻涢悙顒佺彆闂佺顑呯€氼喚妲愰幒鏂哄亾閿濆骸骞楃痪顓炵埣閺屾洟宕煎┑鍫⑿ㄥ┑顔硷龚濞咃絿妲愰幒鎳崇喖宕归鍛棨闂傚倷绀侀浠嬪级閸噮鐎烽梻渚€鈧偛鑻晶顖炴煠閻熸澘鈷旂紒杈╁仦缁绘繈宕惰閹芥洟姊洪棃娴ュ牓寮插鍫濈；闁告洦鍨遍崑锝夋煕閵夛絽濡块柡鍡樼懇閺岀喖宕滆鐢盯鏌ｉ幘瀵告噭妞ゃ劊鍎甸幃娆撴嚑椤戣儻妾搁梻浣筋嚙缁绘垿鎮￠敓鐘茶摕闁斥晛鍟刊鎾偡濞嗗繐顏╃痪鐐▕閹鈻撻崹顔界彯闂佸憡鎸鹃崰鎰┍婵犲洤閱囬柡鍥╁仜閼板灝鈹戞幊閸婃洟鏁冮敐鍥潟闁挎洖鍊归悡?
  };

  useEffect(() => {

    setGridSizeInput(String(gridSize));

  }, [gridSize]);

  const handleRegenerateWithGridSize = (nextValue: number) => {

    const normalizedValue = normalizeGridSize(nextValue);

    if (normalizedValue === gridSize) {

      setGridSizeInput(String(normalizedValue));

      return;

    }

    if (canUndo) {

      if (!window.confirm('重新生成会按新的参数重新计算图案。已去背景区域会尽量保留，但其他手动编辑可能被覆盖，确定继续吗？')) {

        setGridSize(lastAppliedParamsRef.current.gridSize);

        setSaturationBoost(lastAppliedParamsRef.current.saturationBoost);

        setVibrancyPreference(lastAppliedParamsRef.current.vibrancyPreference);

        setGridSizeInput(String(lastAppliedParamsRef.current.gridSize));

        return;

      }

    }

    lastAppliedParamsRef.current = {

      gridSize: normalizedValue,

      saturationBoost,

      vibrancyPreference,

      colorCount,

      simplifyPreset,

    };

    if (containerRef.current) {

      savedScrollPosition.current = containerRef.current.scrollTop;

    }

    setGridSize(normalizedValue);

    setGridSizeInput(String(normalizedValue));

    processImage(true, {

      gridSize: normalizedValue,

      saturationBoost,

      vibrancyPreference,

    });

  };

  const handleAdjustGridSize = (delta: number) => {
    handleRegenerateWithGridSize(gridSize + delta);
  };

  const handleApplySimplifyPreset = (nextPreset: SimplifyPreset) => {
    if (nextPreset === simplifyPreset) {

      return;

    }

    if (canUndo) {

      if (!window.confirm('重新生成会按新的参数重新计算图案。已去背景区域会尽量保留，但其他手动编辑可能被覆盖，确定继续吗？')) {

        return;

      }

    }

    const nextValue = resolveSimplifyColorLimit(nextPreset, paletteMode, myColorCount);
    setSimplifyPreset(nextPreset);
    setColorCount(nextValue);

    lastAppliedParamsRef.current = {
      gridSize,
      saturationBoost,
      vibrancyPreference,
      colorCount: nextValue,
      simplifyPreset: nextPreset,
    };

    if (containerRef.current) {

      savedScrollPosition.current = containerRef.current.scrollTop;

    }

    processImage(true, {
      simplifyPreset: nextPreset,
      colorCount: nextValue,
    });

  };

  const handleApplyPaletteMode = (nextMode: PaletteMode) => {
    if (nextMode === paletteMode) {
      return;
    }

    if (nextMode === 'my-colors') {
      const selectedIds = myColorsService.getSelectedIds();
      if (selectedIds.length === 0) {
        toast.info('请先点击“管理”选择个人色库。');
        setShowMyColorsModal(true);
        return;
      }
      setMyColorCount(selectedIds.length);
      setActiveCustomColorIds(selectedIds);
    }

    if (canUndo) {
      if (!window.confirm('重新生成会按新的色库参数重新计算图案。已去背景区域会尽量保留，但其他手动编辑可能被覆盖，确定继续吗？')) {
        return;
      }
    }

    const nextCustomColorIds = nextMode === 'my-colors'
      ? myColorsService.getSelectedIds()
      : undefined;
    const nextMyColorCount = nextMode === 'my-colors'
      ? nextCustomColorIds.length
      : nextCustomColorIds?.length || myColorCount;
    const nextColorLimit = resolveSimplifyColorLimit(
      simplifyPreset,
      nextMode,
      nextMyColorCount,
    );

    setPaletteMode(nextMode);
    setActiveCustomColorIds(nextCustomColorIds);
    setColorCount(nextColorLimit);

    lastAppliedParamsRef.current = {
      gridSize,
      saturationBoost,
      vibrancyPreference,
      colorCount: nextColorLimit,
      simplifyPreset,
    };

    if (containerRef.current) {
      savedScrollPosition.current = containerRef.current.scrollTop;
    }

    processImage(true, {
      simplifyPreset,
      colorCount: nextColorLimit,
      paletteMode: nextMode,
      customColorIds: nextCustomColorIds,
    });
  };

  const handleGridSizeStep = (delta: number) => {

    handleRegenerateWithGridSize(gridSize + delta);

  };

  const handleGridSizeInputCommit = () => {

    const parsedValue = Number(gridSizeInput);

    handleRegenerateWithGridSize(Number.isFinite(parsedValue) ? parsedValue : gridSize);

  };

  const handleRegenerateWithSaturation = (nextValue: number) => {

    const normalizedValue = Math.min(30, Math.max(0, Math.round(nextValue)));

    if (normalizedValue === saturationBoost) {

      return;

    }

    if (canUndo) {

      if (!window.confirm('重新生成会按新的参数重新计算图案。已去背景区域会尽量保留，但其他手动编辑可能被覆盖，确定继续吗？')) {

        setGridSize(lastAppliedParamsRef.current.gridSize);

        setSaturationBoost(lastAppliedParamsRef.current.saturationBoost);

        setVibrancyPreference(lastAppliedParamsRef.current.vibrancyPreference);

        setGridSizeInput(String(lastAppliedParamsRef.current.gridSize));

        return;

      }

    }

    lastAppliedParamsRef.current = {

      gridSize,

      saturationBoost: normalizedValue,

      vibrancyPreference,

      colorCount,

      simplifyPreset,

    };

    if (containerRef.current) {

      savedScrollPosition.current = containerRef.current.scrollTop;

    }

    setSaturationBoost(normalizedValue);

    processImage(true, {

      gridSize,

      saturationBoost: normalizedValue,

      vibrancyPreference,

    });

  };

  const dominantBrand = React.useMemo(() => {

    if (!beadData) return 'MARD';

    const brandCount: Record<string, number> = {};

    beadData.beads.forEach(b => {
      if (!b) {
        return;
      }

      const brand = b.brand || 'unknown';

      brandCount[brand] = (brandCount[brand] || 0) + 1;

    });

    let maxBrand = 'MARD';

    let maxCount = 0;

    Object.entries(brandCount).forEach(([brand, count]) => {

      if (count > maxCount) {

        maxCount = count;

        maxBrand = brand;

      }

    });

    const brandNames: Record<string, string> = { mard: 'MARD', perler: 'Perler', hama: 'Hama', artkal: 'Artkal' };

    return brandNames[maxBrand.toLowerCase()] || maxBrand.toUpperCase();

  }, [beadData]);

  const isNarrowEditorControls = viewportWidth <= 420;
  const isCompactEditorControls = viewportWidth <= 360;
  const editorControlRowStyle: React.CSSProperties = {
    ...styles.previewZoomRow,
    gap: isNarrowEditorControls ? '6px' : '8px',
  };
  const editorSliderStyle: React.CSSProperties = {
    ...styles.previewZoomSlider,
    minWidth: isNarrowEditorControls ? '100%' : styles.previewZoomSlider.minWidth,
    flexBasis: isNarrowEditorControls ? '100%' : undefined,
    order: isNarrowEditorControls ? 3 : 0,
  };
  const editorStepButtonStyle: React.CSSProperties = {
    ...styles.previewZoomButton,
    width: isCompactEditorControls ? '28px' : isNarrowEditorControls ? '30px' : styles.previewZoomButton.width,
    height: isCompactEditorControls ? '28px' : isNarrowEditorControls ? '30px' : styles.previewZoomButton.height,
    fontSize: isCompactEditorControls ? '16px' : undefined,
  };
  const editorChipStyle: React.CSSProperties = {
    ...styles.previewZoomChip,
    padding: isCompactEditorControls ? '6px 8px' : isNarrowEditorControls ? '6px 9px' : styles.previewZoomChip.padding,
  };
  const editorGridInputStyle: React.CSSProperties = {
    ...styles.gridSizeNumberInput,
    width: isNarrowEditorControls ? '56px' : '64px',
    marginLeft: isNarrowEditorControls ? 'auto' : 0,
    border: 'none',
    borderRadius: 0,
    background: 'transparent',
    color: editorCandy.cyan,
    padding: 0,
    boxShadow: 'none',
    textAlign: 'right',
    height: 'auto',
  };
  const editorWidthControlRowStyle: React.CSSProperties = {
    ...styles.gridSizeControlRow,
    display: 'flex',
    alignItems: 'center',
    gap: isNarrowEditorControls ? '6px' : '8px',
    width: '100%',
  };
  const gridSliderMarkerAreaStyle: React.CSSProperties = {
    ...styles.gridSliderMarkerArea,
    flex: 1,
    minWidth: 0,
    paddingTop: isCompactEditorControls ? '16px' : isNarrowEditorControls ? '17px' : styles.gridSliderMarkerArea.paddingTop,
    paddingBottom: isCompactEditorControls ? '16px' : isNarrowEditorControls ? '17px' : styles.gridSliderMarkerArea.paddingBottom,
  };
  const gridSliderTrackStyle: React.CSSProperties = {
    ...styles.gridSizeSlider,
    width: '100%',
  };
  const editorPresetRowStyle: React.CSSProperties = {
    ...styles.gridPresetRow,
    gap: isCompactEditorControls ? '6px' : '8px',
  };
  const isCompactFloatingPanel = viewportWidth <= 360;
  const floatingUtilityStackStyle: React.CSSProperties = {
    ...styles.floatingUtilityStack,
    top: isCompactFloatingPanel ? '124px' : styles.floatingUtilityStack.top,
    left: isCompactFloatingPanel ? '6px' : styles.floatingUtilityStack.left,
    gap: isCompactFloatingPanel ? '6px' : styles.floatingUtilityStack.gap,
  };
  const floatingEditBtnStyle: React.CSSProperties = {
    ...styles.floatingEditBtn,
    width: isCompactFloatingPanel ? '40px' : styles.floatingEditBtn.width,
    minHeight: isCompactFloatingPanel ? '40px' : styles.floatingEditBtn.minHeight,
    left: isCompactFloatingPanel ? '6px' : styles.floatingEditBtn.left,
    top: isCompactFloatingPanel ? '72px' : styles.floatingEditBtn.top,
  };
  const floatingUtilityBtnStyle: React.CSSProperties = {
    ...styles.floatingUtilityBtn,
    width: isCompactFloatingPanel ? '40px' : styles.floatingUtilityBtn.width,
    minHeight: isCompactFloatingPanel ? '40px' : styles.floatingUtilityBtn.minHeight,
  };
  const drawerPanelStyle: React.CSSProperties = {
    ...styles.drawerPanel,
    left: isCompactFloatingPanel ? '8px' : styles.drawerPanel.left,
    right: isCompactFloatingPanel ? '8px' : styles.drawerPanel.right,
    bottom: isCompactFloatingPanel ? '78px' : styles.drawerPanel.bottom,
    padding: isCompactFloatingPanel ? '12px' : styles.drawerPanel.padding,
    gap: isCompactFloatingPanel ? '10px' : styles.drawerPanel.gap,
    maxHeight: isCompactFloatingPanel ? '44vh' : styles.drawerPanel.maxHeight,
  };
  const drawerPanelHeaderStyle: React.CSSProperties = {
    ...styles.drawerPanelHeader,
    flexWrap: isCompactFloatingPanel ? 'wrap' : 'nowrap',
  };
  const drawerPanelActionsStyle: React.CSSProperties = {
    ...styles.drawerPanelActions,
    width: isCompactFloatingPanel ? '100%' : undefined,
    justifyContent: isCompactFloatingPanel ? 'flex-end' : undefined,
  };

  return (

    <div ref={containerRef} style={styles.container}>

      {/* 闂傚倸鍊搁崐鎼佸磹瀹勬噴褰掑炊瑜夐弸鏍煛閸ャ儱鐏╃紒鎰殜閺岀喖鎮ч崼鐔哄嚒濠殿喛顫夐悡锟犲蓟瀹ュ牜妾ㄩ梺鍛婃尵閸犳牠鐛崘顏呭枂闁告洦鍓欓鎾剁磽娴ｅ湱鈽夋い鎴濇缁辩偤宕奸妷锔惧幗闁瑰吋鎯屽鈧ù婧垮灪閵囧嫰顢曢姀鈺傂﹀銈嗘磸閸庨潧鐣烽悢纰辨晬婵﹢纭搁崯瀣繆閻愵亜鈧牕螞娴ｈ鍙忛柕鍫濇噳閺嬪秹鏌曡箛瀣偓鏍煕閹达附鐓曟繝闈涙椤忊晠鏌嶈閸撴瑩鎮ラ悡搴ｆ殾闁圭増婢橀崘鈧銈嗗姉閸犲孩绂嶉悙顒佸弿婵妫楁晶鎵磼婢跺銇濋柡宀嬬磿娴狅妇鎷犻幓鎺濇綆闂備浇顕栭崰鎾诲垂閽樺鏆﹂柕濠忓缁♀偓闂佸憡娲︽禍鐐靛閸ф鈷掗柛灞剧懅椤︼妇绱撳鍜冭含閽樼喖鏌熼幑鎰靛殭缂佲偓閸屾稒鍙忔俊鐐额嚙娴滈箖鎮楀▓鍨珮闁稿锕悰顔嘉熼崗鐓庣彴闂佸憡鐟ラˇ钘壩涢悢鍏尖拻濞撴埃鍋撴繛浣冲洦鍋嬮柛鈩冦亗濞戞鏃堝椽娴ｈ娅?*/}

      <div style={styles.header}>

        <button style={styles.backBtn} onClick={() => (onBack ? onBack() : navigate(-1))}>

          <ArrowLeft size={20} weight="bold" />

        </button>

        <h1 style={styles.title}>编辑图案</h1>

        <div style={styles.headerPlaceholder} />

      </div>

      {/* Header闂傚倸鍊搁崐椋庣矆娓氣偓楠炲鏁撻悩顔瑰亾閸愵喖閱囬柣鏃傤焾瀵潡鎮楃憴鍕婵炲眰鍔庣划?*/}

      <div style={styles.headerSpacer} />

      {shouldShowImportReviewNotice && (
        <div style={styles.importReviewBanner}>
          <div style={styles.importReviewBannerHeader}>
            <div style={styles.importReviewBannerTitle}>\u5916\u90E8\u56FE\u7EB8\u5BFC\u5165\u7ED3\u679C</div>
            <div style={styles.importReviewBannerActions}>
              {importReviewIndices.length > 0 && (
                <button
                  style={styles.importReviewToggleBtn}
                  onClick={() => setShowImportRiskOverlay((current) => !current)}
                >
                  {showImportRiskOverlay ? '\u9690\u85CF\u98CE\u9669\u9AD8\u4EAE' : '\u663E\u793A\u98CE\u9669\u9AD8\u4EAE'}
                </button>
              )}
            </div>
          </div>
          <div style={styles.importReviewBannerText}>
            {importReviewSummary.count > 0
              ? `\u5EFA\u8BAE\u5148\u68C0\u67E5 ${importReviewSummary.count} \u683C\u9AD8\u98CE\u9669\u4F4D\u7F6E${importReviewSummary.preview ? `\uFF1A${importReviewSummary.preview}` : ''}`
              : '\u5EFA\u8BAE\u5148\u5FEB\u901F\u68C0\u67E5\u5173\u952E\u533A\u57DF\uFF0C\u518D\u5F00\u59CB\u5236\u4F5C\u3002'}
          </div>
          {importReviewIndices.length > 0 && (
            <div style={styles.importReviewNavigator}>
              <button
                type="button"
                style={styles.importReviewNavBtn}
                onClick={() => handleCycleImportReview(-1)}
              >
                上一个风险格
              </button>
              <button
                type="button"
                style={styles.importReviewNavBtnPrimary}
                onClick={() => focusImportReviewIndex(activeImportReviewIndex ?? importReviewIndices[0])}
              >
                {activeImportReviewPosition >= 0
                  ? `定位第 ${activeImportReviewPosition + 1} / ${importReviewIndices.length} 格${activeImportReviewCellLabel ? ` · ${activeImportReviewCellLabel}` : ''}`
                  : `定位风险格（共 ${importReviewIndices.length} 处）`}
              </button>
              <button
                type="button"
                style={styles.importReviewNavBtn}
                onClick={() => handleCycleImportReview(1)}
              >
                下一个风险格
              </button>
            </div>
          )}
        </div>
      )}



      {/* 闂傚倸鍊搁崐鐑芥倿閿曞倸绠栭柛顐ｆ礀绾惧潡鏌ｉ姀銏℃毄濞戞挸绉归弻鈥愁吋鎼粹€崇闂佸搫顑勭欢姘跺蓟閻旂厧绠查柟浼存涧濞堫厼鈹戦埥鍡椾簼闁挎洏鍨藉濠氬即閵忕娀鍞跺┑鐘绘涧濞村倸螞閻愬樊娓婚柕鍫濇噽缁犵儤绻涙径瀣灱闁诲繐顑夊娲传閸曞灚笑闂佽绻戠换鍫ャ€侀弮鍫晣闁靛骏绱曢崢鍛婄箾鏉堝墽绉い顐㈩槸閻ｅ嘲鐣濋埀顒勫焵椤掍緡鍟忛柛锝庡櫍瀹曟粓鎮㈤梹鎰畾闂佸壊鍋呭ú鏍嵁閵忊€茬箚闁靛牆鎷戝妤冪磼??- 闂傚倸鍊搁崐鎼佸磹瀹勬噴褰掑炊瑜夐弸鏍煛閸ャ儱鐏╃紒鎰殜閺岀喖鎮ч崼鐔哄嚒濠殿喛顫夐悡锟犲蓟瀹ュ牜妾ㄩ梺鍛婃尵閸犳牠鐛崘顏呭枂闁告洦鍓欓鎾剁磽娴ｅ湱鈽夋い鎴濇缁辩偤宕奸妷锔惧幗闁瑰吋鐣崹鍏肩珶濡偐纾界€广儱鎷戦煬顒傗偓娈垮枛椤攱淇婇幖浣哥厸闁稿本鐭花濠氭⒑閼姐倕孝婵炲眰鍊曢锝夘敆閳ь剟鍩為幋鐘亾閿濆骸浜滃ù鐙€鍨辩换娑欐綇閸撗勫仹闂佺儵鍓濋弻銊┾€﹂崶顒€绠涢柣妤€鐗嗛埀??*/}

      <div style={styles.previewSection}>

          {isProcessing ? (

            <div style={styles.loadingBox}>

              <div style={styles.loadingSpinner} />

              <p style={styles.loadingText}>正在重新生成图案，请稍候...</p>

            </div>

          ) : beadData ? (

            <InteractiveCanvas
              ref={interactiveCanvasRef}

              beadData={beadData}

              cellSize={cellSize}

              currentTool={currentTool}

              currentColor={currentColor}

              isEditMode={isEditMode}
              reviewHighlightedIndices={showImportRiskOverlay ? importReviewIndices : []}


              onBeadClick={handleBeadClick}

              onBeadDrag={handleBeadDrag}

              onDragEnd={handleDragEnd}

              onPickColor={handlePickColor}
              showControls={false}
              onScaleChange={setPreviewZoom}

            />

          ) : null}



          {/* 闂傚倸鍊搁崐鎼佸磹瀹勬噴褰掑炊瑜夐弸鏍煛閸ャ儱鐏╃紒鎰殜閺岀喖鎮ч崼鐔哄嚒闂佸憡鍨规慨鎾煘閹达附鍋愰悗鍦Т椤ユ繄绱撴担鍝勵€岄柛銊ョ埣瀵鏁愭径濠勵吅闂佹寧绻傞幉娑㈠箻缂佹鍘搁梺鍛婁緱閸犳宕愰幇鐗堢厸鐎光偓鐎ｎ剛鐦堥悗瑙勬礃鐢帟鐏掗柣鐐寸▓閳ь剙鍘栨竟鏇㈡⒑閸濆嫮鈻夐柛瀣у亾闂佺顑嗛幐鎼侊綖濠靛鏁嗛柛灞剧敖閵娾晜鈷戦柛婵嗗椤箓鏌涢弮鈧崹鍧楃嵁閸愵喖顫呴柕鍫濇噸缁卞爼姊洪棃娑辨▓闁搞劌纾划鍫ュ焵椤掑嫭鈷掑ù锝呮啞閹牊銇勯敂璇茬仸闁诡啫鍕瘈闁搞儜鍐偓顓㈡⒑缁夊棗瀚峰▓鏃堟煛鐎ｂ晝绐旈柡宀€鍠栭獮鎴﹀箛闂堟稒顔勬繝纰樻閸嬪懘鏁冮姀銈呰摕闁哄洢鍨归柋鍥ㄧ節闂堟稒绁╂俊顐ゅ仜椤啴濡堕崨顖滎唶闂佺粯鐗滈崢褔锝?- 婵犵數濮烽。钘壩ｉ崨鏉戠；闁告侗鍙庨悢鍡樹繆椤栨氨姣為柛瀣尭椤繈顢曢姀鐘点偖闁诲孩顔栭崳顕€宕戞繝鍥╁祦婵☆垰鍚嬬€氭岸鏌涘▎蹇ｆ▓婵☆偆鍠栧缁樼瑹閳ь剙顭囪閹囧幢濡炪垺绋戣灃闁告粈鐒﹂弲婊堟⒑閸撴彃浜濇繛鍙夛耿閸╂盯骞嬮敂钘変化闂佽鍘界敮鎺撲繆婵傚憡鐓涢悗锝庡亜閻忔挳鏌″畝瀣？闁逞屽墾缂嶅棙绂嶉崼鏇熷亗闁稿繒鈷堝▓浠嬫煟閹邦垰鐨虹紒鐘差煼閺岀喖顢欓悾宀€鐓夐梺鐟扮－閸嬨倖淇婇悜鑺ユ櫆缂佹稑顑勯幋鐑芥⒒閸屾艾鈧绮堟笟鈧獮鏍敃閿曗偓绾惧綊鏌涢锝嗙缁炬儳缍婇弻鈥愁吋鎼粹€茬爱闂佺顑嗛幐鎼侊綖濠靛鏁嗛柛灞剧敖閵娾晜鈷戦柛婵嗗椤箓鏌涢弮鈧崹鍧楃嵁閸愵喖顫呴柕鍫濇濞堛儵姊洪棃娑氬婵炲眰鍔岄悾宄懊洪鍛嫽婵炶揪绲介幉锟犲箚閸儲鐓曞┑鐘插€婚崺锝団偓瑙勬礃閸旀瑥顕ｆ禒瀣垫晝闁绘棁娓规竟?*/}

          {beadData && !isBackgroundMode && (
            <button
              type="button"
              style={floatingEditBtnStyle}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setShowPaletteSettings(false);
                
                handleEnterBackgroundMode();
              }}
              aria-label="进入去背景工具"
              title="进入去背景工具"
            >
              <span style={styles.floatingEditBtnPrimary}>抠图</span>
              <span style={styles.floatingEditBtnSecondary}>去背景</span>
            </button>
          )}
          {beadData && !isBackgroundMode && (
            <>
              {(showPaletteSettings || showColorStyleSettings) && (
                <div
                  style={styles.drawerBackdrop}
                  onClick={() => {
                    setShowPaletteSettings(false);
                    setShowColorStyleSettings(false);
                  }}
                />
              )}
              <div style={floatingUtilityStackStyle}>
                <button
                  style={{
                    ...floatingUtilityBtnStyle,
                    ...(showPaletteSettings ? styles.floatingUtilityBtnActive : {}),
                  }}
                  onClick={() => {
                    setShowColorStyleSettings(false);
                    setShowPaletteSettings((prev) => {
                      const next = !prev;
                      return next;
                    });
                  }}
                  aria-label="打开色系设置"
                >
                  <span style={styles.floatingUtilityPrimary}>色系</span>
                  <span style={styles.floatingUtilitySecondary}>配色</span>
                </button>
                <button
                  style={{
                    ...floatingUtilityBtnStyle,
                    ...(showColorStyleSettings ? styles.floatingUtilityBtnActive : {}),
                  }}
                  onClick={() => {
                    setShowPaletteSettings(false);
                    setShowColorStyleSettings((prev) => !prev);
                  }}
                  aria-label="打开颜色风格"
                >
                  <span style={styles.floatingUtilityPrimary}>风格</span>
                  <span style={styles.floatingUtilitySecondary}>颜色</span>
                </button>
                <button
                  style={{
                    ...floatingUtilityBtnStyle,
                  }}
                  onClick={() => {
                    setShowPaletteSettings(false);
                    setShowColorStyleSettings(false);
                    applyMirrorTransform('horizontal');
                  }}
                  aria-label="左右镜像"
                >
                  <span style={styles.floatingUtilityPrimary}>镜像</span>
                  <span style={styles.floatingUtilitySecondary}>翻转</span>
                </button>

              </div>

              {showPaletteSettings && (
                <div style={drawerPanelStyle}>
                  <div style={styles.drawerHandle} />
                  <div style={drawerPanelHeaderStyle}>
                    <div style={styles.drawerPanelTitleGroup}>
                      <Palette size={18} weight="fill" color={colors.bead.cyan} />
                      <div style={styles.drawerPanelTextGroup}>
                        <span style={styles.drawerPanelTitle}>色系设置</span>
                        <span style={styles.drawerPanelSummary}>
                          {useMyColors
                            ? <>当前仅使用我的颜色{myColorCount > 0 && <>，共 {myColorCount} 色</>}</>
                            : <>{officialPaletteOptions.find((item) => item.id === paletteMode)?.label || 'MARD 291 全色'} / 精简程度 {activeSimplifyOption?.label || '适中'}</>}
                        </span>
                      </div>
                    </div>
                    <div style={drawerPanelActionsStyle}>
                      <button style={styles.drawerPanelCloseBtn} onClick={() => setShowPaletteSettings(false)}>
                        ×
                      </button>
                    </div>
                  </div>

                  <div style={styles.paletteSection}>
                    <div style={styles.paletteSectionHeader}>
                      <span style={styles.paletteSectionTitle}>官方色库</span>
                    </div>
                    <div style={styles.colorCountTabs}>
                      {officialPaletteOptions.map((opt) => (
                        <button
                          key={opt.id}
                          style={{
                            ...styles.colorCountTab,
                            ...(paletteMode === opt.id ? styles.colorCountTabActive : {}),
                          }}
                          onClick={() => handleApplyPaletteMode(opt.id)}
                        >
                          <span>{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={styles.paletteSection}>
                    <div style={styles.paletteSectionHeader}>
                      <span style={styles.paletteSectionTitle}>个人库存</span>
                    </div>
                    <div style={styles.paletteSwitchRow}>
                      <div style={styles.paletteSwitchInfo}>
                        <span style={styles.paletteSwitchTitle}>我的颜色</span>
                        {myColorCount > 0 && (
                          <span style={styles.paletteSwitchBadge}>{myColorCount} 色</span>
                        )}
                      </div>
                      <div style={styles.paletteSwitchActions}>
                        <button style={styles.paletteManageBtn} onClick={() => setShowMyColorsModal(true)}>
                          管理
                        </button>
                        <button
                          style={{
                            ...styles.paletteUseBtn,
                            ...(useMyColors ? styles.paletteUseBtnActive : {}),
                          }}
                          onClick={() => handleApplyPaletteMode('my-colors')}
                        >
                          {useMyColors ? '使用中' : '启用'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div style={styles.paletteSection}>
                    <div style={styles.paletteSectionHeader}>
                      <span style={styles.paletteSectionTitle}>精简程度</span>
                    </div>
                    <div style={styles.colorCountTabs}>
                      {simplifyPresetOptions.map((opt) => (
                        <button
                          key={opt.id}
                          style={{
                            ...styles.colorCountTab,
                            ...(simplifyPreset === opt.id ? styles.colorCountTabActive : {}),
                          }}
                          onClick={() => handleApplySimplifyPreset(opt.id)}
                        >
                          <span>{opt.label}</span>
                          <span style={styles.colorCountDesc}>{opt.description}</span>
                        </button>
                      ))}
                    </div>
                    <div style={styles.paletteModeHint}>
                      在当前色库范围内控制图案复杂度，不代表官方色板方案。
                    </div>
                  </div>
                </div>
              )}

              {showColorStyleSettings && (
                <div style={drawerPanelStyle}>
                  <div style={styles.drawerHandle} />
                  <div style={drawerPanelHeaderStyle}>
                    <div style={styles.drawerPanelTitleGroup}>
                      <Palette size={18} weight="fill" color={colors.bead.green} />
                      <div style={styles.drawerPanelTextGroup}>
                        <span style={styles.drawerPanelTitle}>颜色风格</span>
                        <span style={styles.drawerPanelSummary}>
                          {saturationBoost === 0 ? '当前原图风格' : `当前鲜亮 ${saturationBoost}%`}
                        </span>
                      </div>
                    </div>
                    <div style={drawerPanelActionsStyle}>
                      <button style={styles.drawerPanelCloseBtn} onClick={() => setShowColorStyleSettings(false)}>
                        ×
                      </button>
                    </div>
                  </div>

                  <div style={editorPresetRowStyle}>
                    {SATURATION_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        style={{
                          ...styles.gridPresetChip,
                          ...(saturationBoost === preset.value ? styles.gridPresetChipActive : {}),
                        }}
                        onClick={() => handleRegenerateWithSaturation(preset.value)}
                      >
                        {preset.label}
                      </button>
                    ))}
                    <span style={styles.gridPresetHint}>多数图片先用推荐，再按需要微调</span>
                  </div>

                  <div style={styles.mergeSliderRow}>
                    <span style={styles.mergeLabel}>更接近原图</span>
                    <input
                      type="range"
                      min="0"
                      max="30"
                      value={saturationBoost}
                      onChange={(e) => setSaturationBoost(Number(e.target.value))}
                      onMouseUp={handleRegenerate}
                      onTouchEnd={handleRegenerate}
                      style={styles.slider}
                    />
                    <span style={styles.mergeLabel}>更鲜亮</span>
                  </div>
                </div>
              )}

            </>
          )}
        {!isBackgroundMode && (
        <>
        <div style={styles.controlPanel}>
          <div style={styles.controlItem}>
            <div style={styles.controlHeader}>
              <span style={styles.controlLabel}>预览缩放</span>
              <span style={styles.controlValue}>{Math.round(previewZoom.scale * 100)}%</span>
            </div>
            <div style={editorControlRowStyle}>
              <button style={editorStepButtonStyle} onClick={() => interactiveCanvasRef.current?.zoomOut()} disabled={!beadData}>-</button>
              <input
                type="range"
                min={Math.round(previewZoom.minScale * 100)}
                max={Math.round(previewZoom.maxScale * 100)}
                value={Math.round(previewZoom.scale * 100)}
                onChange={(e) => interactiveCanvasRef.current?.setZoomPercent(Number(e.target.value))}
                style={editorSliderStyle}
                disabled={!beadData}
              />
              <button style={editorStepButtonStyle} onClick={() => interactiveCanvasRef.current?.zoomIn()} disabled={!beadData}>+</button>
              <button style={editorChipStyle} onClick={() => interactiveCanvasRef.current?.fitToViewport()} disabled={!beadData}>适配</button>
              <button style={editorChipStyle} onClick={() => interactiveCanvasRef.current?.resetToActualSize()} disabled={!beadData}>1:1</button>
            </div>
          </div>

          <div style={{ ...styles.controlItem, paddingTop: '4px' }}>
            <div style={styles.controlHeader}>
              <span style={styles.controlLabel}>宽度</span>
              <input
                type="text"
                id="editor-grid-size-input"
                name="editor-grid-size"
                inputMode="numeric"
                pattern="[0-9]*"
                value={gridSizeInput}
                onChange={(e) => setGridSizeInput(e.target.value)}
                onBlur={handleGridSizeInputCommit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleGridSizeInputCommit();
                    (e.currentTarget as HTMLInputElement).blur();
                  }
                }}
                style={editorGridInputStyle}
                aria-label="宽度输入"
              />
            </div>
            <div style={editorWidthControlRowStyle}>
              <button style={editorStepButtonStyle} onClick={() => handleAdjustGridSize(-GRID_SIZE_STEP)} disabled={!beadData}>-</button>
              <div style={gridSliderMarkerAreaStyle}>
                {COMMON_BOARD_WIDTHS.map((preset, index) => {
                  const leftPercent = ((preset - GRID_SIZE_MIN) / (GRID_SIZE_MAX - GRID_SIZE_MIN)) * 100;
                  const isTop = index % 2 === 0;
                  return (
                    <div
                      key={preset}
                      style={{
                        ...styles.gridSliderMarkerAnchor,
                        left: `${leftPercent}%`,
                      }}
                    >
                      <button
                        type="button"
                        style={{
                          ...styles.gridSliderMarkerBtn,
                          minWidth: isNarrowEditorControls ? '28px' : styles.gridSliderMarkerBtn.minWidth,
                          height: isNarrowEditorControls ? '18px' : styles.gridSliderMarkerBtn.height,
                          padding: isNarrowEditorControls ? '0 4px' : styles.gridSliderMarkerBtn.padding,
                          fontSize: isNarrowEditorControls ? '9px' : styles.gridSliderMarkerBtn.fontSize,
                          top: isTop ? '0' : 'auto',
                          bottom: isTop ? 'auto' : '0',
                          ...(gridSize === preset ? styles.gridSliderMarkerBtnActive : {}),
                        }}
                        onClick={() => handleRegenerateWithGridSize(preset)}
                        disabled={!beadData}
                        aria-label={`选择 ${preset} 宽度`}
                      >
                        {preset}
                      </button>
                      <div
                        style={{
                          ...styles.gridSliderMarkerLine,
                          top: isTop ? (isNarrowEditorControls ? '16px' : '18px') : 'auto',
                          bottom: isTop ? 'auto' : (isNarrowEditorControls ? '16px' : '18px'),
                        }}
                      />
                    </div>
                  );
                })}
                <input
                  type="range"
                  min={GRID_SIZE_MIN}
                  max={GRID_SIZE_MAX}
                  step={GRID_SIZE_STEP}
                  value={gridSize}
                  onChange={(e) => setGridSize(Number(e.target.value))}
                  onMouseUp={handleRegenerate}
                  onTouchEnd={handleRegenerate}
                  style={gridSliderTrackStyle}
                  disabled={!beadData}
                />
              </div>
              <button style={editorStepButtonStyle} onClick={() => handleAdjustGridSize(GRID_SIZE_STEP)} disabled={!beadData}>+</button>
            </div>
          </div>

        </div>

        <div style={styles.actions}>
          <button
            style={styles.primaryBtn}
            onClick={handleStartMakingClick}
            disabled={!beadData}
          >
            <Play size={18} weight="fill" />
            保存并开始制作
          </button>
        </div>
        </>
        )}

      </div>

      {showColorPicker && (

        <ColorPicker

          colorCount={effectiveColorLimit}
          availableColors={activePaletteColors}

          selectedColor={currentColor}

          onSelectColor={handleSelectColor}

          onClose={() => setShowColorPicker(false)}

          recentColors={recentColors}

        />

      )}



      <MyColorsModal

        visible={showMyColorsModal}

        onClose={() => setShowMyColorsModal(false)}

        onSave={(selectedIds) => {

          setMyColorCount(selectedIds.length);
          setActiveCustomColorIds(selectedIds.length > 0 ? selectedIds : undefined);

          if (selectedIds.length === 0) {
            if (useMyColors) {
              setPaletteMode('mard-291');
            }
            lastAppliedParamsRef.current = {
              gridSize,
              saturationBoost,
              vibrancyPreference,
              colorCount,
              simplifyPreset,
            };
            processImage(true, {
              simplifyPreset,
              colorCount,
              paletteMode: useMyColors ? 'mard-291' : paletteMode,
              customColorIds: undefined,
            });
            return;
          }

          if (useMyColors) {
            lastAppliedParamsRef.current = {
              gridSize,
              saturationBoost,
              vibrancyPreference,
              colorCount,
              simplifyPreset,
            };
            processImage(true, {
              simplifyPreset,
              colorCount,
              paletteMode: 'my-colors',
              customColorIds: selectedIds,
            });
          }

        }}

      />



      {/* 闂傚倸鍊搁崐鎼佸磹瀹勬噴褰掑炊瑜夐弸鏍煛閸ャ儱鐏╃紒鎰殜閺岀喖鎮ч崼鐔哄嚒闂佸憡鍨规慨鎾煘閹达附鍋愰悗鍦Т椤ユ繄绱撴担鍝勵€岄柛銊﹀▕閸┾偓妞ゆ帒鍊归崵鈧柣搴㈠嚬閸樼晫绮╅悢鐓庡耿婵炲棙鍨归悡瀣⒑缁夊棗瀚峰▓鏇㈡煃闁垮鐏撮柟顔肩秺楠炰線骞掗幋婵愮€抽梻浣告惈椤戝棝宕归崸妤€钃熼柨娑樺閸嬫捇鏁愭惔婵囧枤闂佺粯鎸搁崥瀣€冮妷鈺傚€烽柤纰卞墰椤旀帡姊虹拠鈥虫灍缂侇喗鎹囬獮濠囨倷閸濆嫀銊╂煥閺冨倻鎽傚ù鐘欏洦鈷掗柛灞剧懅椤︼箓鏌熺喊鍗炰喊鐎规洘鍔欏畷濂稿即閻愮绱梻浣告惈缁嬩線宕戦埀顒勬煕?*/}
      <LoginModal
        visible={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={handleLoginSuccess}
        title="登录后再继续"
        message="登录后可保存方案并同步制作进度。"
      />



      {/* 闂傚倸鍊搁崐鎼佸磹瀹勬噴褰掑炊瑜夐弸鏍煛閸ャ儱鐏╃紒鎰殜閺岀喖鎮ч崼鐔哄嚒闂佸憡鍨规慨鎾煘閹达附鍋愰悗鍦Т椤ユ繄绱撴担鍝勵€岄柛銊ョ埣瀵鏁愭径濠勵吅闂佹寧绻傞幉娑㈠箻缂佹鍘搁梺鍛婁緱閸犳宕愰幇鐗堢厸閻忕偠顕ч埀顒佺箞閻涱喗绗熼埀顒勭嵁閹烘绠ｆ繝闈涙－濞笺儵姊婚崒娆戭槮闁圭⒈鍋婇幆澶嬬附缁嬭法鐛ラ梺鍝勭▉閸樺ジ鎷戦悢鍏肩厪濠电偟鍋撳▍鍡涙煕鐎ｎ亜顏柡灞剧☉閳藉顫滈崼婵嗩潬濠电偛顕崢褏鈧碍婢橀～蹇斻偊鐟併倓姹楅梺鍦劋缁诲啴藟閺嶎厽鈷戠紒瀣硶缁犳煡鏌ㄩ弴妯虹仼妞ゆ洩缍侀、鏇㈡晝閳ь剛绮绘繝姘仯闁搞儜鍐獓濡炪們鍎茬换鍫濐潖濞差亝顥堟繛鎴炶壘椤ｅ搫鈹戦埥鍡椾簼妞ゃ劌锕妴渚€寮崼婵嬪敹闂佸搫娲ㄩ崯鍧楀箯濞差亝鐓熼柣妯哄帠閼割亪鏌涢弬璺ㄧ劯鐎殿喗鎮傞獮瀣晜閻ｅ苯骞愰梺璇插嚱缂嶅棙绂嶉崼鏇熷亗闁稿繒鈷堝▓?*/}
      <SaveProjectModal
        visible={showSaveModal}
        onSave={handleSaveProject}
        title="保存方案"
        onCancel={handleCancelSave}
        message="给这份拼豆方案起个名字，方便稍后继续制作。"
        loading={isSaving}
        isLoggedIn={isLoggedIn}
      />



      {/* 闂傚倸鍊搁崐鎼佸磹瀹勬噴褰掑炊瑜夐弸鏍煛閸ャ儱鐏╃紒鎰殜閺岀喖鎮ч崼鐔哄嚒闂佸憡鍨规慨鎾煘閹达附鍋愰悗鍦Т椤ユ繄绱撴担鍝勵€岄柛銊ョ埣瀵鏁愭径濠勵吅闂佹寧绻傞幉娑㈠箻缂佹鍘搁梺鍛婁緱閸犳宕愰幇鐗堢厸鐎光偓鐎ｎ剛鐦堥悗瑙勬礃鐢帟鐏掗柣鐐寸▓閳ь剙鍘栨竟鏇㈡⒑閸濆嫮鈻夐柛瀣у亾闂佺顑嗛幐鎼侊綖濠靛鏁嗛柛灞剧敖閵娾晜鈷戦柛婵嗗椤箓鏌涢弮鈧崹鍧楃嵁閸愵喖顫呴柕鍫濇噹缁愭稒绻濋悽闈浶㈤悗姘间簽濡叉劙寮撮姀鈾€鎷绘繛杈剧到閹芥粎绮旈悜妯镐簻闁靛闄勫畷宀€鈧娲橀〃鍛达綖濠婂牆鐒垫い鎺嗗亾妞?*/}



      {/* 闂傚倸鍊搁崐鎼佸磹瀹勬噴褰掑炊瑜夐弸鏍煛閸ャ儱鐏╃紒鎰殜閺岀喖骞戦幇闈涙缂佺虎鍘搁崑鎾绘⒒娴ｇ瓔娼愰柛搴″悑閹便劑濡舵径濠勶紵閻庡厜鍋撻柛鏇ㄥ墰閸樺崬鈹戦悙鏉戠仸闁挎洦鍋勯蹇涘Ψ閿旇桨绨婚棅顐㈡处閹搁箖宕洪敐鍡樺弿濠电姴鎳忛鐘绘煙閻熸澘顏┑鈩冩倐婵＄兘鏁傞崣銉ф晼婵犵數濮烽。钘壩ｉ崨鏉戠；闁告洦鍘搁崑鎾愁潩椤撶喓鍑￠梺浼欑悼閸忔﹢寮幘缁樺亹闁圭粯甯掔粊顕€姊绘笟鈧褏鎹㈤崱娑樼婵犻潧妫岄弸宥夋煏韫囧鈧牠鍩涢幋锔界厱婵犻潧妫楅鈺呮煃瑜滈崜娆撴偉閻撳海鏆﹂柟鐗堟緲閸愨偓濡炪倖鍔楅崰搴㈢閻愵剚鍙忔慨妤€妫楁晶鎵磼婢跺銇濋柡宀嬬磿娴狅妇鎷犻幓鎺濇綆闂備浇顕栭崰鎾诲垂閽樺鏆﹂柕濠忓缁♀偓闂佸憡娲︽禍鐐靛閸ф鈷?*/}

      {beadData && (

        <ShoppingListModal

          visible={showShoppingList}

          onClose={() => setShowShoppingList(false)}

          items={statistics.map(s => ({

            id: s.color.id,

            name: s.color.name,

            nameCN: s.color.nameCN,

            hex: s.color.hex,

            count: s.count,

            percentage: s.percentage,

          }))}

          gridSize={{ width: beadData.width, height: beadData.height }}

          brand={dominantBrand}

        />

      )}



      {/* 闂傚倸鍊搁崐鎼佸磹瀹勬噴褰掑炊瑜夐弸鏍煛閸ャ儱鐏╃紒鎰殜閺岀喖鎮ч崼鐔哄嚒闂佸憡鍨规慨鎾煘閹达附鍋愰悗鍦Т椤ユ繄绱撴担鍝勵€岄柛銊ョ埣瀵鏁愭径濠勵吅闂佹寧绻傞幉娑㈠箻缂佹鍘搁梺鍛婁緱閸犳宕愰幇鐗堢厸閻忕偟顭堟晶鑼偓鍨緲鐎氼噣鍩€椤掑﹦绉甸柛瀣瀹曟瑩鏁撻悩鏂ユ嫼闁荤姴娲犻埀顒冩珪閻忓牆鈹戦悙宸殶闁稿繑锕㈤悰顔跨疀濞戞瑥浜规繛鎾村嚬閸ㄨ鲸鐡忛梻鍌欐祰椤曆呪偓娑掓櫊閹虫繈宕滆缁€濠傗攽閻樺弶鎼愰柦鍐枛閺屾洘绻涢悙顒佺彆闂佺顑呯€氫即寮诲☉妯锋婵鐗嗘慨娑欑箾鐎电甯堕悗姘緲椤繑銈︾憗銈勬睏闂佸湱鍎ょ换鍐夐弽顓熲拺缂佸娉曠粻鏌ユ煥閺囨ê鐏╂い鏇秮椤㈡洟鏁冮埀顒傜不婵犳碍鍋ｉ柛銉戝啰楠囧銈冨劜缁诲牆顫忓ú顏咁棃婵炴垶鑹鹃。鍝勨攽閳藉棗浜濇い銊ワ躬閵?*/}




      {/* 缂傚倸鍊搁崐鎼佸磹閹间礁纾归柣鎴ｅГ閸ゅ嫰鏌涢锝嗙缂佹劖顨堥埀顒€绠嶉崕鍗灻洪妸鈺佺婵鍩栭悡娆戠磽娴ｉ潧鐏╅柡瀣枛閺岋綁骞橀崡鐐插Е闂佸搫鐭夌紞浣割嚕椤掑嫬绠伴幖绮瑰墲濞堟﹢姊绘担绛嬪殭婵炲瓨宀稿畷鎶芥晲婢跺﹨鎽曢梺缁樻煥婢瑰﹤危瑜版帒绠圭紒顔煎帨閸嬫捇宕橀懠顒夊悈闂傚倸鍊峰ù鍥ь浖閵娾晜鍊块柨鏇炲€哥粻鏌ユ煕閵夋垵鑻▓銊ヮ渻閵堝棗绗掗悗姘煎墮濞插潡姊绘担铏广€婇柛鎾寸箞閵嗗啳绠涢弬娆惧殼?*/}

      <Modal {...modalProps} />

      {/* 闂傚倸鍊搁崐鎼佸磹瀹勬噴褰掑炊瑜夐弸鏍煛閸ャ儱鐏╃紒鎰殜閺岀喖鎮ч崼鐔哄嚒闂佸憡鍨规慨鎾煘閹达附鍋愰悗鍦Т椤ユ繄绱撴担鍝勵€岄柛銊ョ埣瀵鏁愭径濠勵吅闂佹寧绻傞幉娑㈠箻缂佹鍘搁梺鍛婁緱閸犳宕愰幇鐗堢厸鐎光偓鐎ｎ剛鐦堥悗瑙勬礃鐢帟鐏掗柣鐐寸▓閳ь剙鍘栨竟鏇㈡⒑閸濆嫮鈻夐柛瀣у亾闂佺顑嗛幐鎼侊綖濠靛鏁嗛柛灞剧敖閵娾晜鈷戦柛婵嗗椤箓鏌涢弮鈧崹鍧楃嵁閸愵喖顫呴柕鍫濇噹缁愭稒绻濋悽闈浶㈤悗姘间簽濡叉劙寮撮姀鈾€鎷绘繛杈剧到閹芥粎绮旈悜妯镐簻闁靛闄勫畷宀€鈧娲橀〃鍛达綖濠婂牆鐒垫い鎺嗗亾妞ゆ洩缍侀、鏇㈡晝閳ь剛绮绘繝姘仯闁搞儜鍐獓濡炪們鍎茬换鍫濐潖濞差亝顥堟繛鎴炶壘椤ｅ搫鈹戦埥鍡椾簼妞ゃ劌锕妴渚€寮崼鐔锋疂闂佺绻愰幗婊呯不濮橆剦娓婚柕鍫濇婢ь剟鏌曢崶銊ф创鐎规洘鍨块獮妯虹暦閸ャ劍顔曢梻浣规偠閸庮噣寮查埡鍛哗闁靛ň鏅滈埛鎺楁煕鐏炲墽鎳勭紒浣哄缁绘稒寰勭€ｎ偆顦伴悗瑙勬磻閸楁娊鐛崶顒€绾ч柛顭戝枛濞堛倕鈹戦悩鍨毄濠殿喚鏁婚幊婵嬪礈瑜忔稉宥嗐亜閺嶎偄浠﹂柣鎾跺枛閺岀喐娼忛崜褍鍩岄悶姘哺濮婃椽宕崟顒€娅ら梺璇″枛閸婂灝顕ｆ繝姘櫢闁绘灏欓敍婊冣攽閳藉棗鐏ラ柕鍡忓亾闂佺顑嗛幑鍥ь嚕娴犲鏁冮柣鏃囨腹婢??*/}

      {isBackgroundMode && beadData && bgPreviewBeadData && (
        <div style={styles.bgModeOverlay}>
          <div style={styles.bgModeHeader}>
            <button style={styles.bgModeBackBtn} onClick={handleExitBackgroundMode}>
              <ArrowLeft size={18} weight="bold" />
            </button>
            <span style={styles.bgModeTitle}>背景处理模式</span>
            {getBgHighlightedIndices().length > 0 && (
              <span style={styles.bgModeCount}>
                {bgSelectionSource === 'auto'
                  ? '已圈出 ' + getBgHighlightedIndices().length + ' 格背景'
                  : '已选中 ' + getBgHighlightedIndices().length + ' 格'}
              </span>
            )}
          </div>

          <div style={styles.bgModePreview}>
            <button
              style={{
                ...styles.bgModePreviewFloatingBtn,
                ...(bgPanMode ? styles.bgModePreviewFloatingBtnActive : {}),
              }}
              onClick={handleBgTogglePanMode}
              aria-label={bgPanMode ? '切换到选背景' : '切换到移动画面'}
            >
              {bgPanMode ? '选背景' : '移动画面'}
            </button>
            <InteractiveCanvas
              ref={bgInteractiveCanvasRef}
              beadData={bgPreviewBeadData}
              cellSize={cellSize}
              currentTool="picker"
              currentColor={null}
              isEditMode={!isBgComparingBefore}
              highlightedColorId={isBgComparingBefore ? null : bgSelectedColorId}
              bgModeHighlightedIndices={isBgComparingBefore ? [] : getBgHighlightedIndices()}
              bgModeExcludedIndices={isBgComparingBefore ? new Set<number>() : bgExcludedIndices}
              bgModeRecoverableIndices={isBgComparingBefore ? new Set<number>() : bgRecoverableIndices}
              bgCandidateOnly={!isBgComparingBefore && bgCandidateOnly}
              isBackgroundMode={true}
              bgViewMode={isBgComparingBefore ? 'view' : bgViewMode}
              backgroundPanEnabled={!isBgComparingBefore && bgPanMode}
              onBgSelectColor={handleBgSelectColor}
              onBgToggleExclude={handleBgToggleExclude}
              onBgRestoreCell={handleBgRestoreSingleCell}
              onBgManualErase={handleBgManualEraseCell}
              onBeadClick={() => {}}
              onBeadDrag={() => {}}
              onDragEnd={() => {}}
              onPickColor={() => {}}
              showControls={false}
              onScaleChange={setPreviewZoom}
              backgroundModeFillParent={true}
            />
          </div>

          <div style={styles.bgModeZoomPanel}>
            <div style={styles.controlHeader}>
              <span style={styles.controlLabel}>预览缩放</span>
              <span style={styles.controlValue}>{Math.round(previewZoom.scale * 100)}%</span>
            </div>
            <div style={editorControlRowStyle}>
              <button
                style={editorStepButtonStyle}
                onClick={() => bgInteractiveCanvasRef.current?.zoomOut()}
                disabled={!bgPreviewBeadData}
              >
                -
              </button>
              <input
                type="range"
                min={Math.round(previewZoom.minScale * 100)}
                max={Math.round(previewZoom.maxScale * 100)}
                value={Math.round(previewZoom.scale * 100)}
                onChange={(e) => bgInteractiveCanvasRef.current?.setZoomPercent(Number(e.target.value))}
                style={editorSliderStyle}
                disabled={!bgPreviewBeadData}
              />
              <button
                style={editorStepButtonStyle}
                onClick={() => bgInteractiveCanvasRef.current?.zoomIn()}
                disabled={!bgPreviewBeadData}
              >
                +
              </button>
              <button
                style={editorChipStyle}
                onClick={() => bgInteractiveCanvasRef.current?.fitToViewport()}
                disabled={!bgPreviewBeadData}
              >
                适配
              </button>
              <button
                style={editorChipStyle}
                onClick={() => bgInteractiveCanvasRef.current?.resetToActualSize()}
                disabled={!bgPreviewBeadData}
              >
                1:1
              </button>
            </div>
          </div>

          <div style={styles.bgModeActions}>
            <div style={styles.bgModePrimaryActionRow}>
              <button
                type="button"
                aria-label="回退一步选择"
                title="回退一步选择"
                style={styles.bgModeHistoryBtn}
                onClick={handleBgUndoStep}
                disabled={!(
                  (bgSelectionSource === 'manual' && bgManualSelections.length > 0) ||
                  (bgSelectionSource === 'auto' && bgAutoIndices.length > 0) ||
                  canUndo
                )}
              >
                <ArrowCounterClockwise size={16} weight="bold" />
                <span>回退一步</span>
              </button>
              <button
                style={styles.bgModeConfirmBtn}
                onClick={handleBgConfirmTransparent}
                disabled={getBgHighlightedIndices().length === 0}
              >
                确定
              </button>
              <button
                style={styles.bgModeExitBtn}
                onClick={handleBgQuickRemove}
                disabled={!bgPreviewBeadData}
              >
                一键去背景
              </button>
            </div>
          </div>
        </div>
      )}


    </div>

  );

};



const editorCandy = {
  bg: '#fdf7f1',
  bgSoft: '#fff1e7',
  panel: 'rgba(255,255,255,0.9)',
  panelStrong: '#ffffff',
  surface: '#fff7ef',
  border: 'rgba(255, 186, 161, 0.34)',
  borderStrong: 'rgba(95, 200, 255, 0.38)',
  text: '#4b3f5f',
  textSoft: '#7f7293',
  textMuted: '#a093af',
  cyan: '#4faee1',
  lavender: '#8f72ff',
  shadow: '0 16px 36px rgba(255, 188, 154, 0.14)',
};

const styles: Record<string, React.CSSProperties> = {

  container: {

    height: '100vh',

    display: 'flex',

    flexDirection: 'column',

    background: `linear-gradient(180deg, ${editorCandy.bg} 0%, ${editorCandy.bgSoft} 100%)`,

    overflowY: 'auto',

    overflowX: 'hidden',

    overscrollBehaviorX: 'none',

  },




  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 16px',
    background: 'rgba(255,255,255,0.84)',
    borderBottom: '1px solid ' + editorCandy.border,
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },



  headerSpacer: {

    height: '50px',

  },

  importReviewBanner: {

    margin: '0 16px 12px',

    padding: '12px 14px',

    borderRadius: radius.button,

    background: 'rgba(255, 191, 71, 0.14)',

    border: '1px solid rgba(255, 191, 71, 0.28)',

    display: 'flex',

    flexDirection: 'column',

    gap: '6px',

  },

  importReviewBannerHeader: {

    display: 'flex',

    alignItems: 'center',

    justifyContent: 'space-between',

    gap: '12px',

  },

  importReviewBannerActions: {

    display: 'flex',

    alignItems: 'center',

    gap: '8px',

    flexWrap: 'wrap',

    justifyContent: 'flex-end',

  },

  importReviewBannerTitle: {

    fontSize: typography.fontSize.sm,

    fontWeight: typography.fontWeight.bold,

    fontFamily: typography.fontFamilyAlt,

    color: colors.bead.orange,

  },

  importReviewToggleBtn: {

    padding: '6px 10px',

    borderRadius: radius.full,

    border: '1px solid rgba(255, 107, 107, 0.28)',

    background: 'rgba(255, 255, 255, 0.72)',

    color: colors.bead.red,

    fontSize: typography.fontSize.xs,

    fontWeight: typography.fontWeight.semibold,

    fontFamily: typography.fontFamilyAlt,

    cursor: 'pointer',

    flexShrink: 0,

  },

  importReviewBannerText: {

    fontSize: typography.fontSize.xs,

    lineHeight: 1.6,

    color: colors.text.secondary,

    fontFamily: typography.fontFamilyAlt,

  },

  importReviewNavigator: {

    display: 'grid',

    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',

    gap: '8px',

  },

  importReviewNavBtn: {

    minHeight: '36px',

    padding: '8px 10px',

    borderRadius: radius.button,

    border: '1px solid rgba(255, 191, 71, 0.36)',

    background: 'rgba(255, 255, 255, 0.82)',

    color: colors.text.primary,

    fontSize: typography.fontSize.xs,

    fontWeight: typography.fontWeight.semibold,

    fontFamily: typography.fontFamilyAlt,

    cursor: 'pointer',

  },

  importReviewNavBtnPrimary: {

    minHeight: '36px',

    padding: '8px 10px',

    borderRadius: radius.button,

    border: '1px solid rgba(255, 107, 107, 0.28)',

    background: 'linear-gradient(145deg, rgba(255, 142, 122, 0.92), rgba(255, 107, 107, 0.92))',

    color: '#ffffff',

    fontSize: typography.fontSize.xs,

    fontWeight: typography.fontWeight.semibold,

    fontFamily: typography.fontFamilyAlt,

    cursor: 'pointer',

    boxShadow: shadows.sm,

  },



  backBtn: {

    ...mixins.backButton,

  },



  title: {

    fontSize: typography.fontSize.lg,

    fontWeight: typography.fontWeight.bold,

    fontFamily: typography.fontFamilyAlt,

    background: colors.gradients.primary,

    WebkitBackgroundClip: 'text',

    WebkitTextFillColor: 'transparent',

    backgroundClip: 'text',

    margin: 0,

  },




  headerPlaceholder: {

    width: '40px',

    height: '40px',

  },




  previewSection: {
    padding: '8px 10px 6px',

    background: 'linear-gradient(180deg, rgba(255,255,255,0.86) 0%, rgba(255,244,234,0.9) 100%)',

    borderBottom: '1px solid ' + editorCandy.border,

    position: 'sticky',

    top: '50px', // header 闂傚倸鍊搁崐鎼佸磹瀹勬噴褰掑炊瑜夐弸鏍煛閸ャ儱鐏╃紒鎰殜閺岀喖鎮欓浣典户闂佽桨绀侀崐褰掑Φ閸曨喚鐤€闁圭偓鎯屽Λ鈩冪節濞堝灝鐏犻柕鍫熸倐楠炲啫鐣￠幍铏€婚棅顐㈡处閹尖晜绂掗悡搴富?

    zIndex: 98,

  },



  toolbarWrapper: {

    padding: '6px 10px',

    background: 'rgba(255,255,255,0.82)',

    borderBottom: '1px solid ' + editorCandy.border,

  },



  content: {

    flex: 'none',

    padding: '6px 12px 8px',

    overscrollBehaviorX: 'none',

  },



  loadingBox: {

    display: 'flex',

    flexDirection: 'column',

    alignItems: 'center',

    justifyContent: 'center',

    padding: '60px 20px',

    background: editorCandy.panel,

    borderRadius: radius.card,

    gap: '12px',

  },



  loadingSpinner: {

    width: '40px',

    height: '40px',

    border: "3px solid " + colors.bead.cyan + "30",

    borderTopColor: colors.bead.cyan,

    borderRadius: '50%',

    animation: 'spin 1s linear infinite',

  },



  loadingText: {

    fontSize: typography.fontSize.sm,

    fontFamily: typography.fontFamilyAlt,

    color: editorCandy.textSoft,

    margin: 0,

  },



  infoRow: {

    display: 'flex',

    alignItems: 'center',

    justifyContent: 'space-between',

    marginTop: '8px',

    padding: '0 4px',

  },




  sizeInfoGroup: {

    display: 'flex',

    flexDirection: 'column',

    gap: '4px',

  },



  sizeInfo: {

    display: 'flex',

    alignItems: 'center',

    gap: '6px',

    fontSize: typography.fontSize.xs,

    fontFamily: typography.fontFamilyAlt,

    color: editorCandy.textMuted,

  },



  boardRecommendation: {

    display: 'flex',

    alignItems: 'center',

    gap: '6px',

  },



  boardBadge: {

    padding: '2px 6px',

    background: "linear-gradient(135deg, " + colors.bead.cyan + "40, " + colors.bead.purple + "40)",

    borderRadius: radius.bead,

    fontSize: '10px',

    fontWeight: typography.fontWeight.bold,

    fontFamily: typography.fontFamilyAlt,

    color: editorCandy.cyan,

  },



  boardText: {

    fontSize: '10px',

    fontFamily: typography.fontFamilyAlt,

    color: editorCandy.textSoft,

  },



  editModeBtn: {

    display: 'flex',

    alignItems: 'center',

    justifyContent: 'center',

    gap: '3px',

    padding: '4px 8px',

    background: 'rgba(255,255,255,0.88)',

    border: '1px solid ' + editorCandy.border,

    borderRadius: radius.button,

    cursor: 'pointer',

    transition: animation.transition.fast,

    fontSize: '11px',

    fontWeight: typography.fontWeight.semibold,

    fontFamily: typography.fontFamilyAlt,

    color: editorCandy.textSoft,

    flexShrink: 0,

  },



  editModeBtnActive: {

    background: "linear-gradient(145deg, " + colors.bead.orange + ", " + colors.bead.red + ")",

    border: '1px solid ' + colors.bead.orange,

    color: '#ffffff',

    boxShadow: "0 0 6px " + colors.bead.orange + "50",

  },




  floatingEditBtn: {
    position: 'absolute',
    top: '72px',
    left: '8px',
    width: '48px',
    minHeight: '48px',
    padding: '6px 4px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '2px',
    background: 'linear-gradient(145deg, #8ddfc3, #77d6ff)',
    border: 'none',
    borderRadius: radius.button,
    color: '#ffffff',
    cursor: 'pointer',
    boxShadow: '0 10px 22px rgba(119, 214, 255, 0.28)',
    zIndex: 10,
    transition: animation.transition.fast,
  },

  floatingEditBtnPrimary: {
    fontSize: '11px',
    lineHeight: 1,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyAlt,
    color: '#ffffff',
  },

  floatingEditBtnSecondary: {
    fontSize: '8px',
    lineHeight: 1,
    fontFamily: typography.fontFamilyAlt,
    color: 'rgba(255,255,255,0.88)',
  },

  floatingUtilityStack: {
    position: 'absolute',
    top: '128px',
    left: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    zIndex: 11,
  },

  drawerBackdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(49, 35, 74, 0.12)',
    zIndex: 18,
  },

  floatingUtilityBtn: {
    width: '48px',
    minHeight: '48px',
    padding: '6px 4px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '2px',
    background: 'linear-gradient(145deg, rgba(135, 223, 255, 0.98), rgba(176, 168, 255, 0.98))',
    color: '#ffffff',
    border: 'none',
    borderRadius: radius.button,
    boxShadow: '0 10px 22px rgba(143, 114, 255, 0.16)',
    cursor: 'pointer',
    transition: animation.transition.fast,
  },

  floatingUtilityBtnActive: {
    background: 'linear-gradient(145deg, rgba(255, 198, 143, 0.98), rgba(255, 151, 189, 0.98))',
    boxShadow: '0 4px 12px rgba(255, 132, 112, 0.32)',
  },

  floatingUtilityPrimary: {
    fontSize: '11px',
    fontFamily: typography.fontFamilyAlt,
    fontWeight: typography.fontWeight.bold,
    lineHeight: 1,
    color: '#ffffff',
  },

  floatingUtilitySecondary: {
    fontSize: '8px',
    fontFamily: typography.fontFamilyAlt,
    lineHeight: 1,
    color: 'rgba(255,255,255,0.88)',
  },

  drawerPanel: {
    position: 'fixed',
    left: '16px',
    right: '16px',
    bottom: '92px',
    maxHeight: '48vh',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    background: 'rgba(255, 251, 247, 0.98)',
    border: '1px solid rgba(154, 214, 255, 0.55)',
    borderRadius: '24px',
    boxShadow: '0 20px 48px rgba(149, 116, 195, 0.18)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    overflowY: 'auto',
    zIndex: 19,
  },

  drawerHandle: {
    width: '46px',
    height: '5px',
    alignSelf: 'center',
    background: 'rgba(152, 171, 214, 0.6)',
    borderRadius: '999px',
  },

  drawerPanelHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '4px',
  },

  drawerPanelTitleGroup: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    minWidth: 0,
  },

  drawerPanelTextGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    minWidth: 0,
  },

  drawerPanelTitle: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: editorCandy.text,
  },

  drawerPanelSummary: {
    fontSize: typography.fontSize.xs,
    color: editorCandy.textMuted,
    fontFamily: typography.fontFamilyAlt,
  },

  drawerPanelActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexShrink: 0,
  },

  drawerPanelCloseBtn: {
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255, 241, 231, 0.96)',
    border: '1px solid ' + editorCandy.border,
    borderRadius: radius.bead,
    color: editorCandy.textSoft,
    cursor: 'pointer',
    flexShrink: 0,
  },

  statsOverviewCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '10px 12px',
    background: 'rgba(255, 248, 241, 0.92)',
    border: '1px solid ' + editorCandy.border,
    borderRadius: radius.button,
  },

  statsOverviewRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px',
    flexWrap: 'wrap',
  },

  statsOverviewLabel: {
    fontSize: typography.fontSize.xs,
    color: editorCandy.textMuted,
    fontFamily: typography.fontFamilyAlt,
  },

  statsOverviewValue: {
    fontSize: typography.fontSize.sm,
    color: editorCandy.text,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
  },

  floatingStatsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    overflowY: 'auto',
    paddingRight: '2px',
  },


  slidePanel: {

    position: 'absolute',

    top: '8px',

    left: '8px',

    width: '52px',

    background: 'rgba(30, 30, 40, 0.75)',

    backdropFilter: 'blur(12px)',

    WebkitBackdropFilter: 'blur(12px)',

    borderRadius: radius.card,

    boxShadow: editorCandy.shadow,

    border: '1px solid rgba(255, 255, 255, 0.1)',

    display: 'flex',

    flexDirection: 'column',

    zIndex: 20,

    overflow: 'hidden',

  },



  slidePanelHeader: {

    display: 'flex',

    alignItems: 'center',

    justifyContent: 'center',

    padding: '4px',

    borderBottom: "1px solid rgba(255,255,255,0.1)",

  },



  slidePanelTitle: {

    fontSize: '9px',

    fontFamily: typography.fontFamilyAlt,

    fontWeight: typography.fontWeight.bold,

    color: editorCandy.textSoft,

  },



  slidePanelClose: {

    width: '20px',

    height: '20px',

    display: 'flex',

    alignItems: 'center',

    justifyContent: 'center',

    background: 'rgba(255, 255, 255, 0.15)',

    border: 'none',

    borderRadius: '50%',

    color: '#ffffff',

    fontSize: '10px',

    cursor: 'pointer',

  },



  slidePanelTools: {

    display: 'flex',

    flexDirection: 'column',

    alignItems: 'center',

    padding: '6px 4px',

    gap: '4px',

  },



  slidePanelColorBtn: {

    display: 'flex',

    flexDirection: 'column',

    alignItems: 'center',

    gap: '2px',

    padding: '4px',

    background: 'transparent',

    border: 'none',

    cursor: 'pointer',

  },



  slidePanelColorPreview: {

    width: '24px',

    height: '24px',

    borderRadius: radius.bead,

    boxShadow: "inset 0 2px 4px rgba(0,0,0,0.2)",

    border: '2px solid rgba(255,255,255,0.3)',

  },



  slidePanelColorLabel: {

    fontSize: '7px',

    fontFamily: typography.fontFamilyAlt,

    color: '#ffffff',

  },



  slidePanelToolGroup: {

    display: 'flex',

    flexDirection: 'column',

    gap: '4px',

    width: '100%',

  },



  slidePanelToolBtn: {

    display: 'flex',

    flexDirection: 'column',

    alignItems: 'center',

    gap: '1px',

    padding: '4px 2px',

    background: 'rgba(255, 255, 255, 0.1)',

    border: 'none',

    borderRadius: radius.bead,

    cursor: 'pointer',

    transition: animation.transition.fast,

  },



  slidePanelToolBtnActive: {

    background: "linear-gradient(145deg, " + colors.bead.cyan + ", " + colors.bead.cyan + "cc)",

    boxShadow: "0 0 8px " + colors.bead.cyan + "50",

  },



  slidePanelToolIcon: {

    fontSize: '14px',

  },



  slidePanelToolLabel: {

    fontSize: '7px',

    fontFamily: typography.fontFamilyAlt,

    color: '#ffffff',

  },



  slidePanelHistoryGroup: {

    display: 'flex',

    gap: '2px',

    marginTop: '4px',

    justifyContent: 'center',

    width: '100%',

  },



  slidePanelHistoryBtn: {

    width: '16px',

    height: '16px',

    display: 'flex',

    alignItems: 'center',

    justifyContent: 'center',

    background: 'rgba(255, 255, 255, 0.15)',

    border: 'none',

    borderRadius: '4px',

    color: '#ffffff',

    cursor: 'pointer',

  },



  slidePanelMagicBtn: {

    display: 'flex',

    flexDirection: 'column',

    alignItems: 'center',

    gap: '1px',

    padding: '4px 2px',

    background: "linear-gradient(145deg, " + colors.bead.yellow + ", " + colors.bead.orange + ")",

    border: 'none',

    borderRadius: radius.bead,

    cursor: 'pointer',

    width: '100%',

  },



  controlPanel: {

    background: editorCandy.panel,

    borderRadius: radius.card,

    padding: '8px 8px 6px',

    marginBottom: '6px',

    boxShadow: editorCandy.shadow,

    border: '1px solid ' + editorCandy.border,

  },



  previewZoomRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },

  previewZoomButton: {
    width: '32px',
    height: '32px',
    border: 'none',
    borderRadius: radius.bead,
    background: 'rgba(255,255,255,0.96)',
    color: editorCandy.text,
    fontSize: typography.fontSize.lg,
    cursor: 'pointer',
    flexShrink: 0,
  },

  previewZoomSlider: {
    flex: 1,
    minWidth: '120px',
  },

  previewZoomChip: {
    padding: '7px 10px',
    border: '1px solid ' + editorCandy.border,
    borderRadius: radius.button,
    background: 'rgba(255,255,255,0.96)',
    color: editorCandy.text,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    cursor: 'pointer',
    flexShrink: 0,
  },

  controlItem: {

    marginBottom: '6px',

  },



  controlHeader: {

    display: 'flex',

    alignItems: 'center',

    gap: '6px',

    marginBottom: '6px',

  },



  controlLabel: {

    flex: 1,

    fontSize: typography.fontSize.sm,

    fontWeight: typography.fontWeight.semibold,

    fontFamily: typography.fontFamilyAlt,

    color: editorCandy.text,

  },



  controlValue: {

    width: '64px',

    fontSize: typography.fontSize.sm,

    fontFamily: typography.fontFamilyAlt,

    color: editorCandy.cyan,

    fontWeight: typography.fontWeight.bold,

    textAlign: 'right',

  },

  gridSizeControlRow: {

    display: 'grid',

    gridTemplateColumns: '40px minmax(0, 1fr) 40px',

    alignItems: 'center',

    gap: '8px',

  },

  gridSizeInputRow: {

    display: 'flex',

    alignItems: 'center',

    gap: '10px',

    marginTop: '8px',

  },

  gridSizeSlider: {

    minWidth: 0,

  },

  gridSliderMarkerArea: {
    position: 'relative',
    minWidth: 0,
    paddingTop: '18px',
    paddingBottom: '18px',
    display: 'flex',
    alignItems: 'center',
  },

  gridSliderMarkerAnchor: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    transform: 'translateX(-50%)',
    width: '34px',
    pointerEvents: 'none',
    zIndex: 2,
    display: 'flex',
    justifyContent: 'center',
  },

  gridSliderMarkerBtn: {
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
    minWidth: '32px',
    height: '20px',
    padding: '0 5px',
    borderRadius: '999px',
    border: '1px solid ' + editorCandy.border,
    background: colors.bg.secondary,
    color: editorCandy.textSoft,
    fontSize: '10px',
    fontFamily: typography.fontFamilyAlt,
    fontWeight: typography.fontWeight.bold,
    cursor: 'pointer',
    pointerEvents: 'auto',
    zIndex: 3,
    boxShadow: shadows.soft,
  },

  gridSliderMarkerLine: {
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '2px',
    height: '10px',
    background: colors.bead.cyan + '99',
    borderRadius: '999px',
    opacity: 1,
  },

  gridSliderMarkerBtnActive: {
    background: "linear-gradient(145deg, " + colors.bead.cyan + "22, " + colors.bead.green + "18)",
    borderColor: colors.bead.cyan,
    color: editorCandy.cyan,
  },

  gridSizeStepBtn: {

    minWidth: '40px',

    height: '40px',

    border: '1px solid ' + editorCandy.border,

    borderRadius: radius.button,

    background: 'rgba(255,255,255,0.88)',

    color: editorCandy.text,

    fontSize: typography.fontSize.lg,

    fontWeight: typography.fontWeight.bold,

    cursor: 'pointer',

  },

  gridSizeNumberInput: {

    width: '64px',

    height: '40px',

    padding: '0 8px',

    border: '1px solid ' + editorCandy.border,

    borderRadius: radius.button,

    background: 'rgba(255,255,255,0.88)',

    color: editorCandy.text,

    fontSize: typography.fontSize.sm,

    fontFamily: typography.fontFamilyAlt,

    fontWeight: typography.fontWeight.bold,

    textAlign: 'center',

    outline: 'none',

  },

  gridPresetRow: {

    display: 'flex',

    alignItems: 'center',

    flexWrap: 'wrap',

    gap: '8px',

    marginTop: '10px',

  },

  gridPresetChip: {

    minWidth: '48px',

    height: '32px',

    padding: '0 10px',

    border: '1px solid ' + editorCandy.border,

    borderRadius: radius.button,

    background: 'rgba(255,255,255,0.88)',

    color: editorCandy.textSoft,

    fontSize: typography.fontSize.xs,

    fontFamily: typography.fontFamilyAlt,

    fontWeight: typography.fontWeight.semibold,

    cursor: 'pointer',

  },

  gridPresetChipActive: {

    background: colors.gradients.primary,

    border: '1px solid ' + colors.bead.cyan,

    color: '#ffffff',

    boxShadow: "0 4px 12px " + colors.bead.cyan + "30",

  },

  gridPresetHint: {

    fontSize: '11px',

    fontFamily: typography.fontFamilyAlt,

    color: editorCandy.textMuted,

  },



  slider: {

    width: '100%',

    height: '6px',

    WebkitAppearance: 'none',

    appearance: 'none',

    background: 'rgba(255,255,255,0.88)',

    borderRadius: radius.full,

    outline: 'none',

    cursor: 'pointer',

    touchAction: 'pan-y',

  },



  performanceWarning: {

    marginTop: '4px',

    padding: '4px 8px',

    background: colors.bead.orange + "20",

    borderRadius: radius.bead,

    fontSize: '10px',

    fontFamily: typography.fontFamilyAlt,

    color: colors.bead.orange,

    textAlign: 'center',

  },





  paletteSettingsCard: {

    marginTop: '12px',

    padding: '12px',

    borderRadius: radius.card,

    background: "linear-gradient(145deg, " + colors.bead.purple + "12, " + colors.bg.tertiary + ")",

    border: '1px solid ' + editorCandy.border,

  },



  paletteSettingsToggle: {

    width: '100%',

    display: 'flex',

    alignItems: 'center',

    justifyContent: 'space-between',

    gap: '10px',

    background: 'transparent',

    border: 'none',

    color: editorCandy.text,

    cursor: 'pointer',

    padding: 0,

  },



  paletteSettingsToggleLeft: {

    display: 'flex',

    flexDirection: 'column',

    alignItems: 'flex-start',

    gap: '2px',

  },



  paletteSettingsTitle: {

    fontSize: typography.fontSize.sm,

    fontWeight: typography.fontWeight.semibold,

    color: editorCandy.text,

  },



  paletteSettingsSummary: {

    fontSize: typography.fontSize.xs,

    fontFamily: typography.fontFamilyAlt,

    color: editorCandy.textMuted,

  },



  paletteSettingsBody: {

    display: 'flex',

    flexDirection: 'column',

    gap: '12px',

    marginTop: '12px',

  },



  paletteSettingsHint: {

    fontSize: typography.fontSize.xs,

    fontFamily: typography.fontFamilyAlt,

    color: editorCandy.textSoft,

  },



  paletteModeHint: {

    padding: '10px 12px',

    fontSize: typography.fontSize.xs,

    lineHeight: 1.6,

    fontFamily: typography.fontFamilyAlt,

    color: editorCandy.textSoft,

    background: 'rgba(255, 248, 241, 0.92)',

    border: '1px solid ' + editorCandy.border,

    borderRadius: radius.button,

  },



  paletteSection: {

    display: 'flex',

    flexDirection: 'column',

    gap: '10px',

  },



  paletteSectionHeader: {

    display: 'flex',

    alignItems: 'center',

    justifyContent: 'space-between',

  },



  paletteSectionTitle: {

    fontSize: typography.fontSize.sm,

    fontWeight: typography.fontWeight.semibold,

    color: editorCandy.text,

    fontFamily: typography.fontFamilyAlt,

  },



  paletteSwitchRow: {

    display: 'flex',

    alignItems: 'center',

    justifyContent: 'space-between',

    gap: '10px',

  },



  paletteSwitchInfo: {

    display: 'flex',

    alignItems: 'center',

    gap: '8px',

    flexWrap: 'wrap',

  },



  paletteSwitchTitle: {

    fontSize: typography.fontSize.sm,

    color: editorCandy.text,

  },



  paletteSwitchBadge: {

    padding: '2px 8px',

    borderRadius: radius.pill,

    background: colors.bead.cyan + "20",

    color: editorCandy.cyan,

    fontSize: typography.fontSize.xs,

    fontFamily: typography.fontFamilyAlt,

  },



  paletteSwitchActions: {

    display: 'flex',

    gap: '8px',

  },



  paletteManageBtn: {

    padding: '6px 10px',

    borderRadius: radius.button,

    border: '1px solid ' + editorCandy.border,

    background: 'rgba(255,255,255,0.88)',

    color: editorCandy.textSoft,

    cursor: 'pointer',

    fontSize: typography.fontSize.xs,

    fontFamily: typography.fontFamilyAlt,

  },



  paletteUseBtn: {

    padding: '6px 10px',

    borderRadius: radius.button,

    border: '1px solid ' + editorCandy.border,

    background: 'rgba(255,255,255,0.88)',

    color: editorCandy.textSoft,

    cursor: 'pointer',

    fontSize: typography.fontSize.xs,

    fontFamily: typography.fontFamilyAlt,

  },



  paletteUseBtnActive: {

    background: "linear-gradient(145deg, " + colors.bead.cyan + "28, " + colors.bead.cyan + "12)",

    border: '1px solid ' + colors.bead.cyan,

    color: editorCandy.cyan,

  },



  paletteApplyBtn: {

    width: '100%',

    padding: '10px 12px',

    borderRadius: radius.button,

    border: 'none',

    background: "linear-gradient(145deg, " + colors.bead.purple + ", " + colors.bead.cyan + ")",

    color: editorCandy.text,

    cursor: 'pointer',

    fontSize: typography.fontSize.sm,

    fontWeight: typography.fontWeight.semibold,

    boxShadow: shadows.button,

  },



  colorCountTabs: {

    display: 'flex',

    gap: '6px',

  },



  colorCountTab: {

    flex: 1,

    padding: '8px 6px',

    background: 'rgba(255,255,255,0.88)',

    border: '1px solid ' + editorCandy.border,

    borderRadius: radius.button,

    cursor: 'pointer',

    fontSize: typography.fontSize.xs,

    fontWeight: typography.fontWeight.semibold,

    fontFamily: typography.fontFamilyAlt,

    color: editorCandy.textSoft,

    display: 'flex',

    flexDirection: 'column',

    alignItems: 'center',

    justifyContent: 'center',

    gap: '4px',

    textAlign: 'center',

    transition: animation.transition.fast,

  },



  colorCountDesc: {

    fontSize: '10px',

    lineHeight: 1.3,

    fontWeight: typography.fontWeight.regular,

    color: editorCandy.textMuted,

  },



  colorCountTabActive: {

    background: "linear-gradient(145deg, " + colors.bead.purple + "30, " + colors.bead.purple + "15)",

    border: '1px solid ' + colors.bead.purple,

    color: colors.bead.purple,

  },




  mergeSliderRow: {

    display: 'flex',

    alignItems: 'center',

    gap: '8px',

  },



  mergeLabel: {

    fontSize: typography.fontSize.xs,

    fontFamily: typography.fontFamilyAlt,

    color: editorCandy.textMuted,

    whiteSpace: 'nowrap',

  },



  mergeHint: {

    fontSize: typography.fontSize.xs,

    fontFamily: typography.fontFamilyAlt,

    color: editorCandy.textMuted,

    margin: '6px 0 0',

    textAlign: 'center',

  },

  aiCutoutRestoreCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    padding: '10px 12px',
    marginTop: '8px',
    borderRadius: radius.button,
    background: "linear-gradient(145deg, " + colors.bead.yellow + "14, " + colors.bead.orange + "10)",
    border: "1px solid " + colors.bead.yellow + "35",
  },

  aiCutoutRestoreInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    minWidth: 0,
  },

  aiCutoutRestoreHint: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyAlt,
    color: editorCandy.textSoft,
    lineHeight: 1.5,
  },

  aiCutoutRestoreButton: {
    flexShrink: 0,
    padding: '8px 12px',
    borderRadius: radius.button,
    border: 'none',
    background: "linear-gradient(145deg, " + colors.bead.orange + ", " + colors.bead.yellow + ")",
    color: '#ffffff',
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    cursor: 'pointer',
    boxShadow: shadows.button,
  },



  statsSection: {

    background: editorCandy.panel,

    borderRadius: radius.card,

    marginBottom: '8px',

    boxShadow: shadows.sm,

    border: '1px solid ' + editorCandy.border,

    overflow: 'hidden',

  },



  statsHeader: {

    display: 'flex',

    alignItems: 'center',

    justifyContent: 'space-between',

    width: '100%',

    padding: '8px 10px',

    background: 'transparent',

    border: 'none',

    cursor: 'pointer',

  },



  statsHeaderLeft: {

    display: 'flex',

    alignItems: 'center',

    gap: '8px',

  },



  statsHeaderRight: {

    display: 'flex',

    alignItems: 'center',

    gap: '8px',

  },



  smartMergeBtn: {

    display: 'flex',

    alignItems: 'center',

    gap: '4px',

    padding: '4px 8px',

    background: "linear-gradient(145deg, " + colors.bead.purple + "20, " + colors.bead.purple + "10)",

    border: "1px solid " + colors.bead.purple + "50",

    borderRadius: radius.button,

    cursor: 'pointer',

    fontSize: '11px',

    fontWeight: typography.fontWeight.semibold,

    fontFamily: typography.fontFamilyAlt,

    color: colors.bead.purple,

    transition: animation.transition.fast,

  },



  shoppingListBtn: {

    display: 'flex',

    alignItems: 'center',

    gap: '4px',

    padding: '4px 8px',

    background: "linear-gradient(145deg, " + colors.bead.green + "20, " + colors.bead.green + "10)",

    border: "1px solid " + colors.bead.green + "50",

    borderRadius: radius.button,

    cursor: 'pointer',

    fontSize: '11px',

    fontWeight: typography.fontWeight.semibold,

    fontFamily: typography.fontFamilyAlt,

    color: colors.bead.green,

    transition: animation.transition.fast,

  },



  statsTitle: {

    fontSize: typography.fontSize.sm,

    fontWeight: typography.fontWeight.semibold,

    fontFamily: typography.fontFamilyAlt,

    color: editorCandy.text,

  },



  statsCount: {

    fontSize: typography.fontSize.xs,

    fontFamily: typography.fontFamilyAlt,

    color: editorCandy.textMuted,

    padding: '2px 8px',

    background: 'rgba(255,255,255,0.88)',

    borderRadius: radius.full,

  },



  statsArrow: {

    fontSize: '10px',

    color: editorCandy.textMuted,

    transition: animation.transition.fast,

  },



  statsList: {

    padding: '0 8px 8px',

    maxHeight: '200px',

    overflowY: 'auto',

  },



  statsItem: {

    display: 'flex',

    alignItems: 'center',

    gap: '4px',

    padding: '4px 0',

    borderBottom: '1px solid ' + colors.border.soft,

    cursor: 'pointer',

    transition: animation.transition.fast,

  },




  statsItemHighlighted: {

    background: "linear-gradient(145deg, " + colors.bead.yellow + "20, " + colors.bead.yellow + "10)",

    borderColor: colors.bead.yellow,

    borderRadius: '4px',

    padding: '4px 4px',

    margin: '0 -4px',

  },



  statsRank: {

    width: '16px',

    fontSize: '10px',

    fontFamily: typography.fontFamilyAlt,

    color: editorCandy.textMuted,

    textAlign: 'center',

  },




  statsColorBox: {

    width: '16px',

    height: '16px',

    borderRadius: '4px',

    flexShrink: 0,

  },




  statsColorId: {

    fontSize: '9px',

    fontFamily: typography.fontFamilyAlt,

    color: editorCandy.textMuted,

    minWidth: '48px',

    flexShrink: 0,

  },



  statsColorName: {

    flex: 1,

    fontSize: '11px',

    fontFamily: typography.fontFamilyAlt,

    color: editorCandy.text,

    overflow: 'hidden',

    textOverflow: 'ellipsis',

    whiteSpace: 'nowrap',

  },



  statsColorCount: {

    fontSize: '11px',

    fontWeight: typography.fontWeight.bold,

    fontFamily: typography.fontFamilyAlt,

    color: editorCandy.text,

    minWidth: '28px',

    textAlign: 'right',

  },



  statsColorPercent: {

    fontSize: '10px',

    fontFamily: typography.fontFamilyAlt,

    color: editorCandy.textMuted,

    minWidth: '32px',

    textAlign: 'right',

  },




  replaceBtn: {

    display: 'flex',

    alignItems: 'center',

    justifyContent: 'center',

    padding: '2px 6px',

    marginLeft: '2px',

    background: "linear-gradient(145deg, " + colors.bead.cyan + "20, " + colors.bead.cyan + "10)",

    border: "1px solid " + colors.bead.cyan + "50",

    borderRadius: '4px',

    cursor: 'pointer',

    fontSize: '10px',

    fontWeight: typography.fontWeight.semibold,

    fontFamily: typography.fontFamilyAlt,

    color: editorCandy.cyan,

    transition: animation.transition.fast,

    whiteSpace: 'nowrap',

  },




  restoreBtn: {

    display: 'flex',

    alignItems: 'center',

    justifyContent: 'center',

    padding: '2px 6px',

    marginLeft: '2px',

    background: "linear-gradient(145deg, " + colors.bead.orange + "20, " + colors.bead.orange + "10)",

    border: "1px solid " + colors.bead.orange + "50",

    borderRadius: '4px',

    cursor: 'pointer',

    fontSize: '10px',

    fontWeight: typography.fontWeight.semibold,

    fontFamily: typography.fontFamilyAlt,

    color: colors.bead.orange,

    transition: animation.transition.fast,

    whiteSpace: 'nowrap',

  },




  restoreAllBtn: {

    display: 'flex',

    alignItems: 'center',

    justifyContent: 'center',

    width: '100%',

    padding: '6px',

    marginTop: '6px',

    background: "linear-gradient(145deg, " + colors.bead.purple + "20, " + colors.bead.purple + "10)",

    border: "1px solid " + colors.bead.purple + "50",

    borderRadius: '6px',

    cursor: 'pointer',

    fontSize: '11px',

    fontWeight: typography.fontWeight.semibold,

    fontFamily: typography.fontFamilyAlt,

    color: colors.bead.purple,

    transition: animation.transition.fast,

  },




  excludeBtn: {

    display: 'flex',

    alignItems: 'center',

    justifyContent: 'center',

    padding: '2px 4px',

    marginLeft: '2px',

    background: 'transparent',

    border: "1px solid " + colors.text.muted + "30",

    borderRadius: '4px',

    cursor: 'pointer',

    color: editorCandy.textMuted,

    transition: animation.transition.fast,

  },



  excludeBtnActive: {

    background: "linear-gradient(145deg, " + colors.bead.red + "20, " + colors.bead.red + "10)",

    border: "1px solid " + colors.bead.red + "50",

    color: colors.bead.red,

  },




  excludeHint: {

    width: '100%',

    padding: '6px 8px',

    marginTop: '6px',

    background: colors.bead.red + "10",

    borderRadius: '6px',

    fontSize: '11px',

    fontFamily: typography.fontFamilyAlt,

    color: colors.bead.red,

    textAlign: 'center',

  },



  actions: {

    display: 'flex',

    gap: '6px',

    paddingBottom: 0,

  },



  primaryBtn: {

    flex: 1,

    display: 'flex',

    alignItems: 'center',

    justifyContent: 'center',

    gap: '4px',

    padding: '8px 6px',

    background: "linear-gradient(145deg, " + colors.bead.cyan + ", " + colors.pixel.blue + ")",

    border: 'none',

    borderRadius: radius.button,

    color: '#ffffff',

    fontSize: typography.fontSize.xs,

    fontWeight: typography.fontWeight.semibold,

    fontFamily: typography.fontFamilyAlt,

    cursor: 'pointer',

    boxShadow: shadows.button + ", " + shadows.glow.cyan,

    transition: animation.transition.fast,

  },




  bgModeOverlay: {

    position: 'fixed',

    top: 0,

    left: 0,

    right: 0,

    bottom: 0,

    background: `linear-gradient(180deg, ${editorCandy.bg} 0%, ${editorCandy.bgSoft} 100%)`,

    zIndex: 2147483646,

    display: 'flex',

    flexDirection: 'column',

    height: '100dvh',
    paddingBottom: '124px',
    overflow: 'hidden',

  },



  bgModeHeader: {

    display: 'flex',

    alignItems: 'center',

    padding: '10px 16px',

    background: "linear-gradient(145deg, " + colors.bead.magenta + "20, " + colors.bead.purple + "20)",

    borderBottom: "1px solid " + colors.bead.magenta + "40",

    gap: '12px',
    flexShrink: 0,

  },



  bgModeBackBtn: {

    display: 'flex',

    alignItems: 'center',

    justifyContent: 'center',

    width: '36px',

    height: '36px',

    background: editorCandy.panel,

    border: '1px solid ' + editorCandy.border,

    borderRadius: radius.button,

    color: editorCandy.text,

    cursor: 'pointer',

  },



  bgModeTitle: {

    fontSize: typography.fontSize.sm,

    fontWeight: typography.fontWeight.bold,

    fontFamily: typography.fontFamilyAlt,

    color: colors.bead.magenta,

  },



  bgModeCount: {

    marginLeft: 'auto',

    fontSize: typography.fontSize.sm,

    fontFamily: typography.fontFamilyAlt,

    color: editorCandy.textSoft,

    padding: '4px 8px',

    background: editorCandy.panel,

    borderRadius: radius.full,

  },



  bgModePreview: {

    flex: '1 1 auto',
    minHeight: 0,

    position: 'relative',

    display: 'flex',

    alignItems: 'center',

    justifyContent: 'center',

    padding: '12px 12px 8px',

    overflow: 'hidden',

  },

  bgModePreviewFloatingBtn: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    zIndex: 3,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '28px',
    padding: '0 10px',
    borderRadius: radius.full,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.border.soft,
    background: 'rgba(255, 255, 255, 0.82)',
    color: editorCandy.textSoft,
    fontSize: '10px',
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    backdropFilter: 'blur(10px)',
    boxShadow: '0 4px 10px rgba(21, 29, 52, 0.12)',
    cursor: 'pointer',
  },

  bgModePreviewFloatingBtnActive: {
    background: 'linear-gradient(135deg, rgba(110, 231, 255, 0.96), rgba(120, 194, 255, 0.96))',
    borderColor: 'rgba(82, 153, 255, 0.36)',
    color: '#124f8c',
  },

  bgModeZoomPanel: {
    padding: '8px 16px 10px',
    background: colors.bg.card,
    borderTop: '1px solid ' + colors.border.soft,
    borderBottom: '1px solid ' + colors.border.soft,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    flexShrink: 0,
  },



  bgModeHint: {

    padding: '8px 16px',

    background: colors.bg.secondary,

    borderTop: '1px solid ' + colors.border.soft,
    position: 'relative',
    zIndex: 1,

    textAlign: 'center',

    fontSize: typography.fontSize.sm,

    fontFamily: typography.fontFamilyAlt,

    color: editorCandy.textMuted,

  },

  bgModeDetectionText: {

    margin: '0 0 8px',

    fontSize: typography.fontSize.sm,

    lineHeight: 1.5,

    color: editorCandy.cyan,

  },

  bgModeRecoveryHint: {

    margin: '0 0 8px',

    fontSize: typography.fontSize.xs,

    lineHeight: 1.5,

    color: colors.bead.green,

  },

  bgModeCompareHint: {

    margin: '0 0 8px',

    fontSize: typography.fontSize.xs,

    lineHeight: 1.5,

    color: colors.bead.yellow,

  },

  bgModeEntryCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    padding: '10px 8px',
    background: 'rgba(255, 248, 241, 0.92)',
    borderBottom: '1px solid ' + colors.border.soft,
    flexWrap: 'wrap',
  },

  bgModeEntryTextGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    minWidth: 0,
    flex: 1,
  },

  bgModeEntryTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: editorCandy.text,
    fontFamily: typography.fontFamilyAlt,
  },

  bgModeEntryDesc: {
    fontSize: '11px',
    color: editorCandy.textSoft,
    fontFamily: typography.fontFamilyAlt,
    lineHeight: 1.4,
  },

  bgModeEntryBadge: {
    padding: '4px 8px',
    background: 'rgba(92, 242, 207, 0.12)',
    border: '1px solid rgba(92, 242, 207, 0.28)',
    borderRadius: radius.full,
    color: colors.bead.green,
    fontSize: '11px',
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
  },

  bgModeStrengthSection: {

    padding: '12px 16px 10px',

    background: colors.bg.secondary,

    borderTop: '1px solid ' + colors.border.soft,

  },

  bgModeStrengthHeader: {

    display: 'flex',

    alignItems: 'center',

    justifyContent: 'space-between',

    marginBottom: '8px',

  },

  bgModeStrengthValue: {

    fontSize: typography.fontSize.xs,

    fontFamily: typography.fontFamilyAlt,

    color: editorCandy.textSoft,

  },

  bgModeStrengthLabels: {

    display: 'flex',

    justifyContent: 'space-between',

    marginTop: '6px',

    fontSize: '11px',

    fontFamily: typography.fontFamilyAlt,

    color: editorCandy.textMuted,

  },

  bgModeFilterRow: {

    padding: '0 16px 10px',

    background: colors.bg.secondary,

    borderTop: '1px solid ' + colors.border.soft,

  },

  bgModeFilterBtn: {

    width: '100%',

    display: 'flex',

    alignItems: 'center',

    justifyContent: 'center',

    padding: '10px 12px',

    background: 'rgba(255,255,255,0.88)',

    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.border.soft,

    borderRadius: radius.button,

    color: editorCandy.textSoft,

    fontSize: typography.fontSize.sm,

    fontWeight: typography.fontWeight.semibold,

    fontFamily: typography.fontFamilyAlt,

    cursor: 'pointer',

  },

  bgModeFilterBtnActive: {

    background: "linear-gradient(145deg, " + colors.bead.cyan + "25, " + colors.bead.green + "18)",

    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.bead.cyan,

    color: editorCandy.cyan,

  },

  bgModeCompareRow: {

    padding: '0 16px 10px',

    background: colors.bg.secondary,

    borderTop: '1px solid ' + colors.border.soft,

  },

  bgModeCompareBtn: {

    width: '100%',

    display: 'flex',

    alignItems: 'center',

    justifyContent: 'center',

    padding: '10px 12px',

    background: 'rgba(255,255,255,0.88)',

    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.border.soft,

    borderRadius: radius.button,

    color: editorCandy.textSoft,

    fontSize: typography.fontSize.sm,

    fontWeight: typography.fontWeight.semibold,

    fontFamily: typography.fontFamilyAlt,

    cursor: 'pointer',

  },

  bgModeCompareBtnActive: {

    background: "linear-gradient(145deg, " + colors.bead.yellow + "22, " + colors.bead.orange + "18)",

    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.bead.yellow,

    color: colors.bead.yellow,

  },

  bgModePrimaryActions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    padding: '10px 12px 6px',
    background: colors.bg.secondary,
    borderTop: '1px solid ' + colors.border.soft,
  },

  bgModeAdvancedToggleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '0 16px 12px',
    background: colors.bg.secondary,
    borderTop: '1px solid ' + colors.border.soft,
    flexWrap: 'wrap',
  },

  bgModeAdvancedHint: {
    flex: 1,
    minWidth: '160px',
    fontSize: '11px',
    lineHeight: 1.4,
    color: editorCandy.textMuted,
    fontFamily: typography.fontFamilyAlt,
  },

  aiCutoutStatusContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    textAlign: 'left',
  },

  aiCutoutStatusParagraph: {
    margin: 0,
    fontSize: typography.fontSize.sm,
    lineHeight: 1.7,
    color: editorCandy.textSoft,
  },

  aiCutoutStatusCard: {
    padding: '12px',
    borderRadius: radius.button,
    background: 'rgba(255,255,255,0.88)',
    border: '1px solid ' + editorCandy.border,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },

  aiCutoutStatusRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
  },

  aiCutoutStatusLabel: {
    fontSize: typography.fontSize.xs,
    color: editorCandy.textMuted,
    fontFamily: typography.fontFamilyAlt,
  },

  aiCutoutStatusValue: {
    fontSize: typography.fontSize.sm,
    color: editorCandy.text,
    fontWeight: typography.fontWeight.semibold,
    textAlign: 'right',
  },

  aiCutoutStatusNext: {
    margin: 0,
    fontSize: typography.fontSize.xs,
    lineHeight: 1.6,
    color: editorCandy.cyan,
  },



  bgModeActions: {

    display: 'flex',

    flexDirection: 'column',

    gap: '8px',

    padding: '10px 12px calc(10px + env(safe-area-inset-bottom, 0px))',

    background: colors.bg.secondary,

    borderTop: '1px solid ' + colors.border.soft,
    flexShrink: 0,
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: 'calc(56px + env(safe-area-inset-bottom, 0px))',
    zIndex: 2147483647,
    boxShadow: '0 -8px 20px rgba(6, 12, 24, 0.12)',

  },

  bgModeMinorRow: {

    display: 'flex',

    justifyContent: 'flex-end',

    minHeight: '16px',

  },

  bgModeClearLinkBtn: {

    padding: '0',

    background: 'transparent',

    border: 'none',

    color: editorCandy.textMuted,

    fontSize: typography.fontSize.xs,

    fontWeight: typography.fontWeight.semibold,

    fontFamily: typography.fontFamilyAlt,

    cursor: 'pointer',

  },

  bgModePrimaryActionRow: {

    display: 'flex',

    alignItems: 'stretch',

    gap: '8px',

    flexWrap: 'nowrap',

  },

  bgModeQuickBtn: {

    flex: '1 1 calc(50% - 4px)',

    display: 'flex',

    flexDirection: 'column',

    alignItems: 'center',

    justifyContent: 'center',

    minHeight: '54px',

    padding: '8px 10px',

    background: 'linear-gradient(145deg, #8ddfc3, #77d6ff)',

    border: 'none',

    borderRadius: radius.button,

    color: '#ffffff',

    fontSize: typography.fontSize.sm,

    fontWeight: typography.fontWeight.semibold,

    fontFamily: typography.fontFamilyAlt,

    cursor: 'pointer',

    boxShadow: shadows.button,

  },

  bgModeAiBtn: {

    flex: '1 1 calc(50% - 4px)',

    display: 'flex',

    flexDirection: 'column',

    alignItems: 'center',

    justifyContent: 'center',

    minHeight: '54px',

    padding: '8px 10px',

    background: "linear-gradient(145deg, " + colors.bead.yellow + ", " + colors.bead.orange + ")",

    border: 'none',

    borderRadius: radius.button,

    color: '#ffffff',

    fontSize: typography.fontSize.sm,

    fontWeight: typography.fontWeight.semibold,

    fontFamily: typography.fontFamilyAlt,

    cursor: 'pointer',

    boxShadow: shadows.button,

  },

  bgModeHistoryBtn: {

    flex: '1 1 0',

    display: 'flex',

    alignItems: 'center',

    justifyContent: 'center',

    gap: '6px',

    minWidth: '0',

    minHeight: '42px',

    padding: '10px 8px',

    background: editorCandy.panel,

    border: '1px solid ' + editorCandy.border,

    borderRadius: radius.button,

    color: editorCandy.text,

    fontSize: typography.fontSize.xs,

    fontWeight: typography.fontWeight.semibold,

    fontFamily: typography.fontFamilyAlt,

    cursor: 'pointer',

  },

  bgModeActionPrimary: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyAlt,
    lineHeight: 1.1,
  },

  bgModeActionSecondary: {
    fontSize: '11px',
    fontFamily: typography.fontFamilyAlt,
    lineHeight: 1.1,
    opacity: 0.92,
  },



  bgModeToggleBtn: {

    display: 'flex',

    alignItems: 'center',

    justifyContent: 'center',

    padding: '12px 14px',

    background: 'rgba(255,255,255,0.88)',

    border: '1px solid ' + editorCandy.border,

    borderRadius: radius.button,

    color: editorCandy.textSoft,

    fontSize: typography.fontSize.sm,

    fontWeight: typography.fontWeight.semibold,

    fontFamily: typography.fontFamilyAlt,

    cursor: 'pointer',

    flexShrink: 0,

  },



  bgModeToggleBtnActive: {

    background: "linear-gradient(145deg, " + colors.bead.cyan + "30, " + colors.bead.cyan + "10)",

    border: '1px solid ' + colors.bead.cyan,

    color: editorCandy.cyan,

  },



  bgModeClearBtn: {

    flex: '1 1 0',

    display: 'flex',

    alignItems: 'center',

    justifyContent: 'center',

    minHeight: '44px',

    padding: '10px 12px',

    background: 'rgba(255,255,255,0.88)',

    border: '1px solid ' + editorCandy.border,

    borderRadius: radius.button,

    color: editorCandy.textSoft,

    fontSize: typography.fontSize.sm,

    fontWeight: typography.fontWeight.semibold,

    fontFamily: typography.fontFamilyAlt,

    cursor: 'pointer',

  },



  bgModeConfirmBtn: {

    flex: '1.15 1 0',

    display: 'flex',

    alignItems: 'center',

    justifyContent: 'center',

    minWidth: '0',

    minHeight: '48px',

    padding: '10px 10px',

    background: 'linear-gradient(145deg, #ff8fb7, #7ea9ff)',

    border: '1px solid rgba(255,255,255,0.78)',

    borderRadius: radius.button,

    color: '#ffffff',

    fontSize: typography.fontSize.sm,

    fontWeight: typography.fontWeight.semibold,

    fontFamily: typography.fontFamilyAlt,

    cursor: 'pointer',

    boxShadow: '0 14px 28px rgba(126, 169, 255, 0.24)',

    letterSpacing: '0.08em',

  },

  bgModeExitBtn: {

    flex: '1 1 0',

    display: 'flex',

    alignItems: 'center',

    justifyContent: 'center',

    minWidth: '0',

    minHeight: '42px',

    padding: '10px 8px',

    background: 'rgba(255,255,255,0.88)',

    border: '1px solid ' + editorCandy.border,

    borderRadius: radius.button,

    color: editorCandy.text,

    fontSize: typography.fontSize.xs,

    fontWeight: typography.fontWeight.semibold,

    fontFamily: typography.fontFamilyAlt,

    cursor: 'pointer',

  },

};




const styleSheet = document.createElement('style');

styleSheet.textContent = '\n  @keyframes spin {\n    to { transform: rotate(360deg); }\n  }\n';

if (!document.querySelector('#editor-styles')) {

  styleSheet.id = 'editor-styles';

  document.head.appendChild(styleSheet);

}



export default EditorPage;
