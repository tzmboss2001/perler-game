import React, { useEffect, useMemo, useRef, useState } from "react";
import { X } from "@phosphor-icons/react";
import type { BeadPixelData } from "../services/colorMatchService";
import { createPhotoProgressPreview } from "../services/photoProgressService.js";
import {
  VisionPoint,
  VisionRgb,
  analyzeVisionProgress,
  splitBeadDataIntoBoards,
} from "../services/visionAssistService";

export type PhotoProgressSyncStep =
  | "upload"
  | "corners"
  | "empty-reference"
  | "preview"
  | "error";

interface PhotoProgressSyncModalProps {
  visible: boolean;
  onClose: () => void;
  beadData: BeadPixelData;
  boardSize: number;
  initialBoardIndex?: number;
}

interface PhotoProgressPreviewCell {
  x: number;
  y: number;
  index: number;
  state: "done_candidate" | "suspected_wrong" | "low_confidence" | "pending";
  confidence: number;
  targetColorId: string | null;
  detectedColorId: string | null;
  confidenceReasons: string[];
}

interface PhotoProgressPreview {
  boardNumber: number;
  boardSize: number;
  usedWidth: number;
  usedHeight: number;
  qualityLevel: "good" | "warning" | "poor";
  qualityIssues: string[];
  cells: PhotoProgressPreviewCell[];
  summary: {
    doneCandidateCount: number;
    suspectedWrongCount: number;
    lowConfidenceCount: number;
    pendingCount: number;
  };
}

const CORNER_LABELS = ["左上", "右上", "右下", "左下"];
const DEFAULT_TOLERANCE = 42;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const getQualityLabel = (qualityLevel?: PhotoProgressPreview["qualityLevel"]) => {
  switch (qualityLevel) {
    case "good":
      return "较好";
    case "warning":
      return "需复核";
    case "poor":
      return "较低";
    default:
      return "待识别";
  }
};

const getStepTitle = (
  step: PhotoProgressSyncStep,
  corners: VisionPoint[],
  emptyReferenceRgb: VisionRgb | null,
) => {
  if (step === "upload") {
    return "上传今天拼好的实物照片";
  }
  if (step === "corners") {
    if (corners.length < 4) {
      return `请点击拼豆板${CORNER_LABELS[corners.length]}角`;
    }
    return "四角已记录，可继续微调或进入空孔取样";
  }
  if (step === "empty-reference" && !emptyReferenceRgb) {
    return "请点击一个空孔，作为未放豆的参考色";
  }
  if (step === "preview") {
    return "识别预览，不会自动保存进度";
  }
  if (step === "error") {
    return "识别准备失败";
  }
  return "准备识别预览";
};

const getImagePoint = (
  event: React.MouseEvent<HTMLImageElement>,
  image: HTMLImageElement,
): VisionPoint | null => {
  const rect = image.getBoundingClientRect();
  if (!rect.width || !rect.height || !image.naturalWidth || !image.naturalHeight) {
    return null;
  }

  return {
    x: ((event.clientX - rect.left) / rect.width) * image.naturalWidth,
    y: ((event.clientY - rect.top) / rect.height) * image.naturalHeight,
  };
};

const sampleCanvasRgb = (
  canvas: HTMLCanvasElement,
  point: VisionPoint,
  radius = 2,
): VisionRgb => {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context || !canvas.width || !canvas.height) {
    return [255, 255, 255];
  }

  const x = clamp(Math.round(point.x), 0, canvas.width - 1);
  const y = clamp(Math.round(point.y), 0, canvas.height - 1);
  const left = clamp(x - radius, 0, canvas.width - 1);
  const top = clamp(y - radius, 0, canvas.height - 1);
  const width = clamp(radius * 2 + 1, 1, canvas.width - left);
  const height = clamp(radius * 2 + 1, 1, canvas.height - top);
  const data = context.getImageData(left, top, width, height).data;
  let red = 0;
  let green = 0;
  let blue = 0;
  let count = 0;

  for (let index = 0; index < data.length; index += 4) {
    red += data[index];
    green += data[index + 1];
    blue += data[index + 2];
    count += 1;
  }

  if (!count) {
    return [255, 255, 255];
  }

  return [
    Math.round(red / count),
    Math.round(green / count),
    Math.round(blue / count),
  ];
};

const getCellStyle = (state: PhotoProgressPreviewCell["state"]) => {
  switch (state) {
    case "done_candidate":
      return {
        background: "rgba(70, 206, 143, 0.74)",
        borderColor: "rgba(38, 154, 106, 0.72)",
      };
    case "suspected_wrong":
      return {
        background: "rgba(255, 104, 120, 0.82)",
        borderColor: "rgba(205, 48, 69, 0.78)",
      };
    case "low_confidence":
      return {
        background: "rgba(255, 193, 86, 0.78)",
        borderColor: "rgba(206, 132, 18, 0.72)",
      };
    default:
      return {
        background: "rgba(255, 255, 255, 0.34)",
        borderColor: "rgba(124, 112, 146, 0.2)",
      };
  }
};

const PhotoProgressSyncModal = ({
  visible,
  onClose,
  beadData,
  boardSize,
  initialBoardIndex = 0,
}: PhotoProgressSyncModalProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const boards = useMemo(
    () => splitBeadDataIntoBoards(beadData, boardSize),
    [beadData, boardSize],
  );
  const [selectedBoardIndex, setSelectedBoardIndex] = useState(initialBoardIndex);
  const selectedBoard = boards[selectedBoardIndex] || boards[0] || null;
  const [step, setStep] = useState<PhotoProgressSyncStep>("upload");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [corners, setCorners] = useState<VisionPoint[]>([]);
  const [activeCornerIndex, setActiveCornerIndex] = useState(0);
  const [emptyReferenceRgb, setEmptyReferenceRgb] = useState<VisionRgb | null>(
    null,
  );
  const [emptyPoint, setEmptyPoint] = useState<VisionPoint | null>(null);
  const [preview, setPreview] = useState<PhotoProgressPreview | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setSelectedBoardIndex(clamp(initialBoardIndex, 0, Math.max(boards.length - 1, 0)));
  }, [boards.length, initialBoardIndex, visible]);

  useEffect(
    () => () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    },
    [],
  );

  if (!visible) {
    return null;
  }

  const resetImageState = () => {
    setStep("upload");
    setImageUrl(null);
    setImageSize({ width: 0, height: 0 });
    setCorners([]);
    setActiveCornerIndex(0);
    setEmptyReferenceRgb(null);
    setEmptyPoint(null);
    setPreview(null);
    setErrorText(null);
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  };

  const drawImageToCanvas = (image: HTMLImageElement) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { willReadFrequently: true });
    if (!canvas || !context || !image.naturalWidth || !image.naturalHeight) {
      setErrorText("图片读取失败，请换一张清晰照片。");
      setStep("error");
      return;
    }

    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    setImageSize({ width: canvas.width, height: canvas.height });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }

    const nextUrl = URL.createObjectURL(file);
    objectUrlRef.current = nextUrl;
    setImageUrl(nextUrl);
    setStep("corners");
    setCorners([]);
    setActiveCornerIndex(0);
    setEmptyReferenceRgb(null);
    setEmptyPoint(null);
    setPreview(null);
    setErrorText(null);
  };

  const updateCorner = (point: VisionPoint) => {
    setCorners((previous) => {
      if (previous.length < 4) {
        const next = [...previous, point];
        setActiveCornerIndex(clamp(next.length, 0, 3));
        if (next.length === 4) {
          setStep("empty-reference");
          setActiveCornerIndex(0);
        }
        return next;
      }

      const next = [...previous];
      next[activeCornerIndex] = point;
      setActiveCornerIndex((activeCornerIndex + 1) % 4);
      return next;
    });
    setPreview(null);
  };

  const handleImageClick = (event: React.MouseEvent<HTMLImageElement>) => {
    const image = imageRef.current;
    if (!image) {
      return;
    }

    const point = getImagePoint(event, image);
    if (!point) {
      return;
    }

    if (step === "corners") {
      updateCorner(point);
      return;
    }

    if (step === "empty-reference") {
      const canvas = canvasRef.current;
      if (!canvas) {
        setErrorText("照片尚未进入识别画布，请重新上传。");
        setStep("error");
        return;
      }

      setEmptyPoint(point);
      setEmptyReferenceRgb(sampleCanvasRgb(canvas, point));
      setPreview(null);
    }
  };

  const runPreview = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { willReadFrequently: true });
    if (!canvas || !context || !selectedBoard) {
      setErrorText("缺少当前板或照片数据，暂时无法识别。");
      setStep("error");
      return;
    }

    if (corners.length !== 4 || !emptyReferenceRgb) {
      setErrorText("请先完成四角校准和空孔取样。");
      setStep(corners.length === 4 ? "empty-reference" : "corners");
      return;
    }

    const frame = context.getImageData(0, 0, canvas.width, canvas.height);
    const detection = analyzeVisionProgress({
      frameData: frame.data,
      frameWidth: canvas.width,
      frameHeight: canvas.height,
      boardTile: selectedBoard,
      corners: corners as [VisionPoint, VisionPoint, VisionPoint, VisionPoint],
      emptyReferenceRgb,
      tolerance: DEFAULT_TOLERANCE,
    });
    const nextPreview = createPhotoProgressPreview({
      boardNumber: selectedBoard.index + 1,
      boardSize: selectedBoard.boardSize,
      usedWidth: selectedBoard.usedWidth,
      usedHeight: selectedBoard.usedHeight,
      detection,
      hasEmptyReference: true,
      createdAt: Date.now(),
    }) as PhotoProgressPreview;

    setPreview(nextPreview);
    setErrorText(null);
    setStep("preview");
  };

  const pointToPercent = (point: VisionPoint) => ({
    left: `${(point.x / Math.max(imageSize.width, 1)) * 100}%`,
    top: `${(point.y / Math.max(imageSize.height, 1)) * 100}%`,
  });

  const canPreview = corners.length === 4 && Boolean(emptyReferenceRgb);

  return (
    <div style={styles.backdrop} role="dialog" aria-modal="true">
      <div style={styles.sheet}>
        <div style={styles.header}>
          <div>
            <div style={styles.kicker}>拍照同步进度 · Phase1-B</div>
            <h2 style={styles.title}>拍照同步</h2>
          </div>
          <button style={styles.closeButton} onClick={onClose} aria-label="关闭拍照同步">
            <X size={20} />
          </button>
        </div>

        <div style={styles.boardBar}>
          <button
            style={styles.smallButton}
            disabled={selectedBoardIndex <= 0}
            onClick={() => setSelectedBoardIndex((value) => clamp(value - 1, 0, boards.length - 1))}
          >
            上一板
          </button>
          <div style={styles.boardText}>
            当前板：板 {selectedBoard ? selectedBoard.index + 1 : 0} / {boards.length || 0}
            <span style={styles.boardSubText}>只识别当前板，不自动匹配其它板</span>
          </div>
          <button
            style={styles.smallButton}
            disabled={selectedBoardIndex >= boards.length - 1}
            onClick={() => setSelectedBoardIndex((value) => clamp(value + 1, 0, boards.length - 1))}
          >
            下一板
          </button>
        </div>

        <div style={styles.stepCard}>
          <strong>{getStepTitle(step, corners, emptyReferenceRgb)}</strong>
          <span>
            本阶段只生成识别预览，不保存制作进度；疑似错误、未识别和低可信区域会保留给你人工判断。
          </span>
        </div>

        <div style={styles.content}>
          <div style={styles.photoPanel}>
            {!imageUrl ? (
              <label style={styles.uploadBox}>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  style={styles.fileInput}
                  onChange={handleFileChange}
                />
                <span style={styles.uploadTitle}>选择或拍摄当前板照片</span>
                <span style={styles.uploadHint}>
                  建议让整块板进入画面，避开强反光，后面手动点四角校准。
                </span>
              </label>
            ) : (
              <div style={styles.imageWrap}>
                <img
                  ref={imageRef}
                  src={imageUrl}
                  alt="待识别的实物拼豆照片"
                  style={styles.image}
                  onLoad={(event) => drawImageToCanvas(event.currentTarget)}
                  onClick={handleImageClick}
                />
                {corners.map((point, index) => (
                  <button
                    key={`${point.x}-${point.y}-${index}`}
                    style={{
                      ...styles.cornerMarker,
                      ...pointToPercent(point),
                      ...(index === activeCornerIndex && step === "corners"
                        ? styles.cornerMarkerActive
                        : {}),
                    }}
                    onClick={(event) => {
                      event.stopPropagation();
                      setActiveCornerIndex(index);
                      setStep("corners");
                    }}
                    aria-label={`调整${CORNER_LABELS[index]}角`}
                  >
                    {index + 1}
                  </button>
                ))}
                {emptyPoint && (
                  <div style={{ ...styles.emptyMarker, ...pointToPercent(emptyPoint) }}>
                    空
                  </div>
                )}
              </div>
            )}
            <canvas ref={canvasRef} style={styles.hiddenCanvas} />
          </div>

          <div style={styles.sidePanel}>
            <div style={styles.sectionTitle}>校准步骤</div>
            <ol style={styles.steps}>
              <li style={corners.length >= 4 ? styles.stepDone : undefined}>
                点选四个板角：{corners.length}/4
              </li>
              <li style={emptyReferenceRgb ? styles.stepDone : undefined}>
                点击一个空孔取样
              </li>
              <li style={preview ? styles.stepDone : undefined}>
                生成识别预览
              </li>
            </ol>

            <div style={styles.controls}>
              <button
                style={styles.secondaryButton}
                disabled={!imageUrl}
                onClick={() => {
                  setStep("corners");
                  setActiveCornerIndex(0);
                }}
              >
                调整四角
              </button>
              <button
                style={styles.secondaryButton}
                disabled={!corners.length}
                onClick={() => {
                  setCorners((value) => value.slice(0, -1));
                  setPreview(null);
                  setStep("corners");
                }}
              >
                撤销点位
              </button>
              <button
                style={styles.secondaryButton}
                disabled={corners.length !== 4}
                onClick={() => setStep("empty-reference")}
              >
                重取空孔
              </button>
              <button
                style={styles.primaryButton}
                disabled={!canPreview}
                onClick={runPreview}
              >
                生成预览
              </button>
            </div>

            {emptyReferenceRgb && (
              <div style={styles.referenceChip}>
                <span
                  style={{
                    ...styles.referenceSwatch,
                    background: `rgb(${emptyReferenceRgb[0]}, ${emptyReferenceRgb[1]}, ${emptyReferenceRgb[2]})`,
                  }}
                />
                空孔参考：{emptyReferenceRgb.join(", ")}
              </div>
            )}

            {errorText && <div style={styles.errorBox}>{errorText}</div>}

            {preview && (
              <div style={styles.previewPanel}>
                <div style={styles.sectionTitle}>识别预览</div>
                <div style={styles.summaryGrid}>
                  <div>
                    <strong>{preview.summary.doneCandidateCount}</strong>
                    <span>候选完成</span>
                  </div>
                  <div>
                    <strong>{preview.summary.suspectedWrongCount}</strong>
                    <span>疑似错误</span>
                  </div>
                  <div>
                    <strong>{preview.summary.lowConfidenceCount}</strong>
                    <span>低可信</span>
                  </div>
                  <div>
                    <strong>{preview.summary.pendingCount}</strong>
                    <span>未完成</span>
                  </div>
                </div>
                <div style={styles.qualityLine}>
                  识别质量：{getQualityLabel(preview.qualityLevel)}
                  {preview.qualityIssues.length > 0
                    ? ` · ${preview.qualityIssues.slice(0, 2).join(" / ")}`
                    : ""}
                </div>
                <div
                  style={{
                    ...styles.previewGrid,
                    gridTemplateColumns: `repeat(${Math.max(preview.usedWidth, 1)}, minmax(3px, 1fr))`,
                    gridTemplateRows: `repeat(${Math.max(preview.usedHeight, 1)}, minmax(3px, 1fr))`,
                  }}
                  aria-label="格级识别预览"
                >
                  {preview.cells
                    .filter((cell) => cell.x < preview.usedWidth && cell.y < preview.usedHeight)
                    .map((cell) => (
                      <div
                        key={cell.index}
                        aria-hidden="true"
                        style={{
                          ...styles.previewCell,
                          ...getCellStyle(cell.state),
                          gridColumn: cell.x + 1,
                          gridRow: cell.y + 1,
                        }}
                      />
                    ))}
                </div>
                <div style={styles.legend}>
                  <span><i style={styles.doneDot} />候选完成</span>
                  <span><i style={styles.wrongDot} />疑似错误</span>
                  <span><i style={styles.lowDot} />低可信</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={styles.footer}>
          <button style={styles.secondaryButton} onClick={resetImageState}>
            重新上传
          </button>
          <button style={styles.secondaryButton} onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 1900,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "14px",
    background: "rgba(36, 29, 55, 0.54)",
    backdropFilter: "blur(10px)",
  },
  sheet: {
    width: "min(960px, 100%)",
    maxHeight: "min(92vh, 820px)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    borderRadius: "24px",
    background:
      "linear-gradient(145deg, rgba(255,255,255,0.98), rgba(255,248,241,0.96))",
    border: "1px solid rgba(255, 188, 161, 0.48)",
    boxShadow: "0 28px 80px rgba(44, 34, 70, 0.32)",
    color: "#463f5f",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    padding: "18px 20px 12px",
  },
  kicker: {
    fontSize: "12px",
    fontWeight: 800,
    color: "#77bff0",
    letterSpacing: "0.08em",
  },
  title: {
    margin: "3px 0 0",
    fontSize: "22px",
    lineHeight: 1.2,
  },
  closeButton: {
    width: "38px",
    height: "38px",
    border: "1px solid rgba(255, 188, 161, 0.45)",
    borderRadius: "14px",
    background: "rgba(255,255,255,0.88)",
    color: "#5c5274",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  boardBar: {
    margin: "0 18px 10px",
    padding: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
    borderRadius: "18px",
    background: "rgba(245, 250, 255, 0.82)",
    border: "1px solid rgba(118, 198, 239, 0.28)",
  },
  boardText: {
    flex: 1,
    textAlign: "center",
    fontWeight: 900,
    fontSize: "14px",
  },
  boardSubText: {
    display: "block",
    marginTop: "2px",
    fontSize: "11px",
    fontWeight: 700,
    color: "#8d82a0",
  },
  stepCard: {
    margin: "0 18px 12px",
    padding: "12px 14px",
    borderRadius: "18px",
    display: "grid",
    gap: "4px",
    background: "rgba(255,255,255,0.86)",
    border: "1px solid rgba(255, 188, 161, 0.38)",
    fontSize: "13px",
  },
  content: {
    minHeight: 0,
    flex: 1,
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.2fr) minmax(280px, 0.8fr)",
    gap: "14px",
    padding: "0 18px 14px",
    overflow: "auto",
  },
  photoPanel: {
    minHeight: "320px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "20px",
    border: "1px dashed rgba(118, 198, 239, 0.48)",
    background: "rgba(255,255,255,0.6)",
    overflow: "hidden",
  },
  uploadBox: {
    width: "100%",
    minHeight: "320px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    padding: "28px",
    textAlign: "center",
    cursor: "pointer",
  },
  fileInput: {
    width: 0,
    height: 0,
    opacity: 0,
    position: "absolute",
    pointerEvents: "none",
  },
  uploadTitle: {
    padding: "13px 18px",
    borderRadius: "999px",
    background: "linear-gradient(135deg, #77d8f7, #f39bd1)",
    color: "#fff",
    fontWeight: 900,
    boxShadow: "0 10px 26px rgba(119, 216, 247, 0.28)",
  },
  uploadHint: {
    maxWidth: "360px",
    color: "#80738f",
    fontSize: "13px",
    lineHeight: 1.6,
  },
  imageWrap: {
    position: "relative",
    width: "100%",
    maxHeight: "62vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "linear-gradient(45deg, rgba(255,255,255,0.7), rgba(245,250,255,0.78))",
  },
  image: {
    display: "block",
    maxWidth: "100%",
    maxHeight: "62vh",
    objectFit: "contain",
    cursor: "crosshair",
  },
  hiddenCanvas: {
    display: "none",
  },
  cornerMarker: {
    position: "absolute",
    width: "28px",
    height: "28px",
    transform: "translate(-50%, -50%)",
    borderRadius: "50%",
    border: "2px solid #fff",
    background: "#3f365b",
    color: "#fff",
    fontSize: "12px",
    fontWeight: 900,
    boxShadow: "0 6px 18px rgba(0,0,0,0.24)",
  },
  cornerMarkerActive: {
    background: "#46c8f3",
    boxShadow: "0 0 0 4px rgba(70, 200, 243, 0.26)",
  },
  emptyMarker: {
    position: "absolute",
    padding: "4px 7px",
    transform: "translate(-50%, -50%)",
    borderRadius: "999px",
    background: "rgba(255,255,255,0.9)",
    border: "1px solid rgba(78, 68, 99, 0.2)",
    color: "#4b3f5f",
    fontSize: "11px",
    fontWeight: 900,
  },
  sidePanel: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    minWidth: 0,
  },
  sectionTitle: {
    fontSize: "13px",
    fontWeight: 900,
    color: "#4b3f5f",
  },
  steps: {
    margin: 0,
    padding: "0 0 0 20px",
    color: "#837691",
    fontSize: "13px",
    lineHeight: 1.8,
  },
  stepDone: {
    color: "#2f9b72",
    fontWeight: 900,
  },
  controls: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "8px",
  },
  smallButton: {
    border: "1px solid rgba(255, 188, 161, 0.48)",
    borderRadius: "999px",
    padding: "8px 11px",
    background: "rgba(255,255,255,0.88)",
    color: "#5f5573",
    fontWeight: 900,
  },
  secondaryButton: {
    border: "1px solid rgba(255, 188, 161, 0.48)",
    borderRadius: "13px",
    padding: "10px 12px",
    background: "rgba(255,255,255,0.9)",
    color: "#5f5573",
    fontWeight: 900,
  },
  primaryButton: {
    border: "0",
    borderRadius: "13px",
    padding: "10px 12px",
    background: "linear-gradient(135deg, #77d8f7, #f39bd1)",
    color: "#fff",
    fontWeight: 900,
    boxShadow: "0 10px 26px rgba(119, 216, 247, 0.28)",
  },
  referenceChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    width: "fit-content",
    padding: "8px 10px",
    borderRadius: "999px",
    background: "rgba(255,255,255,0.88)",
    border: "1px solid rgba(255, 188, 161, 0.34)",
    fontSize: "12px",
    fontWeight: 800,
  },
  referenceSwatch: {
    width: "18px",
    height: "18px",
    borderRadius: "50%",
    border: "1px solid rgba(65, 55, 86, 0.18)",
  },
  errorBox: {
    padding: "10px 12px",
    borderRadius: "14px",
    background: "rgba(255, 104, 120, 0.12)",
    border: "1px solid rgba(255, 104, 120, 0.34)",
    color: "#a43d4b",
    fontSize: "13px",
    fontWeight: 800,
  },
  previewPanel: {
    display: "grid",
    gap: "10px",
    padding: "12px",
    borderRadius: "18px",
    background: "rgba(255,255,255,0.88)",
    border: "1px solid rgba(255, 188, 161, 0.34)",
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "6px",
  },
  qualityLine: {
    fontSize: "12px",
    fontWeight: 800,
    color: "#837691",
  },
  previewGrid: {
    display: "grid",
    width: "100%",
    aspectRatio: "1 / 1",
    gap: "1px",
    padding: "6px",
    borderRadius: "12px",
    background: "rgba(73, 64, 94, 0.08)",
    overflow: "hidden",
  },
  previewCell: {
    minWidth: 0,
    minHeight: 0,
    borderStyle: "solid",
    borderWidth: "1px",
    borderRadius: "2px",
  },
  legend: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    fontSize: "11px",
    fontWeight: 800,
    color: "#837691",
  },
  doneDot: {
    display: "inline-block",
    width: "9px",
    height: "9px",
    marginRight: "4px",
    borderRadius: "50%",
    background: "rgba(70, 206, 143, 0.9)",
  },
  wrongDot: {
    display: "inline-block",
    width: "9px",
    height: "9px",
    marginRight: "4px",
    borderRadius: "50%",
    background: "rgba(255, 104, 120, 0.9)",
  },
  lowDot: {
    display: "inline-block",
    width: "9px",
    height: "9px",
    marginRight: "4px",
    borderRadius: "50%",
    background: "rgba(255, 193, 86, 0.95)",
  },
  footer: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    padding: "12px 18px 18px",
    borderTop: "1px solid rgba(255, 188, 161, 0.24)",
  },
};

export default PhotoProgressSyncModal;
