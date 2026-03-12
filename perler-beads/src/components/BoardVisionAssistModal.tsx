import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X } from "@phosphor-icons/react";
import { useToast } from "./Toast";
import { BeadPixelData } from "../services/colorMatchService";
import {
  VisionPoint,
  VisionRgb,
  analyzeVisionProgress,
  calculateVisionBoardMatchScore,
  compareVisionFrameSignature,
  createVisionFrameSignature,
  detectBoardCornersDetailed,
  findBestVisionBoardMatch,
  rgbToCss,
  sampleRobustRgb,
  splitBeadDataIntoBoards,
} from "../services/visionAssistService";

interface BoardVisionAssistModalProps {
  visible: boolean;
  onClose: () => void;
  beadData: BeadPixelData;
  boardSize: number;
  initialBoardIndex?: number;
  initialColorId?: string | null;
}

interface VisionAssistPersistedState {
  boardIndex: number;
  preferredColorId: string | null;
  corners: VisionPoint[];
  emptyPoint: VisionPoint | null;
  emptyReferenceRgb: VisionRgb | null;
  samplePreview: VisionRgb | null;
  tolerance: number;
  autoDetect: boolean;
  autoSwitchBoard: boolean;
  detectionSummary: VisionAssistDetectionSummary | null;
}

interface VisionAssistDetectionSummary {
  detectedAt: number;
  boardLabel: string | null;
  progress: number;
  matchedCells: number;
  missingCells: number;
  wrongCells: number;
  tolerance: number;
  qualityLevel: "good" | "warning" | "poor";
  qualityIssues: string[];
  activeColorLabel: string | null;
  activeColorHex: string | null;
  nextGuideLabel: string | null;
  wrongSuggestions: string[];
}

const DETECTION_SUMMARY_WARN_MS = 10 * 60 * 1000;
const DETECTION_SUMMARY_EXPIRE_MS = 12 * 60 * 60 * 1000;

const CORNER_HINTS = ["左上角", "右上角", "右下角", "左下角"];

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const getCellRadius = (
  corners: [VisionPoint, VisionPoint, VisionPoint, VisionPoint],
  boardSize: number,
) => {
  const top = Math.hypot(corners[0].x - corners[1].x, corners[0].y - corners[1].y);
  const bottom = Math.hypot(corners[3].x - corners[2].x, corners[3].y - corners[2].y);
  const left = Math.hypot(corners[0].x - corners[3].x, corners[0].y - corners[3].y);
  const right = Math.hypot(corners[1].x - corners[2].x, corners[1].y - corners[2].y);
  return clamp(Math.round((top + bottom + left + right) / boardSize / 6), 3, 10);
};

const getVideoPoint = (
  event: React.MouseEvent<HTMLDivElement>,
  video: HTMLVideoElement,
): VisionPoint | null => {
  const rect = video.getBoundingClientRect();
  if (!rect.width || !rect.height || !video.videoWidth || !video.videoHeight) {
    return null;
  }

  return {
    x: ((event.clientX - rect.left) / rect.width) * video.videoWidth,
    y: ((event.clientY - rect.top) / rect.height) * video.videoHeight,
  };
};

const getStepText = (corners: VisionPoint[], emptyReferenceRgb: VisionRgb | null) => {
  if (corners.length < 4) {
    return `请依次点击拼豆板${CORNER_HINTS[corners.length]}`;
  }
  if (!emptyReferenceRgb) {
    return "四角已确定。若角点不准，可点击角点附近微调；确认后再点击一个空孔取样。";
  }
  return "校准完成，系统会自动识别当前拼豆进度并标出下一步。";
};

const formatProgressPercent = (progress: number) => {
  const percent = progress * 100;
  if (percent >= 100) {
    return "100%";
  }
  if (percent >= 99) {
    return `${percent.toFixed(1)}%`;
  }
  return `${Math.round(percent)}%`;
};

const getColorLabel = (color: { id: string; nameCN?: string; name?: string }) =>
  `${color.id}${color.nameCN || color.name ? ` · ${color.nameCN || color.name}` : ""}`;

const getWrongSuggestionLabel = (
  sourceColor: { id: string; nameCN?: string; name?: string } | null,
  targetColor: { id: string; nameCN?: string; name?: string } | null,
) => {
  const sourceLabel = sourceColor ? getColorLabel(sourceColor) : "当前颜色";
  const targetLabel = targetColor ? getColorLabel(targetColor) : "目标颜色";
  return `${sourceLabel} -> ${targetLabel}`;
};

const createDetectionSummary = (
  result: ReturnType<typeof analyzeVisionProgress>,
  selectedBoard: { startX: number; startY: number; label: string },
  tolerance: number,
) => {
  const activeColor = result.colors.find((item) => item.color.id === result.activeColorId);
  const nextGuideCell = result.guideCells[0] || null;

  return {
    detectedAt: Date.now(),
    boardLabel: selectedBoard.label || null,
    progress: result.progress,
    matchedCells: result.matchedCells,
    missingCells: result.missingCells,
    wrongCells: result.wrongCells,
    tolerance,
    qualityLevel: result.quality.level,
    qualityIssues: result.quality.issues.slice(0, 3),
    activeColorLabel: activeColor ? getColorLabel(activeColor.color) : null,
    activeColorHex: activeColor?.color.hex || null,
    nextGuideLabel: nextGuideCell
      ? `${getBoardCellLabel(nextGuideCell.x, nextGuideCell.y)} / ${getGlobalCellLabel(
          selectedBoard.startX,
          selectedBoard.startY,
          nextGuideCell.x,
          nextGuideCell.y,
        )}`
      : null,
    wrongSuggestions: result.wrongColorSuggestions
      .slice(0, 3)
      .map(
        (item) =>
          `优先把 ${getWrongSuggestionLabel(item.sourceColor, item.targetColor)}，共 ${item.count} 格`,
      ),
  } satisfies VisionAssistDetectionSummary;
};

const getBoardCellLabel = (x: number, y: number) => `板内第 ${x + 1} 列第 ${y + 1} 行`;

const getGlobalCellLabel = (
  startX: number,
  startY: number,
  x: number,
  y: number,
) => `全图第 ${startX + x + 1} 列第 ${startY + y + 1} 行`;

const getFrameStatusText = (
  status: "idle" | "moving" | "stabilizing" | "stable",
) => {
  switch (status) {
    case "moving":
      return "检测到遮挡或移动";
    case "stabilizing":
      return "等待画面稳定";
    case "stable":
      return "画面稳定";
    default:
      return "待识别";
  }
};

const getQualityText = (level?: "good" | "warning" | "poor") => {
  switch (level) {
    case "poor":
      return "环境较差";
    case "warning":
      return "可识别但需注意";
    case "good":
      return "环境良好";
    default:
      return "待识别";
  }
};

const getAutoCornerFailureMessage = (
  reason: "no_edges" | "board_too_small" | "board_too_large" | null,
) => {
  switch (reason) {
    case "no_edges":
      return "自动识别失败：画面里没找到清晰板边，请把拼豆板放完整、背景更干净后再试。";
    case "board_too_small":
      return "自动识别失败：拼豆板在画面里太小，请把镜头靠近一些再试。";
    case "board_too_large":
      return "自动识别失败：拼豆板太贴边或超出画面，请把镜头拉远一些再试。";
    default:
      return "自动识别四角失败，请改用手动点角校准。";
  }
};

const getCameraErrorMessage = (error: unknown) => {
  const errorName =
    typeof error === "object" && error && "name" in error
      ? String((error as { name?: unknown }).name || "")
      : "";

  switch (errorName) {
    case "NotAllowedError":
    case "PermissionDeniedError":
      return "摄像头权限被拒绝，请在浏览器里允许摄像头访问后重试。";
    case "NotFoundError":
    case "DevicesNotFoundError":
      return "当前设备没有可用摄像头，请换到有摄像头的设备后再试。";
    case "NotReadableError":
    case "TrackStartError":
      return "摄像头当前被其他程序占用，请关闭占用后再重试。";
    case "OverconstrainedError":
    case "ConstraintNotSatisfiedError":
      return "当前摄像头不支持所需拍摄规格，请切换设备或浏览器后再试。";
    case "SecurityError":
      return "当前页面环境不允许调用摄像头，请检查浏览器安全设置后再试。";
    case "AbortError":
      return "摄像头启动被中断，请稍后重试。";
    default:
      return "无法打开摄像头，请检查浏览器权限和设备状态后重试。";
  }
};

const getAutoCornerConfidenceText = (
  confidence: { level: "high" | "medium" | "low"; score: number } | null,
) => {
  if (!confidence) {
    return "自动识别完成，请检查四角是否贴边。";
  }

  switch (confidence.level) {
    case "high":
      return `自动识别四角可信度高（${confidence.score}分），可直接继续空板取样。`;
    case "medium":
      return `自动识别四角可信度一般（${confidence.score}分），建议先目测一遍，不准再微调。`;
    case "low":
      return `自动识别四角可信度偏低（${confidence.score}分），建议先手动微调四角后再继续。`;
    default:
      return "自动识别完成，请检查四角是否贴边。";
  }
};

const formatPercent = (ratio: number) => `${Math.round(ratio * 100)}%`;

const getDetectionSummaryAgeText = (detectedAt: number) => {
  const elapsed = Date.now() - detectedAt;
  const minutes = Math.max(1, Math.floor(elapsed / 60000));
  if (minutes < 60) {
    return `${minutes} 分钟前`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} 小时前`;
  }
  const days = Math.floor(hours / 24);
  return `${days} 天前`;
};

const createVisionAssistStorageKey = (beadData: BeadPixelData, boardSize: number) => {
  const beadSignature = beadData.beads
    .slice(0, 24)
    .map((bead) => bead?.id || "none")
    .join("_");
  return `visionAssist:${boardSize}:${beadData.width}x${beadData.height}:${beadData.beads.length}:${beadSignature}`;
};

const readVisionAssistState = (
  storageKey: string,
): VisionAssistPersistedState | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as VisionAssistPersistedState;
    if (
      parsed?.detectionSummary &&
      Date.now() - parsed.detectionSummary.detectedAt > DETECTION_SUMMARY_EXPIRE_MS
    ) {
      parsed.detectionSummary = null;
    }
    return parsed;
  } catch {
    return null;
  }
};

type BoardSwitchReason = "manual" | "auto" | "locate";

const getBoardSwitchNoticeText = (boardLabel: string, reason: BoardSwitchReason) => {
  switch (reason) {
    case "auto":
      return `\u5df2\u81ea\u52a8\u5207\u5230${boardLabel}`;
    case "locate":
      return `\u5df2\u5b9a\u4f4d\u5230${boardLabel}`;
    default:
      return `\u5df2\u5207\u5230${boardLabel}`;
  }
};

const getAutoSwitchPendingText = (boardLabel: string, count: number) =>
  `\u6b63\u5728\u786e\u8ba4${boardLabel} ${count}/${AUTO_SWITCH_CONFIRMATION_COUNT}`;

const getAutoSwitchCooldownText = (remainingMs: number) =>
  `\u81ea\u52a8\u5207\u677f\u51b7\u5374\u4e2d ${Math.max(1, Math.ceil(remainingMs / 1000))}\u79d2`;

type SetupStepState = "done" | "active" | "pending";

const getSetupStepLabel = (state: SetupStepState) => {
  switch (state) {
    case "done":
      return "\u5df2\u5b8c\u6210";
    case "active":
      return "\u8fdb\u884c\u4e2d";
    default:
      return "\u5f85\u5b8c\u6210";
  }
};

const MOTION_THRESHOLD = 14;
const STABLE_FRAMES_REQUIRED = 2;
const AUTO_SWITCH_COOLDOWN_MS = 2600;
const AUTO_SWITCH_CONFIRMATION_COUNT = 2;
const AUTO_SWITCH_MIN_SCORE_GAP = 28;
const AUTO_SWITCH_STATUS_MIN_MS = 1400;
const DETECTION_CONFIRMATION_COUNT = 2;

const createDetectionStabilityKey = (result: ReturnType<typeof analyzeVisionProgress>) => {
  const guideKey = result.guideCells
    .slice(0, 3)
    .map((cell) => `${cell.index}:${cell.target?.id || "none"}`)
    .join("|");
  const wrongKey = result.wrongGuideCells
    .slice(0, 3)
    .map((cell) => `${cell.index}:${cell.detectedColor?.id || "none"}`)
    .join("|");

  return [
    result.activeColorId || "none",
    result.matchedCells,
    result.missingCells,
    result.wrongCells,
    result.extraFilledCells,
    guideKey,
    wrongKey,
  ].join("::");
};

const BoardVisionAssistModal: React.FC<BoardVisionAssistModalProps> = ({
  visible,
  onClose,
  beadData,
  boardSize,
  initialBoardIndex = 0,
  initialColorId = null,
}) => {
  const toast = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isDetectingRef = useRef(false);
  const previousFrameSignatureRef = useRef<ReturnType<typeof createVisionFrameSignature> | null>(null);
  const stableFrameCountRef = useRef(0);
  const lastAutoSwitchAtRef = useRef<number | null>(null);
  const autoSwitchCandidateRef = useRef<{ boardIndex: number; count: number } | null>(null);
  const autoSwitchStatusShownAtRef = useRef<number | null>(null);
  const autoSwitchStatusClearTimerRef = useRef<number | null>(null);
  const cameraStartRequestIdRef = useRef(0);
  const pendingDetectionRef = useRef<{
    key: string;
    count: number;
    result: ReturnType<typeof analyzeVisionProgress>;
  } | null>(null);

  const boardTiles = useMemo(
    () => splitBeadDataIntoBoards(beadData, boardSize),
    [beadData, boardSize],
  );
  const storageKey = useMemo(
    () => createVisionAssistStorageKey(beadData, boardSize),
    [beadData, boardSize],
  );

  const [boardIndex, setBoardIndex] = useState(initialBoardIndex);
  const [preferredColorId, setPreferredColorId] = useState<string | null>(
    initialColorId,
  );
  const [corners, setCorners] = useState<VisionPoint[]>([]);
  const [emptyPoint, setEmptyPoint] = useState<VisionPoint | null>(null);
  const [emptyReferenceRgb, setEmptyReferenceRgb] = useState<VisionRgb | null>(null);
  const [samplePreview, setSamplePreview] = useState<VisionRgb | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isRetryingCamera, setIsRetryingCamera] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAutoCalibrating, setIsAutoCalibrating] = useState(false);
  const [isLocatingBoard, setIsLocatingBoard] = useState(false);
  const [autoDetect, setAutoDetect] = useState(true);
  const [autoSwitchBoard, setAutoSwitchBoard] = useState(boardTiles.length > 1);
  const [tolerance, setTolerance] = useState(42);
  const [autoCornerConfidence, setAutoCornerConfidence] = useState<{
    level: "high" | "medium" | "low";
    score: number;
  } | null>(null);
  const [lastDetectedAt, setLastDetectedAt] = useState<number | null>(null);
  const [detection, setDetection] = useState<ReturnType<typeof analyzeVisionProgress> | null>(
    null,
  );
  const [frameStatus, setFrameStatus] = useState<"idle" | "moving" | "stabilizing" | "stable">("idle");
  const [motionScore, setMotionScore] = useState<number | null>(null);
  const [boardSwitchNotice, setBoardSwitchNotice] = useState<string | null>(null);
  const [autoSwitchStatus, setAutoSwitchStatus] = useState<string | null>(null);
  const [hasRestoredState, setHasRestoredState] = useState(false);
  const [detectionSummary, setDetectionSummary] = useState<VisionAssistDetectionSummary | null>(null);

  const selectedBoard = boardTiles[
    clamp(boardIndex, 0, Math.max(0, boardTiles.length - 1))
  ];
  const calibratedCorners =
    corners.length === 4
      ? (corners as [VisionPoint, VisionPoint, VisionPoint, VisionPoint])
      : null;
  const canAnalyze = Boolean(selectedBoard && calibratedCorners && emptyReferenceRgb);
  const detectionSummaryAgeText = useMemo(
    () => (detectionSummary ? getDetectionSummaryAgeText(detectionSummary.detectedAt) : null),
    [detectionSummary],
  );
  const detectionSummaryBoardMismatch = useMemo(
    () =>
      Boolean(
        detectionSummary?.boardLabel &&
          selectedBoard?.label &&
          detectionSummary.boardLabel !== selectedBoard.label,
      ),
    [detectionSummary, selectedBoard],
  );
  const detectionSummaryIsStale = useMemo(
    () =>
      Boolean(
        detectionSummary &&
          Date.now() - detectionSummary.detectedAt > DETECTION_SUMMARY_WARN_MS,
      ),
    [detectionSummary],
  );
  const setupSteps = useMemo(() => {
    const stepOneState: SetupStepState =
      corners.length >= 4 ? "done" : corners.length > 0 ? "active" : "pending";
    const stepTwoState: SetupStepState = emptyReferenceRgb
      ? "done"
      : calibratedCorners
        ? "active"
        : "pending";
    const stepThreeState: SetupStepState = lastDetectedAt
      ? "done"
      : canAnalyze
        ? "active"
        : "pending";

    return [
      {
        index: 1,
        title: "\u56db\u89d2\u6821\u51c6",
        hint:
          stepOneState === "done"
            ? "\u5df2\u8bb0\u5f55 4 \u4e2a\u89d2\u70b9"
            : "\u5148\u81ea\u52a8\u8bc6\u522b\u56db\u89d2\uff0c\u4e0d\u51c6\u518d\u624b\u52a8\u8865\u70b9",
        state: stepOneState,
      },
      {
        index: 2,
        title: "\u7a7a\u677f\u53d6\u6837",
        hint:
          stepTwoState === "done"
            ? "\u5df2\u8bb0\u5f55\u7a7a\u677f\u53c2\u8003\u8272"
            : "\u70b9\u4e00\u4e2a\u7a7a\u5b54\uff0c\u8ba9\u7cfb\u7edf\u8bb0\u4f4f\u672a\u653e\u8c46\u7684\u5e95\u8272",
        state: stepTwoState,
      },
      {
        index: 3,
        title: "\u5f00\u59cb\u8bc6\u522b",
        hint:
          stepThreeState === "done"
            ? "\u5df2\u6709\u6700\u8fd1\u4e00\u8f6e\u8bc6\u522b\u7ed3\u679c"
            : "\u5b8c\u6210\u524d\u4e24\u6b65\u540e\uff0c\u53ef\u7acb\u5373\u8bc6\u522b\u6216\u5f00\u542f\u81ea\u52a8\u8f6e\u8be2",
        state: stepThreeState,
      },
    ];
  }, [canAnalyze, calibratedCorners, corners.length, emptyReferenceRgb, lastDetectedAt]);

  const updateAutoSwitchStatus = useCallback((nextStatus: string | null) => {
    if (autoSwitchStatusClearTimerRef.current) {
      window.clearTimeout(autoSwitchStatusClearTimerRef.current);
      autoSwitchStatusClearTimerRef.current = null;
    }

    if (nextStatus) {
      autoSwitchStatusShownAtRef.current = Date.now();
      setAutoSwitchStatus(nextStatus);
      return;
    }

    if (!autoSwitchStatus || !autoSwitchStatusShownAtRef.current) {
      setAutoSwitchStatus(null);
      autoSwitchStatusShownAtRef.current = null;
      return;
    }

    const elapsed = Date.now() - autoSwitchStatusShownAtRef.current;
    const remaining = AUTO_SWITCH_STATUS_MIN_MS - elapsed;

    if (remaining <= 0) {
      setAutoSwitchStatus(null);
      autoSwitchStatusShownAtRef.current = null;
      return;
    }

    autoSwitchStatusClearTimerRef.current = window.setTimeout(() => {
      setAutoSwitchStatus(null);
      autoSwitchStatusShownAtRef.current = null;
      autoSwitchStatusClearTimerRef.current = null;
    }, remaining);
  }, [autoSwitchStatus]);

  const switchBoardPreservingCalibration = useCallback(
    (nextIndex: number, reason: BoardSwitchReason = "manual") => {
      const normalizedIndex = clamp(nextIndex, 0, Math.max(0, boardTiles.length - 1));
      if (normalizedIndex === boardIndex) {
        return;
      }

      previousFrameSignatureRef.current = null;
      stableFrameCountRef.current = 0;
      lastAutoSwitchAtRef.current = Date.now();
      autoSwitchCandidateRef.current = null;
      pendingDetectionRef.current = null;
      setBoardIndex(normalizedIndex);
      setDetection(null);
      setLastDetectedAt(null);
      setMotionScore(null);
      setFrameStatus(emptyReferenceRgb && calibratedCorners ? "stabilizing" : "idle");
      updateAutoSwitchStatus(null);
      setBoardSwitchNotice(
        getBoardSwitchNoticeText(`\u677f${normalizedIndex + 1}`, reason),
      );
    },
    [boardIndex, boardTiles.length, calibratedCorners, emptyReferenceRgb, updateAutoSwitchStatus],
  );

  const handleToggleAutoDetect = useCallback(() => {
    setAutoDetect((prev) => {
      const next = !prev;
      setBoardSwitchNotice(
        next
          ? "\u5df2\u5f00\u542f\u81ea\u52a8\u8f6e\u8be2\uff0c\u753b\u9762\u7a33\u5b9a\u540e\u4f1a\u6301\u7eed\u66f4\u65b0\u8bc6\u522b"
          : "\u5df2\u5173\u95ed\u81ea\u52a8\u8f6e\u8be2\uff0c\u5f53\u524d\u8bc6\u522b\u7ed3\u679c\u4f1a\u4fdd\u7559",
      );
      return next;
    });
  }, []);

  const handleToggleAutoSwitchBoard = useCallback(() => {
    setAutoSwitchBoard((prev) => {
      const next = !prev;
      setBoardSwitchNotice(
        next
          ? "\u5df2\u5f00\u542f\u81ea\u52a8\u5207\u677f\uff0c\u7cfb\u7edf\u4f1a\u5728\u591a\u5757\u62fc\u8c46\u677f\u95f4\u81ea\u52a8\u5339\u914d"
          : "\u5df2\u5173\u95ed\u81ea\u52a8\u5207\u677f\uff0c\u5c06\u56fa\u5b9a\u8bc6\u522b\u5f53\u524d\u6240\u9009\u677f",
      );
      return next;
    });
  }, []);

  const stopCamera = useCallback(() => {
    cameraStartRequestIdRef.current += 1;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    const video = videoRef.current;
    if (video) {
      video.srcObject = null;
    }
    setCameraReady(false);
  }, []);

  const startCamera = useCallback(async () => {
    const requestId = cameraStartRequestIdRef.current + 1;
    cameraStartRequestIdRef.current = requestId;
    setCameraReady(false);
    setCameraError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      if (cameraStartRequestIdRef.current !== requestId) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      video.srcObject = stream;
      await video.play();

      if (cameraStartRequestIdRef.current !== requestId) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      setCameraReady(true);
    } catch (error) {
      console.error("启动视觉辅助摄像头失败", error);
      if (cameraStartRequestIdRef.current === requestId) {
        setCameraError(getCameraErrorMessage(error));
      }
    }
  }, []);

  const handleRetryCamera = useCallback(async () => {
    setIsRetryingCamera(true);
    stopCamera();
    await startCamera();
    setIsRetryingCamera(false);
  }, [startCamera, stopCamera]);

  const handleClearDetectionSummary = useCallback(() => {
    setDetectionSummary(null);
    setBoardSwitchNotice("已清除上次识别摘要");
  }, []);

  const resetCalibration = useCallback(() => {
    previousFrameSignatureRef.current = null;
    stableFrameCountRef.current = 0;
    lastAutoSwitchAtRef.current = null;
    autoSwitchCandidateRef.current = null;
    if (autoSwitchStatusClearTimerRef.current) {
      window.clearTimeout(autoSwitchStatusClearTimerRef.current);
      autoSwitchStatusClearTimerRef.current = null;
    }
    autoSwitchStatusShownAtRef.current = null;
    pendingDetectionRef.current = null;
    setCorners([]);
    setEmptyPoint(null);
    setEmptyReferenceRgb(null);
    setSamplePreview(null);
    setAutoCornerConfidence(null);
    setDetection(null);
    setLastDetectedAt(null);
    setFrameStatus("idle");
    setMotionScore(null);
    setBoardSwitchNotice(null);
    setAutoSwitchStatus(null);
    setDetectionSummary(null);
  }, []);

  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = captureCanvasRef.current;
    if (!video || !canvas || !video.videoWidth || !video.videoHeight) {
      return null;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      return null;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return {
      frameData: imageData.data,
      frameWidth: canvas.width,
      frameHeight: canvas.height,
    };
  }, []);

  const samplePointColor = useCallback(
    (point: VisionPoint) => {
      if (!selectedBoard || !calibratedCorners) {
        return null;
      }
      const frame = captureFrame();
      if (!frame) {
        return null;
      }
      return sampleRobustRgb(
        frame.frameData,
        frame.frameWidth,
        frame.frameHeight,
        point,
        getCellRadius(calibratedCorners, selectedBoard.boardSize),
      );
    },
    [calibratedCorners, captureFrame, selectedBoard],
  );

  const runDetection = useCallback(async (source: "auto" | "manual" = "auto") => {
    if (!selectedBoard || !calibratedCorners || !emptyReferenceRgb || isDetectingRef.current) {
      return;
    }
    const frame = captureFrame();
    if (!frame) {
      return;
    }

    const frameSignature = createVisionFrameSignature({
      frameData: frame.frameData,
      frameWidth: frame.frameWidth,
      frameHeight: frame.frameHeight,
      corners: calibratedCorners,
    });
    const previousSignature = previousFrameSignatureRef.current;
    previousFrameSignatureRef.current = frameSignature;

    if (previousSignature) {
      const nextMotionScore = compareVisionFrameSignature(previousSignature, frameSignature);
      setMotionScore(Math.round(nextMotionScore * 10) / 10);

      if (nextMotionScore > MOTION_THRESHOLD) {
        stableFrameCountRef.current = 0;
        setFrameStatus("moving");
        if (source === "manual") {
          toast.info("检测到手遮挡或板子移动，请稍等画面稳定后再识别");
        }
        return;
      }

      stableFrameCountRef.current += 1;
      if (stableFrameCountRef.current < STABLE_FRAMES_REQUIRED) {
        setFrameStatus("stabilizing");
        return;
      }
    } else {
      stableFrameCountRef.current = STABLE_FRAMES_REQUIRED;
      setMotionScore(null);
    }

    try {
      isDetectingRef.current = true;
      setIsAnalyzing(true);
      setFrameStatus("stable");
      let resolvedBoardIndex = boardIndex;
      let result = analyzeVisionProgress({
        frameData: frame.frameData,
        frameWidth: frame.frameWidth,
        frameHeight: frame.frameHeight,
        boardTile: selectedBoard,
        corners: calibratedCorners,
        emptyReferenceRgb,
        tolerance,
        preferredColorId,
      });

      if (source === "auto" && autoSwitchBoard && boardTiles.length > 1) {
        const currentScore = calculateVisionBoardMatchScore(result);
        const bestMatch = findBestVisionBoardMatch({
          frameData: frame.frameData,
          frameWidth: frame.frameWidth,
          frameHeight: frame.frameHeight,
          boardTiles,
          corners: calibratedCorners,
          emptyReferenceRgb,
          tolerance,
          preferredColorId,
        });

        if (bestMatch && bestMatch.tile.index !== boardIndex) {
          const scoreGap = bestMatch.score - currentScore;
          const now = Date.now();
          const remainingCooldown = lastAutoSwitchAtRef.current
            ? AUTO_SWITCH_COOLDOWN_MS - (now - lastAutoSwitchAtRef.current)
            : 0;
          const cooldownReady =
            !lastAutoSwitchAtRef.current ||
            now - lastAutoSwitchAtRef.current >= AUTO_SWITCH_COOLDOWN_MS;

          if (scoreGap >= AUTO_SWITCH_MIN_SCORE_GAP && cooldownReady) {
            const previousCandidate = autoSwitchCandidateRef.current;
            const nextCount =
              previousCandidate?.boardIndex === bestMatch.tile.index
                ? previousCandidate.count + 1
                : 1;

            autoSwitchCandidateRef.current = {
              boardIndex: bestMatch.tile.index,
              count: nextCount,
            };
            updateAutoSwitchStatus(
              getAutoSwitchPendingText(`\u677f${bestMatch.tile.index + 1}`, nextCount),
            );

            if (nextCount >= AUTO_SWITCH_CONFIRMATION_COUNT) {
              resolvedBoardIndex = bestMatch.tile.index;
              result = bestMatch.detection;
              lastAutoSwitchAtRef.current = now;
              autoSwitchCandidateRef.current = null;
              updateAutoSwitchStatus(null);
            }
          } else if (scoreGap >= AUTO_SWITCH_MIN_SCORE_GAP && !cooldownReady) {
            autoSwitchCandidateRef.current = null;
            updateAutoSwitchStatus(getAutoSwitchCooldownText(remainingCooldown));
          } else if (
            autoSwitchCandidateRef.current?.boardIndex === bestMatch.tile.index
          ) {
            autoSwitchCandidateRef.current = null;
            updateAutoSwitchStatus(null);
          }
        } else {
          autoSwitchCandidateRef.current = null;
          updateAutoSwitchStatus(null);
        }
      } else {
        updateAutoSwitchStatus(null);
      }

      if (resolvedBoardIndex !== boardIndex) {
        switchBoardPreservingCalibration(resolvedBoardIndex, "auto");
      }
      const applyDetectionResult = () => {
        setDetection(result);
        setDetectionSummary(createDetectionSummary(result, selectedBoard, tolerance));
        if (result.activeColorId) {
          setPreferredColorId(result.activeColorId);
        }
      };

      if (source === "manual") {
        pendingDetectionRef.current = null;
        applyDetectionResult();
      } else {
        const detectionKey = createDetectionStabilityKey(result);
        const previousPending = pendingDetectionRef.current;
        if (previousPending?.key === detectionKey) {
          const nextCount = previousPending.count + 1;
          pendingDetectionRef.current = {
            key: detectionKey,
            count: nextCount,
            result,
          };
          if (nextCount >= DETECTION_CONFIRMATION_COUNT) {
            pendingDetectionRef.current = null;
            applyDetectionResult();
          }
        } else {
          pendingDetectionRef.current = {
            key: detectionKey,
            count: 1,
            result,
          };
        }
      }
      setLastDetectedAt(Date.now());
    } finally {
      isDetectingRef.current = false;
      setIsAnalyzing(false);
    }
  }, [
    calibratedCorners,
    captureFrame,
    emptyReferenceRgb,
    preferredColorId,
    selectedBoard,
    tolerance,
    toast,
    autoSwitchBoard,
    boardIndex,
    boardTiles,
    switchBoardPreservingCalibration,
    updateAutoSwitchStatus,
  ]);

  const handleAutoDetectCorners = useCallback(async () => {
    const frame = captureFrame();
    if (!frame) {
      toast.error("摄像头画面还没准备好，暂时无法自动识别四角");
      return;
    }

    try {
      setIsAutoCalibrating(true);
      const detectResult = detectBoardCornersDetailed({
        frameData: frame.frameData,
        frameWidth: frame.frameWidth,
        frameHeight: frame.frameHeight,
        boardSize: selectedBoard?.boardSize,
        usedWidth: selectedBoard?.usedWidth,
        usedHeight: selectedBoard?.usedHeight,
      });
      const detectedCorners = detectResult.corners;

      if (!detectedCorners) {
        toast.warning(getAutoCornerFailureMessage(detectResult.reason));
        return;
      }

      setCorners(detectedCorners);
      setEmptyPoint(null);
      setEmptyReferenceRgb(null);
      setSamplePreview(null);
      setAutoCornerConfidence(detectResult.confidence);
      setDetection(null);
      setLastDetectedAt(null);
      toast.success(getAutoCornerConfidenceText(detectResult.confidence));
    } finally {
      setIsAutoCalibrating(false);
    }
  }, [captureFrame, selectedBoard, toast]);

  const handleAutoLocateBoard = useCallback(async () => {
    if (!calibratedCorners || !emptyReferenceRgb) {
      toast.info("请先完成四角校准和空板取样，再识别当前板");
      return;
    }

    const frame = captureFrame();
    if (!frame) {
      toast.error("摄像头画面还没准备好，暂时无法识别当前板");
      return;
    }

    try {
      setIsLocatingBoard(true);
      const bestMatch = findBestVisionBoardMatch({
        frameData: frame.frameData,
        frameWidth: frame.frameWidth,
        frameHeight: frame.frameHeight,
        boardTiles,
        corners: calibratedCorners,
        emptyReferenceRgb,
        tolerance,
        preferredColorId,
      });

      if (!bestMatch) {
        toast.warning("暂时没识别出当前是哪块板，请手动切板后再试");
        return;
      }

      switchBoardPreservingCalibration(bestMatch.tile.index, "locate");
      setDetection(bestMatch.detection);
      setDetectionSummary(
        createDetectionSummary(bestMatch.detection, bestMatch.tile, tolerance),
      );
      if (bestMatch.detection.activeColorId) {
        setPreferredColorId(bestMatch.detection.activeColorId);
      }
      setLastDetectedAt(Date.now());
      toast.success(`已定位到${bestMatch.tile.label}`);
    } finally {
      setIsLocatingBoard(false);
    }
  }, [
    boardTiles,
    calibratedCorners,
    captureFrame,
    emptyReferenceRgb,
    preferredColorId,
    switchBoardPreservingCalibration,
    toast,
    tolerance,
  ]);

  useEffect(() => {
    if (!visible) {
      stopCamera();
      return;
    }
    void startCamera();

    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera, visible]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    const persisted = readVisionAssistState(storageKey);
    if (persisted) {
      setBoardIndex(clamp(persisted.boardIndex, 0, Math.max(0, boardTiles.length - 1)));
      setPreferredColorId(persisted.preferredColorId);
      setCorners(Array.isArray(persisted.corners) ? persisted.corners.slice(0, 4) : []);
      setEmptyPoint(persisted.emptyPoint || null);
      setEmptyReferenceRgb(persisted.emptyReferenceRgb || null);
      setSamplePreview(persisted.samplePreview || null);
      setTolerance(clamp(persisted.tolerance ?? 42, 24, 90));
      setAutoDetect(Boolean(persisted.autoDetect));
      setAutoSwitchBoard(
        boardTiles.length > 1 ? Boolean(persisted.autoSwitchBoard) : false,
      );
      setDetectionSummary(persisted.detectionSummary || null);
      setDetection(null);
      setLastDetectedAt(null);
      setFrameStatus("idle");
      setMotionScore(null);
      setBoardSwitchNotice("已恢复上次视觉辅助设置");
      setAutoSwitchStatus(null);
    } else {
      setBoardIndex(clamp(initialBoardIndex, 0, Math.max(0, boardTiles.length - 1)));
      setPreferredColorId(initialColorId);
      resetCalibration();
      setTolerance(42);
      setAutoDetect(true);
      setAutoSwitchBoard(boardTiles.length > 1);
      setDetectionSummary(null);
    }
    setHasRestoredState(true);
  }, [boardTiles.length, initialBoardIndex, initialColorId, resetCalibration, storageKey, visible]);

  useEffect(() => {
    if (!visible || !hasRestoredState || typeof window === "undefined") {
      return;
    }

    const stateToPersist: VisionAssistPersistedState = {
      boardIndex,
      preferredColorId,
      corners,
      emptyPoint,
      emptyReferenceRgb,
      samplePreview,
      tolerance,
      autoDetect,
      autoSwitchBoard: boardTiles.length > 1 ? autoSwitchBoard : false,
      detectionSummary,
    };

    window.localStorage.setItem(storageKey, JSON.stringify(stateToPersist));
  }, [
    autoDetect,
    autoSwitchBoard,
    boardIndex,
    boardTiles.length,
    corners,
    emptyPoint,
    emptyReferenceRgb,
    hasRestoredState,
    detectionSummary,
    preferredColorId,
    samplePreview,
    storageKey,
    tolerance,
    visible,
  ]);

  useEffect(() => {
    if (boardTiles.length <= 1) {
      setAutoSwitchBoard(false);
      return;
    }
  }, [boardTiles.length]);

  useEffect(() => {
    if (!visible || !autoDetect || !autoSwitchBoard || boardTiles.length <= 1) {
      autoSwitchCandidateRef.current = null;
      updateAutoSwitchStatus(null);
    }
  }, [autoDetect, autoSwitchBoard, boardTiles.length, updateAutoSwitchStatus, visible]);

  useEffect(() => {
    if (!visible || !autoDetect || !canAnalyze) {
      return;
    }
    void runDetection();
    const timer = window.setInterval(() => {
      void runDetection();
    }, 900);
    return () => window.clearInterval(timer);
  }, [autoDetect, canAnalyze, runDetection, visible]);

  useEffect(() => {
    if (!boardSwitchNotice) {
      return;
    }
    const timer = window.setTimeout(() => {
      setBoardSwitchNotice(null);
    }, 2400);
    return () => window.clearTimeout(timer);
  }, [boardSwitchNotice]);

  useEffect(() => {
    return () => {
      if (autoSwitchStatusClearTimerRef.current) {
        window.clearTimeout(autoSwitchStatusClearTimerRef.current);
        autoSwitchStatusClearTimerRef.current = null;
      }
    };
  }, []);

  const handleOverlayClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const video = videoRef.current;
      if (!video) {
        return;
      }
      const point = getVideoPoint(event, video);
      if (!point) {
        return;
      }

      if (corners.length < 4) {
        const nextCorners = [...corners, point];
        setCorners(nextCorners);
        setAutoCornerConfidence(null);
        if (nextCorners.length < 4) {
          toast.info(
            `已记录${CORNER_HINTS[nextCorners.length - 1]}，继续点击${CORNER_HINTS[nextCorners.length]}`,
          );
        } else {
          toast.success("四角已记录，请点击一个空孔采集空板参考色");
        }
        return;
      }

      if (!emptyReferenceRgb) {
        const nearestCornerIndex = corners.reduce(
          (bestIndex, currentCorner, index, currentCorners) => {
            const currentDistance = Math.hypot(
              currentCorner.x - point.x,
              currentCorner.y - point.y,
            );
            const bestDistance =
              bestIndex === -1
                ? Number.POSITIVE_INFINITY
                : Math.hypot(
                    currentCorners[bestIndex].x - point.x,
                    currentCorners[bestIndex].y - point.y,
                  );
            return currentDistance < bestDistance ? index : bestIndex;
          },
          -1,
        );

        if (
          nearestCornerIndex >= 0 &&
          Math.hypot(
            corners[nearestCornerIndex].x - point.x,
            corners[nearestCornerIndex].y - point.y,
          ) <= 48
        ) {
          const nextCorners = [...corners];
          nextCorners[nearestCornerIndex] = point;
          setCorners(nextCorners);
          setAutoCornerConfidence(null);
          toast.info(`已微调${CORNER_HINTS[nearestCornerIndex]}`);
          return;
        }
      }

      const sampled = samplePointColor(point);
      if (!sampled) {
        toast.error("空板参考色取样失败，请确认摄像头画面正常");
        return;
      }
      setEmptyPoint(point);
      setEmptyReferenceRgb(sampled);
      setSamplePreview(sampled);
      toast.success("空板参考色已记录，开始识别当前进度");
      void runDetection();
    },
    [corners, runDetection, samplePointColor, toast],
  );

  const activeColorProgress = detection?.colors.find(
    (item) => item.color.id === detection.activeColorId,
  );
  const nextGuideCell = detection?.guideCells[0] || null;
  const wrongDetailCells = detection?.wrongCellsDetail.slice(0, 3) || [];
  const detectionEmptyHint = useMemo(() => {
    if (!detection) {
      return null;
    }
    if (detection.totalTargetCells === 0) {
      return "当前板没有可识别的目标格子，请先确认拼豆板切换是否正确。";
    }
    if (
      detection.missingCells === 0 &&
      detection.wrongCells === 0 &&
      detection.extraFilledCells === 0
    ) {
      return "当前板已经全部识别完成，没有待放或错放的格子。";
    }
    if (
      detection.matchedCells === 0 &&
      detection.missingCells === detection.totalTargetCells &&
      detection.wrongCells === 0
    ) {
      return "当前还没识别到已放对的豆子，可能是尚未开始制作，或四角和空板取样还不够准。";
    }
    if (!nextGuideCell && wrongDetailCells.length === 0 && detection.extraFilledCells > 0) {
      return `当前没有识别到明确的下一步，但检测到 ${detection.extraFilledCells} 格多放，建议先检查是否有放到空位的豆子。`;
    }
    if (!nextGuideCell && wrongDetailCells.length === 0) {
      return "当前没有明确的下一步建议，建议重新识别一次或微调四角后再试。";
    }
    return null;
  }, [detection, nextGuideCell, wrongDetailCells.length]);

  if (!visible) {
    return null;
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>视觉辅助引导</h2>
            <p style={styles.subTitle}>
              摄像头直接内置在制作页里，用户只需要完成一次四角校准，就能看到当前拼豆进度和下一步放豆位置。
            </p>
          </div>
          <button style={styles.iconButton} onClick={onClose} aria-label="关闭视觉辅助">
            <X size={18} />
          </button>
        </div>

        <div style={styles.body}>
          <div style={styles.leftColumn}>
            <div style={styles.videoBox}>
              <div style={styles.videoLayer} onClick={handleOverlayClick}>
                <video ref={videoRef} playsInline muted style={styles.video} />
                <svg
                  style={styles.overlaySvg}
                  viewBox={`0 0 ${videoRef.current?.videoWidth || 100} ${videoRef.current?.videoHeight || 100}`}
                  preserveAspectRatio="none"
                >
                  {corners.length >= 2 && (
                    <polyline
                      fill="none"
                      stroke="rgba(45, 224, 255, 0.95)"
                      strokeWidth={3}
                      points={corners.map((point) => `${point.x},${point.y}`).join(" ")}
                    />
                  )}
                  {corners.length === 4 && (
                    <line
                      x1={corners[3].x}
                      y1={corners[3].y}
                      x2={corners[0].x}
                      y2={corners[0].y}
                      stroke="rgba(45, 224, 255, 0.95)"
                      strokeWidth={3}
                    />
                  )}
                  {corners.map((point, index) => (
                    <g key={`corner-${index}`}>
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r={10}
                        fill="rgba(45, 224, 255, 0.95)"
                        stroke="#fff"
                        strokeWidth={2}
                      />
                      <text
                        x={point.x}
                        y={point.y - 16}
                        fill="#fff"
                        fontSize={14}
                        fontWeight={700}
                        textAnchor="middle"
                      >
                        {index + 1}
                      </text>
                    </g>
                  ))}
                  {emptyPoint && (
                    <circle
                      cx={emptyPoint.x}
                      cy={emptyPoint.y}
                      r={12}
                      fill="rgba(117, 255, 178, 0.24)"
                      stroke="rgba(117, 255, 178, 0.95)"
                      strokeWidth={3}
                    />
                  )}
                  {detection?.matchedGuideCells.map((cell) => (
                    <circle
                      key={`matched-${cell.index}`}
                      cx={cell.center.x}
                      cy={cell.center.y}
                      r={Math.max(8, detection.markerRadius)}
                      fill="rgba(117, 255, 178, 0.2)"
                      stroke="rgba(117, 255, 178, 0.95)"
                      strokeWidth={2}
                    />
                  ))}
                  {detection?.guideCells.map((cell, index) => (
                    <g key={`guide-${cell.index}`}>
                      <circle
                        cx={cell.center.x}
                        cy={cell.center.y}
                        r={Math.max(10, detection.markerRadius + 2)}
                        fill="rgba(45, 224, 255, 0.28)"
                        stroke="rgba(45, 224, 255, 0.95)"
                        strokeWidth={2.5}
                      />
                      <text
                        x={cell.center.x}
                        y={cell.center.y + 4}
                        fill="#fff"
                        fontSize={13}
                        fontWeight={800}
                        textAnchor="middle"
                      >
                        {index + 1}
                      </text>
                    </g>
                  ))}
                  {detection?.wrongGuideCells.map((cell) => {
                    const radius = Math.max(8, detection.markerRadius + 1);
                    return (
                      <g key={`wrong-${cell.index}`}>
                        <line
                          x1={cell.center.x - radius}
                          y1={cell.center.y - radius}
                          x2={cell.center.x + radius}
                          y2={cell.center.y + radius}
                          stroke="rgba(255, 91, 123, 0.95)"
                          strokeWidth={3}
                          strokeLinecap="round"
                        />
                        <line
                          x1={cell.center.x + radius}
                          y1={cell.center.y - radius}
                          x2={cell.center.x - radius}
                          y2={cell.center.y + radius}
                          stroke="rgba(255, 91, 123, 0.95)"
                          strokeWidth={3}
                          strokeLinecap="round"
                        />
                      </g>
                    );
                  })}
                </svg>
              </div>
              {!cameraReady && !cameraError && <div style={styles.videoMask}>正在准备摄像头...</div>}
              {cameraError && (
                <div style={styles.videoMask}>
                  <div style={styles.cameraErrorBox}>
                    <div>{cameraError}</div>
                    <button
                      style={{
                        ...styles.secondaryButton,
                        ...styles.cameraRetryButton,
                        ...(isRetryingCamera ? styles.disabledButton : {}),
                      }}
                      onClick={() => {
                        void handleRetryCamera();
                      }}
                      disabled={isRetryingCamera}
                    >
                      {isRetryingCamera ? "正在重试..." : "重试摄像头"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div style={styles.tipText}>{getStepText(corners, emptyReferenceRgb)}</div>
            <div style={styles.buttonRow}>
              <button
                style={{
                  ...styles.secondaryButton,
                  ...(isAutoCalibrating ? styles.disabledButton : {}),
                }}
                onClick={() => {
                  void handleAutoDetectCorners();
                }}
                disabled={isAutoCalibrating || Boolean(cameraError)}
              >
                {isAutoCalibrating ? "识别四角中..." : "自动识别四角"}
              </button>
              <button style={styles.secondaryButton} onClick={resetCalibration}>
                重置校准
              </button>
              <button
                style={styles.secondaryButton}
                onClick={() => {
                  if (!emptyPoint) {
                    toast.info("请先点击空孔，记录空板参考色");
                    return;
                  }
                  const sampled = samplePointColor(emptyPoint);
                  if (!sampled) {
                    toast.error("重新取样失败，请稍后重试");
                    return;
                  }
                  setEmptyReferenceRgb(sampled);
                  setSamplePreview(sampled);
                  toast.success("空板参考色已更新");
                  void runDetection();
                }}
              >
                重新取样
              </button>
              {boardTiles.length > 1 && (
                <button
                  style={{
                    ...styles.secondaryButton,
                    ...(!canAnalyze || isLocatingBoard ? styles.disabledButton : {}),
                  }}
                  onClick={() => {
                    void handleAutoLocateBoard();
                  }}
                  disabled={!canAnalyze || isLocatingBoard}
                >
                  {isLocatingBoard ? "识别当前板中..." : "识别当前板"}
                </button>
              )}
              <button
                style={{
                  ...styles.primaryButton,
                  ...(!canAnalyze || isAnalyzing ? styles.disabledButton : {}),
                }}
                onClick={() => {
                  void runDetection("manual");
                }}
                disabled={!canAnalyze || isAnalyzing}
              >
                {isAnalyzing ? "识别中..." : "立即识别"}
              </button>
            </div>
            {autoCornerConfidence && corners.length === 4 && !emptyReferenceRgb && (
              <div
                style={{
                  ...styles.tipText,
                  ...(autoCornerConfidence.level === "low"
                    ? styles.tipTextWarn
                    : autoCornerConfidence.level === "medium"
                      ? styles.tipTextCaution
                      : styles.tipTextGood),
                }}
              >
                {getAutoCornerConfidenceText(autoCornerConfidence)}
              </div>
            )}
          </div>
          <div style={styles.rightColumn}>
            <div style={styles.panel}>
              <div style={styles.panelTitle}>校准与识别</div>
              <div style={styles.boardTabs}>
                {boardTiles.map((tile) => (
                  <button
                    key={tile.index}
                    style={{
                      ...styles.boardTab,
                      ...(tile.index === boardIndex ? styles.boardTabActive : {}),
                    }}
                    onClick={() => switchBoardPreservingCalibration(tile.index, "manual")}
                  >
                    {`板${tile.index + 1}`}
                  </button>
                ))}
              </div>
          {boardSwitchNotice && (
            <div style={styles.noticeRow}>
              <div style={styles.boardSwitchNotice}>{boardSwitchNotice}</div>
              {detectionSummary && !detection && (
                <button
                  style={styles.noticeAction}
                  onClick={handleClearDetectionSummary}
                >
                  清除历史摘要
                </button>
              )}
            </div>
          )}
              <div style={styles.setupCard}>
                <div style={styles.setupTitle}>{"\u4e0a\u624b\u8fdb\u5ea6"}</div>
                <div style={styles.setupList}>
                  {setupSteps.map((step) => (
                    <div key={step.index} style={styles.setupItem}>
                      <div
                        style={{
                          ...styles.setupIndex,
                          ...(step.state === "done"
                            ? styles.setupIndexDone
                            : step.state === "active"
                              ? styles.setupIndexActive
                              : {}),
                        }}
                      >
                        {step.index}
                      </div>
                      <div style={styles.setupContent}>
                        <div style={styles.setupHeader}>
                          <strong>{step.title}</strong>
                          <span
                            style={{
                              ...styles.setupBadge,
                              ...(step.state === "done"
                                ? styles.setupBadgeDone
                                : step.state === "active"
                                  ? styles.setupBadgeActive
                                  : {}),
                            }}
                          >
                            {getSetupStepLabel(step.state)}
                          </span>
                        </div>
                        <span style={styles.setupHint}>{step.hint}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={styles.metaGrid}>
                <div style={styles.metaCard}>
                  <span style={styles.metaLabel}>当前板尺寸</span>
                  <strong>{selectedBoard.usedWidth} × {selectedBoard.usedHeight}</strong>
                </div>
                <div style={styles.metaCard}>
                  <span style={styles.metaLabel}>识别容差</span>
                  <strong>{tolerance}</strong>
                </div>
                <div style={styles.metaCard}>
                  <span style={styles.metaLabel}>空板参考色</span>
                  <div style={styles.inlineMeta}>
                    <span
                      style={{
                        ...styles.colorSwatch,
                        backgroundColor: samplePreview ? rgbToCss(samplePreview) : "rgba(255,255,255,0.1)",
                      }}
                    />
                    <strong>{samplePreview ? rgbToCss(samplePreview) : "未取样"}</strong>
                  </div>
                </div>
                <div style={styles.metaCard}>
                  <span style={styles.metaLabel}>自动轮询</span>
                  <button
                    style={{
                      ...styles.boardTab,
                      ...(autoDetect ? styles.boardTabActive : {}),
                    }}
                    onClick={handleToggleAutoDetect}
                  >
                    {autoDetect ? "已开启" : "已关闭"}
                  </button>
                </div>
                {boardTiles.length > 1 && (
                  <div style={styles.metaCard}>
                    <span style={styles.metaLabel}>自动切板</span>
                    <button
                      style={{
                        ...styles.boardTab,
                        ...(autoSwitchBoard ? styles.boardTabActive : {}),
                      }}
                      onClick={handleToggleAutoSwitchBoard}
                    >
                      {autoSwitchBoard ? "已开启" : "已关闭"}
                    </button>
                    <span style={styles.metaHint}>{"\u9700\u8fde\u7eed 2 \u6b21\u660e\u663e\u66f4\u5339\u914d\u624d\u4f1a\u5207\u677f"}</span>
                    {autoSwitchStatus && (
                      <span style={styles.metaHintStrong}>{autoSwitchStatus}</span>
                    )}
                  </div>
                )}
                <div style={styles.metaCard}>
                  <span style={styles.metaLabel}>画面稳定性</span>
                  <strong>{getFrameStatusText(frameStatus)}</strong>
                  {motionScore !== null && (
                    <span style={styles.metaHint}>变化值{motionScore.toFixed(1)}</span>
                  )}
                </div>
                <div style={styles.metaCard}>
                  <span style={styles.metaLabel}>识别环境</span>
                  <strong>{getQualityText(detection?.quality.level)}</strong>
                  {detection?.quality && (
                    <span style={styles.metaHint}>
                      亮度 {detection.quality.brightness} / 偏色 {detection.quality.tint} / 反光 {formatPercent(detection.quality.glareRatio)}
                    </span>
                  )}
                </div>
              </div>
              <input
                type="range"
                min={24}
                max={90}
                step={2}
                value={tolerance}
                style={styles.range}
                onChange={(event) => setTolerance(Number(event.target.value))}
                aria-label="识别容差"
              />
              <p style={styles.smallText}>
                容差越高，越容易把接近目标色的格子判成已完成。初版建议先用 40 左右。
              </p>
              {frameStatus !== "idle" && frameStatus !== "stable" && (
                <p style={styles.warningText}>
                  检测到手经过镜头或拼豆板移动时，系统会暂时冻结旧结果，等画面稳定后再继续更新。
                </p>
              )}
              {detection?.quality.issues.length ? (
                <div style={styles.qualityList}>
                  {detection.quality.issues.map((issue) => (
                    <span
                      key={issue}
                      style={{
                        ...styles.qualityChip,
                        ...(detection.quality.level === "poor"
                          ? styles.qualityChipPoor
                          : styles.qualityChipWarn),
                      }}
                    >
                      {issue}
                    </span>
                  ))}
                </div>
              ) : (
                detection && <p style={styles.smallText}>当前光线和颜色环境适合继续识别。</p>
              )}
              {lastDetectedAt && (
                <p style={styles.smallText}>
                  上次识别：{new Date(lastDetectedAt).toLocaleTimeString("zh-CN", { hour12: false })}
                </p>
              )}
            </div>

            <div style={styles.panel}>
              <div style={styles.panelTitle}>当前引导</div>
              {detection ? (
                <>
                  <div style={styles.progressCard}>
                    <div style={styles.progressValue}>{formatProgressPercent(detection.progress)}</div>
                    <div style={styles.smallText}>
                      已完成 {detection.matchedCells} 格 / 待放 {detection.missingCells} 格 / 错放 {detection.wrongCells} 格
                    </div>
                  </div>
                  {detectionEmptyHint && (
                    <div style={styles.tipTextCaution}>{detectionEmptyHint}</div>
                  )}
                  <div style={styles.activeCard}>
                    <div style={styles.metaLabel}>当前优先颜色</div>
                    <div style={styles.inlineMeta}>
                      <span
                        style={{
                          ...styles.colorSwatch,
                          width: 22,
                          height: 22,
                          backgroundColor: activeColorProgress?.color.hex || "rgba(255,255,255,0.1)",
                        }}
                      />
                      <strong>
                        {activeColorProgress
                          ? getColorLabel(activeColorProgress.color)
                          : "等待识别"}
                      </strong>
                    </div>
                    {activeColorProgress && (
                      <div style={styles.smallText}>
                        已放 {activeColorProgress.matched} / 剩余 {activeColorProgress.remaining} / 错放 {activeColorProgress.wrong}
                      </div>
                    )}
                  </div>
                  {nextGuideCell?.target && (
                    <div style={styles.guideCard}>
                      <div style={styles.guideTitle}>下一步建议</div>
                      <div style={styles.guideHeadline}>{getBoardCellLabel(nextGuideCell.x, nextGuideCell.y)}</div>
                      <div style={styles.smallText}>
                        当前板先放 {getColorLabel(nextGuideCell.target)}
                      </div>
                      <div style={styles.smallText}>
                        {getGlobalCellLabel(
                          selectedBoard.startX,
                          selectedBoard.startY,
                          nextGuideCell.x,
                          nextGuideCell.y,
                        )}
                      </div>
                    </div>
                  )}
                  {wrongDetailCells.length > 0 && (
                    <div style={styles.warningCard}>
                      <div style={styles.guideTitle}>优先修正</div>
                      {detection.wrongColorSuggestions.length > 0 && (
                        <div style={styles.warningSummaryList}>
                          {detection.wrongColorSuggestions.map((item, index) => (
                            <div key={`${item.sourceColor?.id || "none"}-${item.targetColor?.id || "none"}`} style={styles.warningSummaryItem}>
                              <span style={styles.warningSummaryIndex}>{index + 1}</span>
                              <span style={styles.warningSummaryText}>
                                建议优先把 {getWrongSuggestionLabel(item.sourceColor, item.targetColor)}，共 {item.count} 格
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div style={styles.warningList}>
                        {wrongDetailCells.map((cell) => (
                          <div key={cell.index} style={styles.warningItem}>
                            <div style={styles.warningHeadline}>
                              {getBoardCellLabel(cell.x, cell.y)}
                            </div>
                            <div style={styles.smallText}>
                              应改成 {cell.target ? getColorLabel(cell.target) : "目标色"}
                            </div>
                            {cell.detectedColor && (
                              <div style={styles.smallText}>
                                当前更像 {getColorLabel(cell.detectedColor)}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div style={styles.legendRow}>
                    <span>蓝色数字：下一步</span>
                    <span>绿色圈：已放对</span>
                    <span>红叉：错放</span>
                  </div>
                  <div style={styles.colorList}>
                    {detection.colors.slice(0, 8).map((item) => (
                      <button
                        key={item.color.id}
                        style={{
                          ...styles.colorChip,
                          ...(item.color.id === detection.activeColorId ? styles.colorChipActive : {}),
                        }}
                        onClick={() => {
                          setPreferredColorId(item.color.id);
                          void runDetection();
                        }}
                      >
                        <span
                          style={{
                            ...styles.colorSwatch,
                            width: 14,
                            height: 14,
                            backgroundColor: item.color.hex,
                          }}
                        />
                        <span>{item.color.id}</span>
                        <span style={styles.growRight}>{item.remaining}</span>
                      </button>
                    ))}
                  </div>
                </>
              ) : detectionSummary ? (
                <div style={styles.summaryCard}>
                  <div style={styles.summaryHeader}>
                    <strong>上次识别摘要</strong>
                    <div style={styles.summaryBadgeRow}>
                      <span style={styles.summaryBadge}>历史结果</span>
                      {detectionSummaryIsStale && (
                        <span style={styles.summaryBadgeWarn}>结果可能已过期</span>
                      )}
                    </div>
                  </div>
                  <div style={styles.progressCard}>
                    <div style={styles.progressValue}>{formatProgressPercent(detectionSummary.progress)}</div>
                    <div style={styles.smallText}>
                      已完成 {detectionSummary.matchedCells} 格 / 待放 {detectionSummary.missingCells} 格 / 错放 {detectionSummary.wrongCells} 格
                    </div>
                  </div>
                  <div style={styles.summaryMeta}>
                    <div style={styles.smallText}>
                      上次识别：{new Date(detectionSummary.detectedAt).toLocaleTimeString("zh-CN", { hour12: false })}
                    </div>
                    {detectionSummary.boardLabel && (
                      <div style={styles.smallText}>识别板位：{detectionSummary.boardLabel}</div>
                    )}
                    <div style={styles.smallText}>上次容差：{detectionSummary.tolerance}</div>
                    <div style={styles.inlineMeta}>
                      <span style={styles.smallText}>上次环境：</span>
                      <span
                        style={{
                          ...styles.qualityChip,
                          ...(detectionSummary.qualityLevel === "poor"
                            ? styles.qualityChipPoor
                            : detectionSummary.qualityLevel === "warning"
                              ? styles.qualityChipWarn
                              : styles.qualityChipGood),
                        }}
                      >
                        {getQualityText(detectionSummary.qualityLevel)}
                      </span>
                    </div>
                    {detectionSummary.qualityIssues.length > 0 && (
                      <div style={styles.qualityList}>
                        {detectionSummary.qualityIssues.map((issue) => (
                          <span key={issue} style={{ ...styles.qualityChip, ...styles.qualityChipWarn }}>
                            {issue}
                          </span>
                        ))}
                      </div>
                    )}
                    {detectionSummaryBoardMismatch && (
                      <div style={styles.warningText}>
                        当前已切到 {selectedBoard.label}，这份历史结果来自 {detectionSummary.boardLabel}，建议重新识别当前板。
                      </div>
                    )}
                    {detectionSummaryAgeText && (
                      <div style={styles.smallText}>
                        结果时间：{detectionSummaryAgeText}
                        {detectionSummaryIsStale ? "，建议重新识别一次" : ""}
                      </div>
                    )}
                    {detectionSummary.activeColorLabel && (
                      <div style={styles.inlineMeta}>
                        <span
                          style={{
                            ...styles.colorSwatch,
                            width: 16,
                            height: 16,
                            backgroundColor: detectionSummary.activeColorHex || "rgba(255,255,255,0.12)",
                          }}
                        />
                        <span style={styles.smallText}>当前优先颜色：{detectionSummary.activeColorLabel}</span>
                      </div>
                    )}
                    {detectionSummary.nextGuideLabel && (
                      <div style={styles.smallText}>下一步建议：{detectionSummary.nextGuideLabel}</div>
                    )}
                  </div>
                  {detectionSummary.wrongSuggestions.length > 0 && (
                    <div style={styles.warningSummaryList}>
                      {detectionSummary.wrongSuggestions.map((item) => (
                        <div key={item} style={styles.warningSummaryItem}>
                          <span style={styles.warningSummaryText}>{item}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={styles.buttonRow}>
                    <button
                      style={styles.secondaryButton}
                      onClick={handleClearDetectionSummary}
                    >
                      清除历史摘要
                    </button>
                  </div>
                </div>
              ) : (
                <p style={styles.smallText}>
                  完成四角校准和空板取样后，系统会自动识别当前板进度，并按当前颜色标出接下来该放的格子。
                </p>
              )}
            </div>
          </div>
        </div>
        <canvas ref={captureCanvasRef} style={{ display: "none" }} />
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: { position: "fixed", inset: 0, zIndex: 5000, background: "rgba(7,10,18,0.82)", backdropFilter: "blur(10px)", display: "flex", justifyContent: "center", padding: "16px 12px calc(env(safe-area-inset-bottom, 0px) + 20px)" },
  modal: { width: "100%", maxWidth: 1180, background: "linear-gradient(180deg, rgba(19,24,42,0.98), rgba(11,15,28,0.98))", border: "1px solid rgba(83,107,180,0.35)", borderRadius: 20, boxShadow: "0 24px 80px rgba(0,0,0,0.45)", overflow: "hidden", color: "#fff" },
  header: { display: "flex", justifyContent: "space-between", gap: 16, padding: "18px 18px 14px", borderBottom: "1px solid rgba(255,255,255,0.08)" },
  title: { margin: 0, fontSize: 22, fontWeight: 800 },
  subTitle: { margin: "6px 0 0", color: "rgba(255,255,255,0.72)", fontSize: 13, lineHeight: 1.6 },
  iconButton: { width: 36, height: 36, borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 },
  body: { display: "grid", gridTemplateColumns: "minmax(0, 1.45fr) minmax(320px, 0.95fr)", gap: 16, padding: 16, maxHeight: "calc(100vh - 110px)", overflow: "auto" },
  leftColumn: { display: "flex", flexDirection: "column", gap: 12 },
  rightColumn: { display: "flex", flexDirection: "column", gap: 12 },
  videoBox: { position: "relative", minHeight: 320, borderRadius: 18, overflow: "hidden", border: "1px solid rgba(82,115,214,0.34)", background: "#04070f" },
  videoLayer: { position: "relative", cursor: "crosshair" },
  video: { width: "100%", height: "auto", display: "block", background: "#04070f" },
  overlaySvg: { position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" },
  videoMask: { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(4,7,15,0.78)", color: "#fff", fontSize: 15, textAlign: "center", padding: 24, lineHeight: 1.6 },
  cameraErrorBox: { display: "flex", flexDirection: "column", alignItems: "center", gap: 12, maxWidth: 280 },
  cameraRetryButton: { minWidth: 140 },
  tipText: { borderRadius: 14, padding: "12px 14px", background: "rgba(45,224,255,0.08)", border: "1px solid rgba(45,224,255,0.22)", color: "#fff", fontSize: 13, lineHeight: 1.5 },
  tipTextGood: { background: "rgba(64,214,182,0.14)", border: "1px solid rgba(64,214,182,0.28)", color: "#baffea" },
  tipTextCaution: { background: "rgba(255,193,92,0.14)", border: "1px solid rgba(255,193,92,0.26)", color: "#ffe0a8" },
  tipTextWarn: { background: "rgba(255,108,122,0.14)", border: "1px solid rgba(255,108,122,0.26)", color: "#ffd1cb" },
  buttonRow: { display: "flex", flexWrap: "wrap", gap: 10 },
  primaryButton: { minWidth: 108, padding: "11px 16px", borderRadius: 12, border: "1px solid rgba(45,224,255,0.4)", background: "linear-gradient(135deg, rgba(38,186,255,0.95), rgba(106,112,255,0.95))", color: "#fff", fontWeight: 700, cursor: "pointer" },
  secondaryButton: { minWidth: 108, padding: "11px 16px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "#fff", fontWeight: 600, cursor: "pointer" },
  disabledButton: { opacity: 0.55, cursor: "not-allowed" },
  panel: { borderRadius: 18, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", padding: 14, display: "flex", flexDirection: "column", gap: 12 },
  panelTitle: { fontSize: 18, fontWeight: 800 },
  boardTabs: { display: "flex", flexWrap: "wrap", gap: 8 },
  boardTab: { padding: "8px 12px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.85)", cursor: "pointer" },
  boardTabActive: { background: "rgba(45,224,255,0.16)", border: "1px solid rgba(45,224,255,0.34)" },
  boardSwitchNotice: {
    borderRadius: 12,
    padding: "8px 12px",
    background: "rgba(64,214,182,0.14)",
    border: "1px solid rgba(64,214,182,0.28)",
    color: "#baffea",
    fontSize: 12,
    fontWeight: 700,
  },
  noticeRow: { marginTop: 10, marginBottom: 12, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" },
  noticeAction: {
    padding: "8px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    color: "#fff",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  },
  setupCard: {
    marginBottom: 12,
    borderRadius: 14,
    padding: 12,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  setupTitle: { fontSize: 14, fontWeight: 800, color: "#fff" },
  setupList: { display: "flex", flexDirection: "column", gap: 10 },
  setupItem: { display: "flex", gap: 10, alignItems: "flex-start" },
  setupIndex: {
    width: 24,
    height: 24,
    borderRadius: 999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    background: "rgba(255,255,255,0.08)",
    color: "rgba(255,255,255,0.78)",
    border: "1px solid rgba(255,255,255,0.1)",
    fontSize: 12,
    fontWeight: 800,
  },
  setupIndexActive: {
    background: "rgba(64, 170, 255, 0.16)",
    color: "#9fd3ff",
    border: "1px solid rgba(64, 170, 255, 0.32)",
  },
  setupIndexDone: {
    background: "rgba(64, 214, 182, 0.16)",
    color: "#baffea",
    border: "1px solid rgba(64, 214, 182, 0.3)",
  },
  setupContent: { display: "flex", flexDirection: "column", gap: 4, minWidth: 0, flex: 1 },
  setupHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 },
  setupBadge: {
    padding: "2px 8px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 700,
    color: "rgba(255,255,255,0.68)",
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.1)",
    flexShrink: 0,
  },
  setupBadgeActive: {
    color: "#9fd3ff",
    background: "rgba(64, 170, 255, 0.14)",
    border: "1px solid rgba(64, 170, 255, 0.24)",
  },
  setupBadgeDone: {
    color: "#baffea",
    background: "rgba(64, 214, 182, 0.14)",
    border: "1px solid rgba(64, 214, 182, 0.24)",
  },
  setupHint: { color: "rgba(255,255,255,0.68)", fontSize: 12, lineHeight: 1.5 },
  metaGrid: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 },
  metaCard: { borderRadius: 14, padding: "10px 12px", background: "rgba(8,12,24,0.55)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", gap: 6 },
  metaLabel: { color: "rgba(255,255,255,0.58)", fontSize: 12 },
  metaHint: { color: "rgba(255,255,255,0.54)", fontSize: 11 },
  metaHintStrong: { color: "#8cf5d8", fontSize: 11, fontWeight: 700 },
  inlineMeta: { display: "flex", alignItems: "center", gap: 8 },
  colorSwatch: { width: 18, height: 18, borderRadius: 6, border: "1px solid rgba(255,255,255,0.15)", flexShrink: 0 },
  range: { width: "100%", accentColor: "#2de0ff" },
  smallText: { margin: 0, color: "rgba(255,255,255,0.72)", fontSize: 12, lineHeight: 1.6 },
  warningText: { margin: 0, color: "#ffb9a8", fontSize: 12, lineHeight: 1.6 },
  qualityList: { display: "flex", flexWrap: "wrap", gap: 8 },
  qualityChip: { display: "inline-flex", alignItems: "center", padding: "5px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700, border: "1px solid transparent" },
  qualityChipGood: { color: "#baffea", background: "rgba(64, 214, 182, 0.14)", border: "1px solid rgba(64, 214, 182, 0.25)" },
  qualityChipWarn: { color: "#ffe0a8", background: "rgba(255, 193, 92, 0.14)", border: "1px solid rgba(255, 193, 92, 0.25)" },
  qualityChipPoor: { color: "#ffd1cb", background: "rgba(255, 108, 122, 0.14)", border: "1px solid rgba(255, 108, 122, 0.25)" },
  progressCard: { borderRadius: 14, padding: 12, background: "rgba(45,224,255,0.08)", border: "1px solid rgba(45,224,255,0.18)" },
  progressValue: { fontSize: 30, fontWeight: 900, lineHeight: 1 },
  summaryCard: { display: "flex", flexDirection: "column", gap: 10 },
  summaryHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 },
  summaryBadgeRow: { display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: 6 },
  summaryBadge: { padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700, color: "#9fd3ff", background: "rgba(64,170,255,0.14)", border: "1px solid rgba(64,170,255,0.24)" },
  summaryBadgeWarn: { padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700, color: "#ffe0a8", background: "rgba(255,193,92,0.14)", border: "1px solid rgba(255,193,92,0.24)" },
  summaryMeta: { display: "flex", flexDirection: "column", gap: 6 },
  activeCard: { borderRadius: 14, padding: 12, background: "rgba(14,18,34,0.75)", border: "1px solid rgba(45,224,255,0.18)", display: "flex", flexDirection: "column", gap: 8 },
  guideCard: { borderRadius: 14, padding: 12, background: "rgba(74, 133, 255, 0.12)", border: "1px solid rgba(74, 133, 255, 0.24)", display: "flex", flexDirection: "column", gap: 6 },
  warningCard: { borderRadius: 14, padding: 12, background: "rgba(255, 108, 122, 0.1)", border: "1px solid rgba(255, 108, 122, 0.22)", display: "flex", flexDirection: "column", gap: 8 },
  warningSummaryList: { display: "flex", flexDirection: "column", gap: 6 },
  warningSummaryItem: { display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 10px", borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)" },
  warningSummaryIndex: { minWidth: 18, height: 18, borderRadius: 999, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "rgba(255, 108, 122, 0.2)", color: "#ffd3d8", fontSize: 11, fontWeight: 800, marginTop: 1 },
  warningSummaryText: { color: "rgba(255,255,255,0.82)", fontSize: 12, lineHeight: 1.5 },
  guideTitle: { fontSize: 14, fontWeight: 800, color: "#fff" },
  guideHeadline: { fontSize: 18, fontWeight: 800, color: "#fff" },
  warningList: { display: "flex", flexDirection: "column", gap: 8 },
  warningItem: { borderRadius: 12, padding: "10px 12px", background: "rgba(9,12,22,0.42)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", gap: 4 },
  warningHeadline: { fontSize: 14, fontWeight: 700, color: "#fff" },
  legendRow: { display: "flex", flexWrap: "wrap", gap: 10, color: "rgba(255,255,255,0.72)", fontSize: 12 },
  colorList: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 },
  colorChip: { display: "flex", alignItems: "center", gap: 8, padding: "9px 10px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", color: "#fff", cursor: "pointer" },
  colorChipActive: { background: "rgba(45,224,255,0.16)", border: "1px solid rgba(45,224,255,0.34)" },
  growRight: { marginLeft: "auto", color: "rgba(255,255,255,0.72)", fontSize: 12, fontWeight: 700 },
};

export default BoardVisionAssistModal;

