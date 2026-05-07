import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  ArrowLeft,
  CheckCircle,
  ShareNetwork,
  Eye,
  EyeSlash,
  Gear,
  Lightning,
  LightningSlash,
  X,
  DownloadSimple,
  Swap,
  SpeakerHigh,
  SpeakerSlash,
} from "@phosphor-icons/react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  colors,
  radius,
  typography,
  shadows,
  animation,
  mixins,
} from "../../styles/designSystem";
import { BeadPixelData } from "../../services/colorMatchService";
import { BeadColor, allBeadColors } from "../../data/beadColors";
import { projectApi } from "../../services/api/projectApi";
import { useToast } from "../../components/Toast";
import { useUserStore } from "../../store/userStore";
import ExportModal from "../../components/ExportModal";
import ColorReplaceModal from "../../components/ColorReplaceModal";
import CoordinateTooltip from "../../components/CoordinateTooltip";
import {
  getContrastColor,
  speakCoordinate,
  canSpeak,
} from "../../utils/colorUtils";
import {
  buildCompletedSingleBoardOnboardingState,
  clampMakingStageTranslate,
  clampSingleBoardMobileOverviewOffset,
  clampSingleBoardMobileOverviewWidth,
  getColorIdTextStyle,
  getMakingDesktopSingleBoardUiFlags,
  getRenderScaleAnchorDelayMs,
  getSafeRenderMetricsBudget,
  getMakingDesktopLayoutFlags,
  getSingleBoardCanvasMinHeight,
  getSingleBoardCanvasWrapperTopOffset,
  getSingleBoardMobileImmersiveControlLayout,
  getSingleBoardMobileImmersiveLayout,
  getLiveStageDisplayScale,
  getSingleBoardLayoutFlags,
  getSingleBoardMobileUiFlags,
  getMakingDesktopSidebarLayout,
  getSingleBoardMobileOverviewLayout,
  getSingleBoardMobileToolbarState,
  SINGLE_BOARD_MOBILE_TOP_CHROME_BASE_OFFSET,
  getSingleBoardOverviewTitle,
  getTextOverlayTransitionTransform,
  getTextOverlayVisualState,
  getSingleBoardAutoFocusScaleDecision,
  getNeighborBoardNumber,
  getSingleBoardMinScale,
  getSingleBoardSwipeStatus,
  getTextOverlayStabilizationFrames,
  parseSingleBoardOnboardingState,
  resolveSingleBoardSwipeDirection,
  shouldShowSingleBoardMobileOverviewButton,
} from "../../utils/singleBoardInteraction.js";
import BottomNav from "../../components/BottomNav";
import {
  recommendBoard,
  getPhysicalBoardGuideOffsets,
  getPhysicalBoardCenterOffset,
  getPhysicalBoardBlockCoordinate,
  getPhysicalBoardBlockRect,
  getPhysicalBoardSegments,
} from "../../services/boardService";
import { getToken } from "../../services/api/authApi";
import BannerAd from "../../components/ads/BannerAd";
import RewardedUnlockModal from "../../components/ads/RewardedUnlockModal";
import { adService } from "../../services/adService";
import BoardVisionAssistModal from "../../components/BoardVisionAssistModal";
import countBeadUsage from "../../services/beadUsageService";
import beadInventoryService from "../../services/beadInventoryService";

const COMMUNITY_MAKING_DRAFT_KEY = "community_making_bead_data";
const SINGLE_BOARD_ONBOARDING_STORAGE_KEY =
  "making_single_board_onboarding_v1";
const SINGLE_BOARD_MOBILE_OVERVIEW_WIDTH_STORAGE_KEY =
  "making_single_board_mobile_overview_width_v1";
const MAKING_DESKTOP_SIDEBAR_STORAGE_KEY = "makingDesktopSidebarCollapsed";
type CommunityMakingDraftPayload =
  | BeadPixelData
  | {
      version?: number;
      source?: "community";
      postId?: number;
      savedAt?: number;
      beadData?: BeadPixelData;
    };

// Wake Lock API 类型声明
declare global {
  interface Navigator {
    wakeLock?: {
      request: (type: "screen") => Promise<WakeLockSentinel>;
    };
  }
  interface WakeLockSentinel {
    release: () => Promise<void>;
    addEventListener: (type: "release", listener: () => void) => void;
  }
}

// 选中状态类型
interface SelectionState {
  type: "block" | "color" | null;
  blockX: number;
  blockY: number;
  colorHex?: string;
  colorId?: string;
}

interface ReplaceHistoryState {
  beadData: BeadPixelData;
  selection: SelectionState;
}

type MakingViewMode = "traditional" | "singleBoard";

interface BoardStatusMap {
  [boardNumber: number]: boolean;
}

// 细节模式阈值：超过该值时才显示色号并允许按单元格选色
const DETAIL_MODE_THRESHOLD = 2.3;
const MIN_SCALE = 0.2;
const MAX_SCALE = 6;
const ZOOM_STEP = 0.1;

/**
 * 制作辅助页面
 * 解决找珠子、放珠子、跟进度、识别色号等问题
 */
const MakingPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { isLoggedIn, initUser } = useUserStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const textOverlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const singleBoardMiniMapCanvasRef = useRef<HTMLCanvasElement>(null);
  const singleBoardMobileOverviewCanvasRef = useRef<HTMLCanvasElement>(null);
  const singleBoardMobileModeSwitchRef = useRef<HTMLDivElement>(null);
  const singleBoardMobileChromeRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasStageRef = useRef<HTMLDivElement>(null);

  // 拖动和缩放相关状态
  const [isDragging, setIsDragging] = useState(false);
  const lastTouchRef = useRef<{ x: number; y: number } | null>(null);
  const pinchStartRef = useRef<{
    distance: number;
    scale: number;
    translateX: number;
    translateY: number;
    focalX: number;
    focalY: number;
  } | null>(null);
  const dragStartTimeRef = useRef<number>(0);
  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const lastTapProcessedRef = useRef<number>(0); // 防止 touch + click 重复触发
  const singleBoardAutoFitPendingRef = useRef(true);
  const singleBoardSwipeGestureRef = useRef<{
    startX: number;
    startY: number;
    startAt: number;
    triggered: boolean;
  }>({
    startX: 0,
    startY: 0,
    startAt: 0,
    triggered: false,
  });

  // 从编辑器或方案列表传入的数据
  interface LocationState {
    beadData?: BeadPixelData;
    colorCount?: number;
    projectId?: number;
    localProjectId?: number;
    backTarget?: string;
    savedProgress?: {
      selectionType: "block" | "color" | null;
      blockX: number;
      blockY: number;
      colorHex?: string;
      colorId?: string;
      timestamp: number;
    };
  }
  const {
    beadData: initialBeadData,
    projectId,
    localProjectId,
    backTarget,
    savedProgress,
  } = (location.state as LocationState) || {};

  const isValidBeadData = (input: unknown): input is BeadPixelData => {
    const data = input as BeadPixelData | null;
    return !!(
      data &&
      Number.isFinite(data.width) &&
      Number.isFinite(data.height) &&
      data.width > 0 &&
      data.height > 0 &&
      Array.isArray(data.beads) &&
      data.beads.length === data.width * data.height
    );
  };

  const getBeadDataFromCommunityDraft = (): BeadPixelData | null => {
    try {
      const raw = localStorage.getItem(COMMUNITY_MAKING_DRAFT_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as CommunityMakingDraftPayload;

      if (isValidBeadData(parsed)) {
        return parsed;
      }

      if (
        parsed &&
        typeof parsed === "object" &&
        "beadData" in parsed &&
        isValidBeadData((parsed as { beadData?: BeadPixelData }).beadData)
      ) {
        return (parsed as { beadData: BeadPixelData }).beadData;
      }

      return null;
    } catch (e) {
      console.warn("[MakingPage] 读取社区制作缓存失败:", e);
      return null;
    }
  };

  // 测试模式：当没有传入数据时生成测试数据（仅开发环境）
  const getTestData = (): BeadPixelData | null => {
    if (initialBeadData) return initialBeadData;
    const cachedFromCommunity = getBeadDataFromCommunityDraft();
    if (cachedFromCommunity) return cachedFromCommunity;
    if (!import.meta.env.DEV) return null;
    const params = new URLSearchParams(location.search);
    if (params.get("test") !== "1") return null;

    // 使用真实的 allBeadColors ID
    const testColors: BeadColor[] = [
      { id: "80-19001", name: "White", hex: "#eaefee", brand: "perler" },
      { id: "80-19002", name: "Creme", hex: "#e1e2bb", brand: "perler" },
      { id: "80-19005", name: "Red", hex: "#b0353c", brand: "perler" },
      { id: "80-19008", name: "Dark Blue", hex: "#0e5092", brand: "perler" },
      { id: "80-19010", name: "Dark Green", hex: "#007b4e", brand: "perler" },
      { id: "80-19003", name: "Yellow", hex: "#e7ce3e", brand: "perler" },
      { id: "80-19004", name: "Orange", hex: "#eb7b31", brand: "perler" },
      { id: "80-19007", name: "Purple", hex: "#684b86", brand: "perler" },
    ];
    const beads: BeadColor[] = [];
    for (let i = 0; i < 900; i++) {
      beads.push(testColors[i % testColors.length]);
    }
    return { width: 30, height: 30, beads };
  };

  const [beadData, setBeadData] = useState<BeadPixelData | null>(getTestData());
  const [authChecked, setAuthChecked] = useState(false);

  const handleBackToSource = useCallback(() => {
    if (backTarget) {
      navigate(backTarget);
      return;
    }

    if (projectId || localProjectId) {
      navigate("/mobile/profile");
      return;
    }

    navigate("/mobile/create");
  }, [backTarget, localProjectId, navigate, projectId]);

  // 选中状态（核心状态）
  const [selection, setSelection] = useState<SelectionState>({
    type: null,
    blockX: 0,
    blockY: 0,
  });

  // UI 状态
  const [showSettings, setShowSettings] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showRewardedUnlockModal, setShowRewardedUnlockModal] = useState(false);
  const pendingExportAfterRewardRef = useRef<(() => void) | null>(null);
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [showVisionAssist, setShowVisionAssist] = useState(false);
  const [lastReplaceSnapshot, setLastReplaceSnapshot] =
    useState<ReplaceHistoryState | null>(null);
  const [redoReplaceSnapshot, setRedoReplaceSnapshot] =
    useState<ReplaceHistoryState | null>(null);
  const [scale, setScale] = useState(1);
  const [renderScaleAnchor, setRenderScaleAnchor] = useState(1);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const scaleRef = useRef(1);
  const translateRef = useRef({ x: 0, y: 0 });
  const renderScaleRef = useRef(1);
  const singleBoardMobileImmersiveRef = useRef(false);
  const viewportSyncFrameRef = useRef<number | null>(null);
  const textOverlayFrameRef = useRef<number | null>(null);
  const textOverlayDrawTokenRef = useRef(0);
  const textOverlayMetricsRef = useRef({
    renderScale: 1,
    canvasWidth: 0,
    canvasHeight: 0,
    dpr: 1,
  });
  const textOverlayVisualStateRef = useRef<{
    stageLeft: number;
    stageTop: number;
    cellScreenSize: number;
  } | null>(null);
  const [selectedCell, setSelectedCell] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [showColorId, setShowColorId] = useState(true);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(canSpeak());
  const [assistPackEnabled, setAssistPackEnabled] = useState(true);
  const [focusCurrentBoard, setFocusCurrentBoard] = useState(true);
  const [viewMode, setViewMode] = useState<MakingViewMode>("traditional");
  const [activeBoardNumber, setActiveBoardNumber] = useState(1);
  const [boardStatusMap, setBoardStatusMap] = useState<BoardStatusMap>({});
  const [singleBoardOverviewCollapsed, setSingleBoardOverviewCollapsed] =
    useState(false);
  const [makingDesktopSidebarCollapsed, setMakingDesktopSidebarCollapsed] =
    useState(false);
  const [
    singleBoardMobileMiniMapExpanded,
    setSingleBoardMobileMiniMapExpanded,
  ] = useState(false);
  const [singleBoardMobileToolbarExpanded, setSingleBoardMobileToolbarExpanded] =
    useState(false);
  const [singleBoardMobileCanvasInteracted, setSingleBoardMobileCanvasInteracted] =
    useState(false);
  const [singleBoardMobileOverviewOffset, setSingleBoardMobileOverviewOffset] =
    useState({ x: 0, y: 0 });
  const [singleBoardMobileOverviewWidth, setSingleBoardMobileOverviewWidth] =
    useState(220);
  const [singleBoardMobileChromeHeights, setSingleBoardMobileChromeHeights] =
    useState({
      summary: 0,
      toolbar: 0,
      swipeStatus: 0,
    });
  const [autoAdvanceOnBoardDone, setAutoAdvanceOnBoardDone] = useState(true);
  const [singleBoardHydrated, setSingleBoardHydrated] = useState(false);
  const [showSingleBoardOnboarding, setShowSingleBoardOnboarding] =
    useState(false);
  const [shareFeedback, setShareFeedback] = useState<
    null | "preparing" | "shared" | "copied" | "unsupported"
  >(null);
  const [inventoryVersion, setInventoryVersion] = useState(0);
  const [inventoryFeedback, setInventoryFeedback] = useState<string | null>(
    null,
  );
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const singleBoardResumeAppliedRef = useRef(false);
  const singleBoardMobileOverviewDragRef = useRef<{
    startX: number;
    startY: number;
    initialOffsetX: number;
    initialOffsetY: number;
    dragging: boolean;
  }>({
    startX: 0,
    startY: 0,
    initialOffsetX: 0,
    initialOffsetY: 0,
    dragging: false,
  });
  const singleBoardMobileOverviewInteractionRef = useRef({
    dragMoved: false,
  });
  const singleBoardMobileOverviewResizeRef = useRef<{
    startX: number;
    startWidth: number;
    resizing: boolean;
  }>({
    startX: 0,
    startWidth: 220,
    resizing: false,
  });
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);
  const [viewportWidth, setViewportWidth] = useState(window.innerWidth);
  const [pointerFine, setPointerFine] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(pointer: fine)").matches;
  });
  const { isSingleBoardMobile, isSingleBoardDesktop } = useMemo(
    () =>
      getSingleBoardLayoutFlags({
        viewMode,
        viewportWidth,
      }),
    [viewMode, viewportWidth],
  );
  const { useDesktopSidebarLayout } = useMemo(
    () =>
      getMakingDesktopLayoutFlags({
        viewMode,
        viewportWidth,
        pointerFine,
      }),
    [pointerFine, viewMode, viewportWidth],
  );
  const desktopSidebarLayout = useMemo(
    () =>
      getMakingDesktopSidebarLayout({
        viewportWidth,
        collapsed: makingDesktopSidebarCollapsed,
      }),
    [makingDesktopSidebarCollapsed, viewportWidth],
  );
  const isIOSWebKit = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    const ua = navigator.userAgent || "";
    const isiOS = /iPhone|iPad|iPod/i.test(ua);
    const isWebKit = /AppleWebKit/i.test(ua);
    const isCriOS = /CriOS|FxiOS|EdgiOS/i.test(ua);
    return isiOS && isWebKit && !isCriOS;
  }, []);
  const renderScaleAnchorDelayMs = useMemo(
    () =>
      getRenderScaleAnchorDelayMs({
        hasFinePointer: pointerFine,
        isIOSWebKit,
      }),
    [pointerFine, isIOSWebKit],
  );
  const singleBoardMobileToolbarState = useMemo(
    () =>
      getSingleBoardMobileToolbarState({
        isSingleBoardMobile,
        hasInteractedWithCanvas: singleBoardMobileCanvasInteracted,
      }),
    [isSingleBoardMobile, singleBoardMobileCanvasInteracted],
  );

  // 坐标提示框状态
  const [tooltipState, setTooltipState] = useState<{
    visible: boolean;
    row: number;
    col: number;
    boardNumber: number;
    localRow: number;
    localCol: number;
    screenX: number;
    screenY: number;
  }>({
    visible: false,
    row: 0,
    col: 0,
    boardNumber: 0,
    localRow: 0,
    localCol: 0,
    screenX: 0,
    screenY: 0,
  });

  // 基础 cellSize
  const baseCellSize = 10;

  const singleBoardStorageKey = useMemo(() => {
    if (!beadData) return null;
    const scope = projectId
      ? `project_${projectId}`
      : localProjectId
        ? `local_${localProjectId}`
        : `draft_${beadData.width}x${beadData.height}`;
    return `making_single_board_state_${scope}`;
  }, [beadData, localProjectId, projectId]);

  const cloneBeadData = useCallback((data: BeadPixelData): BeadPixelData => {
    return {
      ...data,
      beads: data.beads.map((bead) => (bead ? { ...bead } : bead)),
    };
  }, []);

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  useEffect(() => {
    translateRef.current = { x: translateX, y: translateY };
  }, [translateX, translateY]);

  useEffect(() => {
    return () => {
      if (viewportSyncFrameRef.current !== null) {
        cancelAnimationFrame(viewportSyncFrameRef.current);
        viewportSyncFrameRef.current = null;
      }
      if (textOverlayFrameRef.current !== null) {
        cancelAnimationFrame(textOverlayFrameRef.current);
        textOverlayFrameRef.current = null;
      }
    };
  }, []);

  // 初始化用户状态 + 登录保护
  useEffect(() => {
    initUser();
    setAuthChecked(true);
  }, [initUser]);

  useEffect(() => {
    if (!authChecked) {
      return;
    }
    if (!isLoggedIn && !getToken()) {
      navigate("/mobile/login", {
        state: { from: "/mobile/making" },
        replace: true,
      });
    }
  }, [authChecked, isLoggedIn, navigate]);

  useEffect(() => {
    if (beadData) {
      return;
    }
    if (initialBeadData) {
      setBeadData(initialBeadData);
      return;
    }
    const cached = getBeadDataFromCommunityDraft();
    if (cached) {
      setBeadData(cached);
    }
  }, [beadData, initialBeadData]);

  // 监听视口高度变化（处理移动端地址栏显示/隐藏）
  useEffect(() => {
    const updateViewport = () => {
      setViewportHeight(window.innerHeight);
      setViewportWidth(window.innerWidth);
    };
    window.addEventListener("resize", updateViewport);
    updateViewport();
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mediaQueryList = window.matchMedia("(pointer: fine)");
    const updatePointerFine = () => {
      setPointerFine(mediaQueryList.matches);
    };

    updatePointerFine();

    if (typeof mediaQueryList.addEventListener === "function") {
      mediaQueryList.addEventListener("change", updatePointerFine);
      return () =>
        mediaQueryList.removeEventListener("change", updatePointerFine);
    }

    if (typeof mediaQueryList.addListener === "function") {
      mediaQueryList.addListener(updatePointerFine);
      return () => mediaQueryList.removeListener(updatePointerFine);
    }
  }, []);

  const physicalBoardSize = useMemo(() => {
    if (!beadData) return 104;
    return recommendBoard(beadData.width, beadData.height).boardSize;
  }, [beadData]);

  const physicalBoardCols = useMemo(() => {
    if (!beadData) return 1;
    return Math.max(1, Math.ceil(beadData.width / physicalBoardSize));
  }, [beadData, physicalBoardSize]);

  const physicalBoardRows = useMemo(() => {
    if (!beadData) return 1;
    return Math.max(1, Math.ceil(beadData.height / physicalBoardSize));
  }, [beadData, physicalBoardSize]);

  const totalBoardCount = useMemo(
    () => physicalBoardCols * physicalBoardRows,
    [physicalBoardCols, physicalBoardRows],
  );

  const physicalBoardSegments = useMemo(
    () => getPhysicalBoardSegments(physicalBoardSize),
    [physicalBoardSize],
  );

  const segmentsPerBoard = physicalBoardSegments.length;

  // 计算区块数量（按现实豆板分区，而不是固定 10x10）
  const blocksX = beadData ? physicalBoardCols * segmentsPerBoard : 0;
  const blocksY = beadData ? physicalBoardRows * segmentsPerBoard : 0;

  const getBlockRectBySelection = useCallback(
    (blockX: number, blockY: number) => {
      if (!beadData) return null;
      return getPhysicalBoardBlockRect(
        blockX,
        blockY,
        physicalBoardSize,
        beadData.width,
        beadData.height,
      );
    },
    [beadData, physicalBoardSize],
  );

  // 获取指定区块内某颜色的全部格子索引
  const getColorIndicesInBlock = useCallback(
    (colorHex: string, blockX: number, blockY: number): number[] => {
      if (!beadData) return [];
      const rect = getBlockRectBySelection(blockX, blockY);
      if (!rect) return [];

      const indices: number[] = [];
      for (let y = rect.startY; y < rect.endY; y++) {
        for (let x = rect.startX; x < rect.endX; x++) {
          const index = y * beadData.width + x;
          const bead = beadData.beads[index];
          if (bead && bead.hex === colorHex) {
            indices.push(index);
          }
        }
      }
      return indices;
    },
    [beadData, getBlockRectBySelection],
  );

  // 获取选中颜色在当前区块的数量
  const colorCountInBlock = useMemo(() => {
    if (selection.type !== "color" || !selection.colorHex) return 0;
    return getColorIndicesInBlock(
      selection.colorHex,
      selection.blockX,
      selection.blockY,
    ).length;
  }, [selection, getColorIndicesInBlock]);

  // 获取选中颜色在整幅作品的数量
  const colorCountTotal = useMemo(() => {
    if (!beadData || !selection.colorHex) return 0;
    return beadData.beads.filter((b) => b.hex === selection.colorHex).length;
  }, [beadData, selection.colorHex]);

  const boardRects = useMemo(() => {
    if (!beadData) return [];
    const rects: Array<{
      boardNumber: number;
      startX: number;
      startY: number;
      endX: number;
      endY: number;
      boardCol: number;
      boardRow: number;
    }> = [];
    for (let boardRow = 0; boardRow < physicalBoardRows; boardRow++) {
      for (let boardCol = 0; boardCol < physicalBoardCols; boardCol++) {
        const startX = boardCol * physicalBoardSize;
        const startY = boardRow * physicalBoardSize;
        rects.push({
          boardNumber: boardRow * physicalBoardCols + boardCol + 1,
          startX,
          startY,
          endX: Math.min(startX + physicalBoardSize, beadData.width),
          endY: Math.min(startY + physicalBoardSize, beadData.height),
          boardCol,
          boardRow,
        });
      }
    }
    return rects;
  }, [beadData, physicalBoardCols, physicalBoardRows, physicalBoardSize]);

  const activeBoardRect = useMemo(() => {
    return (
      boardRects.find((item) => item.boardNumber === activeBoardNumber) || null
    );
  }, [activeBoardNumber, boardRects]);

  const showSingleBoardMobileOverviewButton = useMemo(
    () =>
      shouldShowSingleBoardMobileOverviewButton({
        isSingleBoardMobile,
        hasActiveBoardRect: !!activeBoardRect,
      }),
    [activeBoardRect, isSingleBoardMobile],
  );

  const singleBoardMobileOverviewLayout = useMemo(() => {
    if (!showSingleBoardMobileOverviewButton) return null;
    return getSingleBoardMobileOverviewLayout({
      viewportWidth,
      viewportHeight,
      offsetX: singleBoardMobileOverviewOffset.x,
      offsetY: singleBoardMobileOverviewOffset.y,
      widthOverride: singleBoardMobileOverviewWidth,
    });
  }, [
    showSingleBoardMobileOverviewButton,
    singleBoardMobileOverviewOffset.x,
    singleBoardMobileOverviewOffset.y,
    singleBoardMobileOverviewWidth,
    viewportHeight,
    viewportWidth,
  ]);

  const getOverviewCanvasLayout = useCallback(
    (canvasWidth: number, canvasHeight: number) => {
      if (!beadData || canvasWidth <= 0 || canvasHeight <= 0) return null;
      const padding = Math.max(6, Math.min(canvasWidth, canvasHeight) * 0.04);
      const availableWidth = Math.max(1, canvasWidth - padding * 2);
      const availableHeight = Math.max(1, canvasHeight - padding * 2);
      const overviewScale = Math.min(
        availableWidth / beadData.width,
        availableHeight / beadData.height,
      );
      const drawWidth = beadData.width * overviewScale;
      const drawHeight = beadData.height * overviewScale;
      const offsetX = (canvasWidth - drawWidth) / 2;
      const offsetY = (canvasHeight - drawHeight) / 2;
      return { padding, overviewScale, drawWidth, drawHeight, offsetX, offsetY };
    },
    [beadData],
  );

  const drawSingleBoardOverviewCanvas = useCallback(
    (canvas: HTMLCanvasElement | null) => {
      if (!canvas || !beadData) return;
      const parent = canvas.parentElement;
      const cssWidth = parent?.clientWidth || canvas.clientWidth;
      const cssHeight = parent?.clientHeight || canvas.clientHeight;
      if (cssWidth <= 0 || cssHeight <= 0) return;

      const dpr = Math.max(1, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.floor(cssWidth * dpr));
      canvas.height = Math.max(1, Math.floor(cssHeight * dpr));
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(dpr, dpr);
      ctx.imageSmoothingEnabled = false;

      const layout = getOverviewCanvasLayout(cssWidth, cssHeight);
      if (!layout) return;

      const { overviewScale, offsetX, offsetY } = layout;

      ctx.save();
      ctx.fillStyle = "rgba(255,255,255,0.22)";
      ctx.fillRect(offsetX, offsetY, beadData.width * overviewScale, beadData.height * overviewScale);

      for (let y = 0; y < beadData.height; y++) {
        for (let x = 0; x < beadData.width; x++) {
          const bead = beadData.beads[y * beadData.width + x];
          if (!bead) continue;
          ctx.fillStyle = bead.hex;
          ctx.fillRect(
            offsetX + x * overviewScale,
            offsetY + y * overviewScale,
            Math.max(overviewScale, 1),
            Math.max(overviewScale, 1),
          );
        }
      }

      const lineWidth = Math.max(1, Math.min(2.4, overviewScale * 0.6));
      boardRects.forEach((board) => {
        const left = offsetX + board.startX * overviewScale;
        const top = offsetY + board.startY * overviewScale;
        const width = (board.endX - board.startX) * overviewScale;
        const height = (board.endY - board.startY) * overviewScale;
        const isActive = board.boardNumber === activeBoardNumber;
        const isDone = Boolean(boardStatusMap[board.boardNumber]);

        if (!isActive) {
          ctx.fillStyle = "rgba(255,255,255,0.4)";
          ctx.fillRect(left, top, width, height);
        }

        if (isDone) {
          ctx.fillStyle = isActive
            ? "rgba(16,185,129,0.24)"
            : "rgba(15,118,110,0.12)";
          ctx.fillRect(left, top, width, height);
        }
        if (isActive) {
          ctx.fillStyle = "rgba(125,211,252,0.08)";
          ctx.fillRect(left, top, width, height);
        }

        ctx.strokeStyle = isActive
          ? "rgba(244,114,182,0.96)"
          : isDone
            ? "rgba(13,148,136,0.7)"
            : "rgba(71,85,105,0.42)";
        ctx.lineWidth = isActive ? lineWidth * 1.8 : lineWidth;
        ctx.strokeRect(left, top, width, height);
        if (isActive) {
          ctx.strokeStyle = "rgba(255,255,255,0.92)";
          ctx.lineWidth = Math.max(1, lineWidth * 0.8);
          ctx.strokeRect(
            left + lineWidth,
            top + lineWidth,
            Math.max(0, width - lineWidth * 2),
            Math.max(0, height - lineWidth * 2),
          );
        }
      });
      ctx.restore();
    },
    [activeBoardNumber, beadData, boardRects, boardStatusMap, getOverviewCanvasLayout],
  );

  useEffect(() => {
    drawSingleBoardOverviewCanvas(singleBoardMiniMapCanvasRef.current);
    drawSingleBoardOverviewCanvas(singleBoardMobileOverviewCanvasRef.current);
  }, [
    activeBoardNumber,
    beadData,
    boardRects,
    boardStatusMap,
    drawSingleBoardOverviewCanvas,
    singleBoardMobileMiniMapExpanded,
    viewportHeight,
    viewportWidth,
  ]);

  const displayBoardRect = useMemo(() => {
    if (!beadData) return null;
    if (viewMode === "singleBoard" && activeBoardRect) {
      return activeBoardRect;
    }
    return {
      boardNumber: 0,
      startX: 0,
      startY: 0,
      endX: beadData.width,
      endY: beadData.height,
      boardCol: 0,
      boardRow: 0,
    };
  }, [activeBoardRect, beadData, viewMode]);

  const displayWidth = displayBoardRect
    ? displayBoardRect.endX - displayBoardRect.startX
    : 0;
  const displayHeight = displayBoardRect
    ? displayBoardRect.endY - displayBoardRect.startY
    : 0;
  const renderMaxScale = useMemo(() => MAX_SCALE, []);

  const getDisplayFitScale = useCallback(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper || !displayBoardRect || displayWidth <= 0 || displayHeight <= 0) {
      return null;
    }
    const fitWidth = wrapper.clientWidth / (displayWidth * baseCellSize);
    const fitHeight = wrapper.clientHeight / (displayHeight * baseCellSize);
    return Math.min(renderMaxScale, Math.max(MIN_SCALE, Math.min(fitWidth, fitHeight)));
  }, [displayBoardRect, displayHeight, displayWidth, renderMaxScale]);

  const singleBoardFitScale = useMemo(() => {
    if (viewMode !== "singleBoard") return null;
    return getDisplayFitScale();
  }, [getDisplayFitScale, viewMode, viewportHeight, viewportWidth, activeBoardNumber]);

  const activeMinScale = useMemo(() => {
    if (viewMode !== "singleBoard" || !singleBoardFitScale) {
      return MIN_SCALE;
    }
    return getSingleBoardMinScale({
      fitScale: singleBoardFitScale,
      baseMinScale: MIN_SCALE,
    });
  }, [singleBoardFitScale, viewMode]);
  const renderMetrics = useMemo(() => {
    if (!displayBoardRect || displayWidth <= 0 || displayHeight <= 0)
      return null;
    return getSafeRenderMetricsBudget({
      width: displayWidth,
      height: displayHeight,
      baseCellSize,
      scale: renderScaleAnchor,
      devicePixelRatio: window.devicePixelRatio || 1,
      isIOSWebKit,
      layerCount: 2,
    });
  }, [
    baseCellSize,
    displayBoardRect,
    displayHeight,
    displayWidth,
    isIOSWebKit,
    renderScaleAnchor,
  ]);
  const renderDpr = renderMetrics?.dpr ?? 1;
  const renderScale = renderMetrics?.renderScale ?? 1;
  const safeRenderCellSize = renderMetrics?.safeRenderCellSize ?? baseCellSize;
  const safeRenderCanvasWidth = renderMetrics?.safeRenderCanvasWidth ?? 0;
  const safeRenderCanvasHeight = renderMetrics?.safeRenderCanvasHeight ?? 0;
  const displayScale = Math.max(1, scale / Math.max(renderScale, 0.0001));

  useEffect(() => {
    setRenderScaleAnchor(scale);
  }, [displayBoardRect, displayHeight, displayWidth]);

  useEffect(() => {
    if (renderScaleAnchorDelayMs <= 0) {
      setRenderScaleAnchor((prev) =>
        Math.abs(prev - scale) < 0.001 ? prev : scale,
      );
      return;
    }

    const timer = window.setTimeout(() => {
      setRenderScaleAnchor((prev) =>
        Math.abs(prev - scale) < 0.001 ? prev : scale,
      );
    }, renderScaleAnchorDelayMs);
    return () => window.clearTimeout(timer);
  }, [renderScaleAnchorDelayMs, scale]);

  const clampTranslate = useCallback(
    (
      nextScale: number,
      x: number,
      y: number,
      options?: { ignoreImmersivePanSlack?: boolean },
    ) => {
      if (
        !displayBoardRect ||
        !wrapperRef.current ||
        displayWidth <= 0 ||
        displayHeight <= 0
      ) {
        return { x, y };
      }
      const wrapperRect = wrapperRef.current.getBoundingClientRect();
      const canvasWidth = displayWidth * baseCellSize * nextScale;
      const canvasHeight = displayHeight * baseCellSize * nextScale;
      return clampMakingStageTranslate({
        x,
        y,
        canvasWidth,
        canvasHeight,
        wrapperWidth: wrapperRect.width,
        wrapperHeight: wrapperRect.height,
        isSingleBoardMobileImmersive:
          singleBoardMobileImmersiveRef.current &&
          !options?.ignoreImmersivePanSlack,
      });
    },
    [baseCellSize, displayBoardRect, displayHeight, displayWidth],
  );

  const applyStageTransformStyle = useCallback(
    (nextScale: number, x: number, y: number, renderScaleOverride?: number) => {
      const stage = canvasStageRef.current;
      if (!stage) return;
      const currentRenderScale = Math.max(
        renderScaleOverride ?? renderScaleRef.current,
        0.0001,
      );
      const nextDisplayScale = getLiveStageDisplayScale({
        targetScale: nextScale,
        committedRenderScale: currentRenderScale,
      });
      stage.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${nextDisplayScale})`;
    },
    [],
  );

  const syncViewportStateNow = useCallback(() => {
    if (viewportSyncFrameRef.current !== null) {
      cancelAnimationFrame(viewportSyncFrameRef.current);
      viewportSyncFrameRef.current = null;
    }
    setScale(scaleRef.current);
    setTranslateX(translateRef.current.x);
    setTranslateY(translateRef.current.y);
  }, []);

  const scheduleViewportStateSync = useCallback(() => {
    if (viewportSyncFrameRef.current !== null) return;
    viewportSyncFrameRef.current = requestAnimationFrame(() => {
      viewportSyncFrameRef.current = null;
      setScale(scaleRef.current);
      setTranslateX(translateRef.current.x);
      setTranslateY(translateRef.current.y);
    });
  }, []);

  const drawTextOverlay = useCallback(() => {
    if (
      !beadData ||
      !textOverlayCanvasRef.current ||
      !wrapperRef.current ||
      !displayBoardRect ||
      !showColorId ||
      scaleRef.current < DETAIL_MODE_THRESHOLD ||
      safeRenderCellSize <= 0
    ) {
      if (textOverlayCanvasRef.current) {
        const ctx = textOverlayCanvasRef.current.getContext("2d");
        if (ctx) {
          textOverlayCanvasRef.current.style.transform = "none";
          textOverlayCanvasRef.current.style.transformOrigin = "0 0";
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.clearRect(
            0,
            0,
            textOverlayCanvasRef.current.width,
            textOverlayCanvasRef.current.height,
          );
        }
      }
      return;
    }

    const wrapper = wrapperRef.current;
    const canvas = textOverlayCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const wrapperWidth = wrapper.clientWidth;
    const wrapperHeight = wrapper.clientHeight;
    if (wrapperWidth <= 0 || wrapperHeight <= 0) return;

    const dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.floor(wrapperWidth * dpr));
    canvas.height = Math.max(1, Math.floor(wrapperHeight * dpr));
    canvas.style.width = `${wrapperWidth}px`;
    canvas.style.height = `${wrapperHeight}px`;
    canvas.style.transform = "none";
    canvas.style.transformOrigin = "0 0";

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = true;

    const currentVisualState = getTextOverlayVisualState({
      wrapperWidth,
      wrapperHeight,
      safeRenderCanvasWidth,
      safeRenderCanvasHeight,
      safeRenderCellSize,
      renderScale: renderScaleRef.current,
      scale: scaleRef.current,
      translateX: translateRef.current.x,
      translateY: translateRef.current.y,
    });
    const cellScreenSize = currentVisualState.cellScreenSize;
    if (cellScreenSize < 11) return;

    const stageLeft = currentVisualState.stageLeft;
    const stageTop = currentVisualState.stageTop;

    const visibleStartX = Math.max(0, Math.floor(-stageLeft / cellScreenSize));
    const visibleStartY = Math.max(0, Math.floor(-stageTop / cellScreenSize));
    const visibleEndX = Math.min(
      displayWidth,
      Math.ceil((wrapperWidth - stageLeft) / cellScreenSize),
    );
    const visibleEndY = Math.min(
      displayHeight,
      Math.ceil((wrapperHeight - stageTop) / cellScreenSize),
    );

    const textStyle = getColorIdTextStyle({
      cellScreenSize,
      labelText: "CE12",
    });
    const fontSize = textStyle.fontSize;
    ctx.save();
    ctx.font = `700 ${fontSize}px "Cascadia Mono", "SFMono-Regular", Consolas, "Courier New", monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.miterLimit = 2;
    ctx.lineWidth = textStyle.lineWidth;

    for (let y = visibleStartY; y < visibleEndY; y++) {
      const globalY = displayBoardRect.startY + y;
      for (let x = visibleStartX; x < visibleEndX; x++) {
        const globalX = displayBoardRect.startX + x;
        const bead = beadData.beads[globalY * beadData.width + globalX];
        if (!bead?.id) continue;
        const cx = stageLeft + x * cellScreenSize + cellScreenSize / 2;
        const cy = stageTop + y * cellScreenSize + cellScreenSize / 2;
        if (
          cx < -cellScreenSize ||
          cy < -cellScreenSize ||
          cx > wrapperWidth + cellScreenSize ||
          cy > wrapperHeight + cellScreenSize
        ) {
          continue;
        }
        const fillColor = getContrastColor(bead.hex);
        const strokeColor =
          fillColor === "#000000"
            ? "rgba(255,255,255,0.55)"
            : "rgba(0,0,0,0.55)";
        const beadTextStyle = getColorIdTextStyle({
          cellScreenSize,
          labelText: bead.id,
        });
        if (Math.abs(beadTextStyle.fontSize - fontSize) > 0.01) {
          ctx.font = `700 ${beadTextStyle.fontSize}px "Cascadia Mono", "SFMono-Regular", Consolas, "Courier New", monospace`;
        }
        ctx.fillStyle = fillColor;
        ctx.lineWidth = beadTextStyle.lineWidth;
        if (beadTextStyle.lineWidth > 0) {
          ctx.strokeStyle = strokeColor;
          ctx.strokeText(bead.id, cx, cy);
        }
        ctx.fillText(bead.id, cx, cy);
      }
    }
    ctx.restore();
    textOverlayVisualStateRef.current = currentVisualState;
  }, [
    beadData,
    displayBoardRect,
    displayHeight,
    displayWidth,
    safeRenderCanvasHeight,
    safeRenderCanvasWidth,
    safeRenderCellSize,
    showColorId,
  ]);

  const scheduleTextOverlayRedraw = useCallback(
    (stabilizationFrames = 1) => {
      if (textOverlayFrameRef.current !== null) {
        cancelAnimationFrame(textOverlayFrameRef.current);
      }

      const token = ++textOverlayDrawTokenRef.current;
      const totalFrames = Math.max(1, Math.floor(stabilizationFrames));

      const runFrame = (remainingFrames: number) => {
        textOverlayFrameRef.current = requestAnimationFrame(() => {
          if (token !== textOverlayDrawTokenRef.current) {
            textOverlayFrameRef.current = null;
            return;
          }

          drawTextOverlay();

          if (remainingFrames > 1) {
            runFrame(remainingFrames - 1);
            return;
          }

          textOverlayFrameRef.current = null;
        });
      };

      runFrame(totalFrames);
    },
    [drawTextOverlay],
  );

  const commitTranslate = useCallback(
    (
      nextScale: number,
      x: number,
      y: number,
      options?: { immediate?: boolean },
    ) => {
      const clamped = clampTranslate(nextScale, x, y);
      translateRef.current = clamped;
      scaleRef.current = nextScale;
      const predictedRenderMetrics =
        displayBoardRect && displayWidth > 0 && displayHeight > 0
          ? getSafeRenderMetricsBudget({
              width: displayWidth,
              height: displayHeight,
              baseCellSize,
              scale: nextScale,
              devicePixelRatio: window.devicePixelRatio || 1,
              isIOSWebKit,
              layerCount: 2,
            })
          : null;
      const predictedRenderScale =
        predictedRenderMetrics?.renderScale ?? renderScaleRef.current;
      applyStageTransformStyle(nextScale, clamped.x, clamped.y);
      if (
        textOverlayCanvasRef.current &&
        wrapperRef.current &&
        predictedRenderMetrics
      ) {
        const nextVisualState = getTextOverlayVisualState({
          wrapperWidth: wrapperRef.current.clientWidth,
          wrapperHeight: wrapperRef.current.clientHeight,
          safeRenderCanvasWidth: predictedRenderMetrics.safeRenderCanvasWidth,
          safeRenderCanvasHeight: predictedRenderMetrics.safeRenderCanvasHeight,
          safeRenderCellSize: predictedRenderMetrics.safeRenderCellSize,
          renderScale: predictedRenderScale,
          scale: nextScale,
          translateX: clamped.x,
          translateY: clamped.y,
        });
        const transitionTransform = getTextOverlayTransitionTransform({
          prevVisualState: textOverlayVisualStateRef.current,
          nextVisualState,
        });
        if (transitionTransform) {
          textOverlayCanvasRef.current.style.transformOrigin = "0 0";
          textOverlayCanvasRef.current.style.transform = `matrix(${transitionTransform.scale}, 0, 0, ${transitionTransform.scale}, ${transitionTransform.translateX}, ${transitionTransform.translateY})`;
        }
      }
      if (options?.immediate) {
        syncViewportStateNow();
      } else {
        scheduleViewportStateSync();
      }
    },
    [
      applyStageTransformStyle,
      baseCellSize,
      clampTranslate,
      displayBoardRect,
      displayHeight,
      displayWidth,
      isIOSWebKit,
      scheduleViewportStateSync,
      syncViewportStateNow,
    ],
  );

  const applyScaleAtPoint = useCallback(
    (
      rawScale: number,
      focalX: number,
      focalY: number,
      options?: { immediate?: boolean },
    ) => {
      const wrapper = wrapperRef.current;
      if (!wrapper) return;
      const nextScale = Math.min(
        renderMaxScale,
        Math.max(activeMinScale, rawScale),
      );
      const prevScale = scaleRef.current;
      const ratio = nextScale / prevScale;
      const centerX = wrapper.clientWidth / 2;
      const centerY = wrapper.clientHeight / 2;
      const prev = translateRef.current;
      const nextX = ratio * prev.x + (1 - ratio) * (focalX - centerX);
      const nextY = ratio * prev.y + (1 - ratio) * (focalY - centerY);
      commitTranslate(nextScale, nextX, nextY, options);
    },
    [activeMinScale, commitTranslate, renderMaxScale],
  );

  useEffect(() => {
    if (scaleRef.current <= renderMaxScale) return;
    const wrapper = wrapperRef.current;
    const focalX = wrapper ? wrapper.clientWidth / 2 : 0;
    const focalY = wrapper ? wrapper.clientHeight / 2 : 0;
    applyScaleAtPoint(renderMaxScale, focalX, focalY, { immediate: true });
  }, [applyScaleAtPoint, renderMaxScale]);

  useLayoutEffect(() => {
    renderScaleRef.current = renderScale;
    applyStageTransformStyle(scale, translateX, translateY, renderScale);
  }, [applyStageTransformStyle, renderScale, scale, translateX, translateY]);

  useEffect(() => {
    const prev = textOverlayMetricsRef.current;
    const renderScaleChanged = Math.abs(prev.renderScale - renderScale) > 0.001;
    const canvasMetricsChanged =
      prev.canvasWidth !== safeRenderCanvasWidth ||
      prev.canvasHeight !== safeRenderCanvasHeight ||
      Math.abs(prev.dpr - renderDpr) > 0.001;

    textOverlayMetricsRef.current = {
      renderScale,
      canvasWidth: safeRenderCanvasWidth,
      canvasHeight: safeRenderCanvasHeight,
      dpr: renderDpr,
    };

    const stabilizationFrames = getTextOverlayStabilizationFrames({
      scale,
      renderMaxScale,
      renderScaleChanged,
      canvasMetricsChanged,
    });

    if (stabilizationFrames > 1) {
      scheduleTextOverlayRedraw(stabilizationFrames);
    }
  }, [
    renderDpr,
    renderMaxScale,
    renderScale,
    safeRenderCanvasHeight,
    safeRenderCanvasWidth,
    scale,
    scheduleTextOverlayRedraw,
  ]);

  const shiftTranslate = useCallback(
    (deltaX: number, deltaY: number) => {
      const prev = translateRef.current;
      commitTranslate(scaleRef.current, prev.x + deltaX, prev.y + deltaY);
    },
    [commitTranslate],
  );

  useEffect(() => {
    commitTranslate(
      scaleRef.current,
      translateRef.current.x,
      translateRef.current.y,
    );
  }, [viewportHeight, beadData, commitTranslate]);

  const getPhysicalBoardCoordinate = useCallback(
    (cellX: number, cellY: number) => {
      const boardCol = Math.floor(cellX / physicalBoardSize);
      const boardRow = Math.floor(cellY / physicalBoardSize);
      return {
        boardNumber: boardRow * physicalBoardCols + boardCol + 1,
        localCol: (cellX % physicalBoardSize) + 1,
        localRow: (cellY % physicalBoardSize) + 1,
      };
    },
    [physicalBoardCols, physicalBoardSize],
  );

  // 获取选中的 BeadColor 对象
  const selectedBeadColor = useMemo((): BeadColor | null => {
    if (!selection.colorId) return null;
    return allBeadColors.find((c) => c.id === selection.colorId) || null;
  }, [selection.colorId]);
  const {
    isDesktopSidebarSingleBoard,
    showMainWorkflowCard,
    showSidebarReplaceAction,
    showSidebarWorkflowActions,
    showToolbarReplaceAction,
  } = useMemo(
    () =>
      getMakingDesktopSingleBoardUiFlags({
        viewMode,
        useDesktopSidebarLayout,
        hasSelectedColor:
          selection.type === "color" && Boolean(selectedBeadColor),
      }),
    [
      selectedBeadColor,
      selection.type,
      useDesktopSidebarLayout,
      viewMode,
    ],
  );
  const {
    showToolbarOverview,
    showToolbarReset,
    showToolbarPrimaryComplete,
    showToolbarTools,
    showToolbarExport,
    showToolbarAssist,
    showToolsReplaceAction,
  } = useMemo(
    () =>
      getSingleBoardMobileUiFlags({
        viewMode,
        isSingleBoardMobile,
        hasSelectedColor:
          selection.type === "color" && Boolean(selectedBeadColor),
      }),
    [isSingleBoardMobile, selectedBeadColor, selection.type, viewMode],
  );

  const visionBoardRecommendation = useMemo(
    () => (beadData ? recommendBoard(beadData.width, beadData.height) : null),
    [beadData],
  );

  const visionInitialBoardIndex = useMemo(() => {
    if (!beadData || !visionBoardRecommendation) {
      return 0;
    }
    const rect = getBlockRectBySelection(selection.blockX, selection.blockY);
    if (!rect) return 0;
    const boardSize = visionBoardRecommendation.boardSize;
    const boardCol = Math.floor(rect.startX / boardSize);
    const boardRow = Math.floor(rect.startY / boardSize);
    return boardRow * visionBoardRecommendation.cols + boardCol;
  }, [
    beadData,
    getBlockRectBySelection,
    selection.blockX,
    selection.blockY,
    visionBoardRecommendation,
  ]);

  const visionInitialColorId =
    selection.type === "color" ? (selection.colorId ?? null) : null;

  const selectedBlockAnchor = useMemo(() => {
    if (!beadData || selection.type === null) return null;
    const rect = getBlockRectBySelection(selection.blockX, selection.blockY);
    if (!rect) return null;
    const anchorX = Math.min(
      rect.startX + Math.floor((rect.endX - rect.startX) / 2),
      beadData.width - 1,
    );
    const anchorY = Math.min(
      rect.startY + Math.floor((rect.endY - rect.startY) / 2),
      beadData.height - 1,
    );
    return { x: anchorX, y: anchorY };
  }, [
    beadData,
    getBlockRectBySelection,
    selection.blockX,
    selection.blockY,
    selection.type,
  ]);

  const currentBoardRect = useMemo(() => {
    if (!beadData || selection.type === null) return null;
    const sourceCellX = selectedCell?.x ?? selectedBlockAnchor?.x ?? 0;
    const sourceCellY = selectedCell?.y ?? selectedBlockAnchor?.y ?? 0;
    const boardCol = Math.floor(sourceCellX / physicalBoardSize);
    const boardRow = Math.floor(sourceCellY / physicalBoardSize);
    const startX = boardCol * physicalBoardSize;
    const startY = boardRow * physicalBoardSize;
    const endX = Math.min(startX + physicalBoardSize, beadData.width);
    const endY = Math.min(startY + physicalBoardSize, beadData.height);
    return {
      boardNumber: boardRow * physicalBoardCols + boardCol + 1,
      startX,
      startY,
      endX,
      endY,
    };
  }, [
    beadData,
    physicalBoardCols,
    physicalBoardSize,
    physicalBoardRows,
    selectedBlockAnchor,
    selectedCell,
    selection.blockX,
    selection.blockY,
    selection.type,
  ]);

  const singleBoardHasNeighborBoard = useMemo(() => {
    if (viewMode !== "singleBoard" || totalBoardCount <= 1) {
      return false;
    }

    return (
      !!getNeighborBoardNumber({
        activeBoardNumber,
        boardCols: physicalBoardCols,
        boardRows: physicalBoardRows,
        direction: "left",
      }) ||
      !!getNeighborBoardNumber({
        activeBoardNumber,
        boardCols: physicalBoardCols,
        boardRows: physicalBoardRows,
        direction: "right",
      }) ||
      !!getNeighborBoardNumber({
        activeBoardNumber,
        boardCols: physicalBoardCols,
        boardRows: physicalBoardRows,
        direction: "up",
      }) ||
      !!getNeighborBoardNumber({
        activeBoardNumber,
        boardCols: physicalBoardCols,
        boardRows: physicalBoardRows,
        direction: "down",
      })
    );
  }, [activeBoardNumber, physicalBoardCols, physicalBoardRows, totalBoardCount, viewMode]);

  const singleBoardSwipeUi = useMemo(() => {
    const status = getSingleBoardSwipeStatus({
      isSingleBoardMobile,
      scale,
      fitScale: singleBoardFitScale,
      hasNeighborBoard: singleBoardHasNeighborBoard,
    });
    const thresholdPercent = Math.max(
      1,
      Math.round(status.swipeThresholdScale * 100),
    );

    if (status.state === "swipe_edge_ready") {
      return {
        ...status,
        title: "可切板",
        text: "已进入切板手势区，拖到边缘后继续滑动即可切换",
        style: styles.singleBoardSwipeStatusReady,
      };
    }

    if (status.state === "swipe_ready") {
      return {
        ...status,
        title: "接近可切板",
        text: "已进入切板手势区，拖到边缘后滑动可切板",
        style: styles.singleBoardSwipeStatusReady,
      };
    }

    return {
      ...status,
      title: "当前为移动画面",
      text: `缩小到约 ${thresholdPercent}% 内后，可滑动切换板面`,
      style: styles.singleBoardSwipeStatusLocked,
    };
  }, [
    isSingleBoardMobile,
    scale,
    singleBoardFitScale,
    singleBoardHasNeighborBoard,
  ]);

  useEffect(() => {
    if (viewMode !== "traditional") return;
    if (currentBoardRect) {
      setActiveBoardNumber(currentBoardRect.boardNumber);
    }
  }, [currentBoardRect, viewMode]);

  const centerViewportOnRectAtScale = useCallback(
    (
      scaleValue: number,
      startX: number,
      startY: number,
      endX: number,
      endY: number,
      options?: { immediate?: boolean },
    ) => {
      if (!beadData || !wrapperRef.current) return;
      const rectCenterX = ((startX + endX) / 2) * baseCellSize * scaleValue;
      const rectCenterY = ((startY + endY) / 2) * baseCellSize * scaleValue;
      const canvasCenterX = (beadData.width * baseCellSize * scaleValue) / 2;
      const canvasCenterY = (beadData.height * baseCellSize * scaleValue) / 2;
      commitTranslate(
        scaleValue,
        canvasCenterX - rectCenterX,
        canvasCenterY - rectCenterY,
        options,
      );
    },
    [beadData, commitTranslate],
  );

  const centerViewportOnRect = useCallback(
    (startX: number, startY: number, endX: number, endY: number) => {
      centerViewportOnRectAtScale(scaleRef.current, startX, startY, endX, endY);
    },
    [centerViewportOnRectAtScale],
  );

  const resetCurrentView = useCallback(() => {
    if (selection.type === "color" && selectedCell) {
      centerViewportOnRect(
        selectedCell.x,
        selectedCell.y,
        selectedCell.x + 1,
        selectedCell.y + 1,
      );
      return;
    }

    if (selection.type === "block") {
      const blockRect = getBlockRectBySelection(
        selection.blockX,
        selection.blockY,
      );
      if (blockRect) {
        centerViewportOnRect(
          blockRect.startX,
          blockRect.startY,
          blockRect.endX,
          blockRect.endY,
        );
        return;
      }
    }

    const targetRect =
      viewMode === "singleBoard" ? activeBoardRect : currentBoardRect;
    if (!targetRect) return;
    centerViewportOnRect(
      targetRect.startX,
      targetRect.startY,
      targetRect.endX,
      targetRect.endY,
    );
  }, [
    activeBoardRect,
    centerViewportOnRect,
    currentBoardRect,
    getBlockRectBySelection,
    selectedCell,
    selection.blockX,
    selection.blockY,
    selection.type,
    viewMode,
  ]);

  const markSingleBoardMobileCanvasInteraction = useCallback(() => {
    if (!isSingleBoardMobile || viewMode !== "singleBoard") {
      return;
    }
    setSingleBoardMobileCanvasInteracted(true);
  }, [isSingleBoardMobile, viewMode]);

  const handleSingleBoardMobileToolbarToggle = useCallback(() => {
    const nextExpanded = !singleBoardMobileToolbarExpanded;
    if (nextExpanded) {
      setSingleBoardMobileCanvasInteracted(false);
    }
    setSingleBoardMobileToolbarExpanded(nextExpanded);
  }, [singleBoardMobileToolbarExpanded]);

  const activateBoard = useCallback(
    (boardNumber: number, shouldCenter = true) => {
      if (!beadData) return;
      const target = boardRects.find(
        (item) => item.boardNumber === boardNumber,
      );
      if (!target) return;
      const targetBlock = getPhysicalBoardBlockCoordinate(
        target.startX,
        target.startY,
        physicalBoardSize,
      );
      setActiveBoardNumber(boardNumber);
      setSelection({
        type: "block",
        blockX: targetBlock.blockX,
        blockY: targetBlock.blockY,
      });
      setSelectedCell(null);
      setTooltipState((prev) => ({ ...prev, visible: false }));
      if (shouldCenter) {
        if (viewMode === "singleBoard") {
          singleBoardAutoFitPendingRef.current = true;
        } else {
          centerViewportOnRect(
            target.startX,
            target.startY,
            target.endX,
            target.endY,
          );
        }
      }
    },
    [beadData, boardRects, centerViewportOnRect, physicalBoardSize, viewMode],
  );

  const handleOverviewCanvasClick = useCallback(
    (
      e: React.MouseEvent<HTMLCanvasElement>,
      options?: { closeMobileOverlay?: boolean },
    ) => {
      if (singleBoardMobileOverviewInteractionRef.current.dragMoved) {
        singleBoardMobileOverviewInteractionRef.current.dragMoved = false;
        return;
      }
      if (!beadData) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const layout = getOverviewCanvasLayout(rect.width, rect.height);
      if (!layout) return;
      const pointerX = e.clientX - rect.left;
      const pointerY = e.clientY - rect.top;
      const artworkX = (pointerX - layout.offsetX) / layout.overviewScale;
      const artworkY = (pointerY - layout.offsetY) / layout.overviewScale;
      if (
        artworkX < 0 ||
        artworkY < 0 ||
        artworkX >= beadData.width ||
        artworkY >= beadData.height
      ) {
        return;
      }

      const target = boardRects.find((board) =>
        artworkX >= board.startX &&
        artworkX < board.endX &&
        artworkY >= board.startY &&
        artworkY < board.endY,
      );
      if (!target) return;
      activateBoard(target.boardNumber, true);
      if (options?.closeMobileOverlay) {
        setSingleBoardMobileMiniMapExpanded(false);
      }
    },
    [activateBoard, beadData, boardRects, getOverviewCanvasLayout],
  );

  const handleSingleBoardMobileOverviewDragStart = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!singleBoardMobileOverviewLayout) return;
      if (singleBoardMobileOverviewResizeRef.current.resizing) return;
      singleBoardMobileOverviewInteractionRef.current.dragMoved = false;
      singleBoardMobileOverviewDragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        initialOffsetX: singleBoardMobileOverviewOffset.x,
        initialOffsetY: singleBoardMobileOverviewOffset.y,
        dragging: true,
      };
      e.currentTarget.setPointerCapture?.(e.pointerId);
      e.preventDefault();
    },
    [
      singleBoardMobileOverviewLayout,
      singleBoardMobileOverviewOffset.x,
      singleBoardMobileOverviewOffset.y,
    ],
  );

  const handleSingleBoardMobileOverviewResizeStart = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!singleBoardMobileOverviewLayout) return;
      singleBoardMobileOverviewInteractionRef.current.dragMoved = false;
      singleBoardMobileOverviewDragRef.current.dragging = false;
      singleBoardMobileOverviewResizeRef.current = {
        startX: e.clientX,
        startWidth: singleBoardMobileOverviewLayout.width,
        resizing: true,
      };
      e.currentTarget.setPointerCapture?.(e.pointerId);
      e.stopPropagation();
      e.preventDefault();
    },
    [singleBoardMobileOverviewLayout],
  );

  useEffect(() => {
    if (!singleBoardMobileMiniMapExpanded || !singleBoardMobileOverviewLayout) {
      singleBoardMobileOverviewDragRef.current.dragging = false;
      singleBoardMobileOverviewResizeRef.current.resizing = false;
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const dragState = singleBoardMobileOverviewDragRef.current;
      const resizeState = singleBoardMobileOverviewResizeRef.current;
      if (resizeState.resizing) {
        const nextWidth = clampSingleBoardMobileOverviewWidth({
          requestedWidth:
            resizeState.startWidth + (event.clientX - resizeState.startX),
          minWidth: singleBoardMobileOverviewLayout.minWidth,
          maxWidth: singleBoardMobileOverviewLayout.maxWidth,
        });
        if (nextWidth !== singleBoardMobileOverviewWidth) {
          setSingleBoardMobileOverviewWidth(nextWidth);
        }
        return;
      }
      if (!dragState.dragging) return;
      const deltaX = event.clientX - dragState.startX;
      const deltaY = event.clientY - dragState.startY;
      if (
        !singleBoardMobileOverviewInteractionRef.current.dragMoved &&
        Math.hypot(deltaX, deltaY) > 6
      ) {
        singleBoardMobileOverviewInteractionRef.current.dragMoved = true;
      }

      const nextOffset = clampSingleBoardMobileOverviewOffset({
        nextOffsetX: dragState.initialOffsetX + deltaX,
        nextOffsetY: dragState.initialOffsetY + deltaY,
        baseLeft:
          singleBoardMobileOverviewLayout.left -
          singleBoardMobileOverviewOffset.x,
        baseTop:
          singleBoardMobileOverviewLayout.top -
          singleBoardMobileOverviewOffset.y,
        minLeft: singleBoardMobileOverviewLayout.minLeft,
        maxLeft: singleBoardMobileOverviewLayout.maxLeft,
        minTop: singleBoardMobileOverviewLayout.minTop,
        maxTop: singleBoardMobileOverviewLayout.maxTop,
      });
      setSingleBoardMobileOverviewOffset({
        x: nextOffset.offsetX,
        y: nextOffset.offsetY,
      });
    };

    const handlePointerUp = () => {
      singleBoardMobileOverviewDragRef.current.dragging = false;
      singleBoardMobileOverviewResizeRef.current.resizing = false;
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [
    singleBoardMobileMiniMapExpanded,
    singleBoardMobileOverviewLayout,
    singleBoardMobileOverviewOffset.x,
    singleBoardMobileOverviewOffset.y,
    singleBoardMobileOverviewWidth,
  ]);

  useEffect(() => {
    if (!singleBoardMobileMiniMapExpanded) {
      setSingleBoardMobileOverviewOffset({ x: 0, y: 0 });
      singleBoardMobileOverviewResizeRef.current.resizing = false;
    }
  }, [singleBoardMobileMiniMapExpanded]);

  useEffect(() => {
    if (!singleBoardMobileMiniMapExpanded || !singleBoardMobileOverviewLayout) {
      return;
    }
    const baseLeft =
      singleBoardMobileOverviewLayout.left - singleBoardMobileOverviewOffset.x;
    const baseTop =
      singleBoardMobileOverviewLayout.top - singleBoardMobileOverviewOffset.y;
    const clamped = clampSingleBoardMobileOverviewOffset({
      nextOffsetX: singleBoardMobileOverviewOffset.x,
      nextOffsetY: singleBoardMobileOverviewOffset.y,
      baseLeft,
      baseTop,
      minLeft: singleBoardMobileOverviewLayout.minLeft,
      maxLeft: singleBoardMobileOverviewLayout.maxLeft,
      minTop: singleBoardMobileOverviewLayout.minTop,
      maxTop: singleBoardMobileOverviewLayout.maxTop,
    });
    if (
      clamped.offsetX !== singleBoardMobileOverviewOffset.x ||
      clamped.offsetY !== singleBoardMobileOverviewOffset.y
    ) {
      setSingleBoardMobileOverviewOffset({
        x: clamped.offsetX,
        y: clamped.offsetY,
      });
    }
  }, [
    singleBoardMobileMiniMapExpanded,
    singleBoardMobileOverviewLayout,
    singleBoardMobileOverviewOffset.x,
    singleBoardMobileOverviewOffset.y,
  ]);

  useEffect(() => {
    if (!isSingleBoardMobile) return;
    try {
      const raw = localStorage.getItem(
        SINGLE_BOARD_MOBILE_OVERVIEW_WIDTH_STORAGE_KEY,
      );
      if (!raw) return;
      const parsed = Number(raw);
      if (!Number.isFinite(parsed)) return;
      setSingleBoardMobileOverviewWidth(parsed);
    } catch {
      // ignore storage read failure
    }
  }, [isSingleBoardMobile]);

  useEffect(() => {
    if (!isSingleBoardMobile) return;
    try {
      localStorage.setItem(
        SINGLE_BOARD_MOBILE_OVERVIEW_WIDTH_STORAGE_KEY,
        String(singleBoardMobileOverviewWidth),
      );
    } catch {
      // ignore storage write failure
    }
  }, [isSingleBoardMobile, singleBoardMobileOverviewWidth]);

  const handleToggleBoardDone = useCallback(() => {
    if (!activeBoardRect) return;
    const nextDone = !boardStatusMap[activeBoardRect.boardNumber];
    setBoardStatusMap((prev) => ({
      ...prev,
      [activeBoardRect.boardNumber]: nextDone,
    }));
    if (nextDone) {
      if (autoAdvanceOnBoardDone) {
        const currentIndex = boardRects.findIndex(
          (item) => item.boardNumber === activeBoardRect.boardNumber,
        );
        const nextPending = boardRects
          .slice(currentIndex + 1)
          .find((item) => !boardStatusMap[item.boardNumber]);
        if (nextPending) {
          activateBoard(nextPending.boardNumber, true);
          toast.info(
            `已完成板${activeBoardRect.boardNumber}，已切到板${nextPending.boardNumber}`,
          );
          return;
        }
      }
      const remaining = boardRects.filter((item) => {
        if (item.boardNumber === activeBoardRect.boardNumber) return false;
        return !boardStatusMap[item.boardNumber];
      }).length;
      if (remaining === 0) {
        toast.success("所有板已完成");
      } else {
        toast.info(`已标记板${activeBoardRect.boardNumber}完成`);
      }
      return;
    }
    toast.info(`已取消板${activeBoardRect.boardNumber}完成`);
  }, [
    activateBoard,
    activeBoardRect,
    autoAdvanceOnBoardDone,
    boardRects,
    boardStatusMap,
    toast,
  ]);

  const singleBoardProgress = useMemo(() => {
    const doneCount = Object.values(boardStatusMap).filter(Boolean).length;
    const totalCount = totalBoardCount;
    return {
      doneCount,
      totalCount,
      remainingCount: Math.max(totalCount - doneCount, 0),
      percent: totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0,
    };
  }, [boardStatusMap, totalBoardCount]);

  const singleBoardAllDone = useMemo(
    () =>
      singleBoardProgress.totalCount > 0 &&
      singleBoardProgress.doneCount >= singleBoardProgress.totalCount,
    [singleBoardProgress.doneCount, singleBoardProgress.totalCount],
  );

  const singleBoardMobileImmersiveLayout =
    getSingleBoardMobileImmersiveLayout({
      viewMode,
      isSingleBoardMobile,
      singleBoardAllDone,
    });
  const isSingleBoardMobileImmersive =
    singleBoardMobileImmersiveLayout.enabled;
  singleBoardMobileImmersiveRef.current = isSingleBoardMobileImmersive;
  const isSingleBoardInteractionLocked =
    isSingleBoardMobileImmersive &&
    (singleBoardMobileToolbarExpanded ||
      showSettings ||
      singleBoardMobileMiniMapExpanded);

  const nextPendingBoardNumber = useMemo(() => {
    const nextPending = boardRects.find(
      (item) => !boardStatusMap[item.boardNumber],
    );
    return nextPending?.boardNumber ?? null;
  }, [boardRects, boardStatusMap]);

  const usageSummary = useMemo(() => {
    if (!beadData) return null;
    return countBeadUsage(beadData);
  }, [beadData]);

  const inventoryStorageScope = useMemo(() => {
    if (projectId) return `project_${projectId}`;
    if (localProjectId) return `local_${localProjectId}`;
    if (beadData) return `temp_${beadData.width}x${beadData.height}`;
    return "unknown";
  }, [beadData, localProjectId, projectId]);

  const consumedInventoryKey = useMemo(
    () => `making_inventory_consumed_${inventoryStorageScope}`,
    [inventoryStorageScope],
  );

  const [inventoryConsumed, setInventoryConsumed] = useState(false);

  const inventoryCheck = useMemo(() => {
    if (!usageSummary) {
      return {
        totalNeed: 0,
        shortageTotal: 0,
        shortageCount: 0,
        canApply: false,
      };
    }
    const quantities = beadInventoryService.getQuantities();
    let shortageTotal = 0;
    let shortageCount = 0;
    usageSummary.usageList.forEach((item) => {
      const stock = quantities[item.color.id] || 0;
      const shortage = Math.max(item.count - stock, 0);
      if (shortage > 0) {
        shortageCount += 1;
        shortageTotal += shortage;
      }
    });
    return {
      totalNeed: usageSummary.totalBeads,
      shortageTotal,
      shortageCount,
      canApply: shortageTotal === 0,
    };
  }, [inventoryVersion, usageSummary]);

  const pendingBoardNumbers = useMemo(() => {
    return boardRects
      .filter((item) => !boardStatusMap[item.boardNumber])
      .map((item) => item.boardNumber);
  }, [boardRects, boardStatusMap]);

  const resumeBoardNumber = useMemo(() => {
    if (
      activeBoardNumber > 0 &&
      pendingBoardNumbers.includes(activeBoardNumber)
    ) {
      return activeBoardNumber;
    }
    return pendingBoardNumbers[0] ?? null;
  }, [activeBoardNumber, pendingBoardNumbers]);

  const compactBoardNav = useMemo(() => {
    if (totalBoardCount <= 0) {
      return [];
    }
    const values = new Set<number>([
      Math.max(1, activeBoardNumber - 1),
      activeBoardNumber,
      Math.min(totalBoardCount, activeBoardNumber + 1),
    ]);
    return Array.from(values).sort((a, b) => a - b);
  }, [activeBoardNumber, totalBoardCount]);

  const activeBoardDone = useMemo(() => {
    if (!activeBoardRect) return false;
    return Boolean(boardStatusMap[activeBoardRect.boardNumber]);
  }, [activeBoardRect, boardStatusMap]);

  useLayoutEffect(() => {
    if (!isSingleBoardMobile || singleBoardAllDone) {
      setSingleBoardMobileChromeHeights((prev) =>
        prev.summary === 0 && prev.toolbar === 0 && prev.swipeStatus === 0
          ? prev
          : { summary: 0, toolbar: 0, swipeStatus: 0 },
      );
      return;
    }

    const modeSwitchHeight = Math.ceil(
      singleBoardMobileModeSwitchRef.current?.getBoundingClientRect().height ?? 0,
    );
    const chromeHeight = Math.ceil(
      singleBoardMobileChromeRef.current?.getBoundingClientRect().height ?? 0,
    );
    const nextHeights = {
      summary: modeSwitchHeight + chromeHeight,
      toolbar: 0,
      swipeStatus: 0,
    };

    setSingleBoardMobileChromeHeights((prev) =>
      prev.summary === nextHeights.summary &&
      prev.toolbar === nextHeights.toolbar &&
      prev.swipeStatus === nextHeights.swipeStatus
        ? prev
        : nextHeights,
    );
  }, [
    activeBoardDone,
    activeBoardNumber,
    isSingleBoardMobile,
    nextPendingBoardNumber,
    resumeBoardNumber,
    showSingleBoardMobileOverviewButton,
    singleBoardAllDone,
    singleBoardMobileToolbarExpanded,
    singleBoardProgress.doneCount,
    singleBoardProgress.remainingCount,
    singleBoardProgress.totalCount,
    singleBoardSwipeUi.text,
    singleBoardSwipeUi.title,
    totalBoardCount,
    viewportWidth,
  ]);

  useEffect(() => {
    if (!isSingleBoardMobile || viewMode !== "singleBoard") {
      setSingleBoardMobileCanvasInteracted(false);
      return;
    }

    if (singleBoardMobileToolbarState.collapsed) {
      setSingleBoardMobileToolbarExpanded((prev) => (prev ? false : prev));
    }
  }, [
    isSingleBoardMobile,
    singleBoardMobileToolbarState.collapsed,
    viewMode,
  ]);

  useEffect(() => {
    if (!singleBoardStorageKey) return;
    let cancelled = false;
    setSingleBoardHydrated(false);
    try {
      const raw = localStorage.getItem(singleBoardStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          viewMode?: MakingViewMode;
          activeBoardNumber?: number;
          boardStatusMap?: BoardStatusMap;
          singleBoardOverviewCollapsed?: boolean;
          autoAdvanceOnBoardDone?: boolean;
        };
        if (
          parsed.viewMode === "singleBoard" ||
          parsed.viewMode === "traditional"
        ) {
          setViewMode(parsed.viewMode);
        }
        if (
          parsed.activeBoardNumber &&
          Number.isFinite(parsed.activeBoardNumber)
        ) {
          setActiveBoardNumber(parsed.activeBoardNumber);
        }
        if (
          parsed.boardStatusMap &&
          typeof parsed.boardStatusMap === "object"
        ) {
          setBoardStatusMap(parsed.boardStatusMap);
        }
        if (typeof parsed.singleBoardOverviewCollapsed === "boolean") {
          setSingleBoardOverviewCollapsed(parsed.singleBoardOverviewCollapsed);
        }
        if (typeof parsed.autoAdvanceOnBoardDone === "boolean") {
          setAutoAdvanceOnBoardDone(parsed.autoAdvanceOnBoardDone);
        }
      }
      const desktopSidebarRaw = localStorage.getItem(
        MAKING_DESKTOP_SIDEBAR_STORAGE_KEY,
      );
      if (desktopSidebarRaw === "1" || desktopSidebarRaw === "0") {
        setMakingDesktopSidebarCollapsed(desktopSidebarRaw === "1");
      }
    } catch (error) {
      console.warn("[MakingPage] 读取单板模式本地状态失败", error);
    }
    const finishHydrate = () => {
      if (!cancelled) {
        setSingleBoardHydrated(true);
      }
    };
    if (
      typeof window !== "undefined" &&
      typeof window.requestAnimationFrame === "function"
    ) {
      window.requestAnimationFrame(() => finishHydrate());
    } else {
      setTimeout(finishHydrate, 0);
    }
    return () => {
      cancelled = true;
    };
  }, [singleBoardStorageKey]);

  useEffect(() => {
    try {
      setInventoryConsumed(localStorage.getItem(consumedInventoryKey) === "1");
    } catch (error) {
      console.warn("[MakingPage] 读取豆仓扣减状态失败", error);
      setInventoryConsumed(false);
    }
  }, [consumedInventoryKey]);

  useEffect(() => {
    if (!singleBoardStorageKey || !singleBoardHydrated) return;
    try {
      localStorage.setItem(
        singleBoardStorageKey,
        JSON.stringify({
          viewMode,
          activeBoardNumber,
          boardStatusMap,
          singleBoardOverviewCollapsed,
          autoAdvanceOnBoardDone,
        }),
      );
    } catch (error) {
      console.warn("[MakingPage] 保存单板模式本地状态失败", error);
    }
  }, [
    activeBoardNumber,
    autoAdvanceOnBoardDone,
    boardStatusMap,
    singleBoardHydrated,
    singleBoardOverviewCollapsed,
    singleBoardStorageKey,
    viewMode,
  ]);

  useEffect(() => {
    if (!singleBoardHydrated || !useDesktopSidebarLayout) return;
    try {
      localStorage.setItem(
        MAKING_DESKTOP_SIDEBAR_STORAGE_KEY,
        makingDesktopSidebarCollapsed ? "1" : "0",
      );
    } catch (error) {
      console.warn("[MakingPage] 保存桌面侧边栏折叠状态失败", error);
    }
  }, [
    makingDesktopSidebarCollapsed,
    singleBoardHydrated,
    useDesktopSidebarLayout,
  ]);

  useEffect(() => {
    if (
      !singleBoardHydrated ||
      viewMode !== "singleBoard" ||
      !resumeBoardNumber
    ) {
      return;
    }
    if (singleBoardResumeAppliedRef.current) {
      return;
    }
    const shouldResume =
      !pendingBoardNumbers.includes(activeBoardNumber) ||
      activeBoardNumber !== resumeBoardNumber;
    if (shouldResume) {
      activateBoard(resumeBoardNumber, true);
    }
    singleBoardResumeAppliedRef.current = true;
  }, [
    activateBoard,
    activeBoardNumber,
    pendingBoardNumbers,
    resumeBoardNumber,
    singleBoardHydrated,
    viewMode,
  ]);

  useEffect(() => {
    if (viewMode !== "singleBoard") {
      singleBoardResumeAppliedRef.current = false;
    }
  }, [viewMode]);

  useEffect(() => {
    if (!shareFeedback || shareFeedback === "preparing") {
      return;
    }
    const timer = window.setTimeout(() => {
      setShareFeedback(null);
    }, 3200);
    return () => window.clearTimeout(timer);
  }, [shareFeedback]);

  useEffect(() => {
    if (!inventoryFeedback) return;
    const timer = window.setTimeout(() => setInventoryFeedback(null), 2600);
    return () => window.clearTimeout(timer);
  }, [inventoryFeedback]);

  useEffect(() => {
    if (viewMode !== "singleBoard" || !singleBoardAllDone) {
      setShareFeedback(null);
      setInventoryFeedback(null);
    }
  }, [singleBoardAllDone, viewMode]);

  const handleDeductInventory = useCallback(() => {
    if (!usageSummary) return;
    if (inventoryConsumed) {
      toast.info("这件作品已经扣减过豆仓");
      return;
    }
    if (!inventoryCheck.canApply) {
      toast.info(`库存不足，还差 ${inventoryCheck.shortageTotal} 颗，先去补仓`);
      return;
    }
    const confirmed = window.confirm(
      `确认按本作品用量扣减豆仓库存？\n\n总计 ${usageSummary.totalBeads} 颗，涉及 ${usageSummary.colorCount} 种颜色。\n扣减后会标记本作品已扣减，避免重复扣减。`,
    );
    if (!confirmed) return;
    beadInventoryService.applyConsumption(
      Object.fromEntries(
        usageSummary.usageList.map((item) => [item.color.id, item.count]),
      ),
    );
    try {
      localStorage.setItem(consumedInventoryKey, "1");
    } catch (error) {
      console.warn("[MakingPage] 保存豆仓扣减状态失败", error);
    }
    setInventoryConsumed(true);
    setInventoryVersion((prev) => prev + 1);
    setInventoryFeedback(
      `已从豆仓扣减本作品所需 ${usageSummary.totalBeads} 颗拼豆`,
    );
    toast.success("已扣减豆仓库存");
  }, [
    consumedInventoryKey,
    inventoryCheck.canApply,
    inventoryCheck.shortageTotal,
    inventoryConsumed,
    toast,
    usageSummary,
  ]);

  const jumpToBoard = useCallback(
    (direction: -1 | 1) => {
      if (!beadData) return;
      const currentBoardNumber =
        viewMode === "singleBoard"
          ? activeBoardNumber
          : currentBoardRect?.boardNumber;
      if (!currentBoardNumber) return;
      const targetBoardNumber = currentBoardNumber + direction;
      const maxBoardNumber = physicalBoardCols * physicalBoardRows;
      if (targetBoardNumber < 1 || targetBoardNumber > maxBoardNumber) {
        return;
      }
      activateBoard(targetBoardNumber, true);
      toast.info(`已切到板${targetBoardNumber}`);
    },
    [
      activeBoardNumber,
      activateBoard,
      beadData,
      currentBoardRect,
      physicalBoardCols,
      physicalBoardRows,
      toast,
      viewMode,
    ],
  );

  const selectedCoordinateSummary = useMemo(() => {
    if (!beadData || selection.type === null || !currentBoardRect) return null;
    if (selection.type === "color" && selectedCell) {
      const boardCoordinate = getPhysicalBoardCoordinate(
        selectedCell.x,
        selectedCell.y,
      );
      return {
        boardNumber: boardCoordinate.boardNumber,
        localCol: boardCoordinate.localCol,
        localRow: boardCoordinate.localRow,
        globalCol: selectedCell.x + 1,
        globalRow: selectedCell.y + 1,
        boardLabel: `板${boardCoordinate.boardNumber}`,
      };
    }

    return {
      boardNumber: currentBoardRect.boardNumber,
      localCol: ((selectedBlockAnchor?.x ?? 0) % physicalBoardSize) + 1,
      localRow: ((selectedBlockAnchor?.y ?? 0) % physicalBoardSize) + 1,
      globalCol: (selectedBlockAnchor?.x ?? 0) + 1,
      globalRow: (selectedBlockAnchor?.y ?? 0) + 1,
      boardLabel: `板${currentBoardRect.boardNumber}`,
    };
  }, [
    beadData,
    currentBoardRect,
    getPhysicalBoardCoordinate,
    physicalBoardSize,
    selectedBlockAnchor,
    selectedCell,
    selection.blockX,
    selection.blockY,
    selection.type,
  ]);

  // 点击选择只改变高亮状态，不再自动移动视图。
  // 视图移动仅保留给“复位视图”和显式切板等用户主动操作。

  // 计算合适缩放（仅首次加载执行，换色等不重置）
  const initialScaleSetRef = useRef(false);
  const traditionalViewSanityCheckedRef = useRef(false);
  useEffect(() => {
    if (
      displayBoardRect &&
      displayWidth > 0 &&
      displayHeight > 0 &&
      !initialScaleSetRef.current
    ) {
      initialScaleSetRef.current = true;
      const timer = setTimeout(() => {
        const viewportHeight = window.innerHeight;
        const wrapper = wrapperRef.current;
        const wrapperWidth = wrapper?.clientWidth || window.innerWidth;
        const wrapperHeight =
          wrapper?.clientHeight || viewportHeight - 40 - 64 - 50 - 60 - 24;
        const fitWidth = wrapperWidth / (displayWidth * baseCellSize);
        const fitHeight = wrapperHeight / (displayHeight * baseCellSize);
        const fitScale = Math.min(fitWidth, fitHeight);
        const nextScale = Math.min(
          renderMaxScale,
          Math.max(MIN_SCALE, fitScale),
        );
        commitTranslate(nextScale, 0, 0, { immediate: true });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [
    commitTranslate,
    displayBoardRect,
    displayHeight,
    displayWidth,
    renderMaxScale,
  ]);

  useEffect(() => {
    traditionalViewSanityCheckedRef.current = false;
  }, [beadData, viewMode]);

  useEffect(() => {
    if (viewMode !== "singleBoard") {
      singleBoardAutoFitPendingRef.current = true;
    }
  }, [viewMode]);

  useEffect(() => {
    if (viewMode !== "singleBoard" || singleBoardAllDone) {
      return;
    }

    try {
      const onboardingState = parseSingleBoardOnboardingState(
        localStorage.getItem(SINGLE_BOARD_ONBOARDING_STORAGE_KEY),
      );
      if (onboardingState.completed) {
        return;
      }
      if (!showSingleBoardOnboarding) {
        setShowSingleBoardOnboarding(true);
      }
      if (!onboardingState.seen) {
        localStorage.setItem(
          SINGLE_BOARD_ONBOARDING_STORAGE_KEY,
          JSON.stringify({
            seen: true,
            completed: false,
          }),
        );
      }
    } catch (e) {
      console.warn("[MakingPage] 读取单板模式引导状态失败:", e);
      setShowSingleBoardOnboarding(true);
    }
  }, [showSingleBoardOnboarding, singleBoardAllDone, viewMode]);

  useEffect(() => {
    if (viewMode !== "traditional" || traditionalViewSanityCheckedRef.current) {
      return;
    }
    traditionalViewSanityCheckedRef.current = true;
    if (selection.type !== null) {
      return;
    }
    const wrapper = wrapperRef.current;
    if (
      !wrapper ||
      !displayBoardRect ||
      displayWidth <= 0 ||
      displayHeight <= 0
    ) {
      return;
    }
    const driftX = Math.abs(translateRef.current.x);
    const driftY = Math.abs(translateRef.current.y);
    const driftThresholdX = wrapper.clientWidth * 0.35;
    const driftThresholdY = wrapper.clientHeight * 0.35;
    if (driftX <= driftThresholdX && driftY <= driftThresholdY) {
      return;
    }
    const fitWidth = wrapper.clientWidth / (displayWidth * baseCellSize);
    const fitHeight = wrapper.clientHeight / (displayHeight * baseCellSize);
    const nextScale = Math.min(
      renderMaxScale,
      Math.max(MIN_SCALE, Math.min(fitWidth, fitHeight)),
    );
    commitTranslate(nextScale, 0, 0, { immediate: true });
  }, [
    beadData,
    commitTranslate,
    displayBoardRect,
    displayHeight,
    displayWidth,
    renderMaxScale,
    selection.type,
    viewMode,
  ]);

  useEffect(() => {
    if (
      viewMode !== "singleBoard" ||
      !displayBoardRect ||
      displayWidth <= 0 ||
      displayHeight <= 0 ||
      !singleBoardAutoFitPendingRef.current
    ) {
      return;
    }
    const timer = setTimeout(() => {
      const scaleDecision = getSingleBoardAutoFocusScaleDecision({
        currentScale: scaleRef.current,
        minScale: activeMinScale,
        maxScale: renderMaxScale,
      });
      singleBoardAutoFitPendingRef.current = false;
      centerViewportOnRectAtScale(
        scaleDecision.nextScale,
        displayBoardRect.startX,
        displayBoardRect.startY,
        displayBoardRect.endX,
        displayBoardRect.endY,
        { immediate: true },
      );
    }, 60);
    return () => clearTimeout(timer);
  }, [
    activeMinScale,
    activeBoardNumber,
    centerViewportOnRectAtScale,
    displayBoardRect,
    displayHeight,
    displayWidth,
    renderMaxScale,
    viewMode,
  ]);

  // 适应屏幕：重置缩放与位移
  const handleFitScreen = useCallback(() => {
    if (!displayBoardRect || displayWidth <= 0) return;
    const wrapper = wrapperRef.current;
    const wrapperWidth = wrapper?.clientWidth || window.innerWidth;
    const fitWidth = wrapperWidth / (displayWidth * baseCellSize);
    const nextScale =
      viewMode === "singleBoard"
        ? getDisplayFitScale()
        : Math.min(renderMaxScale, Math.max(MIN_SCALE, fitWidth));
    if (!nextScale) return;
    commitTranslate(nextScale, 0, 0, { immediate: true });
  }, [
    commitTranslate,
    displayBoardRect,
    displayWidth,
    getDisplayFitScale,
    renderMaxScale,
    viewMode,
  ]);

  const handleOpenTraditionalOverview = useCallback(() => {
    setViewMode("traditional");
    requestAnimationFrame(() => {
      handleFitScreen();
    });
  }, [handleFitScreen]);

  const handleBackToEditor = useCallback(() => {
    handleBackToSource();
  }, [handleBackToSource]);

  const handleShareFinishedWork = useCallback(async () => {
    setShareFeedback("preparing");
    const shareTitle = "拼豆作品已完成";
    const shareText = beadData
      ? `我刚完成了一张 ${beadData.width}x${beadData.height} 的拼豆图案，来试试这个单板制作模式。`
      : "我刚完成了一张拼豆图案，来试试这个单板制作模式。";
    const shareUrl = `${window.location.origin}/mobile/create`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        setShareFeedback("shared");
        toast.success("已打开系统分享");
        return;
      } catch (error) {
        if ((error as Error)?.name === "AbortError") {
          setShareFeedback(null);
          return;
        }
      }
    }

    try {
      await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      setShareFeedback("copied");
      toast.success("已复制分享文案");
    } catch (error) {
      console.error("[MakingPage] 复制分享文案失败:", error);
      setShareFeedback("unsupported");
      toast.info("当前环境不支持直接分享，请先导出图纸再发送");
    }
  }, [beadData, toast]);

  // ===== 状态保存与恢复 =====
  const getStorageKey = useCallback(() => {
    if (projectId) return `making_state_${projectId}`;
    if (beadData)
      return `making_state_temp_${beadData.width}x${beadData.height}`;
    return null;
  }, [projectId, beadData]);

  // 保存选中状态到本地（自动调用，无网络请求）
  const saveSelectionStateToLocal = useCallback(() => {
    const key = getStorageKey();
    if (!key || selection.type === null) return;

    const stateToSave = {
      type: selection.type,
      blockX: selection.blockX,
      blockY: selection.blockY,
      colorHex: selection.colorHex,
      colorId: selection.colorId,
      timestamp: Date.now(),
    };

    try {
      localStorage.setItem(key, JSON.stringify(stateToSave));
      console.log("[MakingPage] 进度已保存到本地");
    } catch (e) {
      console.error("保存本地状态失败:", e);
    }
  }, [getStorageKey, selection]);

  // 登录用户 + 云端方案：自动同步制作进度到后端
  const saveSelectionStateToCloud = useCallback(async () => {
    if (!projectId || !isLoggedIn) return;

    try {
      await projectApi.updateProgress(projectId, {
        progress: {
          selectionType: selection.type,
          blockX: selection.blockX,
          blockY: selection.blockY,
          colorHex: selection.colorHex,
          colorId: selection.colorId,
          timestamp: Date.now(),
        },
      });
      console.log("[MakingPage] progress synced to cloud");
    } catch (e) {
      console.warn("[MakingPage] cloud progress sync failed:", e);
    }
  }, [projectId, isLoggedIn, selection]);

  // 恢复选中状态（优先云端，其次本地）
  useEffect(() => {
    if (!beadData) return;

    // 优先使用从云端传入的进度
    if (savedProgress && savedProgress.selectionType) {
      if (savedProgress.blockX < blocksX && savedProgress.blockY < blocksY) {
        setSelection({
          type: savedProgress.selectionType,
          blockX: savedProgress.blockX,
          blockY: savedProgress.blockY,
          colorHex: savedProgress.colorHex,
          colorId: savedProgress.colorId,
        });
        console.log("[MakingPage] 已从云端恢复进度");
        return;
      }
    }

    // 其次尝试从本地恢复
    const key = getStorageKey();
    if (!key) return;

    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const state = JSON.parse(saved);
        // 验证数据有效性
        if (state.blockX < blocksX && state.blockY < blocksY) {
          setSelection({
            type: state.type,
            blockX: state.blockX,
            blockY: state.blockY,
            colorHex: state.colorHex,
            colorId: state.colorId,
          });
          console.log("[MakingPage] 已从本地恢复进度");
        }
      }
    } catch (e) {
      console.error("恢复状态失败:", e);
    }
  }, [getStorageKey, beadData, blocksX, blocksY, savedProgress]);

  // 页面切后台/关闭/卸载时保存到本地
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        saveSelectionStateToLocal();
        saveSelectionStateToCloud();
      }
    };

    const handlePageHide = () => {
      saveSelectionStateToLocal();
      saveSelectionStateToCloud();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      // 组件卸载时也保存（比如点击返回）
      saveSelectionStateToLocal();
      saveSelectionStateToCloud();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [saveSelectionStateToLocal, saveSelectionStateToCloud]);

  // 防抖云同步，避免频繁请求
  useEffect(() => {
    if (!projectId || !isLoggedIn) return;

    const timer = window.setTimeout(() => {
      saveSelectionStateToCloud();
    }, 600);

    return () => window.clearTimeout(timer);
  }, [projectId, isLoggedIn, selection, saveSelectionStateToCloud]);

  // 切换选中状态时自动保存到本地
  useEffect(() => {
    if (selection.type !== null) {
      saveSelectionStateToLocal();
    }
  }, [selection, saveSelectionStateToLocal]);

  // ===== 屏幕常亮功能 =====
  const toggleWakeLock = useCallback(async () => {
    if (wakeLockActive && wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        setWakeLockActive(false);
        toast.info("屏幕常亮已关闭");
      } catch (err) {
        console.error("释放 Wake Lock 失败:", err);
      }
    } else {
      if ("wakeLock" in navigator && navigator.wakeLock) {
        try {
          wakeLockRef.current = await navigator.wakeLock.request("screen");
          setWakeLockActive(true);
          toast.success("屏幕常亮已开启");
          wakeLockRef.current.addEventListener("release", () => {
            setWakeLockActive(false);
          });
        } catch (err) {
          console.error("请求 Wake Lock 失败:", err);
        }
      } else {
        toast.info("您的浏览器不支持屏幕常亮功能");
      }
    }
  }, [wakeLockActive, toast]);

  useEffect(() => {
    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
      }
    };
  }, []);

  // ===== 点击处理（交互核心）=====
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (isSingleBoardInteractionLocked) return;
      if (
        !beadData ||
        !canvasRef.current ||
        !wrapperRef.current ||
        !displayBoardRect
      )
        return;

      markSingleBoardMobileCanvasInteraction();

      // 防止触摸事件后的 click 二次触发（touchEnd 已处理）
      if (Date.now() - lastTapProcessedRef.current < 500) return;

      // 拖拽检测：通过 dragStartPosRef 判断是否为拖动
      const startPos = dragStartPosRef.current;
      dragStartPosRef.current = null; // 用完即清
      if (!startPos) return; // 没有 mousedown 记录，直接返回

      const dx = e.clientX - startPos.x;
      const dy = e.clientY - startPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > 10) return; // 这是拖动，不处理点击

      const canvas = canvasRef.current;
      const wrapper = wrapperRef.current;
      const rect = canvas.getBoundingClientRect();
      const wrapperRect = wrapper.getBoundingClientRect();

      // 计算点击的格子坐标：必须按当前画布真实显示尺寸反推，
      // 不能继续用 baseCellSize * scale，否则高倍率下会出现焦点漂移。
      const drawCellWidth = rect.width / displayWidth;
      const drawCellHeight = rect.height / displayHeight;
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      const cellX = Math.floor(clickX / drawCellWidth);
      const cellY = Math.floor(clickY / drawCellHeight);

      // 边界检查
      if (
        cellX < 0 ||
        cellX >= displayWidth ||
        cellY < 0 ||
        cellY >= displayHeight
      ) {
        return;
      }

      const globalCellX = displayBoardRect.startX + cellX;
      const globalCellY = displayBoardRect.startY + cellY;

      // 计算所在区块（按现实豆板分区）
      const blockCoordinate = getPhysicalBoardBlockCoordinate(
        globalCellX,
        globalCellY,
        physicalBoardSize,
      );
      const blockX = blockCoordinate.blockX;
      const blockY = blockCoordinate.blockY;

      // 根据缩放级别决定行为
      if (scale < DETAIL_MODE_THRESHOLD) {
        // 缩小状态：选中区块
        if (
          selection.type === "block" &&
          selection.blockX === blockX &&
          selection.blockY === blockY
        ) {
          setSelection({ type: null, blockX: 0, blockY: 0 });
          setSelectedCell(null);
          setTooltipState((prev) => ({ ...prev, visible: false }));
        } else {
          setSelection({
            type: "block",
            blockX,
            blockY,
          });
          setSelectedCell(null);
          setTooltipState((prev) => ({ ...prev, visible: false }));
        }
      } else {
        // 放大状态：选中颜色
        const index = globalCellY * beadData.width + globalCellX;
        const bead = beadData.beads[index];
        if (!bead) {
          setSelection({ type: null, blockX: 0, blockY: 0 });
          setSelectedCell(null);
          setTooltipState((prev) => ({ ...prev, visible: false }));
          return;
        }

        // 显示坐标提示
        const screenX = e.clientX - wrapperRect.left;
        const screenY = e.clientY - wrapperRect.top;
        const boardCoordinate = getPhysicalBoardCoordinate(
          globalCellX,
          globalCellY,
        );

        setTooltipState({
          visible: true,
          row: globalCellY + 1,
          col: globalCellX + 1,
          boardNumber: boardCoordinate.boardNumber,
          localRow: boardCoordinate.localRow,
          localCol: boardCoordinate.localCol,
          screenX,
          screenY,
        });

        if (voiceEnabled) {
          speakCoordinate(
            globalCellY + 1,
            globalCellX + 1,
            boardCoordinate.boardNumber,
            boardCoordinate.localRow,
            boardCoordinate.localCol,
          );
        }

        const sameCell =
          selection.type === "color" &&
          selectedCell?.x === globalCellX &&
          selectedCell?.y === globalCellY;

        // 只有重复点击同一个格子时才取消；点击其他格子一律直接切换
        if (sameCell) {
          setSelection({ type: null, blockX: 0, blockY: 0 });
          setSelectedCell(null);
          setTooltipState((prev) => ({ ...prev, visible: false }));
        } else {
          setSelection({
            type: "color",
            blockX,
            blockY,
            colorHex: bead.hex,
            colorId: bead.id,
          });
          setSelectedCell({ x: globalCellX, y: globalCellY });
        }
      }
    },
    [
      beadData,
      displayBoardRect,
      displayHeight,
      displayWidth,
      getPhysicalBoardCoordinate,
      physicalBoardSize,
      scale,
      selectedCell,
      selection,
      voiceEnabled,
      toast,
      markSingleBoardMobileCanvasInteraction,
      isSingleBoardInteractionLocked,
    ],
  );

  // 触摸拖动处理
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isSingleBoardInteractionLocked) {
      e.preventDefault();
      return;
    }
    markSingleBoardMobileCanvasInteraction();
    if (e.touches.length === 1) {
      setIsDragging(true);
      const touch = e.touches[0];
      lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
      dragStartTimeRef.current = Date.now();
      dragStartPosRef.current = { x: touch.clientX, y: touch.clientY };
      singleBoardSwipeGestureRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        startAt: Date.now(),
        triggered: false,
      };
    } else if (e.touches.length === 2) {
      setIsDragging(false);
      singleBoardSwipeGestureRef.current.triggered = true;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const wrapperRect = wrapperRef.current?.getBoundingClientRect();
      if (!wrapperRect) return;
      const focalX =
        (e.touches[0].clientX + e.touches[1].clientX) / 2 - wrapperRect.left;
      const focalY =
        (e.touches[0].clientY + e.touches[1].clientY) / 2 - wrapperRect.top;

      pinchStartRef.current = {
        distance,
        scale: scaleRef.current,
        translateX: translateRef.current.x,
        translateY: translateRef.current.y,
        focalX,
        focalY,
      };
    }
  }, [isSingleBoardInteractionLocked, markSingleBoardMobileCanvasInteraction]);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (isSingleBoardInteractionLocked) {
        e.preventDefault();
        return;
      }
      if (e.touches.length === 1 && isDragging && lastTouchRef.current) {
        markSingleBoardMobileCanvasInteraction();
        const touch = e.touches[0];
        const deltaX = touch.clientX - lastTouchRef.current.x;
        const deltaY = touch.clientY - lastTouchRef.current.y;
        const prev = translateRef.current;
        const nextX = prev.x + deltaX;
        const nextY = prev.y + deltaY;
        const clamped = clampTranslate(scaleRef.current, nextX, nextY);
        commitTranslate(scaleRef.current, clamped.x, clamped.y);

        if (
          viewMode === "singleBoard" &&
          isSingleBoardMobile &&
          activeBoardRect &&
          singleBoardFitScale &&
          !singleBoardSwipeGestureRef.current.triggered
        ) {
          const swipeResult = resolveSingleBoardSwipeDirection({
            scale: scaleRef.current,
            fitScale: singleBoardFitScale,
            translationAtEdge: true,
            deltaX: touch.clientX - singleBoardSwipeGestureRef.current.startX,
            deltaY: touch.clientY - singleBoardSwipeGestureRef.current.startY,
            elapsedMs:
              Date.now() - singleBoardSwipeGestureRef.current.startAt,
          });

          if (swipeResult) {
            const contentBoundsClamped = clampTranslate(
              scaleRef.current,
              nextX,
              nextY,
              { ignoreImmersivePanSlack: true },
            );
            const directionEdgeMatched =
              (swipeResult.direction === "right" &&
                nextX < prev.x &&
                contentBoundsClamped.x === prev.x) ||
              (swipeResult.direction === "left" &&
                nextX > prev.x &&
                contentBoundsClamped.x === prev.x) ||
              (swipeResult.direction === "down" &&
                nextY < prev.y &&
                clamped.y === prev.y) ||
              (swipeResult.direction === "up" &&
                nextY > prev.y &&
                clamped.y === prev.y);

            if (directionEdgeMatched) {
              const targetBoardNumber = getNeighborBoardNumber({
                activeBoardNumber,
                boardCols: physicalBoardCols,
                boardRows: physicalBoardRows,
                direction: swipeResult.direction,
              });

              if (targetBoardNumber) {
                singleBoardSwipeGestureRef.current.triggered = true;
                activateBoard(targetBoardNumber, true);
                toast.info(`已切到板${targetBoardNumber}`);
                setIsDragging(false);
                lastTouchRef.current = null;
                dragStartPosRef.current = null;
                return;
              }
            }
          }
        }

        lastTouchRef.current = {
          x: touch.clientX,
          y: touch.clientY,
        };
      } else if (e.touches.length === 2 && pinchStartRef.current) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const wrapperRect = wrapperRef.current?.getBoundingClientRect();
        const start = pinchStartRef.current;
        if (!wrapperRect || start.distance <= 0) return;
        markSingleBoardMobileCanvasInteraction();

        const currentFocalX =
          (e.touches[0].clientX + e.touches[1].clientX) / 2 - wrapperRect.left;
        const currentFocalY =
          (e.touches[0].clientY + e.touches[1].clientY) / 2 - wrapperRect.top;

        // 以手势起点为基准计算，避免逐帧增量误差放大造成抖动
        const scaleRatio = dist / start.distance;
        const nextScale = Math.min(
          renderMaxScale,
          Math.max(activeMinScale, start.scale * scaleRatio),
        );

        const centerX = wrapperRect.width / 2;
        const centerY = wrapperRect.height / 2;
        const ratioFromStart = nextScale / start.scale;
        const deltaFocalX = currentFocalX - start.focalX;
        const deltaFocalY = currentFocalY - start.focalY;
        const nextX =
          ratioFromStart * start.translateX +
          (1 - ratioFromStart) * (start.focalX - centerX) +
          deltaFocalX;
        const nextY =
          ratioFromStart * start.translateY +
          (1 - ratioFromStart) * (start.focalY - centerY) +
          deltaFocalY;

        commitTranslate(nextScale, nextX, nextY);
      }
    },
    [
      activeBoardNumber,
      activeBoardRect,
      activateBoard,
      activeMinScale,
      clampTranslate,
      commitTranslate,
      isDragging,
      isSingleBoardMobile,
      physicalBoardCols,
      physicalBoardRows,
      renderMaxScale,
      markSingleBoardMobileCanvasInteraction,
      singleBoardFitScale,
      toast,
      viewMode,
      isSingleBoardInteractionLocked,
    ],
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (isSingleBoardInteractionLocked) {
        e.preventDefault();
        setIsDragging(false);
        lastTouchRef.current = null;
        pinchStartRef.current = null;
        dragStartPosRef.current = null;
        return;
      }
      // 检查是否为点击（非拖动）
      if (e.changedTouches.length === 1 && dragStartPosRef.current) {
        const touch = e.changedTouches[0];
        markSingleBoardMobileCanvasInteraction();
        const dx = touch.clientX - dragStartPosRef.current.x;
        const dy = touch.clientY - dragStartPosRef.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const duration = Date.now() - dragStartTimeRef.current;

        if (distance < 10 && duration < 300 && canvasRef.current) {
          // 模拟点击事件
          const canvas = canvasRef.current;
          const rect = canvas.getBoundingClientRect();
          const wrapper = wrapperRef.current;
          if (!wrapper || !beadData || !displayBoardRect) {
            setIsDragging(false);
            lastTouchRef.current = null;
            pinchStartRef.current = null;
            dragStartPosRef.current = null;
            return;
          }

          const wrapperRect = wrapper.getBoundingClientRect();
          const drawCellWidth = rect.width / displayWidth;
          const drawCellHeight = rect.height / displayHeight;
          const clickX = touch.clientX - rect.left;
          const clickY = touch.clientY - rect.top;
          const cellX = Math.floor(clickX / drawCellWidth);
          const cellY = Math.floor(clickY / drawCellHeight);

          if (
            cellX >= 0 &&
            cellX < displayWidth &&
            cellY >= 0 &&
            cellY < displayHeight
          ) {
            const globalCellX = displayBoardRect.startX + cellX;
            const globalCellY = displayBoardRect.startY + cellY;
            const blockCoordinate = getPhysicalBoardBlockCoordinate(
              globalCellX,
              globalCellY,
              physicalBoardSize,
            );
            const blockX = blockCoordinate.blockX;
            const blockY = blockCoordinate.blockY;

            if (scale < DETAIL_MODE_THRESHOLD) {
              if (
                selection.type === "block" &&
                selection.blockX === blockX &&
                selection.blockY === blockY
              ) {
                setSelection({ type: null, blockX: 0, blockY: 0 });
                setSelectedCell(null);
                setTooltipState((prev) => ({ ...prev, visible: false }));
              } else {
                setSelection({ type: "block", blockX, blockY });
                setSelectedCell(null);
                setTooltipState((prev) => ({ ...prev, visible: false }));
              }
            } else {
              const index = globalCellY * beadData.width + globalCellX;
              const bead = beadData.beads[index];
              if (!bead) {
                setSelection({ type: null, blockX: 0, blockY: 0 });
                setSelectedCell(null);
                setTooltipState((prev) => ({ ...prev, visible: false }));
                lastTapProcessedRef.current = Date.now();
                return;
              }

              const screenX = touch.clientX - wrapperRect.left;
              const screenY = touch.clientY - wrapperRect.top;
              const boardCoordinate = getPhysicalBoardCoordinate(
                globalCellX,
                globalCellY,
              );

              setTooltipState({
                visible: true,
                row: globalCellY + 1,
                col: globalCellX + 1,
                boardNumber: boardCoordinate.boardNumber,
                localRow: boardCoordinate.localRow,
                localCol: boardCoordinate.localCol,
                screenX,
                screenY,
              });

              if (voiceEnabled) {
                speakCoordinate(
                  globalCellY + 1,
                  globalCellX + 1,
                  boardCoordinate.boardNumber,
                  boardCoordinate.localRow,
                  boardCoordinate.localCol,
                );
              }

              const sameBlock =
                selection.blockX === blockX && selection.blockY === blockY;

              // 点击当前区块内相同颜色：回到区块高亮，不清空区块
              if (
                selection.type === "color" &&
                sameBlock &&
                selection.colorHex === bead.hex
              ) {
                setSelection({ type: "block", blockX, blockY });
                setSelectedCell(null);
                setTooltipState((prev) => ({ ...prev, visible: false }));
              } else {
                setSelection({
                  type: "color",
                  blockX,
                  blockY,
                  colorHex: bead.hex,
                  colorId: bead.id,
                });
                setSelectedCell({ x: globalCellX, y: globalCellY });
              }
            }
          }

          // 标记已处理，防止后续 click 事件重复触发
          lastTapProcessedRef.current = Date.now();
        }
      }

      setIsDragging(false);
      lastTouchRef.current = null;
      pinchStartRef.current = null;
      dragStartPosRef.current = null;
      singleBoardSwipeGestureRef.current.triggered = false;
    },
    [
      beadData,
      displayBoardRect,
      displayHeight,
      displayWidth,
      getPhysicalBoardCoordinate,
      physicalBoardSize,
      scale,
      selection,
      markSingleBoardMobileCanvasInteraction,
      voiceEnabled,
      toast,
      isSingleBoardInteractionLocked,
    ],
  );

  // 鼠标拖动处理
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isSingleBoardInteractionLocked) return;
    markSingleBoardMobileCanvasInteraction();
    setIsDragging(true);
    lastTouchRef.current = { x: e.clientX, y: e.clientY };
    dragStartTimeRef.current = Date.now();
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
    // 注意：不要调用 preventDefault()，否则会阻止 click 事件
  }, [isSingleBoardInteractionLocked, markSingleBoardMobileCanvasInteraction]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isSingleBoardInteractionLocked) return;
      if (!isDragging || !lastTouchRef.current) return;

      const deltaX = e.clientX - lastTouchRef.current.x;
      const deltaY = e.clientY - lastTouchRef.current.y;

      shiftTranslate(deltaX, deltaY);

      lastTouchRef.current = { x: e.clientX, y: e.clientY };
    },
    [isDragging, shiftTranslate, isSingleBoardInteractionLocked],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    lastTouchRef.current = null;
    // 注意：不清除 dragStartPosRef，留给 handleCanvasClick 做拖拽距离判断
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
    lastTouchRef.current = null;
    dragStartPosRef.current = null;
  }, []);

  // 鼠标滚轮缩放
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const handleWheelNative = (e: WheelEvent) => {
      if (isSingleBoardInteractionLocked) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      markSingleBoardMobileCanvasInteraction();
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY > 0 ? -0.2 : 0.2;
      const rect = wrapper.getBoundingClientRect();
      const focalX = e.clientX - rect.left;
      const focalY = e.clientY - rect.top;
      applyScaleAtPoint(scaleRef.current + delta, focalX, focalY);
    };

    wrapper.addEventListener("wheel", handleWheelNative, { passive: false });
    return () => wrapper.removeEventListener("wheel", handleWheelNative);
  }, [
    applyScaleAtPoint,
    markSingleBoardMobileCanvasInteraction,
    isSingleBoardInteractionLocked,
  ]);

  // 阻止页面滚动
  useEffect(() => {
    const container = document.querySelector("[data-making-page]");
    if (!container) return;

    const preventScroll = (e: Event) => {
      if (e.target === container || container.contains(e.target as Node)) {
        e.preventDefault();
      }
    };

    document.addEventListener("wheel", preventScroll, { passive: false });
    return () => document.removeEventListener("wheel", preventScroll);
  }, []);

  // ===== 棰滆壊鏇挎崲鍔熻兘 =====
  const handleColorReplace = useCallback(
    (newColor: BeadColor) => {
      if (!beadData || !selection.colorHex) return;

      setLastReplaceSnapshot({
        beadData: cloneBeadData(beadData),
        selection: { ...selection },
      });
      setRedoReplaceSnapshot(null);

      // 替换所有该颜色的珠子
      const newBeads = beadData.beads.map((bead) => {
        if (bead && bead.hex === selection.colorHex) {
          return { ...newColor };
        }
        return bead;
      });

      setBeadData({
        ...beadData,
        beads: newBeads,
      });

      // 更新选中状态为新颜色
      setSelection({
        ...selection,
        colorHex: newColor.hex,
        colorId: newColor.id,
      });

      toast.success(`已将 ${colorCountTotal} 颗豆子替换为 ${newColor.name}`);
    },
    [beadData, selection, colorCountTotal, toast, cloneBeadData],
  );

  const handleUndoLastReplace = useCallback(() => {
    if (!lastReplaceSnapshot || !beadData) return;

    setRedoReplaceSnapshot({
      beadData: cloneBeadData(beadData),
      selection: { ...selection },
    });
    setBeadData(cloneBeadData(lastReplaceSnapshot.beadData));
    setSelection({ ...lastReplaceSnapshot.selection });
    setSelectedCell(null);
    setLastReplaceSnapshot(null);
    toast.info("已撤销上一次换色");
  }, [lastReplaceSnapshot, beadData, cloneBeadData, selection, toast]);

  const handleRedoLastReplace = useCallback(() => {
    if (!redoReplaceSnapshot || !beadData) return;

    setLastReplaceSnapshot({
      beadData: cloneBeadData(beadData),
      selection: { ...selection },
    });
    setBeadData(cloneBeadData(redoReplaceSnapshot.beadData));
    setSelection({ ...redoReplaceSnapshot.selection });
    setSelectedCell(null);
    setRedoReplaceSnapshot(null);
    toast.info("已恢复上一次换色");
  }, [redoReplaceSnapshot, beadData, cloneBeadData, selection, toast]);

  // ===== 娓叉煋 Canvas =====
  useLayoutEffect(() => {
    if (
      !beadData ||
      !canvasRef.current ||
      !displayBoardRect ||
      displayWidth <= 0 ||
      displayHeight <= 0 ||
      !renderMetrics
    )
      return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = safeRenderCanvasWidth * renderDpr;
    canvas.height = safeRenderCanvasHeight * renderDpr;
    canvas.style.width = safeRenderCanvasWidth + "px";
    canvas.style.height = safeRenderCanvasHeight + "px";
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(renderDpr, renderDpr);
    ctx.imageSmoothingEnabled = false;
    const displayStartX = displayBoardRect.startX;
    const displayStartY = displayBoardRect.startY;
    const beads = beadData.beads;

    // 获取选中区块范围（按现实豆板分区）
    const selectedBlockRect = getBlockRectBySelection(
      selection.blockX,
      selection.blockY,
    );
    const selectedBlockStartX = selectedBlockRect?.startX ?? 0;
    const selectedBlockStartY = selectedBlockRect?.startY ?? 0;
    const selectedBlockEndX = selectedBlockRect?.endX ?? 0;
    const selectedBlockEndY = selectedBlockRect?.endY ?? 0;

    // 获取选中颜色的索引集合
    const highlightedIndices = new Set(
      selection.type === "color" && selection.colorHex
        ? getColorIndicesInBlock(
            selection.colorHex,
            selection.blockX,
            selection.blockY,
          )
        : [],
    );

    const focusedBoardRect =
      assistPackEnabled &&
      focusCurrentBoard &&
      currentBoardRect &&
      selection.type !== null
        ? {
            left:
              (currentBoardRect.startX - displayStartX) * safeRenderCellSize,
            top: (currentBoardRect.startY - displayStartY) * safeRenderCellSize,
            width:
              (currentBoardRect.endX - currentBoardRect.startX) *
              safeRenderCellSize,
            height:
              (currentBoardRect.endY - currentBoardRect.startY) *
              safeRenderCellSize,
          }
        : null;

    // 绘制所有珠子
    for (let localY = 0; localY < displayHeight; localY++) {
      const globalY = displayStartY + localY;
      for (let localX = 0; localX < displayWidth; localX++) {
        const globalX = displayStartX + localX;
        const index = globalY * beadData.width + globalX;
        const bead = beads[index];
        const px = localX * safeRenderCellSize;
        const py = localY * safeRenderCellSize;

        // 绘制背景色
        const beadHex = bead?.hex || "#1a1a24";
        ctx.fillStyle = beadHex;
        ctx.fillRect(px, py, safeRenderCellSize, safeRenderCellSize);

        // 选中区块时，非选中区半透明
        if (selection.type === "block") {
          const inBlock =
            globalX >= selectedBlockStartX &&
            globalX < selectedBlockEndX &&
            globalY >= selectedBlockStartY &&
            globalY < selectedBlockEndY;
          if (!inBlock) {
            ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
            ctx.fillRect(px, py, safeRenderCellSize, safeRenderCellSize);
          }
        }

        // 选中颜色时：区块外明显弱化，区块内非目标格子轻度变暗，
        // 目标颜色整格轻量高亮，让原色仍然可读。
        if (selection.type === "color") {
          const inBlock =
            globalX >= selectedBlockStartX &&
            globalX < selectedBlockEndX &&
            globalY >= selectedBlockStartY &&
            globalY < selectedBlockEndY;

          if (!inBlock) {
            ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
            ctx.fillRect(px, py, safeRenderCellSize, safeRenderCellSize);
          } else if (!highlightedIndices.has(index)) {
            ctx.fillStyle = "rgba(0, 0, 0, 0.16)";
            ctx.fillRect(px, py, safeRenderCellSize, safeRenderCellSize);
          } else if (highlightedIndices.has(index)) {
            ctx.fillStyle = "rgba(255, 255, 255, 0.14)";
            ctx.fillRect(px, py, safeRenderCellSize, safeRenderCellSize);
          }
        }
      }
    }

    if (focusedBoardRect) {
      ctx.save();
      ctx.fillStyle = "rgba(255, 247, 237, 0.56)";
      if (focusedBoardRect.top > 0) {
        ctx.fillRect(0, 0, safeRenderCanvasWidth, focusedBoardRect.top);
      }
      if (focusedBoardRect.left > 0) {
        ctx.fillRect(
          0,
          focusedBoardRect.top,
          focusedBoardRect.left,
          focusedBoardRect.height,
        );
      }
      const rightStart = focusedBoardRect.left + focusedBoardRect.width;
      if (rightStart < safeRenderCanvasWidth) {
        ctx.fillRect(
          rightStart,
          focusedBoardRect.top,
          safeRenderCanvasWidth - rightStart,
          focusedBoardRect.height,
        );
      }
      const bottomStart = focusedBoardRect.top + focusedBoardRect.height;
      if (bottomStart < safeRenderCanvasHeight) {
        ctx.fillRect(
          0,
          bottomStart,
          safeRenderCanvasWidth,
          safeRenderCanvasHeight - bottomStart,
        );
      }
      ctx.restore();
    }

    // 网格、板号、中心十字、选中边框和色号改由独立高清覆盖层绘制，
    // 避免底图随 CSS 放大后一起模糊。
  }, [
    assistPackEnabled,
    beadData,
    currentBoardRect,
    displayBoardRect,
    displayHeight,
    displayWidth,
    focusCurrentBoard,
    getBlockRectBySelection,
    getColorIndicesInBlock,
    renderDpr,
    renderScale,
    safeRenderCellSize,
    safeRenderCanvasHeight,
    safeRenderCanvasWidth,
    selection,
    showColorId,
  ]);

  useLayoutEffect(() => {
    if (
      !beadData ||
      !overlayCanvasRef.current ||
      !displayBoardRect ||
      !renderMetrics ||
      displayWidth <= 0 ||
      displayHeight <= 0
    )
      return;

    const canvas = overlayCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Keep overlay backing store aligned with the same safe DPR budget as the base canvas.
    // Using raw devicePixelRatio here can blow the overlay past mobile canvas limits and white-screen.
    const dpr = renderDpr;
    const drawCellWidth = safeRenderCellSize;
    const drawCellHeight = safeRenderCellSize;
    const drawCellSize = safeRenderCellSize;
    const displayStartX = displayBoardRect.startX;
    const displayStartY = displayBoardRect.startY;
    const selectedBlockRect = getBlockRectBySelection(
      selection.blockX,
      selection.blockY,
    );
    const selectedBlockStartX = selectedBlockRect?.startX ?? 0;
    const selectedBlockStartY = selectedBlockRect?.startY ?? 0;
    const selectedBlockEndX = selectedBlockRect?.endX ?? 0;
    const selectedBlockEndY = selectedBlockRect?.endY ?? 0;
    const highlightedIndices = new Set(
      selection.type === "color" && selection.colorHex
        ? getColorIndicesInBlock(
            selection.colorHex,
            selection.blockX,
            selection.blockY,
          )
        : [],
    );
    const focusedBoardRect =
      assistPackEnabled &&
      focusCurrentBoard &&
      currentBoardRect &&
      selection.type !== null
        ? {
            left: (currentBoardRect.startX - displayStartX) * drawCellWidth,
            top: (currentBoardRect.startY - displayStartY) * drawCellHeight,
            width:
              (currentBoardRect.endX - currentBoardRect.startX) * drawCellWidth,
            height:
              (currentBoardRect.endY - currentBoardRect.startY) *
              drawCellHeight,
          }
        : null;

    canvas.width = Math.max(1, Math.floor(safeRenderCanvasWidth * dpr));
    canvas.height = Math.max(1, Math.floor(safeRenderCanvasHeight * dpr));
    canvas.style.width = `${safeRenderCanvasWidth}px`;
    canvas.style.height = `${safeRenderCanvasHeight}px`;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = false;

    const visibleStartX = 0;
    const visibleStartY = 0;
    const visibleEndX = displayWidth;
    const visibleEndY = displayHeight;
    const visibleGlobalStartX = displayStartX;
    const visibleGlobalStartY = displayStartY;
    const visibleGlobalEndX = displayStartX + displayWidth;
    const visibleGlobalEndY = displayStartY + displayHeight;
    const baseGridWidth = Math.min(1, Math.max(0.35, 0.9 / dpr));
    const guideWidth = Math.min(1.4, Math.max(0.75, 1.15 / dpr));
    const boardWidth = Math.min(2, Math.max(1.1, 1.6 / dpr));
    const highlightWidth = Math.min(2.5, Math.max(1.3, 2 / dpr));
    const snapCanvasCoord = (value: number) => Math.round(value * dpr) / dpr;
    const drawVLine = (
      x: number,
      y1: number,
      y2: number,
      strokeStyle: string,
      lineWidth: number,
    ) => {
      const snappedX = snapCanvasCoord(x);
      const startY = snapCanvasCoord(Math.min(y1, y2));
      const endY = snapCanvasCoord(Math.max(y1, y2));
      ctx.save();
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(snappedX, startY);
      ctx.lineTo(snappedX, endY);
      ctx.stroke();
      ctx.restore();
    };
    const drawHLine = (
      y: number,
      x1: number,
      x2: number,
      strokeStyle: string,
      lineWidth: number,
    ) => {
      const snappedY = snapCanvasCoord(y);
      const startX = snapCanvasCoord(Math.min(x1, x2));
      const endX = snapCanvasCoord(Math.max(x1, x2));
      ctx.save();
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(startX, snappedY);
      ctx.lineTo(endX, snappedY);
      ctx.stroke();
      ctx.restore();
    };

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, safeRenderCanvasWidth, safeRenderCanvasHeight);
    ctx.clip();

    // 1. 基础小格
    if (drawCellSize >= 7) {
      for (let x = visibleStartX; x <= visibleEndX; x++) {
        const screenX = x * drawCellWidth;
        drawVLine(
          screenX,
          0,
          safeRenderCanvasHeight,
          "rgba(17,24,39,0.22)",
          baseGridWidth,
        );
      }
      for (let y = visibleStartY; y <= visibleEndY; y++) {
        const screenY = y * drawCellHeight;
        drawHLine(
          screenY,
          0,
          safeRenderCanvasWidth,
          "rgba(17,24,39,0.22)",
          baseGridWidth,
        );
      }
    }

    // 2. 现实豆板内部对称分区线
    const guideOffsets = getPhysicalBoardGuideOffsets(physicalBoardSize);
    const boardColStart = Math.floor(visibleGlobalStartX / physicalBoardSize);
    const boardColEnd = Math.ceil(visibleGlobalEndX / physicalBoardSize);
    const boardRowStart = Math.floor(visibleGlobalStartY / physicalBoardSize);
    const boardRowEnd = Math.ceil(visibleGlobalEndY / physicalBoardSize);

    for (let boardCol = boardColStart; boardCol <= boardColEnd; boardCol++) {
      const originX = boardCol * physicalBoardSize;
      for (const offset of guideOffsets) {
        const lineX = originX + offset;
        if (lineX < visibleGlobalStartX || lineX > visibleGlobalEndX) continue;
        const screenX = (lineX - displayStartX) * drawCellWidth;
        drawVLine(
          screenX,
          0,
          safeRenderCanvasHeight,
          "rgba(0,0,0,0.72)",
          guideWidth,
        );
      }
    }
    for (let boardRow = boardRowStart; boardRow <= boardRowEnd; boardRow++) {
      const originY = boardRow * physicalBoardSize;
      for (const offset of guideOffsets) {
        const lineY = originY + offset;
        if (lineY < visibleGlobalStartY || lineY > visibleGlobalEndY) continue;
        const screenY = (lineY - displayStartY) * drawCellHeight;
        drawHLine(
          screenY,
          0,
          safeRenderCanvasWidth,
          "rgba(0,0,0,0.72)",
          guideWidth,
        );
      }
    }

    // 3. 豆板边界线
    for (let boardCol = boardColStart; boardCol <= boardColEnd; boardCol++) {
      const lineX = boardCol * physicalBoardSize;
      if (lineX < visibleGlobalStartX || lineX > visibleGlobalEndX) continue;
      const screenX = (lineX - displayStartX) * drawCellWidth;
      drawVLine(
        screenX,
        0,
        safeRenderCanvasHeight,
        "rgba(0,0,0,0.92)",
        boardWidth,
      );
    }
    for (let boardRow = boardRowStart; boardRow <= boardRowEnd; boardRow++) {
      const lineY = boardRow * physicalBoardSize;
      if (lineY < visibleGlobalStartY || lineY > visibleGlobalEndY) continue;
      const screenY = (lineY - displayStartY) * drawCellHeight;
      drawHLine(
        screenY,
        0,
        safeRenderCanvasWidth,
        "rgba(0,0,0,0.92)",
        boardWidth,
      );
    }

    // 4. 每块板中心十字
    if (drawCellSize >= 8) {
      const centerOffset = getPhysicalBoardCenterOffset(physicalBoardSize);
      const crossArm = Math.min(8, Math.max(4, drawCellSize * 0.38));
      for (let boardRow = 0; boardRow < physicalBoardRows; boardRow++) {
        for (let boardCol = 0; boardCol < physicalBoardCols; boardCol++) {
          const centerCellX = boardCol * physicalBoardSize + centerOffset;
          const centerCellY = boardRow * physicalBoardSize + centerOffset;
          if (
            centerCellX < visibleGlobalStartX ||
            centerCellX > visibleGlobalEndX ||
            centerCellY < visibleGlobalStartY ||
            centerCellY > visibleGlobalEndY
          ) {
            continue;
          }
          const cx = (centerCellX - displayStartX) * drawCellWidth;
          const cy = (centerCellY - displayStartY) * drawCellHeight;
          drawVLine(
            cx,
            cy - crossArm,
            cy + crossArm,
            "#ff3ea5",
            highlightWidth,
          );
          drawHLine(
            cy,
            cx - crossArm,
            cx + crossArm,
            "#ff3ea5",
            highlightWidth,
          );
        }
      }
    }

    // 5. 板号标签
    if (drawCellSize >= 7) {
      const labelFont = Math.min(16, Math.max(11, drawCellSize * 0.6));
      for (let boardRow = 0; boardRow < physicalBoardRows; boardRow++) {
        for (let boardCol = 0; boardCol < physicalBoardCols; boardCol++) {
          const startX = boardCol * physicalBoardSize;
          const startY = boardRow * physicalBoardSize;
          const endX = Math.min(startX + physicalBoardSize, beadData.width);
          const endY = Math.min(startY + physicalBoardSize, beadData.height);
          if (
            endX < visibleGlobalStartX ||
            startX > visibleGlobalEndX ||
            endY < visibleGlobalStartY ||
            startY > visibleGlobalEndY
          ) {
            continue;
          }
          const x = (startX - displayStartX) * drawCellWidth + 4;
          const y = (startY - displayStartY) * drawCellHeight + 4;
          const text = `板${boardRow * physicalBoardCols + boardCol + 1}`;
          ctx.save();
          ctx.font = `700 ${labelFont}px "Trebuchet MS", "PingFang SC", sans-serif`;
          const textWidth = ctx.measureText(text).width;
          const pillHeight = labelFont + 6;
          ctx.fillStyle = "rgba(255,153,0,0.95)";
          ctx.beginPath();
          ctx.roundRect(x, y, textWidth + 12, pillHeight, 6);
          ctx.fill();
          ctx.fillStyle = "#ffffff";
          ctx.fillText(text, x + 6, y + labelFont);
          ctx.restore();
        }
      }
    }
    ctx.restore();

    // 6. 当前板聚焦边框/当前区块边框
    if (focusedBoardRect) {
      const x = focusedBoardRect.left;
      const y = focusedBoardRect.top;
      const w = focusedBoardRect.width;
      const h = focusedBoardRect.height;
      ctx.save();
      ctx.strokeStyle = "rgba(79,174,225,0.95)";
      ctx.lineWidth = Math.max(1.5, 2 / dpr);
      ctx.setLineDash([8, 5]);
      ctx.strokeRect(x, y, w, h);
      ctx.restore();
    }

    if (selection.type === "block" || selection.type === "color") {
      const localStartX = selectedBlockStartX - displayStartX;
      const localStartY = selectedBlockStartY - displayStartY;
      const x = localStartX * drawCellWidth;
      const y = localStartY * drawCellHeight;
      const w = (selectedBlockEndX - selectedBlockStartX) * drawCellWidth;
      const h = (selectedBlockEndY - selectedBlockStartY) * drawCellHeight;
      const snappedLeft = snapCanvasCoord(x);
      const snappedTop = snapCanvasCoord(y);
      const snappedRight = snapCanvasCoord(x + w);
      const snappedBottom = snapCanvasCoord(y + h);
      ctx.save();
      ctx.strokeStyle = "#ff6aa2";
      ctx.lineWidth = Math.max(1.5, 2.2 / dpr);
      ctx.strokeRect(
        snappedLeft,
        snappedTop,
        Math.max(0, snappedRight - snappedLeft),
        Math.max(0, snappedBottom - snappedTop),
      );
      ctx.restore();
    }

    if (selection.type === "color" && highlightedIndices.size > 0) {
      ctx.save();
      const highlightFill = "rgba(255, 106, 162, 0.18)";
      const selectedStroke = "rgba(255, 255, 255, 0.98)";
      const selectedStrokeWidth = Math.max(1.5, 2.6 / dpr);

      for (let y = visibleStartY; y < visibleEndY; y++) {
        const globalY = displayStartY + y;
        for (let x = visibleStartX; x < visibleEndX; x++) {
          const globalX = displayStartX + x;
          const index = globalY * beadData.width + globalX;
          if (!highlightedIndices.has(index)) continue;

          const px = x * drawCellWidth;
          const py = y * drawCellHeight;
          const snappedPx = snapCanvasCoord(px);
          const snappedPy = snapCanvasCoord(py);
          const snappedRight = snapCanvasCoord(px + drawCellWidth);
          const snappedBottom = snapCanvasCoord(py + drawCellHeight);
          const snappedWidth = Math.max(0, snappedRight - snappedPx);
          const snappedHeight = Math.max(0, snappedBottom - snappedPy);

          ctx.fillStyle = highlightFill;
          ctx.fillRect(snappedPx, snappedPy, snappedWidth, snappedHeight);

          if (
            selectedCell &&
            selectedCell.x === globalX &&
            selectedCell.y === globalY
          ) {
            ctx.strokeStyle = selectedStroke;
            ctx.lineWidth = selectedStrokeWidth;
            ctx.strokeRect(
              snappedPx + selectedStrokeWidth * 0.5,
              snappedPy + selectedStrokeWidth * 0.5,
              Math.max(0, snappedWidth - selectedStrokeWidth),
              Math.max(0, snappedHeight - selectedStrokeWidth),
            );
          }
        }
      }
      ctx.restore();
    }
  }, [
    beadData,
    displayBoardRect,
    displayHeight,
    displayWidth,
    getBlockRectBySelection,
    getColorIndicesInBlock,
    showColorId,
    scale,
    safeRenderCellSize,
    safeRenderCanvasHeight,
    safeRenderCanvasWidth,
    selection,
    currentBoardRect,
    assistPackEnabled,
    focusCurrentBoard,
    selectedCell,
    physicalBoardCols,
    physicalBoardRows,
    physicalBoardSize,
    renderDpr,
  ]);

  useLayoutEffect(() => {
    drawTextOverlay();
  }, [drawTextOverlay, displayScale, scale, translateX, translateY]);

  // 取消选中
  const handleClearSelection = () => {
    setSelection({ type: null, blockX: 0, blockY: 0 });
    setSelectedCell(null);
  };

  const handleOpenExport = useCallback(() => {
    setShowExportModal(true);
  }, []);

  const handleSingleBoardToolbarPrimaryAction = useCallback(() => {
    if (singleBoardAllDone) {
      setSingleBoardOverviewCollapsed(false);
      handleOpenExport();
      return;
    }
    if (activeBoardDone && nextPendingBoardNumber) {
      activateBoard(nextPendingBoardNumber, true);
      return;
    }
    handleToggleBoardDone();
  }, [
    activateBoard,
    activeBoardDone,
    handleOpenExport,
    handleToggleBoardDone,
    nextPendingBoardNumber,
    singleBoardAllDone,
  ]);

  const handleDismissSingleBoardOnboarding = useCallback(() => {
    setShowSingleBoardOnboarding(false);
    try {
      localStorage.setItem(
        SINGLE_BOARD_ONBOARDING_STORAGE_KEY,
        JSON.stringify(buildCompletedSingleBoardOnboardingState()),
      );
    } catch (e) {
      console.warn("[MakingPage] 保存单板模式引导状态失败:", e);
    }
  }, []);

  // 如果没有数据
  if (!beadData) {
    return (
      <div style={styles.container}>
        <div style={styles.emptyState}>
          <p style={styles.emptyText}>请先在编辑器中生成图案</p>
          <button
            style={styles.backButton}
            onClick={() => navigate("/mobile/create")}
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  const isNarrowToolbar = viewportWidth <= 420;
  const isCompactToolbar = viewportWidth <= 360;
  const isTraditionalMobile =
    viewMode === "traditional" && viewportWidth <= 640;
  const detailModeEnabled = scale >= DETAIL_MODE_THRESHOLD;
  useEffect(() => {
    if (!isSingleBoardMobile || totalBoardCount <= 1 || singleBoardAllDone) {
      setSingleBoardMobileMiniMapExpanded(false);
    }
  }, [isSingleBoardMobile, totalBoardCount, singleBoardAllDone]);

  const singleBoardMobileImmersiveControlLayout =
    getSingleBoardMobileImmersiveControlLayout({ viewportWidth });
  const floatingControlsStyle: React.CSSProperties = {
    ...styles.floatingControls,
    flexWrap: isNarrowToolbar ? "wrap" : "nowrap",
    alignItems: isNarrowToolbar ? "stretch" : "center",
    gap: isNarrowToolbar ? "6px" : "8px",
    ...(isSingleBoardMobileImmersive
      ? styles.singleBoardMobileImmersiveFloatingControls
      : {}),
    ...(isSingleBoardMobileImmersive
      ? {
          bottom: `max(${singleBoardMobileImmersiveControlLayout.zoomBottomPx}px, calc(env(safe-area-inset-bottom, 0px) + ${singleBoardMobileImmersiveControlLayout.zoomBottomPx}px))`,
        }
      : {}),
  };
  const zoomControlsStyle: React.CSSProperties = {
    ...styles.zoomControls,
    width: isNarrowToolbar ? "100%" : undefined,
    flexBasis: isNarrowToolbar ? "100%" : undefined,
    order: isNarrowToolbar ? 1 : 0,
    padding:
      isSingleBoardMobile && !singleBoardAllDone
        ? "4px 6px"
        : isCompactToolbar
          ? "6px 8px"
          : styles.zoomControls.padding,
    gap:
      isSingleBoardMobile && !singleBoardAllDone
        ? "3px"
        : isCompactToolbar
          ? "4px"
          : "6px",
    ...(isSingleBoardMobileImmersive
      ? styles.singleBoardMobileImmersiveZoomControls
      : {}),
    ...(isSingleBoardMobileImmersive
      ? {
          maxWidth: `${singleBoardMobileImmersiveControlLayout.zoomMaxWidthPx}px`,
        }
      : {}),
  };
  const zoomRangeStyle: React.CSSProperties = {
    ...styles.zoomRange,
    width: isCompactToolbar
      ? "clamp(48px, 22vw, 72px)"
      : isNarrowToolbar
        ? "clamp(56px, 24vw, 96px)"
        : styles.zoomRange.width,
  };
  const zoomLabelStyle: React.CSSProperties = {
    ...styles.zoomLabel,
    minWidth: isCompactToolbar ? "38px" : styles.zoomLabel.minWidth,
    padding: isCompactToolbar ? "0 4px" : styles.zoomLabel.padding,
    fontSize: isCompactToolbar ? "10px" : styles.zoomLabel.fontSize,
  };
  const fitBtnStyle: React.CSSProperties = {
    ...styles.fitBtn,
    minWidth: isCompactToolbar ? "38px" : styles.fitBtn.minWidth,
    padding: isCompactToolbar ? "0 6px" : styles.fitBtn.padding,
  };
  const controlBtnsStyle: React.CSSProperties = {
    ...styles.controlBtns,
    order: isNarrowToolbar ? 2 : 0,
    marginLeft: isNarrowToolbar ? "auto" : 0,
  };
  const singleBoardToolbarBtnStyle: React.CSSProperties = {
    ...styles.singleBoardToolbarBtn,
    ...(isCompactToolbar ? styles.singleBoardToolbarBtnCompact : {}),
  };
  const modeSwitchBarStyle: React.CSSProperties = {
    ...styles.modeSwitchBar,
    ...(viewMode === "singleBoard"
      ? {
          gap: isSingleBoardMobile ? "4px" : "6px",
          padding: isSingleBoardMobile ? "4px 6px 0" : "6px 8px 0",
        }
      : {}),
  };
  const modeSwitchBtnStyle = (active: boolean): React.CSSProperties => ({
    ...styles.modeSwitchBtn,
    ...(viewMode === "singleBoard"
      ? {
          height: isSingleBoardMobile ? "28px" : "30px",
          fontSize: isSingleBoardMobile ? "11px" : "12px",
        }
      : {}),
    ...(active ? styles.modeSwitchBtnActive : {}),
  });
  const singleBoardChromeOffset =
    viewMode === "singleBoard"
      ? SINGLE_BOARD_MOBILE_TOP_CHROME_BASE_OFFSET
      : 50;
  const singleBoardMobileTopChromeOffset = isSingleBoardMobile
    ? SINGLE_BOARD_MOBILE_TOP_CHROME_BASE_OFFSET +
      singleBoardMobileChromeHeights.summary
    : null;
  const singleBoardCanvasTopOffset = getSingleBoardCanvasWrapperTopOffset({
    viewMode,
    isSingleBoardMobile,
    baseOffset:
      singleBoardMobileImmersiveLayout.canvasWrapperTopOffset ??
      singleBoardChromeOffset,
    pageChromeOffset: singleBoardMobileTopChromeOffset ?? singleBoardChromeOffset,
  });
  const shouldShowStatusHint =
    !isSingleBoardMobile &&
    (viewMode !== "singleBoard" ||
      (!singleBoardAllDone && (selection.type !== null || showSettings)));
  const statusHintStyle: React.CSSProperties = {
    ...styles.statusHint,
    top:
      isSingleBoardMobile && singleBoardMobileTopChromeOffset !== null
        ? `${singleBoardMobileTopChromeOffset}px`
        : isNarrowToolbar
          ? `${singleBoardChromeOffset + 38}px`
          : `${singleBoardChromeOffset}px`,
    maxWidth: isNarrowToolbar ? "calc(100vw - 32px)" : undefined,
    ...(viewMode === "singleBoard"
      ? {
          padding: "4px 10px",
          fontSize: "11px",
        }
      : {}),
  };
  const canvasWrapperStyle: React.CSSProperties = {
    ...styles.canvasWrapper,
    top: `${singleBoardCanvasTopOffset}px`,
  };
  const canvasContainerStyle: React.CSSProperties = {
    ...styles.canvasContainer,
    ...(isSingleBoardMobileImmersive
      ? styles.singleBoardMobileImmersiveCanvasContainer
      : {
          minHeight: getSingleBoardCanvasMinHeight({
            viewMode,
            isSingleBoardMobile,
            isSingleBoardDesktop,
            singleBoardAllDone,
          }),
        }),
  };
  const singleBoardOverviewStyle: React.CSSProperties = {
    ...styles.singleBoardOverview,
    ...(isSingleBoardMobileImmersive
      ? styles.singleBoardMobileImmersiveOverviewLayer
      : {}),
    ...(useDesktopSidebarLayout
      ? {
          gap: makingDesktopSidebarCollapsed ? "2px" : "6px",
          paddingTop: makingDesktopSidebarCollapsed ? "2px" : "4px",
        }
      : {}),
  };
  const singleBoardOverviewBodyStyle: React.CSSProperties = {
    ...styles.singleBoardOverview,
    ...(isSingleBoardMobileImmersive
      ? styles.singleBoardMobileImmersiveOverlay
      : {}),
  };
  const singleBoardMobileChromeStackStyle: React.CSSProperties = {
    ...styles.singleBoardMobileChromeStack,
    ...(isSingleBoardMobileImmersive
      ? styles.singleBoardMobileImmersiveChromeStack
      : {}),
  };
  const singleBoardMobileSummaryRowStyle: React.CSSProperties = {
    ...styles.singleBoardMobileSummaryRow,
    ...(isSingleBoardMobileImmersive
      ? styles.singleBoardMobileImmersiveSummaryPill
      : {}),
  };
  const singleBoardMobileToolbarShellStyle: React.CSSProperties = {
    ...styles.singleBoardMobileToolbarShell,
    ...(isSingleBoardMobileImmersive
      ? styles.singleBoardMobileImmersiveToolbarShell
      : {}),
    ...(isSingleBoardMobileImmersive
      ? {
          bottom: `max(${singleBoardMobileImmersiveControlLayout.toolbarBottomPx}px, calc(env(safe-area-inset-bottom, 0px) + ${singleBoardMobileImmersiveControlLayout.toolbarBottomPx}px))`,
        }
      : {}),
  };
  const singleBoardMobileSwipeStatusStyle: React.CSSProperties = {
    ...styles.singleBoardSwipeStatus,
    ...singleBoardSwipeUi.style,
    ...(isSingleBoardMobileImmersive
      ? styles.singleBoardMobileImmersiveSwipeStatus
      : {}),
  };
  const previewSectionStyle: React.CSSProperties = {
    ...styles.previewSection,
    ...(useDesktopSidebarLayout
      ? {
          paddingRight: `${desktopSidebarLayout.width + 20}px`,
        }
      : {}),
  };
  const canvasStageStyle: React.CSSProperties = {
    ...styles.canvasStage,
    width: `${safeRenderCanvasWidth}px`,
    height: `${safeRenderCanvasHeight}px`,
  };

  return (
    <div
      style={{ ...styles.container, height: viewportHeight }}
      data-making-page
    >
      {/* 头部 */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={handleBackToSource}>
          <ArrowLeft size={20} weight="bold" />
        </button>
        <h1 style={styles.title}>制作模式</h1>
        <div style={{ width: 40 }} />
      </div>

      {/* 预览区 */}
      <div style={previewSectionStyle}>
        {singleBoardMobileImmersiveLayout.showModeSwitch &&
          !(viewMode === "singleBoard" && singleBoardAllDone) && (
          <div ref={singleBoardMobileModeSwitchRef} style={modeSwitchBarStyle}>
            <button
              style={modeSwitchBtnStyle(viewMode === "traditional")}
              onClick={() => setViewMode("traditional")}
            >
              传统模式
            </button>
            <button
              style={modeSwitchBtnStyle(viewMode === "singleBoard")}
              onClick={() => {
                setViewMode("singleBoard");
                if (resumeBoardNumber) {
                  activateBoard(resumeBoardNumber, true);
                } else if (activeBoardRect) {
                  activateBoard(activeBoardRect.boardNumber, true);
                } else if (boardRects[0]) {
                  activateBoard(boardRects[0].boardNumber, true);
                }
              }}
            >
              单板模式
            </button>
          </div>
        )}

        {viewMode === "singleBoard" && (
          <div
            style={singleBoardOverviewStyle}
            data-making-desktop-sidebar-layout={
              useDesktopSidebarLayout ? "1" : "0"
            }
            data-making-desktop-sidebar-collapsed={
              useDesktopSidebarLayout
                ? makingDesktopSidebarCollapsed
                  ? "1"
                  : "0"
                : undefined
            }
          >
            <div style={singleBoardOverviewBodyStyle}>
            {singleBoardAllDone ? (
              <div style={styles.singleBoardCompletionEntry}>
                <div style={styles.singleBoardResumeEntryMeta}>
                  <span style={styles.singleBoardResumeEntryTitle}>
                    全部板已完成
                  </span>
                  <span style={styles.singleBoardResumeEntryText}>
                    {singleBoardProgress.doneCount}/
                    {singleBoardProgress.totalCount} · 导出图纸 / 查看整图
                  </span>
                  <span style={styles.singleBoardResumeEntryText}>
                    {inventoryConsumed
                      ? "豆仓已扣减"
                      : inventoryCheck.canApply
                        ? `可扣减豆仓 · 共 ${inventoryCheck.totalNeed} 颗`
                        : `库存不足 · 还差 ${inventoryCheck.shortageTotal} 颗`}
                  </span>
                  {shareFeedback && (
                    <span style={styles.singleBoardShareFeedback}>
                      {shareFeedback === "preparing"
                        ? "正在准备分享..."
                        : shareFeedback === "shared"
                          ? "已打开系统分享"
                          : shareFeedback === "copied"
                            ? "已复制分享文案"
                            : "当前环境不支持直接分享，可先导出图纸"}
                    </span>
                  )}
                  {inventoryFeedback && (
                    <span style={styles.singleBoardShareFeedback}>
                      {inventoryFeedback}
                    </span>
                  )}
                </div>
                <div style={styles.singleBoardCompletionActions}>
                  <button
                    style={{
                      ...styles.singleBoardResumeEntryBtn,
                      ...styles.singleBoardSecondaryBtn,
                      opacity:
                        inventoryConsumed || !inventoryCheck.canApply
                          ? 0.72
                          : 1,
                    }}
                    onClick={handleDeductInventory}
                    disabled={inventoryConsumed || !inventoryCheck.canApply}
                  >
                    {inventoryConsumed
                      ? "已扣减豆仓"
                      : inventoryCheck.canApply
                        ? "扣减豆仓"
                        : "库存不足"}
                  </button>
                  <button
                    style={{
                      ...styles.singleBoardResumeEntryBtn,
                      ...styles.singleBoardSecondaryBtn,
                    }}
                    onClick={handleOpenTraditionalOverview}
                  >
                    查看整图
                  </button>
                  <button
                    style={styles.singleBoardResumeEntryBtn}
                    onClick={handleOpenExport}
                  >
                    导出图纸
                  </button>
                </div>
              </div>
            ) : (
              resumeBoardNumber &&
              !isSingleBoardMobile &&
              !isSingleBoardDesktop && (
                <div style={styles.singleBoardResumeEntry}>
                  <div style={styles.singleBoardResumeEntryMeta}>
                    <span style={styles.singleBoardResumeEntryTitle}>
                      继续上次制作
                    </span>
                    <span style={styles.singleBoardResumeEntryText}>
                      板{resumeBoardNumber} · 已完成{" "}
                      {singleBoardProgress.doneCount}/
                      {singleBoardProgress.totalCount}
                    </span>
                  </div>
                  <button
                    style={styles.singleBoardResumeEntryBtn}
                    onClick={() => activateBoard(resumeBoardNumber, true)}
                  >
                    继续
                  </button>
                </div>
              )
            )}
            {!singleBoardAllDone && (
              <>
                {isSingleBoardMobile ? (
                  <>
                    <div
                      ref={singleBoardMobileChromeRef}
                      style={singleBoardMobileChromeStackStyle}
                    >
                      {isSingleBoardMobileImmersive &&
                        singleBoardMobileToolbarExpanded && (
                          <div
                            style={styles.singleBoardMobileImmersiveBackdrop}
                            onClick={() =>
                              setSingleBoardMobileToolbarExpanded(false)
                            }
                          />
                        )}
                      <div style={singleBoardMobileSummaryRowStyle}>
                        <div style={styles.singleBoardMobileSummaryMain}>
                          <span style={styles.singleBoardMobileSummaryText}>
                            进度 {singleBoardProgress.doneCount}/
                            {singleBoardProgress.totalCount}
                          </span>
                          <span style={styles.singleBoardMobileSummaryText}>
                            剩余 {singleBoardProgress.remainingCount} 块
                          </span>
                          {resumeBoardNumber &&
                            resumeBoardNumber !== activeBoardNumber && (
                              <button
                                style={styles.singleBoardResumeBtn}
                                onClick={() =>
                                  activateBoard(resumeBoardNumber, true)
                                }
                              >
                                继续未完成
                              </button>
                            )}
                        </div>
                      </div>
                      {totalBoardCount > 1 && (
                        <div
                          style={singleBoardMobileSwipeStatusStyle}
                        >
                          <span style={styles.singleBoardSwipeStatusTitle}>
                            {singleBoardSwipeUi.title}
                          </span>
                          <span style={styles.singleBoardSwipeStatusText}>
                            {singleBoardSwipeUi.text}
                          </span>
                        </div>
                      )}
                      <div style={singleBoardMobileToolbarShellStyle}>
                        <div style={styles.singleBoardMobileNavRow}>
                          {showSingleBoardMobileOverviewButton && (
                            <button
                              style={{
                                ...styles.singleBoardMobileOverviewBtn,
                                width: "auto",
                                minWidth: "64px",
                                padding: "0 12px",
                                fontSize: "11px",
                              }}
                              onClick={() =>
                                setSingleBoardMobileMiniMapExpanded(
                                  (prev) => !prev,
                                )
                              }
                              title={
                                singleBoardMobileMiniMapExpanded
                                  ? "收起总览"
                                  : "展开总览"
                              }
                            >
                              {singleBoardMobileMiniMapExpanded
                                ? "收起总览"
                                : "总览"}
                            </button>
                          )}
                          <button
                            style={styles.singleBoardMobileSecondaryBtn}
                            onClick={resetCurrentView}
                            disabled={!activeBoardRect}
                          >
                            复位
                          </button>
                          <button
                            style={styles.singleBoardMobilePrimaryBtn}
                            onClick={() => {
                              if (activeBoardDone && nextPendingBoardNumber) {
                                activateBoard(nextPendingBoardNumber, true);
                                return;
                              }
                              handleToggleBoardDone();
                            }}
                            disabled={!activeBoardRect}
                          >
                            {activeBoardDone && nextPendingBoardNumber
                              ? "下一块"
                              : "完成"}
                          </button>
                          <button
                            style={{
                              ...styles.singleBoardMobileToolToggleBtn,
                              ...(singleBoardMobileToolbarExpanded
                                ? styles.singleBoardMobileToolToggleBtnActive
                                : {}),
                            }}
                            onClick={handleSingleBoardMobileToolbarToggle}
                            title={
                              singleBoardMobileToolbarExpanded
                                ? "收起工具"
                                : "展开工具"
                            }
                          >
                            {singleBoardMobileToolbarExpanded ? "收起" : "工具"}
                          </button>
                        </div>
                        {singleBoardMobileToolbarExpanded && (
                          <div style={styles.singleBoardMobileToolRow}>
                          <button
                            style={{
                              ...styles.singleBoardQuickToggle,
                              ...styles.singleBoardMobileQuickToggle,
                              ...(autoAdvanceOnBoardDone
                                ? styles.singleBoardQuickToggleActive
                                : {}),
                            }}
                            onClick={() =>
                              setAutoAdvanceOnBoardDone((prev) => !prev)
                            }
                          >
                            {autoAdvanceOnBoardDone ? "自动切换" : "停留"}
                          </button>
                          <button
                            style={styles.singleBoardMobileToolChip}
                            onClick={handleOpenExport}
                            title="下载图纸"
                          >
                            图纸
                          </button>
                          <button
                            style={{
                              ...styles.singleBoardMobileToolChip,
                              ...(showSettings
                                ? styles.singleBoardMobileToolChipActive
                                : {}),
                            }}
                            onClick={() => setShowSettings((prev) => !prev)}
                            title={showSettings ? "收起辅助" : "展开辅助"}
                          >
                            辅助
                          </button>
                          {selection.type === "color" && selectedBeadColor && (
                            <button
                              style={styles.singleBoardMobileToolChip}
                              onClick={() => setShowReplaceModal(true)}
                              title="替换当前选中颜色"
                            >
                              换色
                            </button>
                          )}
                          </div>
                        )}
                      </div>
                    </div>
                    {showSingleBoardMobileOverviewButton &&
                      singleBoardMobileMiniMapExpanded && (
                        <div style={styles.singleBoardMobileOverviewOverlay}>
                          <div
                            style={{
                              ...styles.singleBoardMobileOverviewCard,
                              ...(singleBoardMobileOverviewLayout
                                ? {
                                    width: `${singleBoardMobileOverviewLayout.width}px`,
                                    maxHeight: `${singleBoardMobileOverviewLayout.maxHeight}px`,
                                    left: `${singleBoardMobileOverviewLayout.left}px`,
                                    top: `${singleBoardMobileOverviewLayout.top}px`,
                                  }
                                : {}),
                            }}
                            onPointerDown={
                              handleSingleBoardMobileOverviewDragStart
                            }
                          >
                            <div style={styles.singleBoardMobileOverviewHeader}>
                              <span style={styles.singleBoardMobileOverviewTitle}>
                                {getSingleBoardOverviewTitle({
                                  activeBoardNumber,
                                  totalBoardCount,
                                })}
                              </span>
                              <button
                                style={styles.singleBoardMobileOverviewCloseBtn}
                                onClick={() =>
                                  setSingleBoardMobileMiniMapExpanded(false)
                                }
                                aria-label="关闭总览"
                              >
                                ×
                              </button>
                            </div>
                            <div style={styles.singleBoardMobileOverviewBody}>
                              {totalBoardCount > 1 && (
                                <button
                                  style={{
                                    ...styles.singleBoardMobileOverviewArrow,
                                    ...styles.singleBoardMobileOverviewArrowLeft,
                                  }}
                                  onClick={() => jumpToBoard(-1)}
                                  disabled={activeBoardNumber <= 1}
                                  aria-label="上一块板"
                                >
                                  ‹
                                </button>
                              )}
                              <div style={styles.singleBoardMobileOverviewCanvasWrap}>
                                <canvas
                                  ref={singleBoardMobileOverviewCanvasRef}
                                  style={{
                                    ...styles.singleBoardMobileOverviewCanvas,
                                    aspectRatio: beadData
                                      ? `${beadData.width} / ${beadData.height}`
                                      : "1 / 1",
                                  }}
                                  onClick={(e) =>
                                    handleOverviewCanvasClick(e, {
                                      closeMobileOverlay: true,
                                    })
                                  }
                                />
                              </div>
                              {totalBoardCount > 1 && (
                                <button
                                  style={{
                                    ...styles.singleBoardMobileOverviewArrow,
                                    ...styles.singleBoardMobileOverviewArrowRight,
                                  }}
                                  onClick={() => jumpToBoard(1)}
                                  disabled={activeBoardNumber >= totalBoardCount}
                                  aria-label="下一块板"
                                >
                                  ›
                                </button>
                              )}
                            </div>
                            <div style={styles.singleBoardMobileOverviewHint}>
                              {totalBoardCount > 1
                                ? "拖动总览可挪动卡片，点击总览中的板块可直接跳转"
                                : "拖动总览可挪动卡片，点击总览可查看整块板位置"}
                            </div>
                            <div
                              style={styles.singleBoardMobileOverviewResizeHandle}
                              onPointerDown={
                                handleSingleBoardMobileOverviewResizeStart
                              }
                              aria-label="缩放总览"
                              role="button"
                              title="拖动缩放总览"
                            >
                              <span
                                style={
                                  styles.singleBoardMobileOverviewResizeHandleIcon
                                }
                              />
                            </div>
                          </div>
                        </div>
                      )}
                  </>
                ) : (
                  <>
                    <div style={styles.singleBoardCompactHeader}>
                      <div style={styles.singleBoardCompactMeta}>
                        <span style={styles.singleBoardSummaryTitle}>单板</span>
                        <span style={styles.singleBoardSummaryText}>
                          {singleBoardProgress.doneCount}/
                          {singleBoardProgress.totalCount}
                          {singleBoardProgress.totalCount > 0
                            ? ` · ${singleBoardProgress.percent}%`
                            : ""}
                          {` · 剩余${singleBoardProgress.remainingCount}块`}
                        </span>
                        {nextPendingBoardNumber && (
                          <span style={styles.singleBoardSummaryHint}>
                            下一块：板{nextPendingBoardNumber}
                          </span>
                        )}
                        {isSingleBoardDesktop && (
                          <span style={styles.singleBoardSummaryHint}>
                            未完成{singleBoardProgress.remainingCount}块
                          </span>
                        )}
                        <span
                          style={{
                            ...styles.singleBoardStatePill,
                            ...(activeBoardDone
                              ? styles.singleBoardStatePillDone
                              : styles.singleBoardStatePillTodo),
                          }}
                        >
                          {activeBoardDone
                            ? `板${activeBoardNumber} 已完成`
                            : `板${activeBoardNumber} 进行中`}
                        </span>
                        {totalBoardCount > 1 && (
                          <span
                            style={{
                              ...styles.singleBoardSwipeStatusInline,
                              ...singleBoardSwipeUi.style,
                            }}
                          >
                            {isSingleBoardDesktop
                              ? singleBoardSwipeUi.title
                              : `${singleBoardSwipeUi.title} · ${singleBoardSwipeUi.text}`}
                          </span>
                        )}
                      </div>
                      {isSingleBoardDesktop ? (
                        useDesktopSidebarLayout ? null : (
                        <div style={styles.singleBoardDesktopHeaderActions}>
                          {resumeBoardNumber &&
                            resumeBoardNumber !== activeBoardNumber && (
                              <button
                                style={styles.singleBoardDesktopHeaderBtn}
                                onClick={() =>
                                  activateBoard(resumeBoardNumber, true)
                                }
                              >
                                继续板{resumeBoardNumber}
                              </button>
                            )}
                          <button
                            style={{
                              ...styles.singleBoardQuickToggle,
                              ...styles.singleBoardDesktopQuickToggle,
                              ...(autoAdvanceOnBoardDone
                                ? styles.singleBoardQuickToggleActive
                                : {}),
                            }}
                            onClick={() =>
                              setAutoAdvanceOnBoardDone((prev) => !prev)
                            }
                          >
                            自动切下一板
                          </button>
                          <button
                            style={styles.singleBoardCollapseBtn}
                            onClick={() =>
                              setSingleBoardOverviewCollapsed((prev) => !prev)
                            }
                          >
                            {singleBoardOverviewCollapsed
                              ? "展开总览"
                              : "收起总览"}
                          </button>
                        </div>
                        )
                      ) : (
                        <button
                          style={styles.singleBoardCollapseBtn}
                          onClick={() =>
                            setSingleBoardOverviewCollapsed((prev) => !prev)
                          }
                        >
                          {singleBoardOverviewCollapsed ? "展开总览" : "收起总览"}
                        </button>
                      )}
                    </div>
                    {!singleBoardOverviewCollapsed && !isSingleBoardDesktop && (
                      <div style={styles.singleBoardProgressTrack}>
                        <div
                          style={{
                            ...styles.singleBoardProgressFill,
                            width: `${singleBoardProgress.percent}%`,
                          }}
                        />
                      </div>
                    )}
                    {!isSingleBoardDesktop && (
                      <div
                        style={{
                          ...styles.singleBoardQuickRow,
                          ...(isSingleBoardDesktop
                            ? styles.singleBoardDesktopQuickRow
                            : {}),
                        }}
                      >
                        <div
                          style={{
                            ...styles.singleBoardQuickControls,
                            ...(isSingleBoardDesktop
                              ? styles.singleBoardDesktopQuickControls
                              : {}),
                          }}
                        >
                          <button
                            style={{
                              ...styles.singleBoardQuickToggle,
                              ...(isSingleBoardDesktop
                                ? styles.singleBoardDesktopQuickToggle
                                : {}),
                              ...(autoAdvanceOnBoardDone
                                ? styles.singleBoardQuickToggleActive
                                : {}),
                            }}
                            onClick={() =>
                              setAutoAdvanceOnBoardDone((prev) => !prev)
                            }
                          >
                            {autoAdvanceOnBoardDone
                              ? "自动切下一板"
                              : "完成后停留当前板"}
                          </button>
                        </div>
                        {pendingBoardNumbers.length > 0 &&
                          !singleBoardOverviewCollapsed && (
                            <div
                              style={{
                                ...styles.singleBoardPendingRow,
                                ...(isSingleBoardDesktop
                                  ? styles.singleBoardDesktopPendingRow
                                  : {}),
                              }}
                            >
                              <span
                                style={{
                                  ...styles.singleBoardPendingLabel,
                                  ...(isSingleBoardDesktop
                                    ? styles.singleBoardDesktopPendingLabel
                                    : {}),
                                }}
                              >
                                未完成：
                              </span>
                              {pendingBoardNumbers
                                .slice(0, 3)
                                .map((boardNumber) => (
                                  <button
                                    key={`pending-${boardNumber}`}
                                    style={{
                                      ...styles.singleBoardPendingChip,
                                      ...(isSingleBoardDesktop
                                        ? styles.singleBoardDesktopPendingChip
                                        : {}),
                                    }}
                                    onClick={() =>
                                      activateBoard(boardNumber, true)
                                    }
                                  >
                                    ?{boardNumber}
                                  </button>
                                ))}
                              {pendingBoardNumbers.length > 3 && (
                                <span style={styles.singleBoardPendingMore}>
                                  +{pendingBoardNumbers.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                      </div>
                    )}
                    {!singleBoardOverviewCollapsed && showMainWorkflowCard && (
                      useDesktopSidebarLayout ? (
                        <div style={styles.singleBoardDesktopWorkflowCard}>
                          <div style={styles.singleBoardDesktopMetaRow}>
                            <div style={styles.singleBoardDesktopWorkflowMeta}>
                              <span style={styles.singleBoardSummaryText}>
                                当前板 板{activeBoardNumber} / 共{" "}
                                {singleBoardProgress.totalCount} 块
                              </span>
                            </div>
                            <div style={styles.singleBoardDesktopActionRow}>
                              <button
                                style={{
                                  ...styles.singleBoardMinorBtn,
                                  ...styles.singleBoardDesktopMinorBtn,
                                }}
                                onClick={handleToggleBoardDone}
                                disabled={!activeBoardRect}
                              >
                                {activeBoardRect &&
                                boardStatusMap[activeBoardRect.boardNumber]
                                  ? "取消完成"
                                  : "标记本板完成"}
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : isSingleBoardDesktop ? (
                        <div style={styles.singleBoardDesktopDenseRow}>
                          <div style={styles.singleBoardDesktopWorkflowCard}>
                            <div style={styles.singleBoardDesktopMetaRow}>
                              <div style={styles.singleBoardDesktopWorkflowMeta}>
                                <span style={styles.singleBoardSummaryText}>
                                  当前板 板{activeBoardNumber} / 共{" "}
                                  {singleBoardProgress.totalCount} 块 · 进度{" "}
                                  {singleBoardProgress.percent}%
                                </span>
                              </div>
                              <div style={styles.singleBoardDesktopActionRow}>
                                <button
                                  style={{
                                    ...styles.singleBoardMinorBtn,
                                    ...styles.singleBoardDesktopMinorBtn,
                                  }}
                                  onClick={handleToggleBoardDone}
                                  disabled={!activeBoardRect}
                                >
                                  {activeBoardRect &&
                                  boardStatusMap[activeBoardRect.boardNumber]
                                    ? "取消完成"
                                    : "标记本板完成"}
                                </button>
                                <button
                                  style={{
                                    ...styles.singleBoardMinorBtn,
                                    ...styles.singleBoardDesktopMinorBtn,
                                  }}
                                  onClick={resetCurrentView}
                                  disabled={!activeBoardRect}
                                >
                                  复位视图
                                </button>
                              </div>
                            </div>
                          </div>
                          <div
                            style={{
                              ...styles.singleBoardMiniMapCard,
                              ...styles.singleBoardDesktopMiniMapCard,
                            }}
                            title="整图总览"
                          >
                            <div style={styles.singleBoardMiniMapFrame}>
                              <canvas
                                ref={singleBoardMiniMapCanvasRef}
                                onClick={(e) => handleOverviewCanvasClick(e)}
                                style={{
                                  ...styles.singleBoardMiniMapCanvas,
                                  ...styles.singleBoardDesktopMiniMapCanvas,
                                  aspectRatio: beadData
                                    ? `${beadData.width} / ${beadData.height}`
                                    : "1 / 1",
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div style={styles.singleBoardHeroRow}>
                          <div style={styles.singleBoardSummaryCard}>
                            <div style={styles.singleBoardSummary}>
                              <span style={styles.singleBoardSummaryTitle}>
                                当前板工作流
                              </span>
                              <span style={styles.singleBoardSummaryText}>
                                板{activeBoardNumber} / 共{" "}
                                {singleBoardProgress.totalCount} 块
                              </span>
                            </div>
                            <div style={styles.singleBoardActionRow}>
                              <button
                                style={styles.singleBoardMinorBtn}
                                onClick={handleToggleBoardDone}
                                disabled={!activeBoardRect}
                              >
                                {activeBoardRect &&
                                boardStatusMap[activeBoardRect.boardNumber]
                                  ? "取消完成"
                                  : "标记本板完成"}
                              </button>
                              <button
                                style={styles.singleBoardMinorBtn}
                                onClick={resetCurrentView}
                                disabled={!activeBoardRect}
                              >
                                复位视图
                              </button>
                            </div>
                          </div>
                          <div style={styles.singleBoardMiniMapCard}>
                            <div style={styles.singleBoardMiniMapFrame}>
                              <canvas
                                ref={singleBoardMiniMapCanvasRef}
                                onClick={(e) => handleOverviewCanvasClick(e)}
                                style={{
                                  ...styles.singleBoardMiniMapCanvas,
                                  aspectRatio: beadData
                                    ? `${beadData.width} / ${beadData.height}`
                                    : "1 / 1",
                                }}
                              />
                            </div>
                            <div style={styles.singleBoardMiniMapHint}>
                              整图总览
                            </div>
                          </div>
                        </div>
                      )
                    )}
                    {!useDesktopSidebarLayout &&
                      (singleBoardOverviewCollapsed ? (
                        <div
                          style={{
                            ...styles.singleBoardCompactNav,
                            ...(isSingleBoardDesktop
                              ? styles.singleBoardDesktopCompactNav
                              : {}),
                          }}
                        >
                          <button
                            style={{
                              ...styles.singleBoardCompactNavBtn,
                              ...(isSingleBoardDesktop
                                ? styles.singleBoardDesktopCompactNavBtn
                                : {}),
                            }}
                            onClick={() => jumpToBoard(-1)}
                            disabled={activeBoardNumber <= 1}
                          >
                            上一块板
                          </button>
                          <div
                            style={{
                              ...styles.singleBoardCompactNavChips,
                              ...(isSingleBoardDesktop
                                ? styles.singleBoardDesktopCompactNavChips
                                : {}),
                            }}
                          >
                            {compactBoardNav.map((boardNumber) => {
                              const isActive = boardNumber === activeBoardNumber;
                              const isDone = Boolean(boardStatusMap[boardNumber]);
                              return (
                                <button
                                  key={`compact-board-${boardNumber}`}
                                  style={{
                                    ...styles.singleBoardChip,
                                    ...(isSingleBoardDesktop
                                      ? styles.singleBoardDesktopChip
                                      : {}),
                                    ...(isActive
                                      ? styles.singleBoardChipActive
                                      : {}),
                                    ...(isDone ? styles.singleBoardChipDone : {}),
                                  }}
                                  onClick={() =>
                                    activateBoard(boardNumber, true)
                                  }
                                >
                                  板{boardNumber}
                                </button>
                              );
                            })}
                          </div>
                          <button
                            style={{
                              ...styles.singleBoardCompactNavBtn,
                              ...(isSingleBoardDesktop
                                ? styles.singleBoardDesktopCompactNavBtn
                                : {}),
                            }}
                            onClick={() => jumpToBoard(1)}
                            disabled={activeBoardNumber >= totalBoardCount}
                          >
                            下一块板
                          </button>
                        </div>
                      ) : (
                      <div
                        style={{
                          ...styles.singleBoardGrid,
                          ...(isSingleBoardDesktop
                            ? styles.singleBoardDesktopGrid
                              : {}),
                          }}
                        >
                          {boardRects.map((board) => {
                            const isActive =
                              board.boardNumber === activeBoardNumber;
                            const isDone = Boolean(
                              boardStatusMap[board.boardNumber],
                            );
                            return (
                              <button
                                key={board.boardNumber}
                                style={{
                                  ...styles.singleBoardChip,
                                  ...(isSingleBoardDesktop
                                    ? styles.singleBoardDesktopChip
                                    : {}),
                                  ...(isActive
                                    ? styles.singleBoardChipActive
                                    : {}),
                                  ...(isDone ? styles.singleBoardChipDone : {}),
                                }}
                                onClick={() =>
                                  activateBoard(board.boardNumber, true)
                                }
                              >
                                板{board.boardNumber}
                              </button>
                            );
                          })}
                        </div>
                      ))}
                  </>
                )}
              </>
            )}
          </div>
          </div>
        )}

        <div style={canvasContainerStyle}>
          {/* 浮动控制栏 */}
          <div style={floatingControlsStyle}>
            {/* 左侧：缩放 */}
            <div
              style={{
                ...zoomControlsStyle,
                ...(viewMode === "singleBoard"
                  ? {
                      padding: singleBoardAllDone ? "3px 6px" : "4px 8px",
                      gap: singleBoardAllDone ? "3px" : "4px",
                      borderRadius: "10px",
                    }
                  : {}),
              }}
            >
              <button
                style={styles.miniBtn}
                onClick={() => {
                  const wrapper = wrapperRef.current;
                  const focalX = wrapper ? wrapper.clientWidth / 2 : 0;
                  const focalY = wrapper ? wrapper.clientHeight / 2 : 0;
                  applyScaleAtPoint(
                    scaleRef.current - ZOOM_STEP,
                    focalX,
                    focalY,
                  );
                }}
              >
                -
              </button>
              <input
                type="range"
                min={activeMinScale}
                max={renderMaxScale}
                step={0.05}
                value={scale}
                style={{
                  ...zoomRangeStyle,
                  ...(viewMode === "singleBoard" && singleBoardAllDone
                    ? { display: "none" }
                    : {}),
                }}
                onChange={(e) => {
                  const wrapper = wrapperRef.current;
                  const focalX = wrapper ? wrapper.clientWidth / 2 : 0;
                  const focalY = wrapper ? wrapper.clientHeight / 2 : 0;
                  applyScaleAtPoint(Number(e.target.value), focalX, focalY);
                }}
                aria-label="缩放倍率"
              />
              <span
                style={{
                  ...zoomLabelStyle,
                  ...(viewMode === "singleBoard"
                    ? {
                        minWidth: singleBoardAllDone ? 30 : 40,
                        fontSize: singleBoardAllDone ? "11px" : "12px",
                      }
                    : {}),
                }}
              >
                {Math.round(scale * 100)}%
              </span>
              <button
                style={styles.miniBtn}
                onClick={() => {
                  const wrapper = wrapperRef.current;
                  const focalX = wrapper ? wrapper.clientWidth / 2 : 0;
                  const focalY = wrapper ? wrapper.clientHeight / 2 : 0;
                  applyScaleAtPoint(
                    scaleRef.current + ZOOM_STEP,
                    focalX,
                    focalY,
                  );
                }}
              >
                +
              </button>
              <button
                style={{
                  ...fitBtnStyle,
                  ...(viewMode === "singleBoard" && singleBoardAllDone
                    ? {
                        height: "28px",
                        minWidth: "48px",
                        padding: "0 8px",
                        fontSize: "11px",
                      }
                    : {}),
                }}
                onClick={handleFitScreen}
                title={
                  viewMode === "singleBoard" ? "适应当前板" : "适应屏幕宽度"
                }
              >
                {viewMode === "singleBoard" ? "适板" : "适宽"}
              </button>
              {viewMode === "traditional" && (
                <button
                  style={{
                    ...fitBtnStyle,
                    minWidth: isTraditionalMobile
                      ? "52px"
                      : fitBtnStyle.minWidth,
                  }}
                  onClick={resetCurrentView}
                  title="复位当前视图"
                >
                  复位
                </button>
              )}
              {viewMode === "traditional" && (
                <button
                  style={{
                    ...fitBtnStyle,
                    minWidth: isTraditionalMobile
                      ? "52px"
                      : fitBtnStyle.minWidth,
                    opacity:
                      selection.type === "color" && selectedBeadColor
                        ? 1
                        : 0.45,
                    cursor:
                      selection.type === "color" && selectedBeadColor
                        ? "pointer"
                        : "not-allowed",
                  }}
                  onClick={() => {
                    if (selection.type === "color" && selectedBeadColor) {
                      setShowReplaceModal(true);
                    }
                  }}
                  disabled={!(selection.type === "color" && selectedBeadColor)}
                  title="替换当前选中颜色"
                >
                  换色
                </button>
              )}
            </div>

            {/* 右侧：功能按钮 */}
            <div
              style={{
                ...controlBtnsStyle,
                ...(isSingleBoardMobile && viewMode === "singleBoard"
                  ? { display: "none" }
                  : {}),
              }}
            >
              {viewMode === "singleBoard" && !singleBoardAllDone && (
                <button
                  style={{
                    ...singleBoardToolbarBtnStyle,
                    ...styles.singleBoardToolbarPrimaryBtn,
                  }}
                  onClick={handleSingleBoardToolbarPrimaryAction}
                  title={
                    singleBoardAllDone
                      ? "收尾并导出图纸"
                      : activeBoardDone && nextPendingBoardNumber
                        ? isSingleBoardMobile
                          ? "继续下一块"
                          : `继续板${nextPendingBoardNumber}`
                        : isSingleBoardMobile
                          ? "完成当前板"
                          : `完成板${activeBoardNumber}`
                  }
                >
                  {singleBoardAllDone
                    ? "收尾"
                    : activeBoardDone && nextPendingBoardNumber
                      ? isSingleBoardMobile
                        ? "下一块"
                        : `继续板${nextPendingBoardNumber}`
                      : isSingleBoardMobile
                        ? "完成"
                        : `完成板${activeBoardNumber}`}
                </button>
              )}
              {showToolbarExport &&
                !(viewMode === "singleBoard" && singleBoardAllDone) &&
                !isDesktopSidebarSingleBoard && (
                <button
                  style={
                    viewMode === "singleBoard"
                      ? singleBoardToolbarBtnStyle
                      : styles.miniBtn
                  }
                  onClick={handleOpenExport}
                  title="下载图纸"
                >
                  {viewMode === "singleBoard" ? (
                    <>
                      <DownloadSimple size={13} />
                      图纸
                    </>
                  ) : (
                    <DownloadSimple size={14} />
                  )}
                </button>
              )}
              {(showToolbarAssist || showToolbarTools) &&
                !isDesktopSidebarSingleBoard && (
                <button
                  style={
                    viewMode === "singleBoard"
                      ? {
                          ...singleBoardToolbarBtnStyle,
                          ...(singleBoardAllDone
                            ? styles.singleBoardToolbarBtnCompact
                            : {}),
                        }
                      : styles.miniBtn
                  }
                  onClick={() => setShowSettings(!showSettings)}
                  title={showToolbarTools ? "工具" : "设置"}
                >
                  {viewMode === "singleBoard" ? (
                    <>
                      <Gear size={13} />
                      {showToolbarTools ? "工具" : "辅助"}
                    </>
                  ) : (
                    <Gear size={14} />
                  )}
                </button>
              )}
              {viewMode === "singleBoard" &&
                !isSingleBoardMobile &&
                showToolbarReplaceAction &&
                selection.type === "color" &&
                selectedBeadColor && (
                  <button
                    style={
                      viewMode === "singleBoard"
                        ? singleBoardToolbarBtnStyle
                        : styles.miniBtn
                    }
                    onClick={() => setShowReplaceModal(true)}
                    title="替换当前选中颜色"
                  >
                    {viewMode === "singleBoard" ? (
                      <>
                        <Swap size={13} />
                        换色
                      </>
                    ) : (
                      <Swap size={14} />
                    )}
                  </button>
                )}
            </div>
          </div>

          {/* 设置面板 */}
          {showSettings && (
            <div style={styles.settingsPanel}>
              <div style={styles.settingsHeader}>
                <span style={styles.settingsTitle}>
                  {isSingleBoardMobile && viewMode === "singleBoard"
                    ? "工具"
                    : "设置"}
                </span>
                <button
                  style={styles.closeBtn}
                  onClick={() => setShowSettings(false)}
                >
                  <X size={16} />
                </button>
              </div>
              <div style={styles.settingsContent}>
                {isSingleBoardMobile && viewMode === "singleBoard" && (
                  <>
                    {resumeBoardNumber &&
                      resumeBoardNumber !== activeBoardNumber && (
                        <div style={styles.settingRow}>
                          <span style={styles.settingLabel}>继续未完成</span>
                          <button
                            style={{
                              ...styles.actionBtn,
                              padding: "8px 12px",
                              fontSize: "12px",
                            }}
                            onClick={() => {
                              setShowSettings(false);
                              activateBoard(resumeBoardNumber, true);
                            }}
                          >
                            继续
                          </button>
                        </div>
                      )}
                    <div style={styles.settingRow}>
                      <span style={styles.settingLabel}>图纸</span>
                      <button
                        style={{
                          ...styles.actionBtn,
                          padding: "8px 12px",
                          fontSize: "12px",
                        }}
                        onClick={() => {
                          setShowSettings(false);
                          handleOpenExport();
                        }}
                      >
                        下载
                      </button>
                    </div>
                    <div style={styles.settingRow}>
                      <span style={styles.settingLabel}>辅助</span>
                      <button
                        style={{
                          ...styles.actionBtn,
                          padding: "8px 12px",
                          fontSize: "12px",
                        }}
                        onClick={() => {
                          setShowSettings(false);
                          setShowVisionAssist(true);
                        }}
                      >
                        打开
                      </button>
                    </div>
                    <div style={styles.settingRow}>
                      <span style={styles.settingLabel}>自动切换</span>
                      <button
                        style={{
                          ...styles.toggleBtn,
                          ...(autoAdvanceOnBoardDone
                            ? styles.toggleBtnActive
                            : {}),
                        }}
                        onClick={() =>
                          setAutoAdvanceOnBoardDone((prev) => !prev)
                        }
                      >
                        {autoAdvanceOnBoardDone ? (
                          <CheckCircle size={16} weight="fill" />
                        ) : (
                          <CheckCircle size={16} />
                        )}
                      </button>
                    </div>
                    {showToolsReplaceAction &&
                      selection.type === "color" &&
                      selectedBeadColor && (
                        <div style={styles.settingRow}>
                          <span style={styles.settingLabel}>换色</span>
                          <button
                            style={{
                              ...styles.actionBtn,
                              padding: "8px 12px",
                              fontSize: "12px",
                            }}
                            onClick={() => {
                              setShowSettings(false);
                              setShowReplaceModal(true);
                            }}
                          >
                            打开
                          </button>
                        </div>
                      )}
                    <div style={styles.settingDivider} />
                  </>
                )}
                <div style={styles.settingRow}>
                  <span style={styles.settingLabel}>显示色号</span>
                  <button
                    style={{
                      ...styles.toggleBtn,
                      ...(showColorId ? styles.toggleBtnActive : {}),
                    }}
                    onClick={() => setShowColorId(!showColorId)}
                  >
                    {showColorId ? <Eye size={16} /> : <EyeSlash size={16} />}
                  </button>
                </div>
                <div style={styles.settingRow}>
                  <span style={styles.settingLabel}>屏幕常亮</span>
                  <button
                    style={{
                      ...styles.toggleBtn,
                      ...(wakeLockActive ? styles.toggleBtnActive : {}),
                    }}
                    onClick={toggleWakeLock}
                  >
                    {wakeLockActive ? (
                      <Lightning size={16} weight="fill" />
                    ) : (
                      <LightningSlash size={16} />
                    )}
                  </button>
                </div>
                <div style={styles.settingRow}>
                  <span style={styles.settingLabel}>语音播报</span>
                  <button
                    style={{
                      ...styles.toggleBtn,
                      ...(voiceEnabled ? styles.toggleBtnActive : {}),
                    }}
                    onClick={() => {
                      if (!canSpeak()) {
                        toast.info("您的浏览器不支持语音功能");
                        return;
                      }
                      setVoiceEnabled(!voiceEnabled);
                      toast.info(
                        voiceEnabled ? "语音提示已关闭" : "语音提示已开启",
                      );
                    }}
                  >
                    {voiceEnabled ? (
                      <SpeakerHigh size={16} />
                    ) : (
                      <SpeakerSlash size={16} />
                    )}
                  </button>
                </div>
                <div style={styles.settingRow}>
                  <span style={styles.settingLabel}>视觉辅助（试验）</span>
                  <button
                    style={{
                      ...styles.actionBtn,
                      padding: "8px 12px",
                      fontSize: "12px",
                    }}
                    onClick={() => {
                      setShowSettings(false);
                      setShowVisionAssist(true);
                    }}
                  >
                    试用
                  </button>
                </div>
                <div style={styles.settingDivider} />
                <div style={styles.settingRow}>
                  <span style={styles.settingLabel}>高级制作辅助</span>
                  <button
                    style={{
                      ...styles.toggleBtn,
                      ...(assistPackEnabled ? styles.toggleBtnActive : {}),
                    }}
                    onClick={() => setAssistPackEnabled(!assistPackEnabled)}
                    title="开启后增强当前板聚焦、定位和固定坐标提示"
                  >
                    {assistPackEnabled ? (
                      <CheckCircle size={16} weight="fill" />
                    ) : (
                      <CheckCircle size={16} />
                    )}
                  </button>
                </div>
                <div style={styles.settingRow}>
                  <span style={styles.settingLabel}>聚焦当前板</span>
                  <button
                    style={{
                      ...styles.toggleBtn,
                      ...(assistPackEnabled && focusCurrentBoard
                        ? styles.toggleBtnActive
                        : {}),
                      opacity: assistPackEnabled ? 1 : 0.45,
                    }}
                    onClick={() =>
                      assistPackEnabled &&
                      setFocusCurrentBoard(!focusCurrentBoard)
                    }
                    disabled={!assistPackEnabled}
                  >
                    {focusCurrentBoard ? (
                      <Eye size={16} />
                    ) : (
                      <EyeSlash size={16} />
                    )}
                  </button>
                </div>
                <div style={styles.settingHint}>
                  <p style={styles.hintText}>
                    <strong>操作说明：</strong>
                  </p>
                  <p style={styles.hintText}>- 缩小时点击：选中区块</p>
                  <p style={styles.hintText}>- 放大时点击：高亮同色格子</p>
                </div>
              </div>
            </div>
          )}

          {/* 状态提示 */}
          {shouldShowStatusHint && (
            <div style={statusHintStyle}>
              {selection.type === null && (
                <span>
                  {viewMode === "singleBoard"
                    ? !detailModeEnabled
                      ? "点格选区块"
                      : "点格选颜色"
                    : !detailModeEnabled
                      ? "点击选择区块"
                      : "点击选择颜色"}
                </span>
              )}
              {selection.type === "block" && (
                <span>
                  区块 ({selection.blockX + 1}, {selection.blockY + 1})
                </span>
              )}
              {selection.type === "color" && selection.colorHex && (
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      backgroundColor: selection.colorHex,
                      borderRadius: 3,
                      border: "1px solid rgba(255,255,255,0.3)",
                    }}
                  />
                  区内{colorCountInBlock}颗 / 总计{colorCountTotal}颗
                </span>
              )}
            </div>
          )}

          {/* 坐标提示框 */}
          <CoordinateTooltip
            visible={tooltipState.visible && !isSingleBoardMobile}
            row={tooltipState.row}
            col={tooltipState.col}
            boardNumber={tooltipState.boardNumber}
            localRow={tooltipState.localRow}
            localCol={tooltipState.localCol}
            cellScreenX={tooltipState.screenX}
            cellScreenY={tooltipState.screenY}
            containerWidth={wrapperRef.current?.clientWidth || 300}
            containerHeight={wrapperRef.current?.clientHeight || 300}
          />

          {/* Canvas */}
          <div
            ref={wrapperRef}
            style={{
              ...canvasWrapperStyle,
              cursor: isDragging ? "grabbing" : "grab",
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
          >
            <div ref={canvasStageRef} style={canvasStageStyle}>
              <canvas
                ref={canvasRef}
                style={styles.canvas}
                onClick={handleCanvasClick}
              />
              <canvas ref={overlayCanvasRef} style={styles.overlayCanvas} />
            </div>
            <canvas
              ref={textOverlayCanvasRef}
              style={styles.textOverlayCanvas}
            />
          </div>
        </div>
          {useDesktopSidebarLayout && (
            <aside
              style={{
                ...styles.makingDesktopSidebar,
                width: `${desktopSidebarLayout.width}px`,
              }}
              data-making-desktop-sidebar="1"
            >
              {makingDesktopSidebarCollapsed ? (
                <div style={styles.makingDesktopSidebarRail}>
                  <button
                    style={styles.makingDesktopSidebarRailBtn}
                    onClick={() => setMakingDesktopSidebarCollapsed(false)}
                  >
                    展开工具
                  </button>
                </div>
              ) : (
                <div style={styles.makingDesktopSidebarPanel}>
                  <div style={styles.makingDesktopSidebarHeader}>
                    <span style={styles.makingDesktopSidebarTitle}>
                      桌面工具区
                    </span>
                    <button
                      style={styles.makingDesktopSidebarToggle}
                      onClick={() => setMakingDesktopSidebarCollapsed(true)}
                    >
                      收起
                    </button>
                  </div>
                  <div
                    style={{
                      ...styles.makingDesktopSidebarContent,
                      padding: `${desktopSidebarLayout.contentPadding}px`,
                    }}
                  >
                    <div
                      style={styles.makingDesktopSidebarSlot}
                      data-making-desktop-sidebar-slot="1"
                    >
                      <div style={styles.makingDesktopSidebarSlotHeader}>
                        <div style={styles.makingDesktopSidebarSlotMeta}>
                          <span style={styles.makingDesktopSidebarSlotTitle}>
                            整图总览
                          </span>
                          <span style={styles.makingDesktopSidebarSlotText}>
                            当前板 板{activeBoardNumber} / 共{" "}
                            {singleBoardProgress.totalCount} 块
                          </span>
                        </div>
                        <span style={styles.makingDesktopSidebarSlotBadge}>
                          {singleBoardOverviewCollapsed ? "精简切换" : "完整切换"}
                        </span>
                      </div>
                      <div
                        style={{
                          ...styles.singleBoardMiniMapCard,
                          ...styles.singleBoardDesktopMiniMapCard,
                          width: "100%",
                          minWidth: 0,
                        }}
                        title="整图总览"
                      >
                        <div style={styles.singleBoardMiniMapFrame}>
                          <canvas
                            ref={singleBoardMiniMapCanvasRef}
                            onClick={(e) => handleOverviewCanvasClick(e)}
                            style={{
                              ...styles.singleBoardMiniMapCanvas,
                              ...styles.singleBoardDesktopMiniMapCanvas,
                              aspectRatio: beadData
                                ? `${beadData.width} / ${beadData.height}`
                                : "1 / 1",
                            }}
                          />
                        </div>
                        <div style={styles.singleBoardMiniMapHint}>
                          点击总览可直接跳转
                        </div>
                      </div>
                      {showSidebarWorkflowActions && (
                        <div style={styles.makingDesktopSidebarWorkflowRow}>
                          <button
                            style={styles.makingDesktopSidebarWorkflowPrimaryBtn}
                            onClick={handleToggleBoardDone}
                            disabled={!activeBoardRect}
                          >
                            {activeBoardRect &&
                            boardStatusMap[activeBoardRect.boardNumber]
                              ? "取消完成"
                              : "标记本板完成"}
                          </button>
                          {resumeBoardNumber &&
                            resumeBoardNumber !== activeBoardNumber && (
                              <button
                                style={styles.makingDesktopSidebarWorkflowBtn}
                                onClick={() =>
                                  activateBoard(resumeBoardNumber, true)
                                }
                              >
                                继续板{resumeBoardNumber}
                              </button>
                            )}
                          <button
                            style={styles.makingDesktopSidebarWorkflowBtn}
                            onClick={() =>
                              setSingleBoardOverviewCollapsed((prev) => !prev)
                            }
                          >
                            {singleBoardOverviewCollapsed
                              ? "展开总览"
                              : "收起总览"}
                          </button>
                        </div>
                      )}

                      {singleBoardOverviewCollapsed ? (
                        <div
                          style={{
                            ...styles.singleBoardCompactNav,
                            ...(isSingleBoardDesktop
                              ? styles.singleBoardDesktopCompactNav
                              : {}),
                            flexWrap: "nowrap",
                          }}
                        >
                          <button
                            style={{
                              ...styles.singleBoardCompactNavBtn,
                              ...(isSingleBoardDesktop
                                ? styles.singleBoardDesktopCompactNavBtn
                                : {}),
                            }}
                            onClick={() => jumpToBoard(-1)}
                            disabled={activeBoardNumber <= 1}
                          >
                            上一板
                          </button>
                          <div
                            style={{
                              ...styles.singleBoardCompactNavChips,
                              ...(isSingleBoardDesktop
                                ? styles.singleBoardDesktopCompactNavChips
                                : {}),
                            }}
                          >
                            {compactBoardNav.map((boardNumber) => {
                              const isActive = boardNumber === activeBoardNumber;
                              const isDone = Boolean(boardStatusMap[boardNumber]);
                              return (
                                <button
                                  key={`sidebar-compact-board-${boardNumber}`}
                                  style={{
                                    ...styles.singleBoardChip,
                                    ...(isSingleBoardDesktop
                                      ? styles.singleBoardDesktopChip
                                      : {}),
                                    ...(isActive
                                      ? styles.singleBoardChipActive
                                      : {}),
                                    ...(isDone ? styles.singleBoardChipDone : {}),
                                  }}
                                  onClick={() =>
                                    activateBoard(boardNumber, true)
                                  }
                                >
                                  板{boardNumber}
                                </button>
                              );
                            })}
                          </div>
                          <button
                            style={{
                              ...styles.singleBoardCompactNavBtn,
                              ...(isSingleBoardDesktop
                                ? styles.singleBoardDesktopCompactNavBtn
                                : {}),
                            }}
                            onClick={() => jumpToBoard(1)}
                            disabled={activeBoardNumber >= totalBoardCount}
                          >
                            下一板
                          </button>
                        </div>
                      ) : (
                        <div
                          style={{
                            ...styles.singleBoardGrid,
                            ...(isSingleBoardDesktop
                              ? styles.singleBoardDesktopGrid
                              : {}),
                          }}
                        >
                          {boardRects.map((board) => {
                            const isActive =
                              board.boardNumber === activeBoardNumber;
                            const isDone = Boolean(
                              boardStatusMap[board.boardNumber],
                            );
                            return (
                              <button
                                key={`sidebar-board-${board.boardNumber}`}
                                style={{
                                  ...styles.singleBoardChip,
                                  ...(isSingleBoardDesktop
                                    ? styles.singleBoardDesktopChip
                                    : {}),
                                  ...(isActive
                                    ? styles.singleBoardChipActive
                                    : {}),
                                  ...(isDone ? styles.singleBoardChipDone : {}),
                                }}
                                onClick={() =>
                                  activateBoard(board.boardNumber, true)
                                }
                              >
                                板{board.boardNumber}
                              </button>
                            );
                          })}
                        </div>
                      )}
                      <div style={styles.makingDesktopSidebarBoardActions}>
                        <button
                          style={styles.makingDesktopSidebarBoardBtn}
                          onClick={() => jumpToBoard(-1)}
                          disabled={activeBoardNumber <= 1}
                        >
                          上一板
                        </button>
                        <button
                          style={styles.makingDesktopSidebarBoardBtn}
                          onClick={() => jumpToBoard(1)}
                          disabled={activeBoardNumber >= totalBoardCount}
                        >
                          下一板
                        </button>
                      </div>
                      {pendingBoardNumbers.length > 0 && (
                        <div style={styles.makingDesktopSidebarPendingRow}>
                          <span style={styles.makingDesktopSidebarPendingLabel}>
                            未完成：
                          </span>
                          {pendingBoardNumbers.slice(0, 4).map((boardNumber) => (
                            <button
                              key={`sidebar-pending-${boardNumber}`}
                              style={{
                                ...styles.singleBoardPendingChip,
                                ...styles.singleBoardDesktopPendingChip,
                              }}
                              onClick={() => activateBoard(boardNumber, true)}
                            >
                              板{boardNumber}
                            </button>
                          ))}
                          {pendingBoardNumbers.length > 4 && (
                            <span style={styles.singleBoardPendingMore}>
                              +{pendingBoardNumbers.length - 4}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div style={styles.makingDesktopSidebarSection}>
                      <div style={styles.makingDesktopSidebarSectionHeader}>
                        <div style={styles.makingDesktopSidebarSectionMeta}>
                          <span style={styles.makingDesktopSidebarSlotTitle}>
                            常用工具
                          </span>
                          <span style={styles.makingDesktopSidebarSlotText}>
                            图纸导出、视觉辅助和常用开关
                          </span>
                        </div>
                        {showSidebarReplaceAction && (
                          <button
                            style={styles.makingDesktopSidebarMinorBtn}
                            onClick={() => setShowReplaceModal(true)}
                          >
                            换色
                          </button>
                        )}
                      </div>
                      <div style={styles.makingDesktopSidebarActionGrid}>
                        <button
                          style={styles.makingDesktopSidebarActionBtn}
                          onClick={handleOpenExport}
                        >
                          图纸
                        </button>
                        <button
                          style={styles.makingDesktopSidebarActionBtn}
                          onClick={resetCurrentView}
                          disabled={!activeBoardRect}
                        >
                          复位视图
                        </button>
                        <button
                          style={styles.makingDesktopSidebarActionBtn}
                          onClick={() => {
                            setShowSettings(false);
                            setShowVisionAssist(true);
                          }}
                        >
                          视觉辅助
                        </button>
                      </div>
                      <div style={styles.makingDesktopSidebarToggleList}>
                        <div style={styles.makingDesktopSidebarToggleRow}>
                          <span style={styles.makingDesktopSidebarToggleLabel}>
                            显示色号
                          </span>
                          <button
                            style={{
                              ...styles.toggleBtn,
                              ...(showColorId ? styles.toggleBtnActive : {}),
                            }}
                            onClick={() => setShowColorId(!showColorId)}
                          >
                            {showColorId ? (
                              <Eye size={16} />
                            ) : (
                              <EyeSlash size={16} />
                            )}
                          </button>
                        </div>
                        <div style={styles.makingDesktopSidebarToggleRow}>
                          <span style={styles.makingDesktopSidebarToggleLabel}>
                            屏幕常亮
                          </span>
                          <button
                            style={{
                              ...styles.toggleBtn,
                              ...(wakeLockActive ? styles.toggleBtnActive : {}),
                            }}
                            onClick={toggleWakeLock}
                          >
                            {wakeLockActive ? (
                              <Lightning size={16} weight="fill" />
                            ) : (
                              <LightningSlash size={16} />
                            )}
                          </button>
                        </div>
                        <div style={styles.makingDesktopSidebarToggleRow}>
                          <span style={styles.makingDesktopSidebarToggleLabel}>
                            语音播报
                          </span>
                          <button
                            style={{
                              ...styles.toggleBtn,
                              ...(voiceEnabled ? styles.toggleBtnActive : {}),
                            }}
                            onClick={() => {
                              if (!canSpeak()) {
                                toast.info("您的浏览器不支持语音功能");
                                return;
                              }
                              setVoiceEnabled(!voiceEnabled);
                              toast.info(
                                voiceEnabled
                                  ? "语音提示已关闭"
                                  : "语音提示已开启",
                              );
                            }}
                          >
                            {voiceEnabled ? (
                              <SpeakerHigh size={16} />
                            ) : (
                              <SpeakerSlash size={16} />
                            )}
                          </button>
                        </div>
                        <div style={styles.makingDesktopSidebarToggleRow}>
                          <span style={styles.makingDesktopSidebarToggleLabel}>
                            高级制作辅助
                          </span>
                          <button
                            style={{
                              ...styles.toggleBtn,
                              ...(assistPackEnabled
                                ? styles.toggleBtnActive
                                : {}),
                            }}
                            onClick={() =>
                              setAssistPackEnabled(!assistPackEnabled)
                            }
                          >
                            {assistPackEnabled ? (
                              <CheckCircle size={16} weight="fill" />
                            ) : (
                              <CheckCircle size={16} />
                            )}
                          </button>
                        </div>
                        <div style={styles.makingDesktopSidebarToggleRow}>
                          <span style={styles.makingDesktopSidebarToggleLabel}>
                            自动切下一板
                          </span>
                          <button
                            style={{
                              ...styles.toggleBtn,
                              ...(autoAdvanceOnBoardDone
                                ? styles.toggleBtnActive
                                : {}),
                            }}
                            onClick={() =>
                              setAutoAdvanceOnBoardDone((prev) => !prev)
                            }
                          >
                            {autoAdvanceOnBoardDone ? (
                              <CheckCircle size={16} weight="fill" />
                            ) : (
                              <CheckCircle size={16} />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                    <div style={styles.makingDesktopSidebarSlot}>
                      <span style={styles.makingDesktopSidebarSlotTitle}>
                        更多设置
                      </span>
                      <span style={styles.makingDesktopSidebarSlotText}>
                        如果需要完整设置面板，仍可继续使用弹出面板。
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </aside>
          )}
      </div>

      {/* 底部操作栏 */}
      {viewMode !== "singleBoard" && <BannerAd placement="making_bottom" />}

      {!useDesktopSidebarLayout &&
        !isSingleBoardMobile &&
        (!isTraditionalMobile || selection.type === "color") && (
          <div style={styles.bottomBar}>
            {selection.type === null ? (
              <div style={styles.bottomHint}>
                {viewMode === "singleBoard"
                  ? !detailModeEnabled
                    ? "点格选区块"
                    : "点格看坐标"
                  : !detailModeEnabled
                    ? "点击画布选择区块"
                    : "点击格子查看坐标"}
              </div>
            ) : (
              <div style={styles.bottomActions}>
                {viewMode === "singleBoard" &&
                  assistPackEnabled &&
                  selectedCoordinateSummary && (
                    <div
                      style={{
                        ...styles.assistDock,
                        ...(viewMode === "singleBoard"
                          ? {
                              padding: isSingleBoardMobile
                                ? "4px 6px"
                                : isSingleBoardDesktop
                                  ? "4px 6px"
                                  : "6px 8px",
                              gap: isSingleBoardMobile
                                ? "6px"
                                : isSingleBoardDesktop
                                  ? "6px"
                                  : "8px",
                              borderRadius: isSingleBoardMobile
                                ? "8px"
                                : "10px",
                              alignItems: isSingleBoardMobile
                                ? "stretch"
                                : "center",
                            }
                          : {}),
                      }}
                    >
                      <div
                        style={{
                          ...styles.assistMeta,
                          ...(isSingleBoardMobile && viewMode === "singleBoard"
                            ? {
                                gap: "4px",
                              }
                            : isSingleBoardDesktop &&
                                viewMode === "singleBoard"
                              ? {
                                  gap: "6px",
                                }
                            : {}),
                        }}
                      >
                        {viewMode === "singleBoard" && singleBoardAllDone ? (
                          <>
                            <span
                              style={{
                                ...styles.assistBoardBadge,
                                ...styles.singleBoardFinishBadge,
                              }}
                            >
                              已完工
                            </span>
                            <span style={styles.assistCoordText}>
                              作品已完成
                            </span>
                          </>
                        ) : (
                          <>
                            {!isSingleBoardMobile && (
                              <span style={styles.assistBoardBadge}>
                                {selectedCoordinateSummary.boardLabel}
                              </span>
                            )}
                            <span
                              style={{
                                ...styles.assistCoordText,
                                ...(isSingleBoardMobile &&
                                viewMode === "singleBoard"
                                  ? { fontSize: "12px" }
                                  : isSingleBoardDesktop &&
                                      viewMode === "singleBoard"
                                    ? { fontSize: "11px" }
                                  : {}),
                              }}
                            >
                              列{selectedCoordinateSummary.localCol} 行
                              {selectedCoordinateSummary.localRow}
                            </span>
                          </>
                        )}
                        {viewMode === "singleBoard" ? (
                          <>
                            {!isSingleBoardMobile && (
                              <span style={styles.singleBoardTaskPill}>
                                {singleBoardAllDone
                                  ? "全部完成"
                                  : activeBoardDone
                                    ? `板${activeBoardNumber}已完成`
                                    : `板${activeBoardNumber}任务`}
                              </span>
                            )}
                            {!isSingleBoardMobile && (
                              <span
                                style={{
                                  ...styles.assistCoordMuted,
                                  ...(isSingleBoardMobile &&
                                  viewMode === "singleBoard"
                                    ? { fontSize: "11px" }
                                    : isSingleBoardDesktop &&
                                        viewMode === "singleBoard"
                                      ? { fontSize: "10px" }
                                    : {}),
                                }}
                              >
                                {singleBoardProgress.doneCount}/
                                {singleBoardProgress.totalCount}
                              </span>
                            )}
                            {!singleBoardAllDone && !isSingleBoardMobile && (
                              <span style={styles.assistCoordMuted}>
                                剩余 {singleBoardProgress.remainingCount}
                              </span>
                            )}
                            {nextPendingBoardNumber &&
                              activeBoardDone &&
                              !isSingleBoardMobile && (
                                <span style={styles.assistCoordMuted}>
                                  下一块 板{nextPendingBoardNumber}
                                </span>
                              )}
                          </>
                        ) : (
                          <span style={styles.assistCoordMuted}>
                            全图 {selectedCoordinateSummary.globalCol},
                            {selectedCoordinateSummary.globalRow}
                          </span>
                        )}
                      </div>
                      {viewMode === "singleBoard" && (
                        <button
                          style={{
                            ...styles.assistLocateBtn,
                            ...styles.singleBoardAssistPrimaryBtn,
                            ...(isSingleBoardDesktop
                              ? {
                                  height: "30px",
                                  minWidth: "62px",
                                  padding: "0 12px",
                                  fontSize: "11px",
                                }
                              : {}),
                          }}
                          onClick={() => {
                            if (singleBoardAllDone) {
                              setSingleBoardOverviewCollapsed(false);
                              handleOpenExport();
                              return;
                            }
                            if (activeBoardDone && nextPendingBoardNumber) {
                              activateBoard(nextPendingBoardNumber, true);
                              return;
                            }
                            handleToggleBoardDone();
                          }}
                          disabled={!activeBoardRect}
                        >
                          {singleBoardAllDone
                            ? "导出图纸"
                            : activeBoardDone && nextPendingBoardNumber
                              ? "下一块"
                              : activeBoardRect &&
                                  boardStatusMap[activeBoardRect.boardNumber]
                                ? "取消完成"
                                : "完成"}
                        </button>
                      )}
                      <button
                        style={
                          viewMode === "singleBoard"
                            ? {
                                ...styles.singleBoardAssistMinorBtn,
                                ...(isSingleBoardDesktop
                                  ? {
                                      height: "30px",
                                      minWidth: "58px",
                                      padding: "0 10px",
                                      fontSize: "10px",
                                    }
                                  : {}),
                              }
                            : styles.assistLocateBtn
                        }
                        onClick={() => {
                          if (
                            viewMode === "singleBoard" &&
                            singleBoardAllDone
                          ) {
                            handleBackToEditor();
                            return;
                          }
                          if (
                            isSingleBoardMobile &&
                            viewMode === "singleBoard"
                          ) {
                            resetCurrentView();
                            return;
                          }
                          jumpToBoard(-1);
                        }}
                        disabled={
                          viewMode === "singleBoard"
                            ? singleBoardAllDone
                              ? false
                              : isSingleBoardMobile
                                ? !activeBoardRect
                                : activeBoardNumber <= 1
                            : !currentBoardRect ||
                              currentBoardRect.boardNumber <= 1
                        }
                      >
                        {viewMode === "singleBoard"
                          ? singleBoardAllDone
                            ? "回到编辑"
                            : isSingleBoardMobile
                              ? "定位"
                              : "上一板"
                          : "上一块"}
                      </button>
                      {!isSingleBoardMobile && (
                        <button
                          style={
                            viewMode === "singleBoard"
                              ? {
                                  ...styles.singleBoardAssistMinorBtn,
                                  ...(isSingleBoardDesktop
                                    ? {
                                        height: "30px",
                                        minWidth: "58px",
                                        padding: "0 10px",
                                        fontSize: "10px",
                                      }
                                    : {}),
                                }
                              : styles.assistLocateBtn
                          }
                          onClick={() => {
                            if (
                              viewMode === "singleBoard" &&
                              singleBoardAllDone
                            ) {
                              handleShareFinishedWork();
                              return;
                            }
                            resetCurrentView();
                          }}
                          disabled={
                            viewMode === "singleBoard"
                              ? singleBoardAllDone
                                ? false
                                : !activeBoardRect
                              : !currentBoardRect
                          }
                        >
                          {viewMode === "singleBoard" && singleBoardAllDone
                            ? "分享作品"
                            : "复位视图"}
                        </button>
                      )}
                      {viewMode === "singleBoard" && singleBoardAllDone && (
                        <button
                          style={{
                            ...styles.singleBoardAssistMinorBtn,
                            ...(isSingleBoardDesktop
                              ? {
                                  height: "30px",
                                  minWidth: "58px",
                                  padding: "0 10px",
                                  fontSize: "10px",
                                }
                              : {}),
                          }}
                          onClick={handleDeductInventory}
                          disabled={
                            inventoryConsumed || !inventoryCheck.canApply
                          }
                        >
                          {inventoryConsumed
                            ? "已扣减豆仓"
                            : inventoryCheck.canApply
                              ? "扣减豆仓"
                              : "库存不足"}
                        </button>
                      )}
                      {!isSingleBoardMobile &&
                        !(viewMode === "singleBoard" && singleBoardAllDone) && (
                          <button
                            style={
                              viewMode === "singleBoard"
                                ? {
                                    ...styles.singleBoardAssistMinorBtn,
                                    ...(isSingleBoardDesktop
                                      ? {
                                          height: "30px",
                                          minWidth: "58px",
                                          padding: "0 10px",
                                          fontSize: "10px",
                                        }
                                      : {}),
                                  }
                                : styles.assistLocateBtn
                            }
                            onClick={() => {
                              jumpToBoard(1);
                            }}
                            disabled={
                              viewMode === "singleBoard"
                                ? activeBoardNumber >= totalBoardCount
                                : !currentBoardRect ||
                                  currentBoardRect.boardNumber >=
                                    totalBoardCount
                            }
                          >
                            {viewMode === "singleBoard" ? "下一板" : "下一块"}
                          </button>
                        )}
                      {viewMode === "singleBoard" && singleBoardAllDone && (
                        <button
                          style={{
                            ...styles.singleBoardAssistMinorBtn,
                            ...(isSingleBoardDesktop
                              ? {
                                  height: "30px",
                                  minWidth: "58px",
                                  padding: "0 10px",
                                  fontSize: "10px",
                                }
                              : {}),
                          }}
                          disabled
                        >
                          已完成
                        </button>
                      )}
                    </div>
                  )}
              </div>
            )}
          </div>
        )}

      {showSingleBoardOnboarding && viewMode === "singleBoard" && (
        <div style={styles.singleBoardOnboardingOverlay}>
          <div style={styles.singleBoardOnboardingCard}>
            <button
              style={styles.singleBoardOnboardingClose}
              onClick={handleDismissSingleBoardOnboarding}
              aria-label="关闭单板模式引导"
            >
              ×
            </button>
            <span style={styles.singleBoardOnboardingEyebrow}>单板模式引导</span>
            <h3 style={styles.singleBoardOnboardingTitle}>先熟悉这 3 个关键动作</h3>
            <div style={styles.singleBoardOnboardingSteps}>
              <div style={styles.singleBoardOnboardingStep}>
                <span style={styles.singleBoardOnboardingStepIndex}>1</span>
                <div style={styles.singleBoardOnboardingStepBody}>
                  <span style={styles.singleBoardOnboardingStepTitle}>
                    一次只专注一块板
                  </span>
                  <span style={styles.singleBoardOnboardingStepText}>
                    单板模式会聚焦当前板，减少整图干扰，更适合跟着实体板制作。
                  </span>
                </div>
              </div>
              <div style={styles.singleBoardOnboardingStep}>
                <span style={styles.singleBoardOnboardingStepIndex}>2</span>
                <div style={styles.singleBoardOnboardingStepBody}>
                  <span style={styles.singleBoardOnboardingStepTitle}>
                    看总览图快速跳板
                  </span>
                  <span style={styles.singleBoardOnboardingStepText}>
                    点击“看总览图”可以查看整幅作品，并直接跳到其它板面。
                  </span>
                </div>
              </div>
              <div style={styles.singleBoardOnboardingStep}>
                <span style={styles.singleBoardOnboardingStepIndex}>3</span>
                <div style={styles.singleBoardOnboardingStepBody}>
                  <span style={styles.singleBoardOnboardingStepTitle}>
                    缩小后才能手势切板
                  </span>
                  <span style={styles.singleBoardOnboardingStepText}>
                    放大时手势只会移动画面；缩小到适板附近后，拖到边缘再继续滑动就能切板。
                  </span>
                </div>
              </div>
            </div>
            <button
              style={styles.singleBoardOnboardingPrimaryBtn}
              onClick={handleDismissSingleBoardOnboarding}
            >
              知道了
            </button>
          </div>
        </div>
      )}

      {/* 导出弹窗 */}
      {beadData && (
        <ExportModal
          visible={showExportModal}
          onClose={() => setShowExportModal(false)}
          beadData={beadData}
          onNeedRewardUnlock={(_reason, onUnlocked) => {
            pendingExportAfterRewardRef.current = onUnlocked || null;
            setShowRewardedUnlockModal(true);
          }}
        />
      )}

      <RewardedUnlockModal
        visible={showRewardedUnlockModal}
        title="解锁高清导出"
        desc="观看短广告后可解锁 1 次高级导出。"
        onClose={() => setShowRewardedUnlockModal(false)}
        onRewardEarned={() => {
          adService.grantPremiumExportRewardCredit();
          const run = pendingExportAfterRewardRef.current;
          pendingExportAfterRewardRef.current = null;
          if (run) {
            toast.success("广告已完成，开始下载图纸");
            run();
            return;
          }
          toast.success("已解锁 1 次高级导出");
        }}
      />

      {/* 颜色替换弹窗 */}
      {selectedBeadColor && (
        <ColorReplaceModal
          visible={showReplaceModal}
          onClose={() => setShowReplaceModal(false)}
          currentColor={selectedBeadColor}
          totalCount={colorCountTotal}
          onReplace={handleColorReplace}
          onUndoReplace={handleUndoLastReplace}
          onRedoReplace={handleRedoLastReplace}
          canUndoReplace={Boolean(lastReplaceSnapshot)}
          canRedoReplace={Boolean(redoReplaceSnapshot)}
        />
      )}

      {beadData && visionBoardRecommendation && (
        <BoardVisionAssistModal
          visible={showVisionAssist}
          onClose={() => setShowVisionAssist(false)}
          beadData={beadData}
          boardSize={visionBoardRecommendation.boardSize}
          initialBoardIndex={visionInitialBoardIndex}
          initialColorId={visionInitialColorId}
        />
      )}

      {/* 底部导航栏 */}
      {singleBoardMobileImmersiveLayout.showBottomNav && (
        <BottomNav transparent />
      )}
    </div>
  );
};

const makingCandy = {
  bg: "#fdf7f1",
  bgSoft: "#fff1e7",
  panel: "rgba(255,255,255,0.92)",
  panelStrong: "#ffffff",
  panelDark: "#453f61",
  border: "rgba(255, 186, 161, 0.34)",
  borderStrong: "rgba(95, 200, 255, 0.4)",
  text: "#4b3f5f",
  textSoft: "#7f7293",
  textMuted: "#a093af",
  cyan: "#4faee1",
  shadow: "0 16px 36px rgba(255, 188, 154, 0.14)",
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: "100dvh",
    maxHeight: "-webkit-fill-available",
    display: "flex",
    flexDirection: "column",
    background: `linear-gradient(180deg, ${makingCandy.bg} 0%, ${makingCandy.bgSoft} 100%)`,
    overflow: "hidden",
  },

  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "6px 12px",
    background: "rgba(255,255,255,0.86)",
    borderBottom: `1px solid ${makingCandy.border}`,
    flexShrink: 0,
  },

  backBtn: {
    ...mixins.backButton,
  },

  title: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyAlt,
    background: colors.gradients.primary,
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
    margin: 0,
  },

  previewSection: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    padding: "0",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(255,245,236,0.94) 100%)",
    overflow: "hidden",
    position: "relative" as const,
    minHeight: 0,
  },

  makingDesktopSidebar: {
    position: "absolute" as const,
    top: "10px",
    right: "10px",
    bottom: "12px",
    display: "flex",
    flexDirection: "column" as const,
    alignSelf: "stretch",
    flexShrink: 0,
    minHeight: 0,
    zIndex: 4,
    borderLeft: `1px solid ${makingCandy.border}`,
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(255,246,239,0.94) 100%)",
    boxShadow: "inset 1px 0 0 rgba(255,255,255,0.6)",
    borderRadius: "18px",
    overflow: "hidden" as const,
  },

  makingDesktopSidebarPanel: {
    display: "flex",
    flexDirection: "column" as const,
    minHeight: 0,
    height: "100%",
  },

  makingDesktopSidebarHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
    padding: "10px 12px 8px",
    borderBottom: `1px solid rgba(96,165,250,0.12)`,
  },

  makingDesktopSidebarTitle: {
    fontSize: "12px",
    fontWeight: 800,
    color: makingCandy.text,
  },

  makingDesktopSidebarToggle: {
    height: "24px",
    padding: "0 10px",
    borderRadius: radius.full,
    border: `1px solid ${makingCandy.border}`,
    background: "rgba(255,255,255,0.9)",
    color: makingCandy.textSoft,
    fontSize: "10px",
    fontWeight: 700,
    cursor: "pointer",
  },

  makingDesktopSidebarContent: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "12px",
    minHeight: 0,
    overflowY: "auto" as const,
  },

  makingDesktopSidebarSlot: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "6px",
    padding: "12px",
    borderRadius: radius.xl,
    border: `1px dashed rgba(96,165,250,0.24)`,
    background:
      "linear-gradient(145deg, rgba(255,255,255,0.95), rgba(244,114,182,0.06))",
  },

  makingDesktopSidebarSlotHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "8px",
  },

  makingDesktopSidebarSlotMeta: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "2px",
    minWidth: 0,
  },

  makingDesktopSidebarSlotTitle: {
    fontSize: "11px",
    fontWeight: 800,
    color: makingCandy.text,
  },

  makingDesktopSidebarSlotText: {
    fontSize: "10px",
    lineHeight: 1.5,
    color: makingCandy.textSoft,
  },

  makingDesktopSidebarSlotBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    height: "22px",
    padding: "0 8px",
    borderRadius: radius.full,
    border: `1px solid rgba(96,165,250,0.22)`,
    background: "rgba(255,255,255,0.86)",
    color: makingCandy.textSoft,
    fontSize: "9px",
    fontWeight: 800,
    flexShrink: 0,
  },

  makingDesktopSidebarBoardActions: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },

  makingDesktopSidebarBoardBtn: {
    flex: 1,
    height: "28px",
    borderRadius: radius.full,
    border: `1px solid ${makingCandy.border}`,
    background: "rgba(255,255,255,0.92)",
    color: makingCandy.text,
    fontSize: "11px",
    fontWeight: 700,
    cursor: "pointer",
  },

  makingDesktopSidebarPendingRow: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    flexWrap: "wrap" as const,
  },

  makingDesktopSidebarPendingLabel: {
    fontSize: "10px",
    fontWeight: 700,
    color: makingCandy.textSoft,
  },

  makingDesktopSidebarWorkflowRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap" as const,
  },

  makingDesktopSidebarWorkflowPrimaryBtn: {
    flex: "1 1 100%",
    height: "30px",
    borderRadius: radius.full,
    border: `1px solid ${makingCandy.borderStrong}`,
    background:
      "linear-gradient(145deg, rgba(125,211,252,0.22), rgba(244,114,182,0.18))",
    color: makingCandy.text,
    fontSize: "11px",
    fontWeight: 800,
    cursor: "pointer",
  },

  makingDesktopSidebarWorkflowBtn: {
    flex: "1 1 0",
    minWidth: "104px",
    height: "28px",
    borderRadius: radius.full,
    border: `1px solid ${makingCandy.border}`,
    background: "rgba(255,255,255,0.92)",
    color: makingCandy.textSoft,
    fontSize: "10px",
    fontWeight: 700,
    cursor: "pointer",
  },

  makingDesktopSidebarSection: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "10px",
    padding: "12px",
    borderRadius: radius.xl,
    border: `1px solid rgba(96,165,250,0.16)`,
    background:
      "linear-gradient(145deg, rgba(255,255,255,0.96), rgba(125,211,252,0.08))",
  },

  makingDesktopSidebarSectionHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "8px",
  },

  makingDesktopSidebarSectionMeta: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "2px",
    minWidth: 0,
  },

  makingDesktopSidebarMinorBtn: {
    height: "24px",
    padding: "0 10px",
    borderRadius: radius.full,
    border: `1px solid ${makingCandy.border}`,
    background: "rgba(255,255,255,0.9)",
    color: makingCandy.textSoft,
    fontSize: "10px",
    fontWeight: 700,
    cursor: "pointer",
    flexShrink: 0,
  },

  makingDesktopSidebarActionGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "8px",
  },

  makingDesktopSidebarActionBtn: {
    height: "30px",
    borderRadius: radius.full,
    border: `1px solid ${makingCandy.border}`,
    background:
      "linear-gradient(145deg, rgba(125,211,252,0.18), rgba(244,114,182,0.14))",
    color: makingCandy.text,
    fontSize: "11px",
    fontWeight: 800,
    cursor: "pointer",
  },

  makingDesktopSidebarToggleList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "8px",
  },

  makingDesktopSidebarToggleRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
  },

  makingDesktopSidebarToggleLabel: {
    fontSize: "11px",
    fontWeight: 700,
    color: makingCandy.text,
  },

  makingDesktopSidebarRail: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    paddingTop: "12px",
    height: "100%",
  },

  makingDesktopSidebarRailBtn: {
    writingMode: "vertical-rl" as const,
    textOrientation: "mixed" as const,
    height: "88px",
    minWidth: "24px",
    padding: "10px 0",
    borderRadius: radius.full,
    border: `1px solid ${makingCandy.border}`,
    background:
      "linear-gradient(145deg, rgba(255,255,255,0.96), rgba(125,211,252,0.18))",
    color: makingCandy.text,
    fontSize: "10px",
    fontWeight: 800,
    cursor: "pointer",
  },

  modeSwitchBar: {
    display: "flex",
    gap: "8px",
    padding: "10px 12px 0",
    flexShrink: 0,
  },

  modeSwitchBtn: {
    flex: 1,
    height: "34px",
    borderRadius: radius.full,
    border: `1px solid ${makingCandy.border}`,
    background: "rgba(255,255,255,0.88)",
    color: makingCandy.textSoft,
    fontSize: typography.fontSize.sm,
    fontWeight: 700,
    cursor: "pointer",
  },

  modeSwitchBtnActive: {
    background:
      "linear-gradient(145deg, #7fd8ff 0%, #85b7ff 55%, #ff93bf 100%)",
    color: "#ffffff",
    borderColor: "rgba(126,163,255,0.45)",
    boxShadow: makingCandy.shadow,
  },

  singleBoardOverview: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    padding: "4px 8px 0",
    flexShrink: 0,
  },

  singleBoardResumeEntry: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
    padding: "6px 8px",
    borderRadius: radius.lg,
    border: `1px solid rgba(96,165,250,0.2)`,
    background:
      "linear-gradient(145deg, rgba(125,211,252,0.12), rgba(244,114,182,0.1))",
    boxShadow: makingCandy.shadowSoft,
  },

  singleBoardCompletionEntry: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
    padding: "6px 8px",
    borderRadius: radius.lg,
    border: `1px solid rgba(52,211,153,0.26)`,
    background:
      "linear-gradient(145deg, rgba(236,253,245,0.95), rgba(240,249,255,0.96))",
    boxShadow: "0 10px 20px rgba(52,211,153,0.12)",
  },

  singleBoardCompletionActions: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    flexShrink: 0,
  },

  singleBoardResumeEntryMeta: {
    display: "flex",
    flexDirection: "column",
    gap: "1px",
    minWidth: 0,
  },

  singleBoardResumeEntryTitle: {
    fontSize: "11px",
    fontWeight: 800,
    color: makingCandy.text,
  },

  singleBoardResumeEntryText: {
    fontSize: "10px",
    color: makingCandy.textSoft,
  },

  singleBoardShareFeedback: {
    fontSize: "10px",
    color: "#0f766e",
    fontWeight: 700,
  },

  singleBoardResumeEntryBtn: {
    height: "26px",
    padding: "0 12px",
    borderRadius: radius.full,
    border: `1px solid rgba(96,165,250,0.28)`,
    background:
      "linear-gradient(145deg, rgba(125,211,252,0.2), rgba(244,114,182,0.18))",
    color: makingCandy.text,
    fontSize: "11px",
    fontWeight: 800,
    cursor: "pointer",
    flexShrink: 0,
  },

  singleBoardSecondaryBtn: {
    background: "rgba(255,255,255,0.92)",
    borderColor: makingCandy.border,
    color: makingCandy.textSoft,
  },

  singleBoardCompactHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
    padding: "0",
  },

  singleBoardCompactMeta: {
    display: "flex",
    alignItems: "baseline",
    gap: "6px",
    minWidth: 0,
    flexWrap: "wrap" as const,
  },

  singleBoardDesktopHeaderActions: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    flexShrink: 0,
  },

  singleBoardDesktopHeaderBtn: {
    height: "22px",
    padding: "0 8px",
    borderRadius: radius.full,
    border: `1px solid rgba(96,165,250,0.28)`,
    background:
      "linear-gradient(145deg, rgba(125,211,252,0.16), rgba(244,114,182,0.14))",
    color: makingCandy.text,
    fontSize: "9px",
    fontWeight: 800,
    cursor: "pointer",
    flexShrink: 0,
  },

  singleBoardSummaryHint: {
    fontSize: "9px",
    color: makingCandy.textSoft,
    fontWeight: 700,
  },

  singleBoardStatePill: {
    display: "inline-flex",
    alignItems: "center",
    height: "18px",
    padding: "0 7px",
    borderRadius: radius.full,
    fontSize: "9px",
    fontWeight: 800,
  },

  singleBoardStatePillTodo: {
    background: "rgba(96,165,250,0.12)",
    color: "#1d4ed8",
  },

  singleBoardStatePillDone: {
    background: "rgba(52,211,153,0.16)",
    color: "#0f766e",
  },

  singleBoardCollapseBtn: {
    height: "22px",
    padding: "0 8px",
    borderRadius: radius.full,
    border: `1px solid ${makingCandy.border}`,
    background: "rgba(255,255,255,0.92)",
    color: makingCandy.textSoft,
    fontSize: "9px",
    fontWeight: 700,
    cursor: "pointer",
    flexShrink: 0,
  },

  singleBoardProgressTrack: {
    width: "100%",
    height: "5px",
    borderRadius: radius.full,
    background: "rgba(148,163,184,0.18)",
    overflow: "hidden",
  },

  singleBoardProgressFill: {
    height: "100%",
    borderRadius: radius.full,
    background:
      "linear-gradient(90deg, rgba(52,211,153,0.95), rgba(96,165,250,0.95))",
    transition: "width 180ms ease",
  },

  singleBoardQuickRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
    flexWrap: "wrap" as const,
    marginTop: "-1px",
  },

  singleBoardDesktopQuickRow: {
    gap: "6px",
    alignItems: "center",
  },

  singleBoardQuickControls: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    flexWrap: "wrap" as const,
  },

  singleBoardDesktopQuickControls: {
    gap: "4px",
  },

  singleBoardResumeBtn: {
    height: "24px",
    padding: "0 10px",
    borderRadius: radius.full,
    border: `1px solid rgba(96,165,250,0.28)`,
    background:
      "linear-gradient(145deg, rgba(125,211,252,0.14), rgba(244,114,182,0.14))",
    color: makingCandy.text,
    fontSize: "10px",
    fontWeight: 800,
    cursor: "pointer",
  },

  singleBoardQuickToggle: {
    height: "24px",
    padding: "0 10px",
    borderRadius: radius.full,
    border: `1px solid ${makingCandy.border}`,
    background: "rgba(255,255,255,0.9)",
    color: makingCandy.textSoft,
    fontSize: "10px",
    fontWeight: 700,
    cursor: "pointer",
  },

  singleBoardDesktopQuickToggle: {
    height: "22px",
    padding: "0 8px",
    fontSize: "9px",
  },

  singleBoardQuickToggleActive: {
    background:
      "linear-gradient(145deg, rgba(125,211,252,0.18), rgba(244,114,182,0.16))",
    color: makingCandy.text,
    borderColor: makingCandy.borderStrong,
  },

  singleBoardPendingRow: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    flexWrap: "wrap" as const,
  },

  singleBoardDesktopPendingRow: {
    gap: "3px",
  },

  singleBoardPendingLabel: {
    fontSize: "10px",
    color: makingCandy.textSoft,
    fontWeight: 700,
  },

  singleBoardDesktopPendingLabel: {
    fontSize: "9px",
  },

  singleBoardPendingChip: {
    height: "22px",
    padding: "0 8px",
    borderRadius: radius.full,
    border: `1px solid ${makingCandy.border}`,
    background: "rgba(255,255,255,0.9)",
    color: makingCandy.text,
    fontSize: "10px",
    fontWeight: 700,
    cursor: "pointer",
  },

  singleBoardDesktopPendingChip: {
    height: "20px",
    padding: "0 7px",
    fontSize: "9px",
  },

  singleBoardPendingMore: {
    fontSize: "10px",
    color: makingCandy.textSoft,
    fontWeight: 700,
  },

  singleBoardMobileSummaryRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "4px",
    padding: "4px 6px",
    borderRadius: "16px",
    background: "rgba(255,255,255,0.82)",
    border: `1px solid rgba(255,255,255,0.72)`,
    boxShadow: "0 8px 18px rgba(120,93,45,0.08)",
    backdropFilter: "blur(8px)",
  },

  singleBoardMobileSummaryMain: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    flexWrap: "wrap" as const,
    minWidth: 0,
  },

  singleBoardMobileSummaryTitle: {
    fontSize: "11px",
    fontWeight: 800,
    color: makingCandy.text,
  },

  singleBoardMobileSummaryText: {
    fontSize: "9px",
    color: makingCandy.textSoft,
    fontWeight: 800,
  },

  singleBoardMobileSummaryHint: {
    fontSize: "9px",
    color: "#0f766e",
    fontWeight: 800,
  },

  singleBoardMobileQuickToggle: {
    height: "20px",
    padding: "0 7px",
    fontSize: "9px",
    flexShrink: 0,
  },

  singleBoardMobileChromeStack: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "4px",
  },

  singleBoardMobileImmersiveCanvasContainer: {
    minHeight: 0,
    height: "100%",
  },

  singleBoardMobileImmersiveOverviewLayer: {
    position: "absolute" as const,
    inset: 0,
    padding: 0,
    gap: 0,
    zIndex: 45,
    pointerEvents: "none" as const,
  },

  singleBoardMobileImmersiveOverlay: {
    position: "absolute" as const,
    inset: 0,
    padding: 0,
    gap: 0,
    zIndex: 45,
    pointerEvents: "none" as const,
  },

  singleBoardMobileImmersiveChromeStack: {
    position: "absolute" as const,
    inset: 0,
    display: "block",
    pointerEvents: "none" as const,
  },

  singleBoardMobileImmersiveBackdrop: {
    position: "absolute" as const,
    inset: 0,
    zIndex: 1,
    background: "rgba(255,255,255,0.03)",
    pointerEvents: "auto" as const,
    touchAction: "none",
  },

  singleBoardMobileImmersiveSummaryPill: {
    position: "absolute" as const,
    top: "8px",
    left: "8px",
    maxWidth: "calc(100vw - 96px)",
    padding: "5px 8px",
    borderRadius: radius.full,
    background: "rgba(255,255,255,0.68)",
    border: `1px solid rgba(255,255,255,0.72)`,
    boxShadow: "0 8px 20px rgba(120,93,45,0.08)",
    backdropFilter: "blur(10px)",
    zIndex: 4,
    pointerEvents: "auto" as const,
  },

  singleBoardMobileImmersiveSwipeStatus: {
    position: "absolute" as const,
    left: "8px",
    right: "8px",
    top: "42px",
    opacity: 0.86,
    zIndex: 3,
    pointerEvents: "none" as const,
  },

  singleBoardMobileImmersiveToolbarShell: {
    position: "absolute" as const,
    right: "8px",
    bottom: "max(10px, env(safe-area-inset-bottom, 0px))",
    width: "min(186px, calc(100vw - 18px))",
    padding: "5px",
    opacity: 0.88,
    zIndex: 5,
    pointerEvents: "auto" as const,
  },

  singleBoardMobileToolbarShell: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "4px",
    padding: "5px 6px 6px",
    borderRadius: "18px",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.86), rgba(255,248,240,0.9))",
    border: `1px solid rgba(255,255,255,0.74)`,
    boxShadow: "0 10px 22px rgba(120,93,45,0.1)",
    backdropFilter: "blur(10px)",
  },

  singleBoardSwipeStatus: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 9px",
    borderRadius: "14px",
    border: `1px solid rgba(255,255,255,0.72)`,
    background: "rgba(255,255,255,0.8)",
    flexWrap: "wrap" as const,
    boxShadow: "0 8px 18px rgba(120,93,45,0.08)",
    backdropFilter: "blur(8px)",
  },

  singleBoardSwipeStatusInline: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "4px 9px",
    borderRadius: radius.full,
    border: `1px solid ${makingCandy.border}`,
    fontSize: "11px",
    fontWeight: 700,
    lineHeight: 1.25,
  },

  singleBoardSwipeStatusLocked: {
    background: "rgba(148,163,184,0.12)",
    borderColor: "rgba(148,163,184,0.22)",
    color: makingCandy.textSoft,
  },

  singleBoardSwipeStatusReady: {
    background: "rgba(79,174,225,0.12)",
    borderColor: "rgba(79,174,225,0.24)",
    color: makingCandy.text,
  },

  singleBoardSwipeStatusTitle: {
    fontSize: "10px",
    fontWeight: 900,
    flexShrink: 0,
  },

  singleBoardSwipeStatusText: {
    fontSize: "10px",
    fontWeight: 700,
    lineHeight: 1.35,
  },

  singleBoardMobileNavRow: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    flexWrap: "wrap" as const,
    minWidth: 0,
  },

  singleBoardMobileToolRow: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    flexWrap: "wrap" as const,
    paddingTop: "2px",
    borderTop: `1px solid rgba(255,255,255,0.65)`,
  },

  singleBoardMobileToolToggleBtn: {
    minWidth: "52px",
    height: "28px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.full,
    border: `1px solid ${makingCandy.borderStrong}`,
    background:
      "linear-gradient(145deg, rgba(125,211,252,0.16), rgba(244,114,182,0.12))",
    color: makingCandy.text,
    fontSize: "11px",
    fontWeight: 800,
    cursor: "pointer",
    flexShrink: 0,
    boxShadow: makingCandy.shadowSoft,
  },

  singleBoardMobileToolToggleBtnActive: {
    background:
      "linear-gradient(145deg, rgba(255,255,255,0.98), rgba(255,248,240,0.96))",
    borderColor: makingCandy.borderStrong,
  },

  singleBoardMobileToolChip: {
    minWidth: "58px",
    height: "20px",
    padding: "0 8px",
    borderRadius: radius.full,
    border: `1px solid ${makingCandy.border}`,
    background: "rgba(255,255,255,0.9)",
    color: makingCandy.textSoft,
    fontSize: "9px",
    fontWeight: 700,
    cursor: "pointer",
    flexShrink: 0,
  },

  singleBoardMobileToolChipActive: {
    background:
      "linear-gradient(145deg, rgba(125,211,252,0.18), rgba(244,114,182,0.16))",
    color: makingCandy.text,
    borderColor: makingCandy.borderStrong,
  },

  singleBoardMobileOverviewBtn: {
    minWidth: "58px",
    height: "28px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.full,
    border: `1px solid ${makingCandy.borderStrong}`,
    background:
      "linear-gradient(145deg, rgba(125,211,252,0.24), rgba(244,114,182,0.18))",
    color: makingCandy.text,
    fontSize: "11px",
    fontWeight: 800,
    cursor: "pointer",
    flexShrink: 0,
    boxShadow: makingCandy.shadowSoft,
  },

  singleBoardMobileMiniMapPanel: {
    display: "flex",
    justifyContent: "center",
    paddingTop: "4px",
  },

  singleBoardMobileMiniMapPanelInner: {
    width: "min(44vw, 132px)",
    padding: "6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "12px",
    border: `1px solid ${makingCandy.border}`,
    background:
      "linear-gradient(145deg, rgba(255,255,255,0.98), rgba(245,251,255,0.95))",
    boxShadow: makingCandy.shadowSoft,
    cursor: "pointer",
  },

  singleBoardMobileNavBtn: {
    width: "26px",
    height: "26px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.full,
    border: `1px solid ${makingCandy.border}`,
    background: "rgba(255,255,255,0.94)",
    color: makingCandy.text,
    fontSize: "16px",
    fontWeight: 800,
    cursor: "pointer",
    flexShrink: 0,
  },

  singleBoardMobileMiniMapCard: {
    flex: 1,
    minWidth: 0,
    height: "30px",
    padding: "3px 5px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "10px",
    border: `1px solid ${makingCandy.border}`,
    background:
      "linear-gradient(145deg, rgba(255,255,255,0.96), rgba(245,251,255,0.94))",
    boxShadow: makingCandy.shadowSoft,
    cursor: "pointer",
  },

  singleBoardMobileMiniMapCanvas: {
    maxHeight: "100%",
    width: "100%",
    height: "100%",
  },

  singleBoardMobileMiniMapPanelCanvas: {
    width: "100%",
    height: "auto",
    minHeight: "84px",
    maxHeight: "140px",
  },

  singleBoardMobileMiniMapCell: {
    fontSize: 0,
    lineHeight: 0,
  },

  singleBoardMobileOverviewOverlay: {
    position: "fixed" as const,
    inset: 0,
    zIndex: 60,
    pointerEvents: "none" as const,
  },

  singleBoardMobileOverviewCard: {
    position: "absolute" as const,
    width: "220px",
    maxHeight: "280px",
    padding: "8px",
    borderRadius: "18px",
    border: `1px solid ${makingCandy.borderStrong}`,
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.93), rgba(255,247,242,0.9))",
    backdropFilter: "blur(12px)",
    boxShadow: makingCandy.shadow,
    pointerEvents: "auto" as const,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column" as const,
    touchAction: "none" as const,
  },

  singleBoardMobileOverviewHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
    marginBottom: "6px",
    cursor: "grab",
    touchAction: "none" as const,
  },

  singleBoardMobileOverviewTitle: {
    fontSize: "10px",
    fontWeight: 800,
    color: makingCandy.text,
    lineHeight: 1.35,
  },

  singleBoardMobileOverviewCloseBtn: {
    width: "22px",
    height: "22px",
    borderRadius: radius.full,
    border: `1px solid ${makingCandy.border}`,
    background: "rgba(255,255,255,0.88)",
    color: makingCandy.textSoft,
    fontSize: "14px",
    fontWeight: 800,
    cursor: "pointer",
    lineHeight: 1,
  },

  singleBoardMobileOverviewBody: {
    position: "relative" as const,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    minHeight: 0,
  },

  singleBoardMobileOverviewCanvasWrap: {
    width: "100%",
    padding: "4px",
    borderRadius: "14px",
    border: `1px solid ${makingCandy.border}`,
    background: "rgba(255,255,255,0.86)",
    overflow: "auto",
    maxHeight: "100%",
  },

  singleBoardMobileOverviewCanvas: {
    display: "block",
    width: "100%",
    height: "auto",
    minHeight: "72px",
    maxHeight: "100%",
    borderRadius: "10px",
    cursor: "pointer",
    background:
      "linear-gradient(180deg, rgba(241,245,249,0.9), rgba(255,255,255,0.95))",
  },

  singleBoardMobileOverviewArrow: {
    position: "absolute" as const,
    top: "50%",
    width: "28px",
    height: "28px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    transform: "translateY(-50%)",
    borderRadius: radius.full,
    border: `1px solid ${makingCandy.borderStrong}`,
    background: "rgba(255,255,255,0.96)",
    color: makingCandy.text,
    fontSize: "18px",
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: makingCandy.shadowSoft,
  },

  singleBoardMobileOverviewArrowLeft: {
    left: "-10px",
  },

  singleBoardMobileOverviewArrowRight: {
    right: "-10px",
  },

  singleBoardMobileOverviewHint: {
    marginTop: "6px",
    fontSize: "10px",
    color: makingCandy.textSoft,
    textAlign: "center" as const,
    fontWeight: 700,
    lineHeight: 1.45,
    paddingRight: "28px",
  },

  singleBoardMobileOverviewResizeHandle: {
    position: "absolute" as const,
    right: "10px",
    bottom: "10px",
    width: "28px",
    height: "28px",
    borderRadius: radius.full,
    background: "rgba(255,255,255,0.8)",
    border: `1px solid ${makingCandy.borderStrong}`,
    boxShadow: makingCandy.shadowSoft,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "nwse-resize",
    touchAction: "none" as const,
  },

  singleBoardMobileOverviewResizeHandleIcon: {
    width: "12px",
    height: "12px",
    borderRight: `2px solid ${makingCandy.textSoft}`,
    borderBottom: `2px solid ${makingCandy.textSoft}`,
    transform: "translate(-1px, -1px) rotate(0deg)",
  },

  singleBoardOnboardingOverlay: {
    position: "fixed" as const,
    inset: 0,
    zIndex: 2500,
    background: "rgba(37, 30, 58, 0.42)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
  },

  singleBoardOnboardingCard: {
    width: "min(100%, 360px)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(255,247,241,0.98))",
    borderRadius: "24px",
    border: `1px solid ${makingCandy.borderStrong}`,
    boxShadow: "0 24px 48px rgba(56, 42, 86, 0.22)",
    padding: "18px 18px 16px",
    position: "relative" as const,
    display: "flex",
    flexDirection: "column" as const,
    gap: "12px",
  },

  singleBoardOnboardingClose: {
    position: "absolute" as const,
    top: "12px",
    right: "12px",
    width: "28px",
    height: "28px",
    borderRadius: radius.full,
    border: `1px solid ${makingCandy.border}`,
    background: "rgba(255,255,255,0.86)",
    color: makingCandy.textSoft,
    fontSize: "16px",
    fontWeight: 700,
    cursor: "pointer",
  },

  singleBoardOnboardingEyebrow: {
    fontSize: "11px",
    fontWeight: 900,
    letterSpacing: "0.08em",
    color: makingCandy.cyan,
    textTransform: "uppercase" as const,
  },

  singleBoardOnboardingTitle: {
    margin: 0,
    fontSize: "20px",
    lineHeight: 1.25,
    color: makingCandy.text,
    fontWeight: 900,
  },

  singleBoardOnboardingSteps: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "10px",
  },

  singleBoardOnboardingStep: {
    display: "flex",
    gap: "10px",
    padding: "10px 12px",
    borderRadius: "16px",
    background: "rgba(255,255,255,0.84)",
    border: `1px solid ${makingCandy.border}`,
  },

  singleBoardOnboardingStepIndex: {
    width: "24px",
    height: "24px",
    borderRadius: radius.full,
    background:
      "linear-gradient(145deg, rgba(125,211,252,0.26), rgba(244,114,182,0.2))",
    color: makingCandy.text,
    fontSize: "12px",
    fontWeight: 900,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  singleBoardOnboardingStepBody: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "3px",
  },

  singleBoardOnboardingStepTitle: {
    fontSize: "13px",
    fontWeight: 900,
    color: makingCandy.text,
  },

  singleBoardOnboardingStepText: {
    fontSize: "12px",
    lineHeight: 1.45,
    color: makingCandy.textSoft,
  },

  singleBoardOnboardingPrimaryBtn: {
    height: "42px",
    borderRadius: radius.full,
    border: "none",
    background:
      "linear-gradient(145deg, rgba(125,211,252,0.92), rgba(244,114,182,0.78))",
    color: makingCandy.text,
    fontSize: "14px",
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: shadows.button,
  },

  singleBoardMobilePrimaryBtn: {
    minWidth: "48px",
    height: "26px",
    padding: "0 8px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.full,
    border: `1px solid ${makingCandy.borderStrong}`,
    background:
      "linear-gradient(145deg, rgba(125,211,252,0.26), rgba(244,114,182,0.22))",
    color: makingCandy.text,
    fontSize: "10px",
    fontWeight: 800,
    cursor: "pointer",
    flexShrink: 0,
  },

  singleBoardMobileSecondaryBtn: {
    minWidth: "48px",
    height: "26px",
    padding: "0 8px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.full,
    border: `1px solid ${makingCandy.border}`,
    background: "rgba(255,255,255,0.94)",
    color: makingCandy.text,
    fontSize: "10px",
    fontWeight: 800,
    cursor: "pointer",
    flexShrink: 0,
    boxShadow: makingCandy.shadowSoft,
  },

  singleBoardHeroRow: {
    display: "flex",
    gap: "6px",
    alignItems: "stretch",
    minHeight: 60,
  },

  singleBoardDesktopDenseRow: {
    display: "flex",
    alignItems: "stretch",
    gap: "4px",
    minHeight: 34,
  },

  singleBoardDesktopWorkflowCard: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    alignItems: "center",
    padding: "4px 7px",
    borderRadius: radius.lg,
    border: `1px solid ${makingCandy.border}`,
    background:
      "linear-gradient(145deg, rgba(255,255,255,0.94), rgba(255,247,242,0.92))",
    boxShadow: makingCandy.shadowSoft,
  },

  singleBoardDesktopMetaRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "6px",
    width: "100%",
  },

  singleBoardDesktopWorkflowMeta: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "1px",
    minWidth: 0,
  },

  singleBoardDesktopActionRow: {
    display: "flex",
    alignItems: "center",
    gap: "3px",
    flexShrink: 0,
  },

  singleBoardDesktopMinorBtn: {
    height: "20px",
    padding: "0 7px",
    fontSize: "9px",
  },

  singleBoardSummaryCard: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    padding: "6px 8px",
    borderRadius: radius.lg,
    border: `1px solid ${makingCandy.border}`,
    background:
      "linear-gradient(145deg, rgba(255,255,255,0.94), rgba(255,247,242,0.92))",
    boxShadow: makingCandy.shadowSoft,
  },

  singleBoardSummary: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
  },

  singleBoardSummaryTitle: {
    fontSize: "12px",
    fontWeight: typography.fontWeight.bold,
    color: makingCandy.text,
  },

  singleBoardSummaryText: {
    fontSize: "10px",
    color: makingCandy.textSoft,
  },

  singleBoardGrid: {
    display: "flex",
    gap: "4px",
    overflowX: "auto",
    paddingBottom: "1px",
  },

  singleBoardDesktopGrid: {
    gap: "3px",
  },

  singleBoardCompactNav: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    minWidth: 0,
  },

  singleBoardDesktopCompactNav: {
    gap: "4px",
    marginTop: "-2px",
  },

  singleBoardCompactNavBtn: {
    height: "24px",
    padding: "0 8px",
    borderRadius: radius.full,
    border: `1px solid ${makingCandy.border}`,
    background: "rgba(255,255,255,0.92)",
    color: makingCandy.textSoft,
    fontSize: "10px",
    fontWeight: 700,
    cursor: "pointer",
    flexShrink: 0,
  },

  singleBoardDesktopCompactNavBtn: {
    height: "20px",
    padding: "0 6px",
    fontSize: "9px",
  },

  singleBoardCompactNavChips: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    minWidth: 0,
    overflowX: "auto",
    paddingBottom: "1px",
  },

  singleBoardDesktopCompactNavChips: {
    gap: "3px",
  },

  singleBoardChip: {
    minWidth: "50px",
    height: "26px",
    padding: "0 8px",
    borderRadius: radius.full,
    border: `1px solid ${makingCandy.border}`,
    background: "rgba(255,255,255,0.9)",
    color: makingCandy.textSoft,
    fontSize: "10px",
    fontWeight: 700,
    cursor: "pointer",
    flexShrink: 0,
  },

  singleBoardDesktopChip: {
    minWidth: "40px",
    height: "20px",
    padding: "0 6px",
    fontSize: "9px",
  },

  singleBoardChipActive: {
    background:
      "linear-gradient(145deg, rgba(79,174,225,0.22), rgba(139,92,246,0.18))",
    color: makingCandy.text,
    borderColor: makingCandy.borderStrong,
  },

  singleBoardChipDone: {
    background:
      "linear-gradient(145deg, rgba(110,231,183,0.24), rgba(52,211,153,0.16))",
    borderColor: "rgba(16,185,129,0.3)",
    color: "#0f766e",
  },

  singleBoardActionRow: {
    display: "flex",
    gap: "4px",
    marginTop: "auto",
  },

  singleBoardMinorBtn: {
    flex: 1,
    height: "26px",
    borderRadius: radius.full,
    border: `1px solid ${makingCandy.border}`,
    background: "rgba(255,255,255,0.92)",
    color: makingCandy.text,
    fontSize: "10px",
    fontWeight: 700,
    cursor: "pointer",
  },

  singleBoardMiniMapCard: {
    width: 78,
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: "3px",
    padding: "6px",
    borderRadius: radius.lg,
    border: `1px solid ${makingCandy.border}`,
    background:
      "linear-gradient(145deg, rgba(255,255,255,0.94), rgba(245,251,255,0.92))",
    boxShadow: makingCandy.shadowSoft,
  },

  singleBoardDesktopMiniMapCard: {
    width: 58,
    padding: "3px",
    gap: "0",
  },

  singleBoardMiniMapFrame: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  singleBoardMiniMapCanvas: {
    position: "relative" as const,
    width: "100%",
    maxHeight: 56,
    borderRadius: 12,
    overflow: "hidden",
    border: `1px solid ${makingCandy.border}`,
    background:
      "linear-gradient(180deg, rgba(241,245,249,0.95), rgba(255,255,255,0.96))",
    display: "block",
    cursor: "pointer",
  },

  singleBoardDesktopMiniMapCanvas: {
    maxHeight: 30,
  },

  singleBoardMiniMapCell: {
    position: "absolute" as const,
    border: "1px solid rgba(99,102,241,0.22)",
    background: "rgba(255,255,255,0.24)",
    color: "#475569",
    fontSize: "9px",
    fontWeight: 800,
    lineHeight: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
    cursor: "pointer",
  },

  singleBoardMiniMapCellDone: {
    background: "rgba(52,211,153,0.22)",
    borderColor: "rgba(16,185,129,0.34)",
  },

  singleBoardMiniMapCellActive: {
    background:
      "linear-gradient(145deg, rgba(125,211,252,0.92), rgba(244,114,182,0.84))",
    borderColor: "rgba(79,70,229,0.58)",
    color: "#ffffff",
    boxShadow: "0 0 0 1px rgba(255,255,255,0.65) inset",
  },

  singleBoardMiniMapHint: {
    textAlign: "center" as const,
    fontSize: "10px",
    color: makingCandy.textSoft,
    fontWeight: 700,
  },

  canvasContainer: {
    position: "relative" as const,
    flex: 1,
    width: "100%",
    height: "100%",
  },

  floatingControls: {
    position: "absolute" as const,
    top: "10px",
    left: "10px",
    right: "10px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "nowrap",
    gap: "8px",
    zIndex: 20,
    pointerEvents: "none",
  },

  singleBoardMobileImmersiveFloatingControls: {
    top: "auto",
    left: "8px",
    right: "8px",
    bottom: "max(10px, env(safe-area-inset-bottom, 0px))",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    zIndex: 32,
  },

  zoomControls: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 10px",
    flex: 1,
    minWidth: 0,
    overflow: "hidden",
    background:
      "linear-gradient(145deg, rgba(255,255,255,0.94), rgba(255,245,236,0.92))",
    backdropFilter: "blur(12px)",
    border: `1px solid ${makingCandy.border}`,
    boxShadow: makingCandy.shadow,
    borderRadius: "12px",
    pointerEvents: "auto",
  },

  singleBoardMobileImmersiveZoomControls: {
    width: "auto",
    flex: "0 1 auto",
    flexBasis: "auto",
    maxWidth: "min(320px, calc(100vw - 210px))",
    minWidth: "154px",
    opacity: 0.58,
    padding: "4px 6px",
    borderRadius: radius.full,
  },

  miniBtn: {
    width: "28px",
    minWidth: "28px",
    height: "28px",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "linear-gradient(145deg, rgba(255,255,255,0.18), rgba(255,255,255,0.08))",
    border: `1px solid ${makingCandy.border}`,
    borderRadius: radius.bead,
    color: makingCandy.text,
    boxShadow: makingCandy.shadowSoft,
    fontSize: "13px",
    fontWeight: "bold",
    cursor: "pointer",
    transition:
      "transform 0.16s ease, background 0.16s ease, border-color 0.16s ease",
  },

  miniBtnActive: {
    background: `linear-gradient(145deg, ${colors.bead.cyan}66, ${colors.bead.cyan}33)`,
    border: `1px solid ${colors.bead.cyan}99`,
    color: "#dffcff",
  },

  fitBtn: {
    minWidth: "42px",
    height: "28px",
    flexShrink: 0,
    padding: "0 8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "linear-gradient(145deg, rgba(59, 130, 246, 0.45), rgba(37, 99, 235, 0.28))",
    border: "1px solid rgba(147, 197, 253, 0.65)",
    borderRadius: radius.bead,
    color: "#eaf4ff",
    fontSize: "11px",
    fontWeight: 700,
    cursor: "pointer",
  },

  zoomLabel: {
    fontSize: "11px",
    fontWeight: 700,
    color: makingCandy.text,
    minWidth: "42px",
    padding: "0 6px",
    lineHeight: "20px",
    background: "rgba(255, 242, 233, 0.94)",
    borderRadius: "8px",
    textAlign: "center" as const,
  },

  zoomRange: {
    width: "clamp(52px, 16vw, 80px)",
    accentColor: colors.bead.cyan,
    flexShrink: 1,
  },

  controlBtns: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px",
    background:
      "linear-gradient(145deg, rgba(255,255,255,0.94), rgba(255,245,236,0.92))",
    backdropFilter: "blur(12px)",
    border: `1px solid ${makingCandy.border}`,
    boxShadow: makingCandy.shadow,
    borderRadius: "12px",
    flexShrink: 0,
    pointerEvents: "auto",
  },

  singleBoardToolbarBtn: {
    minWidth: "54px",
    height: "28px",
    padding: "0 10px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "5px",
    background: "rgba(255,255,255,0.96)",
    border: `1px solid ${makingCandy.border}`,
    borderRadius: radius.full,
    color: makingCandy.text,
    fontSize: "11px",
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: makingCandy.shadowSoft,
  },

  singleBoardToolbarBtnCompact: {
    minWidth: "44px",
    padding: "0 7px",
    gap: "4px",
    fontSize: "10px",
  },

  singleBoardToolbarPrimaryBtn: {
    minWidth: "74px",
    background:
      "linear-gradient(145deg, rgba(125,211,252,0.22), rgba(244,114,182,0.2))",
    borderColor: makingCandy.borderStrong,
    color: makingCandy.text,
  },

  settingsPanel: {
    position: "absolute" as const,
    top: "50px",
    right: "8px",
    width: "min(200px, calc(100vw - 16px))",
    maxWidth: "calc(100vw - 16px)",
    background: "rgba(255,255,255,0.96)",
    backdropFilter: "blur(12px)",
    borderRadius: radius.card,
    border: `1px solid ${makingCandy.border}`,
    boxShadow: shadows.lg,
    zIndex: 30,
    overflow: "hidden",
  },

  settingsHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 12px",
    borderBottom: `1px solid ${makingCandy.border}`,
  },

  settingsTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: makingCandy.text,
  },

  closeBtn: {
    width: "24px",
    height: "24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "transparent",
    border: "none",
    borderRadius: radius.bead,
    color: colors.text.muted,
    cursor: "pointer",
  },

  settingsContent: {
    padding: "10px 12px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },

  settingRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },

  settingDivider: {
    height: 1,
    background: makingCandy.border,
    margin: "2px 0",
  },

  settingLabel: {
    fontSize: typography.fontSize.sm,
    color: makingCandy.textSoft,
  },

  toggleBtn: {
    width: "32px",
    height: "32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "linear-gradient(145deg, rgba(255,255,255,0.96), rgba(250,244,255,0.92))",
    border: `1px solid ${makingCandy.border}`,
    borderRadius: radius.bead,
    color: colors.text.muted,
    cursor: "pointer",
  },

  toggleBtnActive: {
    background: `${colors.bead.cyan}20`,
    borderColor: colors.bead.cyan,
    color: colors.bead.cyan,
  },

  settingHint: {
    marginTop: 8,
    padding: "8px",
    background: "rgba(255,255,255,0.9)",
    borderRadius: radius.bead,
  },

  hintText: {
    margin: "4px 0",
    fontSize: "11px",
    color: colors.text.muted,
    lineHeight: 1.4,
  },

  statusHint: {
    position: "absolute" as const,
    top: "50px",
    left: "50%",
    transform: "translateX(-50%)",
    display: "flex",
    alignItems: "center",
    padding: "6px 14px",
    background:
      "linear-gradient(135deg, rgba(255,255,255,0.92), rgba(255,244,236,0.9))",
    backdropFilter: "blur(8px)",
    borderRadius: radius.full,
    fontSize: "12px",
    fontWeight: "bold",
    color: makingCandy.text,
    zIndex: 20,
  },

  canvasWrapper: {
    position: "absolute" as const,
    top: "50px",
    left: 0,
    right: 0,
    bottom: 0,
    overflow: "hidden",
    background: "#fff9f1",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "4px",
    touchAction: "none",
    cursor: "grab",
  },

  canvasStage: {
    position: "absolute" as const,
    left: "50%",
    top: "50%",
    flexShrink: 0,
    transformOrigin: "center center",
    willChange: "transform",
  },

  canvas: {
    borderRadius: radius.bead,
    imageRendering: "pixelated",
    flexShrink: 0,
    width: "100%",
    height: "100%",
    display: "block",
  },

  overlayCanvas: {
    position: "absolute" as const,
    inset: 0,
    width: "100%",
    height: "100%",
    pointerEvents: "none" as const,
    imageRendering: "pixelated",
  },

  textOverlayCanvas: {
    position: "absolute" as const,
    inset: 0,
    width: "100%",
    height: "100%",
    pointerEvents: "none" as const,
    imageRendering: "auto",
  },

  bottomBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    padding: "10px 16px",
    marginBottom: "65px", // 给底部导航栏留出空间
    background: "rgba(255,255,255,0.84)",
    borderTop: `1px solid ${makingCandy.border}`,
    flexShrink: 0,
    minHeight: 44,
  },

  bottomHint: {
    fontSize: typography.fontSize.sm,
    color: colors.text.muted,
    textAlign: "center" as const,
    lineHeight: 1.2,
  },

  bottomHintSmall: {
    fontSize: "12px",
    color: colors.text.muted,
    marginRight: "auto",
    minWidth: 0,
  },

  bottomActions: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
    minWidth: 0,
    justifyContent: "space-between",
    width: "100%",
  },

  assistDock: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "8px 10px",
    background:
      "linear-gradient(145deg, rgba(255,255,255,0.96), rgba(255,244,236,0.96))",
    border: `1px solid ${makingCandy.border}`,
    borderRadius: "12px",
    boxShadow: makingCandy.shadow,
    flex: "1 1 260px",
    minWidth: 0,
  },

  assistMeta: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    minWidth: 0,
    flexWrap: "wrap",
    flex: 1,
  },

  assistBoardBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: "42px",
    height: "24px",
    padding: "0 10px",
    borderRadius: "999px",
    background: "rgba(79, 174, 225, 0.14)",
    color: makingCandy.cyan,
    fontSize: "12px",
    fontWeight: 700,
  },

  singleBoardFinishBadge: {
    background: "rgba(52,211,153,0.16)",
    color: "#0f766e",
  },

  assistCoordText: {
    fontSize: "13px",
    fontWeight: 700,
    color: makingCandy.text,
  },

  assistCoordMuted: {
    fontSize: "12px",
    color: makingCandy.textSoft,
  },

  singleBoardTaskPill: {
    display: "inline-flex",
    alignItems: "center",
    height: "22px",
    padding: "0 8px",
    borderRadius: "999px",
    background: "rgba(52,211,153,0.14)",
    color: "#0f766e",
    fontSize: "11px",
    fontWeight: 800,
  },

  assistLocateBtn: {
    height: "30px",
    padding: "0 12px",
    borderRadius: "999px",
    border: `1px solid ${makingCandy.borderStrong}`,
    background:
      "linear-gradient(135deg, rgba(79,174,225,0.16), rgba(139,92,246,0.16))",
    color: makingCandy.text,
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
    flexShrink: 0,
  },

  singleBoardAssistPrimaryBtn: {
    background:
      "linear-gradient(135deg, rgba(52,211,153,0.18), rgba(96,165,250,0.18))",
    borderColor: "rgba(16,185,129,0.26)",
    color: makingCandy.text,
  },

  singleBoardAssistMinorBtn: {
    height: "28px",
    padding: "0 10px",
    borderRadius: "999px",
    border: `1px solid ${makingCandy.border}`,
    background: "rgba(255,255,255,0.92)",
    color: makingCandy.textSoft,
    fontSize: "11px",
    fontWeight: 700,
    cursor: "pointer",
    flexShrink: 0,
  },

  singleBoardAssistDoneBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    height: "28px",
    padding: "0 12px",
    borderRadius: "999px",
    background: "rgba(148,163,184,0.14)",
    border: "1px solid rgba(148,163,184,0.22)",
    color: makingCandy.textMuted,
    fontSize: "11px",
    fontWeight: 700,
    flexShrink: 0,
  },

  actionBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "10px 16px",
    background: "rgba(255,255,255,0.9)",
    border: `1px solid ${makingCandy.border}`,
    borderRadius: radius.button,
    color: makingCandy.textSoft,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    cursor: "pointer",
  },

  actionBtnPrimary: {
    background:
      "linear-gradient(145deg, #7fd8ff 0%, #85b7ff 55%, #ff93bf 100%)",
    border: "none",
    color: makingCandy.text,
    boxShadow: shadows.button,
  },

  emptyState: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px",
  },

  emptyText: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamilyAlt,
    color: makingCandy.textSoft,
    marginBottom: "20px",
  },

  backButton: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px 24px",
    background: "linear-gradient(145deg, #87dfff, #7ea3ff)",
    border: "none",
    borderRadius: radius.button,
    color: makingCandy.text,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    cursor: "pointer",
    boxShadow: shadows.button,
  },
};

export default MakingPage;
