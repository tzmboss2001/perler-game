import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  ArrowLeft,
  CheckCircle,
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
import BottomNav from "../../components/BottomNav";
import {
  recommendBoard,
  getPhysicalBoardDrawSize,
  getPhysicalBoardGuideOffsets,
} from "../../services/boardService";
import { getToken } from "../../services/api/authApi";
import BannerAd from "../../components/ads/BannerAd";
import RewardedUnlockModal from "../../components/ads/RewardedUnlockModal";
import { adService } from "../../services/adService";
import BoardVisionAssistModal from "../../components/BoardVisionAssistModal";

const COMMUNITY_MAKING_DRAFT_KEY = "community_making_bead_data";
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

// 缩放阈值：大于该值时点击选颜色，否则选区块
const ZOOM_THRESHOLD = 2.5;
const MIN_SCALE = 0.2;
const MAX_SCALE = 6;
const ZOOM_STEP = 0.1;

// 区块大小（固定 10x10，匹配常见拼豆板网格）
const BLOCK_SIZE = 10;

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
  const wrapperRef = useRef<HTMLDivElement>(null);

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
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const scaleRef = useRef(1);
  const translateRef = useRef({ x: 0, y: 0 });
  const [showColorId, setShowColorId] = useState(true);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(canSpeak());
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);
  const [viewportWidth, setViewportWidth] = useState(window.innerWidth);

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

  const clampTranslate = useCallback(
    (nextScale: number, x: number, y: number) => {
      if (!beadData || !wrapperRef.current) {
        return { x, y };
      }
      const wrapperRect = wrapperRef.current.getBoundingClientRect();
      const canvasWidth = beadData.width * baseCellSize * nextScale;
      const canvasHeight = beadData.height * baseCellSize * nextScale;
      const maxOffsetX = Math.max(0, (canvasWidth - wrapperRect.width) / 2);
      const maxOffsetY = Math.max(0, (canvasHeight - wrapperRect.height) / 2);
      return {
        x: Math.min(maxOffsetX, Math.max(-maxOffsetX, x)),
        y: Math.min(maxOffsetY, Math.max(-maxOffsetY, y)),
      };
    },
    [beadData],
  );

  const commitTranslate = useCallback(
    (nextScale: number, x: number, y: number) => {
      const clamped = clampTranslate(nextScale, x, y);
      translateRef.current = clamped;
      setTranslateX(clamped.x);
      setTranslateY(clamped.y);
    },
    [clampTranslate],
  );

  const applyScaleAtPoint = useCallback(
    (rawScale: number, focalX: number, focalY: number) => {
      const wrapper = wrapperRef.current;
      if (!wrapper) return;
      const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, rawScale));
      const prevScale = scaleRef.current;
      const ratio = nextScale / prevScale;
      const centerX = wrapper.clientWidth / 2;
      const centerY = wrapper.clientHeight / 2;
      const prev = translateRef.current;
      const nextX = ratio * prev.x + (1 - ratio) * (focalX - centerX);
      const nextY = ratio * prev.y + (1 - ratio) * (focalY - centerY);
      scaleRef.current = nextScale;
      setScale(nextScale);
      commitTranslate(nextScale, nextX, nextY);
    },
    [commitTranslate],
  );

  const shiftTranslate = useCallback(
    (deltaX: number, deltaY: number) => {
      const prev = translateRef.current;
      commitTranslate(scaleRef.current, prev.x + deltaX, prev.y + deltaY);
    },
    [commitTranslate],
  );

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
    commitTranslate(
      scaleRef.current,
      translateRef.current.x,
      translateRef.current.y,
    );
  }, [viewportHeight, beadData, commitTranslate]);

  // 计算区块数量
  const blocksX = beadData ? Math.ceil(beadData.width / BLOCK_SIZE) : 0;
  const blocksY = beadData ? Math.ceil(beadData.height / BLOCK_SIZE) : 0;

  // 获取指定区块内某颜色的全部格子索引
  const getColorIndicesInBlock = useCallback(
    (colorHex: string, blockX: number, blockY: number): number[] => {
      if (!beadData) return [];

      const indices: number[] = [];
      const startX = blockX * BLOCK_SIZE;
      const startY = blockY * BLOCK_SIZE;
      const endX = Math.min(startX + BLOCK_SIZE, beadData.width);
      const endY = Math.min(startY + BLOCK_SIZE, beadData.height);

      for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
          const index = y * beadData.width + x;
          const bead = beadData.beads[index];
          if (bead && bead.hex === colorHex) {
            indices.push(index);
          }
        }
      }
      return indices;
    },
    [beadData],
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

  const physicalBoardSize = useMemo(() => {
    if (!beadData) return 104;
    return getPhysicalBoardDrawSize(beadData.width, beadData.height);
  }, [beadData]);

  const physicalBoardCols = useMemo(() => {
    if (!beadData) return 1;
    return Math.max(1, Math.ceil(beadData.width / physicalBoardSize));
  }, [beadData, physicalBoardSize]);

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

  const visionBoardRecommendation = useMemo(
    () => (beadData ? recommendBoard(beadData.width, beadData.height) : null),
    [beadData],
  );

  const visionInitialBoardIndex = useMemo(() => {
    if (!beadData || !visionBoardRecommendation) {
      return 0;
    }
    const boardSize = visionBoardRecommendation.boardSize;
    const boardCol = Math.floor((selection.blockX * BLOCK_SIZE) / boardSize);
    const boardRow = Math.floor((selection.blockY * BLOCK_SIZE) / boardSize);
    return boardRow * visionBoardRecommendation.cols + boardCol;
  }, [beadData, selection.blockX, selection.blockY, visionBoardRecommendation]);

  const visionInitialColorId =
    selection.type === "color" ? selection.colorId ?? null : null;

  // 计算合适缩放（仅首次加载执行，换色等不重置）
  const initialScaleSetRef = useRef(false);
  useEffect(() => {
    if (beadData && !initialScaleSetRef.current) {
      initialScaleSetRef.current = true;
      const timer = setTimeout(() => {
        const viewportHeight = window.innerHeight;
        const wrapper = wrapperRef.current;
        const wrapperWidth = wrapper?.clientWidth || window.innerWidth;
        const wrapperHeight =
          wrapper?.clientHeight || viewportHeight - 40 - 64 - 50 - 60 - 24;
        const fitWidth = wrapperWidth / (beadData.width * baseCellSize);
        const fitHeight = wrapperHeight / (beadData.height * baseCellSize);
        const fitScale = Math.min(fitWidth, fitHeight);
        const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, fitScale));
        scaleRef.current = nextScale;
        setScale(nextScale);
        commitTranslate(nextScale, 0, 0);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [beadData, commitTranslate]);

  // 适应屏幕：重置缩放与位移
  const handleFitScreen = useCallback(() => {
    if (!beadData) return;
    const wrapper = wrapperRef.current;
    const wrapperWidth = wrapper?.clientWidth || window.innerWidth;
    const fitWidth = wrapperWidth / (beadData.width * baseCellSize);
    const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, fitWidth));
    scaleRef.current = nextScale;
    setScale(nextScale);
    commitTranslate(nextScale, 0, 0);
  }, [beadData, commitTranslate]);

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
      if (!beadData || !canvasRef.current || !wrapperRef.current) return;

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

      // 计算点击的格子坐标
      const drawCellSize = baseCellSize * scale;
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      const cellX = Math.floor(clickX / drawCellSize);
      const cellY = Math.floor(clickY / drawCellSize);

      // 边界检查
      if (
        cellX < 0 ||
        cellX >= beadData.width ||
        cellY < 0 ||
        cellY >= beadData.height
      ) {
        return;
      }

      // 计算所在区块
      const blockX = Math.floor(cellX / BLOCK_SIZE);
      const blockY = Math.floor(cellY / BLOCK_SIZE);

      // 根据缩放级别决定行为
      if (scale < ZOOM_THRESHOLD) {
        // 缩小状态：选中区块
        if (
          selection.type === "block" &&
          selection.blockX === blockX &&
          selection.blockY === blockY
        ) {
          setSelection({ type: null, blockX: 0, blockY: 0 });
        } else {
          setSelection({
            type: "block",
            blockX,
            blockY,
          });
          toast.info(`选中区块 (${blockX + 1}, ${blockY + 1})`);
        }
      } else {
        // 放大状态：选中颜色
        const index = cellY * beadData.width + cellX;
        const bead = beadData.beads[index];
        if (!bead) {
          setSelection({ type: null, blockX: 0, blockY: 0 });
          return;
        }

        // 显示坐标提示
        const screenX = e.clientX - wrapperRect.left;
        const screenY = e.clientY - wrapperRect.top;
        const boardCoordinate = getPhysicalBoardCoordinate(cellX, cellY);

        setTooltipState({
          visible: true,
          row: cellY + 1,
          col: cellX + 1,
          boardNumber: boardCoordinate.boardNumber,
          localRow: boardCoordinate.localRow,
          localCol: boardCoordinate.localCol,
          screenX,
          screenY,
        });

        if (voiceEnabled) {
          speakCoordinate(
            cellY + 1,
            cellX + 1,
            boardCoordinate.boardNumber,
            boardCoordinate.localRow,
            boardCoordinate.localCol,
          );
        }

        // 点击同一颜色：取消选中（不限区块）
        if (selection.type === "color" && selection.colorHex === bead.hex) {
          setSelection({ type: null, blockX: 0, blockY: 0 });
        } else {
          setSelection({
            type: "color",
            blockX,
            blockY,
            colorHex: bead.hex,
            colorId: bead.id,
          });
        }
      }
    },
    [beadData, getPhysicalBoardCoordinate, scale, selection, voiceEnabled, toast],
  );

  // 触摸拖动处理
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      const touch = e.touches[0];
      lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
      dragStartTimeRef.current = Date.now();
      dragStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    } else if (e.touches.length === 2) {
      setIsDragging(false);
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
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 1 && isDragging && lastTouchRef.current) {
        const deltaX = e.touches[0].clientX - lastTouchRef.current.x;
        const deltaY = e.touches[0].clientY - lastTouchRef.current.y;

        shiftTranslate(deltaX, deltaY);

        lastTouchRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
      } else if (e.touches.length === 2 && pinchStartRef.current) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const wrapperRect = wrapperRef.current?.getBoundingClientRect();
        const start = pinchStartRef.current;
        if (!wrapperRect || start.distance <= 0) return;

        const currentFocalX =
          (e.touches[0].clientX + e.touches[1].clientX) / 2 - wrapperRect.left;
        const currentFocalY =
          (e.touches[0].clientY + e.touches[1].clientY) / 2 - wrapperRect.top;

        // 以手势起点为基准计算，避免逐帧增量误差放大造成抖动
        const scaleRatio = dist / start.distance;
        const nextScale = Math.min(
          MAX_SCALE,
          Math.max(MIN_SCALE, start.scale * scaleRatio),
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

        scaleRef.current = nextScale;
        setScale(nextScale);
        commitTranslate(nextScale, nextX, nextY);
      }
    },
    [isDragging, commitTranslate, shiftTranslate],
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      // 检查是否为点击（非拖动）
      if (e.changedTouches.length === 1 && dragStartPosRef.current) {
        const touch = e.changedTouches[0];
        const dx = touch.clientX - dragStartPosRef.current.x;
        const dy = touch.clientY - dragStartPosRef.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const duration = Date.now() - dragStartTimeRef.current;

        if (distance < 10 && duration < 300 && canvasRef.current) {
          // 模拟点击事件
          const canvas = canvasRef.current;
          const rect = canvas.getBoundingClientRect();
          const wrapper = wrapperRef.current;
          if (!wrapper || !beadData) {
            setIsDragging(false);
            lastTouchRef.current = null;
            pinchStartRef.current = null;
            dragStartPosRef.current = null;
            return;
          }

          const wrapperRect = wrapper.getBoundingClientRect();
          const drawCellSize = baseCellSize * scale;
          const clickX = touch.clientX - rect.left;
          const clickY = touch.clientY - rect.top;
          const cellX = Math.floor(clickX / drawCellSize);
          const cellY = Math.floor(clickY / drawCellSize);

          if (
            cellX >= 0 &&
            cellX < beadData.width &&
            cellY >= 0 &&
            cellY < beadData.height
          ) {
            const blockX = Math.floor(cellX / BLOCK_SIZE);
            const blockY = Math.floor(cellY / BLOCK_SIZE);

            if (scale < ZOOM_THRESHOLD) {
              if (
                selection.type === "block" &&
                selection.blockX === blockX &&
                selection.blockY === blockY
              ) {
                setSelection({ type: null, blockX: 0, blockY: 0 });
              } else {
                setSelection({ type: "block", blockX, blockY });
                toast.info(`选中区块 (${blockX + 1}, ${blockY + 1})`);
              }
            } else {
              const index = cellY * beadData.width + cellX;
              const bead = beadData.beads[index];
              if (!bead) {
                setSelection({ type: null, blockX: 0, blockY: 0 });
                lastTapProcessedRef.current = Date.now();
                return;
              }

              const screenX = touch.clientX - wrapperRect.left;
              const screenY = touch.clientY - wrapperRect.top;
              const boardCoordinate = getPhysicalBoardCoordinate(cellX, cellY);

              setTooltipState({
                visible: true,
                row: cellY + 1,
                col: cellX + 1,
                boardNumber: boardCoordinate.boardNumber,
                localRow: boardCoordinate.localRow,
                localCol: boardCoordinate.localCol,
                screenX,
                screenY,
              });

              if (voiceEnabled) {
                speakCoordinate(
                  cellY + 1,
                  cellX + 1,
                  boardCoordinate.boardNumber,
                  boardCoordinate.localRow,
                  boardCoordinate.localCol,
                );
              }

              // 点击同一颜色：取消选中（不限区块）
              if (
                selection.type === "color" &&
                selection.colorHex === bead.hex
              ) {
                setSelection({ type: null, blockX: 0, blockY: 0 });
              } else {
                setSelection({
                  type: "color",
                  blockX,
                  blockY,
                  colorHex: bead.hex,
                  colorId: bead.id,
                });
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
    },
    [beadData, getPhysicalBoardCoordinate, scale, selection, voiceEnabled, toast],
  );

  // 鼠标拖动处理
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    lastTouchRef.current = { x: e.clientX, y: e.clientY };
    dragStartTimeRef.current = Date.now();
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
    // 注意：不要调用 preventDefault()，否则会阻止 click 事件
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging || !lastTouchRef.current) return;

      const deltaX = e.clientX - lastTouchRef.current.x;
      const deltaY = e.clientY - lastTouchRef.current.y;

      shiftTranslate(deltaX, deltaY);

      lastTouchRef.current = { x: e.clientX, y: e.clientY };
    },
    [isDragging, shiftTranslate],
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
  }, []);

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
    setRedoReplaceSnapshot(null);
    toast.info("已恢复上一次换色");
  }, [redoReplaceSnapshot, beadData, cloneBeadData, selection, toast]);

  // ===== 娓叉煋 Canvas =====
  useEffect(() => {
    if (!beadData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height, beads } = beadData;
    const drawCellSize = baseCellSize * scale;
    const canvasWidth = width * drawCellSize;
    const canvasHeight = height * drawCellSize;

    // 楂樻竻娓叉煋
    const maxCanvasSize = 4096;
    let dpr = window.devicePixelRatio || 1;
    const maxDimension = Math.max(canvasWidth, canvasHeight);
    if (maxDimension * dpr > maxCanvasSize) {
      dpr = Math.max(1, maxCanvasSize / maxDimension);
    }

    canvas.width = canvasWidth * dpr;
    canvas.height = canvasHeight * dpr;
    canvas.style.width = canvasWidth + "px";
    canvas.style.height = canvasHeight + "px";
    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = true;

    // 获取选中区块范围
    const selectedBlockStartX = selection.blockX * BLOCK_SIZE;
    const selectedBlockStartY = selection.blockY * BLOCK_SIZE;
    const selectedBlockEndX = Math.min(selectedBlockStartX + BLOCK_SIZE, width);
    const selectedBlockEndY = Math.min(
      selectedBlockStartY + BLOCK_SIZE,
      height,
    );

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

    // 绘制所有珠子
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = y * width + x;
        const bead = beads[index];
        const px = x * drawCellSize;
        const py = y * drawCellSize;

        // 绘制背景色
        const beadHex = bead?.hex || "#1a1a24";
        ctx.fillStyle = beadHex;
        ctx.fillRect(px, py, drawCellSize, drawCellSize);

        // 选中区块时，非选中区半透明
        if (selection.type === "block") {
          const inBlock =
            x >= selectedBlockStartX &&
            x < selectedBlockEndX &&
            y >= selectedBlockStartY &&
            y < selectedBlockEndY;
          if (!inBlock) {
            ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
            ctx.fillRect(px, py, drawCellSize, drawCellSize);
          }
        }

        // 选中颜色时
        if (selection.type === "color") {
          if (!highlightedIndices.has(index)) {
            // 非高亮区域半透明
            ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
            ctx.fillRect(px, py, drawCellSize, drawCellSize);
          } else {
            // 高亮像素：叠加淡白提升亮度
            ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
            ctx.fillRect(px, py, drawCellSize, drawCellSize);
          }
        }
      }
    }

    // 绘制网格线
    // 网格线保持视觉细线，不随缩放显著变粗
    const tinyLine = Math.max(0.5, 1 / Math.max(scale, 1.4));
    const normalLine = Math.max(0.7, 1.2 / Math.max(scale, 1.2));
    const blockLine = Math.max(1, 2 / Math.max(scale, 1.2));

    // 细网格线（深色，避免放大后发白）
    ctx.strokeStyle = "rgba(0, 0, 0, 0.45)";
    ctx.lineWidth = normalLine;
    for (let x = 0; x <= width; x++) {
      ctx.beginPath();
      ctx.moveTo(x * drawCellSize, 0);
      ctx.lineTo(x * drawCellSize, canvasHeight);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * drawCellSize);
      ctx.lineTo(canvasWidth, y * drawCellSize);
      ctx.stroke();
    }

    // 叠加一层更深线，提升清晰度
    ctx.strokeStyle = "rgba(0, 0, 0, 0.62)";
    ctx.lineWidth = tinyLine;
    for (let x = 0; x <= width; x++) {
      ctx.beginPath();
      ctx.moveTo(x * drawCellSize, 0);
      ctx.lineTo(x * drawCellSize, canvasHeight);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * drawCellSize);
      ctx.lineTo(canvasWidth, y * drawCellSize);
      ctx.stroke();
    }

    // 5×5 中等网格线（深灰）
    ctx.strokeStyle = "rgba(0, 0, 0, 0.72)";
    ctx.lineWidth = normalLine;
    for (let x = 0; x <= width; x++) {
      if (x % 5 === 0 && x % BLOCK_SIZE !== 0) {
        ctx.beginPath();
        ctx.moveTo(x * drawCellSize, 0);
        ctx.lineTo(x * drawCellSize, canvasHeight);
        ctx.stroke();
      }
    }
    for (let y = 0; y <= height; y++) {
      if (y % 5 === 0 && y % BLOCK_SIZE !== 0) {
        ctx.beginPath();
        ctx.moveTo(0, y * drawCellSize);
        ctx.lineTo(canvasWidth, y * drawCellSize);
        ctx.stroke();
      }
    }

    // 10×10 大网格线（黑色）
    ctx.strokeStyle = "rgba(0, 0, 0, 0.9)";
    ctx.lineWidth = blockLine;
    for (let x = 0; x <= width; x += BLOCK_SIZE) {
      ctx.beginPath();
      ctx.moveTo(x * drawCellSize, 0);
      ctx.lineTo(x * drawCellSize, canvasHeight);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += BLOCK_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, y * drawCellSize);
      ctx.lineTo(canvasWidth, y * drawCellSize);
      ctx.stroke();
    }

    // 现实豆板分区线：按常见 54 / 78 / 104 板的对称结构补画。
    // 大作品统一按 104 板重复，保证制作模式更接近真实豆板观感。
    const physicalBoardSize = getPhysicalBoardDrawSize(width, height);
    const physicalGuideOffsets = getPhysicalBoardGuideOffsets(physicalBoardSize);
    if (physicalGuideOffsets.length > 0) {
      const physicalBoardCols = Math.ceil(width / physicalBoardSize);
      const physicalBoardRows = Math.ceil(height / physicalBoardSize);
      ctx.save();
      ctx.strokeStyle = "rgba(17, 24, 39, 0.98)";
      ctx.lineWidth = Math.max(blockLine, 1.2 / Math.max(scale, 1.15));

      for (let boardCol = 0; boardCol < physicalBoardCols; boardCol++) {
        const originX = boardCol * physicalBoardSize;
        for (const offset of physicalGuideOffsets) {
          const guideX = originX + offset;
          if (guideX <= 0 || guideX >= width) {
            continue;
          }
          ctx.beginPath();
          ctx.moveTo(guideX * drawCellSize, 0);
          ctx.lineTo(guideX * drawCellSize, canvasHeight);
          ctx.stroke();
        }
      }

      for (let boardRow = 0; boardRow < physicalBoardRows; boardRow++) {
        const originY = boardRow * physicalBoardSize;
        for (const offset of physicalGuideOffsets) {
          const guideY = originY + offset;
          if (guideY <= 0 || guideY >= height) {
            continue;
          }
          ctx.beginPath();
          ctx.moveTo(0, guideY * drawCellSize);
          ctx.lineTo(canvasWidth, guideY * drawCellSize);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    // 拼豆板边界线（智能推荐板尺寸 + 橙色虚线 + 板号标注）
    const boardRec = recommendBoard(width, height);
    const BOARD_SIZE = boardRec.boardSize;
    const boardCols = boardRec.cols;
    const boardRows = boardRec.rows;
    if (boardCols > 1 || boardRows > 1) {
      ctx.save();
      ctx.setLineDash([drawCellSize * 0.5, drawCellSize * 0.3]);
      ctx.strokeStyle = "rgba(255, 160, 0, 0.8)";
      ctx.lineWidth = blockLine;
      // 垂直板线
      for (let c = 1; c < boardCols; c++) {
        const px = c * BOARD_SIZE * drawCellSize;
        ctx.beginPath();
        ctx.moveTo(px, 0);
        ctx.lineTo(px, canvasHeight);
        ctx.stroke();
      }
      // 水平板线
      for (let r = 1; r < boardRows; r++) {
        const py = r * BOARD_SIZE * drawCellSize;
        ctx.beginPath();
        ctx.moveTo(0, py);
        ctx.lineTo(canvasWidth, py);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // 板号标注
      const labelSize = Math.max(10, drawCellSize * 0.8);
      ctx.font = `bold ${labelSize}px Arial, sans-serif`;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      let boardNum = 1;
      for (let r = 0; r < boardRows; r++) {
        for (let c = 0; c < boardCols; c++) {
          const lx = c * BOARD_SIZE * drawCellSize + 3;
          const ly = r * BOARD_SIZE * drawCellSize + 3;
          // 背景
          const text = `板${boardNum}`;
          const tw = ctx.measureText(text).width + 6;
          ctx.fillStyle = "rgba(255, 160, 0, 0.85)";
          ctx.fillRect(lx - 2, ly - 1, tw, labelSize + 4);
          // 文字
          ctx.fillStyle = "#fff";
          ctx.fillText(text, lx + 1, ly + 1);
          boardNum++;
        }
      }
      ctx.restore();
    }

    // 选中区块时，绘制高亮边框
    if (selection.type === "block") {
      ctx.strokeStyle = "#00FFFF";
      ctx.lineWidth = Math.max(2, blockLine + 1);
      ctx.shadowColor = "#00FFFF";
      ctx.shadowBlur = 4;
      const bw = (selectedBlockEndX - selectedBlockStartX) * drawCellSize;
      const bh = (selectedBlockEndY - selectedBlockStartY) * drawCellSize;
      ctx.strokeRect(
        selectedBlockStartX * drawCellSize,
        selectedBlockStartY * drawCellSize,
        bw,
        bh,
      );
      ctx.shadowBlur = 0;
    }

    // 选中颜色时，高亮像素已在上方绘制阶段完成（白色半透明叠加）
    // 不再使用粗边框，改为明暗对比突出选中像素

    // 绘制色号
    const minSizeForColorId = 24;
    const fullOpacitySize = 40;

    if (showColorId && drawCellSize >= minSizeForColorId) {
      const fontSize = Math.max(10, Math.min(28, drawCellSize * 0.42));
      const opacity = Math.min(
        1,
        (drawCellSize - minSizeForColorId) /
          (fullOpacitySize - minSizeForColorId),
      );

      ctx.font = `700 ${fontSize}px "PingFang SC", "Microsoft YaHei", "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      for (let y = 0; y < height; y++) {
        let currentColorId = "";
        let segmentCount = 0;

        for (let x = 0; x < width; x++) {
          const index = y * width + x;
          const bead = beads[index];
          const px = x * drawCellSize + drawCellSize / 2;
          const py = y * drawCellSize + drawCellSize / 2;
          const beadHex = bead?.hex || "#1a1a24";

          // 判断该像素是否处于“激活”状态（未被遮罩变暗）
          let isActive = true;
          if (selection.type === "block") {
            const inBlock =
              x >= selectedBlockStartX &&
              x < selectedBlockEndX &&
              y >= selectedBlockStartY &&
              y < selectedBlockEndY;
            isActive = inBlock;
          }
          if (selection.type === "color") {
            isActive = highlightedIndices.has(index);
          }

          // 激活像素正常显示，非激活像素降低透明度（仍可见色号）
          const effectiveOpacity = isActive ? opacity : opacity * 0.35;

          const contrastColor = getContrastColor(beadHex);
          const r = parseInt(contrastColor.slice(1, 3), 16);
          const g = parseInt(contrastColor.slice(3, 5), 16);
          const b = parseInt(contrastColor.slice(5, 7), 16);
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${effectiveOpacity})`;

          // 直接使用原始色号（MARD: H9、A1 等已足够简短）
          const displayColorId = bead?.id || "--";

          let displayText = "";
          if (bead.id !== currentColorId || segmentCount >= 99) {
            currentColorId = bead.id;
            segmentCount = 1;
            displayText = displayColorId;
          } else {
            segmentCount++;
            displayText = segmentCount.toString();
          }

          ctx.fillText(displayText, px, py);
        }
      }
    }
  }, [beadData, scale, showColorId, selection, getColorIndicesInBlock]);

  // 取消选中
  const handleClearSelection = () => {
    setSelection({ type: null, blockX: 0, blockY: 0 });
  };

  const handleOpenExport = useCallback(() => {
    setShowExportModal(true);
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
  const floatingControlsStyle: React.CSSProperties = {
    ...styles.floatingControls,
    flexWrap: isNarrowToolbar ? "wrap" : "nowrap",
    alignItems: isNarrowToolbar ? "stretch" : "center",
    gap: isNarrowToolbar ? "6px" : "8px",
  };
  const zoomControlsStyle: React.CSSProperties = {
    ...styles.zoomControls,
    width: isNarrowToolbar ? "100%" : undefined,
    flexBasis: isNarrowToolbar ? "100%" : undefined,
    order: isNarrowToolbar ? 1 : 0,
    padding: isCompactToolbar ? "6px 8px" : styles.zoomControls.padding,
    gap: isCompactToolbar ? "4px" : "6px",
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
  const statusHintStyle: React.CSSProperties = {
    ...styles.statusHint,
    top: isNarrowToolbar ? "88px" : styles.statusHint.top,
    maxWidth: isNarrowToolbar ? "calc(100vw - 32px)" : undefined,
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
      <div style={styles.previewSection}>
        <div style={styles.canvasContainer}>
          {/* 浮动控制栏 */}
          <div style={floatingControlsStyle}>
            {/* 左侧：缩放 */}
            <div style={zoomControlsStyle}>
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
                min={MIN_SCALE}
                max={MAX_SCALE}
                step={0.05}
                value={scale}
                style={zoomRangeStyle}
                onChange={(e) => {
                  const wrapper = wrapperRef.current;
                  const focalX = wrapper ? wrapper.clientWidth / 2 : 0;
                  const focalY = wrapper ? wrapper.clientHeight / 2 : 0;
                  applyScaleAtPoint(Number(e.target.value), focalX, focalY);
                }}
                aria-label="缩放倍率"
              />
              <span style={zoomLabelStyle}>{Math.round(scale * 100)}%</span>
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
                style={fitBtnStyle}
                onClick={handleFitScreen}
                title="适应屏幕宽度"
              >
                适宽
              </button>
            </div>

            {/* 右侧：功能按钮 */}
            <div style={controlBtnsStyle}>
              <button
                style={styles.miniBtn}
                onClick={handleOpenExport}
                title="下载图纸"
              >
                <DownloadSimple size={14} />
              </button>
              <button
                style={styles.miniBtn}
                onClick={() => setShowSettings(!showSettings)}
                title="设置"
              >
                <Gear size={14} />
              </button>
            </div>
          </div>

          {/* 设置面板 */}
          {showSettings && (
            <div style={styles.settingsPanel}>
              <div style={styles.settingsHeader}>
                <span style={styles.settingsTitle}>设置</span>
                <button
                  style={styles.closeBtn}
                  onClick={() => setShowSettings(false)}
                >
                  <X size={16} />
                </button>
              </div>
              <div style={styles.settingsContent}>
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
                    {wakeLockActive ? <Lightning size={16} weight="fill" /> : <LightningSlash size={16} />}
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
                      toast.info(voiceEnabled ? "语音提示已关闭" : "语音提示已开启");
                    }}
                  >
                    {voiceEnabled ? <SpeakerHigh size={16} /> : <SpeakerSlash size={16} />}
                  </button>
                </div>
                <div style={styles.settingRow}>
                  <span style={styles.settingLabel}>视觉辅助</span>
                  <button
                    style={{ ...styles.actionBtn, padding: "8px 12px", fontSize: "12px" }}
                    onClick={() => {
                      setShowSettings(false);
                      setShowVisionAssist(true);
                    }}
                  >
                    打开
                  </button>
                </div>
                <div style={styles.settingHint}>
                  <p style={styles.hintText}>
                    <strong>操作说明：</strong>
                  </p>
                  <p style={styles.hintText}>- 缩小时点击：选中区块</p>
                  <p style={styles.hintText}>- 放大时点击：高亮同色格子</p>
                  <p style={styles.hintText}>- 再次点击：取消选中</p>
                </div>
              </div>
            </div>
          )}

          {/* 状态提示 */}
          <div style={statusHintStyle}>
            {selection.type === null && (
              <span>
                {scale < ZOOM_THRESHOLD ? "点击选择区块" : "点击选择颜色"}
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
                区块{colorCountInBlock}颗 / 全部{colorCountTotal}颗
              </span>
            )}
          </div>

          {/* 坐标提示框 */}
          <CoordinateTooltip
            visible={tooltipState.visible}
            row={tooltipState.row}
            col={tooltipState.col}
            boardNumber={tooltipState.boardNumber}
            localRow={tooltipState.localRow}
            localCol={tooltipState.localCol}
            cellScreenX={tooltipState.screenX}
            cellScreenY={tooltipState.screenY}
            containerWidth={wrapperRef.current?.clientWidth || 300}
            containerHeight={wrapperRef.current?.clientHeight || 300}
            onHide={() =>
              setTooltipState((prev) => ({ ...prev, visible: false }))
            }
          />

          {/* Canvas */}
          <div
            ref={wrapperRef}
            style={{
              ...styles.canvasWrapper,
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
            <canvas
              ref={canvasRef}
              style={{
                ...styles.canvas,
                transform: `translate(${translateX}px, ${translateY}px)`,
              }}
              onClick={handleCanvasClick}
            />
          </div>
        </div>
      </div>

      {/* 底部操作栏 */}
      <BannerAd placement="making_bottom" />

      <div style={styles.bottomBar}>
        {selection.type === null ? (
          <div style={styles.bottomHint}>
            {scale < ZOOM_THRESHOLD ? "点击画布选择区块" : "点击格子查看坐标"}
          </div>
        ) : (
          <div style={styles.bottomActions}>
            {/* 提示：再次点击可取消 */}
            <span style={styles.bottomHintSmall}>再次点击可取消选中</span>
            {/* 选中颜色时显示替换按钮 */}
            {selection.type === "color" && selectedBeadColor && (
              <>
                <button
                  style={{ ...styles.actionBtn, ...styles.actionBtnPrimary }}
                  onClick={() => setShowReplaceModal(true)}
                >
                  <Swap size={18} />
                  替换颜色
                </button>
                
              </>
            )}
          </div>
        )}
      </div>

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
      <BottomNav transparent />
    </div>
  );
};

const makingCandy = {
  bg: '#fdf7f1',
  bgSoft: '#fff1e7',
  panel: 'rgba(255,255,255,0.92)',
  panelStrong: '#ffffff',
  panelDark: '#453f61',
  border: 'rgba(255, 186, 161, 0.34)',
  borderStrong: 'rgba(95, 200, 255, 0.4)',
  text: '#4b3f5f',
  textSoft: '#7f7293',
  textMuted: '#a093af',
  cyan: '#4faee1',
  shadow: '0 16px 36px rgba(255, 188, 154, 0.14)',
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
    background: 'rgba(255,255,255,0.86)',
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
    background: 'linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(255,245,236,0.94) 100%)',
    overflow: "hidden",
    position: "relative" as const,
    minHeight: 0,
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

  zoomControls: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 10px",
    flex: 1,
    minWidth: 0,
    overflow: "hidden",
    background: 'linear-gradient(145deg, rgba(255,255,255,0.94), rgba(255,245,236,0.92))',
    backdropFilter: "blur(12px)",
    border: `1px solid ${makingCandy.border}`,
    boxShadow: makingCandy.shadow,
    borderRadius: "12px",
    pointerEvents: "auto",
  },

  miniBtn: {
    width: "28px",
    height: "28px",
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
    background: 'rgba(255, 242, 233, 0.94)',
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
    background: 'linear-gradient(145deg, rgba(255,255,255,0.94), rgba(255,245,236,0.92))',
    backdropFilter: "blur(12px)",
    border: `1px solid ${makingCandy.border}`,
    boxShadow: makingCandy.shadow,
    borderRadius: "12px",
    flexShrink: 0,
    pointerEvents: "auto",
  },

  settingsPanel: {
    position: "absolute" as const,
    top: "50px",
    right: "8px",
    width: "min(200px, calc(100vw - 16px))",
    maxWidth: "calc(100vw - 16px)",
    background: 'rgba(255,255,255,0.96)',
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
    background: 'linear-gradient(145deg, rgba(255,255,255,0.96), rgba(250,244,255,0.92))',
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
    background: 'rgba(255,255,255,0.9)',
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
    background: 'linear-gradient(135deg, rgba(255,255,255,0.92), rgba(255,244,236,0.9))',
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
    background: '#fff9f1',
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "4px",
    touchAction: "none",
    cursor: "grab",
  },

  canvas: {
    borderRadius: radius.bead,
    imageRendering: "auto",
    flexShrink: 0,
  },

  bottomBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    padding: "10px 16px",
    marginBottom: "65px", // 给底部导航栏留出空间
    background: 'rgba(255,255,255,0.84)',
    borderTop: `1px solid ${makingCandy.border}`,
    flexShrink: 0,
    minHeight: 44,
  },

  bottomHint: {
    fontSize: typography.fontSize.sm,
    color: colors.text.muted,
    textAlign: "center" as const,
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
    justifyContent: "flex-end",
  },

  actionBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "10px 16px",
    background: 'rgba(255,255,255,0.9)',
    border: `1px solid ${makingCandy.border}`,
    borderRadius: radius.button,
    color: makingCandy.textSoft,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    cursor: "pointer",
  },

  actionBtnPrimary: {
    background: 'linear-gradient(145deg, #7fd8ff 0%, #85b7ff 55%, #ff93bf 100%)',
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
    background: 'linear-gradient(145deg, #87dfff, #7ea3ff)',
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

