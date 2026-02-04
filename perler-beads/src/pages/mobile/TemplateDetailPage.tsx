import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Play, GridFour, Palette, Star, SpinnerGap, MagnifyingGlassPlus, MagnifyingGlassMinus, ArrowCounterClockwise } from '@phosphor-icons/react';
import { colors, radius, typography, shadows, animation, mixins } from '../../styles/designSystem';
import { templateApi, TemplateResponse } from '../../services/api/templateApi';
import { BeadPixelData, renderBeadsToCanvas } from '../../services/colorMatchService';
import { BeadColor } from '../../data/beadColors';
import { useToast } from '../../components/Toast';

/**
 * 模板详情页
 * 展示模板的高清图片（支持缩放）、基本信息、颜色预览
 * 点击"开始制作"进入制作模式
 */
const TemplateDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 状态
  const [template, setTemplate] = useState<TemplateResponse | null>(null);
  const [beadData, setBeadData] = useState<BeadPixelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Canvas 缩放状态
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const lastTouchRef = useRef<{ x: number; y: number } | null>(null);
  const lastPinchDistRef = useRef<number | null>(null);
  const pinchStartScale = useRef<number>(1);

  // 基础 cellSize
  const baseCellSize = 10;

  // 难度配置
  const difficultyConfig: Record<string, { label: string; color: string }> = {
    easy: { label: '简单', color: colors.bead.green },
    medium: { label: '中等', color: colors.bead.yellow },
    hard: { label: '困难', color: colors.bead.red },
  };

  // 加载模板详情
  useEffect(() => {
    const loadTemplate = async () => {
      if (!id) {
        setError('无效的模板ID');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await templateApi.getById(parseInt(id, 10));
        if (response.code === 0 && response.data) {
          setTemplate(response.data);
          // 解析 bead_data
          const parsed = parseBeadDataFn(response.data.bead_data);
          if (parsed) {
            setBeadData(parsed);
          }
        } else {
          setError(response.msg || '加载失败');
        }
      } catch (err) {
        console.error('加载模板详情失败:', err);
        setError('网络错误，请稍后重试');
      } finally {
        setLoading(false);
      }
    };

    // 解析函数
    const parseBeadDataFn = (data: Record<string, unknown>): BeadPixelData | null => {
      try {
        const d = data as {
          beads?: Array<{ brand: string; hex: string; id: string; name: string }>;
          width?: number;
          height?: number;
        };
        if (!d.beads || !Array.isArray(d.beads)) return null;
        const width = d.width || Math.sqrt(d.beads.length);
        const height = d.height || Math.sqrt(d.beads.length);
        const beads: BeadColor[] = d.beads.map((bead) => ({
          id: bead.id,
          name: bead.name,
          hex: bead.hex,
          brand: bead.brand as 'perler' | 'artkal' | 'hama' | 'other',
        }));
        return { width: Math.floor(width), height: Math.floor(height), beads };
      } catch {
        return null;
      }
    };

    loadTemplate();
  }, [id]);

  // 高清渲染的固定 cellSize
  const HD_CELL_SIZE = 8;

  // 计算适配容器的基础缩放比例
  const [baseScale, setBaseScale] = useState(1);

  // 渲染高清 Canvas（只在数据变化时渲染一次）
  useEffect(() => {
    if (!beadData || !canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;

    // 使用固定的较大 cellSize 渲染高清图像
    renderBeadsToCanvas(beadData, canvas, HD_CELL_SIZE, false, false, false);

    // 计算让 Canvas 适配容器的基础缩放比例
    const canvasWidth = beadData.width * HD_CELL_SIZE;
    const canvasHeight = beadData.height * HD_CELL_SIZE;
    const containerWidth = container.clientWidth - 32;
    const containerHeight = container.clientHeight - 32;
    const fitScaleW = containerWidth / canvasWidth;
    const fitScaleH = containerHeight / canvasHeight;
    const fitScale = Math.min(fitScaleW, fitScaleH, 1); // 不超过原始大小

    setBaseScale(fitScale);
  }, [beadData]);

  // 解析 bead_data 转换为 BeadPixelData 格式
  const parseBeadData = useCallback((beadData: Record<string, unknown>): BeadPixelData | null => {
    try {
      // bead_data 格式: { beads: [{brand, hex, id, name}, ...], width, height }
      const data = beadData as {
        beads?: Array<{ brand: string; hex: string; id: string; name: string }>;
        width?: number;
        height?: number;
      };

      if (!data.beads || !Array.isArray(data.beads)) {
        console.error('bead_data 格式错误: 缺少 beads 数组');
        return null;
      }

      const width = data.width || Math.sqrt(data.beads.length);
      const height = data.height || Math.sqrt(data.beads.length);

      const beads: BeadColor[] = data.beads.map((bead) => ({
        id: bead.id,
        name: bead.name,
        hex: bead.hex,
        brand: bead.brand as 'perler' | 'artkal' | 'hama' | 'other',
      }));

      return {
        width: Math.floor(width),
        height: Math.floor(height),
        beads,
      };
    } catch (err) {
      console.error('解析 bead_data 失败:', err);
      return null;
    }
  }, []);

  // 提取所有颜色（用于预览）
  const getAllColors = useCallback((): { hex: string; count: number; name: string; id: string }[] => {
    if (!template?.bead_data) return [];

    try {
      const data = template.bead_data as {
        beads?: Array<{ hex: string; name: string; id: string }>;
      };

      if (!data.beads) return [];

      // 统计颜色
      const colorMap = new Map<string, { count: number; name: string; id: string }>();
      data.beads.forEach((bead) => {
        const existing = colorMap.get(bead.hex);
        if (existing) {
          existing.count++;
        } else {
          colorMap.set(bead.hex, { count: 1, name: bead.name, id: bead.id });
        }
      });

      // 转换并排序
      const colorList = Array.from(colorMap.entries()).map(([hex, { count, name, id }]) => ({
        hex,
        count,
        name,
        id,
      }));
      colorList.sort((a, b) => b.count - a.count);

      // 返回所有颜色
      return colorList;
    } catch {
      return [];
    }
  }, [template]);

  // 缩放控制
  const handleZoomIn = useCallback(() => {
    setScale((prev) => {
      const newScale = Math.min(4, prev + 0.3);
      return Math.round(newScale * 10) / 10; // 避免浮点精度问题
    });
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale((prev) => {
      const newScale = Math.max(0.5, prev - 0.3);
      return Math.round(newScale * 10) / 10;
    });
  }, []);

  const handleReset = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  // 开始制作
  const handleStartMaking = useCallback(async () => {
    if (!template) return;

    setStarting(true);
    try {
      // 解析 bead_data
      const beadData = parseBeadData(template.bead_data);
      if (!beadData) {
        toast.error('模板数据解析失败');
        setStarting(false);
        return;
      }

      // 记录使用（可选，不阻塞流程）
      templateApi.useTemplate(template.id).catch(() => {
        // 忽略使用记录的错误
      });

      // 跳转到制作页面
      navigate('/mobile/making', {
        state: {
          beadData,
          colorCount: template.color_count,
        },
      });
    } catch (err) {
      console.error('开始制作失败:', err);
      toast.error('开始制作失败，请稍后重试');
      setStarting(false);
    }
  }, [template, parseBeadData, navigate, toast]);

  // 触摸拖动处理
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      const touch = e.touches[0];
      lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
    } else if (e.touches.length === 2) {
      // 双指缩放
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastPinchDistRef.current = Math.sqrt(dx * dx + dy * dy);
      pinchStartScale.current = scale;
    }
  }, [scale]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging && lastTouchRef.current) {
      const deltaX = e.touches[0].clientX - lastTouchRef.current.x;
      const deltaY = e.touches[0].clientY - lastTouchRef.current.y;

      setOffset((prev) => ({ x: prev.x + deltaX, y: prev.y + deltaY }));

      lastTouchRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    } else if (e.touches.length === 2 && lastPinchDistRef.current) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const scaleDelta = dist / lastPinchDistRef.current;
      const newScale = Math.min(4, Math.max(0.5, pinchStartScale.current * scaleDelta));

      setScale(newScale);
    }
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    lastTouchRef.current = null;
    lastPinchDistRef.current = null;
  }, []);

  // 鼠标滚轮缩放
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.2 : 0.2;
      setScale((prev) => Math.min(4, Math.max(0.5, prev + delta)));
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  // 双击重置缩放
  const handleDoubleClick = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  // 加载中
  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={() => navigate(-1)}>
            <ArrowLeft size={20} weight="bold" />
          </button>
          <h1 style={styles.title}>模板详情</h1>
          <div style={{ width: 40 }} />
        </div>
        <div style={styles.loadingContainer}>
          <SpinnerGap size={32} style={styles.spinner} />
          <p style={styles.loadingText}>加载中...</p>
        </div>
      </div>
    );
  }

  // 错误
  if (error || !template) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={() => navigate(-1)}>
            <ArrowLeft size={20} weight="bold" />
          </button>
          <h1 style={styles.title}>模板详情</h1>
          <div style={{ width: 40 }} />
        </div>
        <div style={styles.errorContainer}>
          <p style={styles.errorText}>{error || '模板不存在'}</p>
          <button style={styles.retryBtn} onClick={() => navigate(-1)}>
            返回
          </button>
        </div>
      </div>
    );
  }

  const allColors = getAllColors();
  const difficulty = difficultyConfig[template.difficulty] || difficultyConfig.medium;

  return (
    <div style={styles.container}>
      {/* 头部 */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate(-1)}>
          <ArrowLeft size={20} weight="bold" />
        </button>
        <h1 style={styles.title}>模板详情</h1>
        <div style={{ width: 40 }} />
      </div>

      {/* 内容区域 */}
      <div style={styles.content}>
        {/* Canvas 展示区 - 可缩放 */}
        <div
          ref={containerRef}
          style={styles.imageSection}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onDoubleClick={handleDoubleClick}
        >
          <div
            style={{
              ...styles.canvasWrapper,
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${baseScale * scale})`,
            }}
          >
            <canvas
              ref={canvasRef}
              style={styles.canvas}
            />
          </div>
          {/* 缩放提示 */}
          <div style={styles.zoomHint}>
            <span>双指缩放 · 拖动平移 · 双击重置</span>
          </div>
        </div>

        {/* 缩放控制条 - 移到画面外部 */}
        <div style={styles.zoomBar}>
          <button
            style={styles.zoomBtn}
            onClick={handleZoomOut}
          >
            <MagnifyingGlassMinus size={18} />
          </button>
          <div style={styles.zoomProgress}>
            <div
              style={{
                ...styles.zoomProgressFill,
                width: `${((scale - 0.5) / 3.5) * 100}%`,
              }}
            />
          </div>
          <span style={styles.zoomLabel}>{Math.round(scale * 100)}%</span>
          <button
            style={styles.zoomBtn}
            onClick={handleZoomIn}
          >
            <MagnifyingGlassPlus size={18} />
          </button>
          <button
            style={styles.resetBtn}
            onClick={handleReset}
          >
            <ArrowCounterClockwise size={16} />
            重置
          </button>
        </div>

        {/* 信息卡片 */}
        <div style={styles.infoSection}>
          {/* 标题和标签 */}
          <div style={styles.titleRow}>
            <h2 style={styles.templateName}>{template.name}</h2>
            <div style={styles.badges}>
              <span
                style={{
                  ...styles.badge,
                  background: `linear-gradient(145deg, ${difficulty.color}, ${difficulty.color}dd)`,
                }}
              >
                {difficulty.label}
              </span>
              {template.is_featured && (
                <span style={styles.officialBadge}>
                  <Star size={12} weight="fill" />
                  精选
                </span>
              )}
            </div>
          </div>

          {/* 基本信息 */}
          <div style={styles.infoCard}>
            <h3 style={styles.infoTitle}>
              <GridFour size={16} />
              基本信息
            </h3>
            <div style={styles.infoGrid}>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>网格尺寸</span>
                <span style={styles.infoValue}>{template.grid_width} × {template.grid_height}</span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>珠子数量</span>
                <span style={styles.infoValue}>{template.bead_count.toLocaleString()} 颗</span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>颜色种类</span>
                <span style={styles.infoValue}>{template.color_count} 种</span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>分类</span>
                <span style={styles.infoValue}>{template.category_name || '其他'}</span>
              </div>
            </div>
          </div>

          {/* 颜色预览 */}
          {allColors.length > 0 && (
            <div style={styles.colorCard}>
              <h3 style={styles.infoTitle}>
                <Palette size={16} />
                颜色统计
                <span style={styles.colorTotal}>共 {allColors.length} 种</span>
              </h3>
              <div style={styles.colorScrollArea}>
                <div style={styles.colorGrid}>
                  {allColors.map((color, index) => (
                    <div key={index} style={styles.colorItem}>
                      <div
                        style={{
                          ...styles.colorBlock,
                          backgroundColor: color.hex,
                        }}
                      >
                        <span style={styles.colorId}>{color.id}</span>
                      </div>
                      <span style={styles.colorCount}>{color.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 底部按钮 */}
      <div style={styles.bottomBar}>
        <button
          style={{
            ...styles.startBtn,
            ...(starting ? styles.startBtnDisabled : {}),
          }}
          onClick={handleStartMaking}
          disabled={starting}
        >
          {starting ? (
            <>
              <SpinnerGap size={20} style={styles.btnSpinner} />
              加载中...
            </>
          ) : (
            <>
              <Play size={20} weight="fill" />
              开始制作
            </>
          )}
        </button>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100dvh',
    display: 'flex',
    flexDirection: 'column',
    background: colors.bg.primary,
  },

  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 16px',
    background: colors.bg.secondary,
    borderBottom: `1px solid ${colors.border.soft}`,
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
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    margin: 0,
  },

  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'auto',
  },

  imageSection: {
    position: 'relative',
    width: '100%',
    height: '38vh',
    minHeight: '240px',
    maxHeight: '340px',
    background: '#1a1b2e',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    touchAction: 'none',
    cursor: 'grab',
  },

  canvasWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  canvas: {
    imageRendering: 'pixelated',
    borderRadius: radius.bead,
  },

  zoomHint: {
    position: 'absolute',
    bottom: '8px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    padding: '4px 10px',
    background: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(8px)',
    borderRadius: radius.full,
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: '10px',
  },

  zoomBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    background: colors.bg.secondary,
    borderBottom: `1px solid ${colors.border.soft}`,
  },

  zoomBtn: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: colors.bg.tertiary,
    border: `1px solid ${colors.border.soft}`,
    borderRadius: radius.bead,
    color: colors.text.secondary,
    cursor: 'pointer',
    transition: animation.transition.fast,
  },

  zoomProgress: {
    flex: 1,
    height: '4px',
    background: colors.bg.tertiary,
    borderRadius: radius.full,
    overflow: 'hidden',
  },

  zoomProgressFill: {
    height: '100%',
    background: `linear-gradient(90deg, ${colors.bead.cyan}, ${colors.bead.blue})`,
    borderRadius: radius.full,
    transition: 'width 0.2s ease',
  },

  zoomLabel: {
    minWidth: '40px',
    textAlign: 'center' as const,
    fontSize: '12px',
    fontWeight: 'bold',
    color: colors.text.primary,
  },

  resetBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 10px',
    background: colors.bg.tertiary,
    border: `1px solid ${colors.border.soft}`,
    borderRadius: radius.bead,
    color: colors.text.secondary,
    fontSize: '12px',
    cursor: 'pointer',
    transition: animation.transition.fast,
  },

  infoSection: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },

  titleRow: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '12px',
  },

  templateName: {
    flex: 1,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.primary,
    margin: 0,
    lineHeight: 1.3,
  },

  badges: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexShrink: 0,
  },

  badge: {
    padding: '4px 10px',
    borderRadius: radius.full,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: '#ffffff',
  },

  officialBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    borderRadius: radius.full,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: '#ffffff',
    background: `linear-gradient(145deg, ${colors.bead.purple}, ${colors.bead.blue})`,
  },

  infoCard: {
    background: colors.bg.card,
    borderRadius: radius.card,
    border: `1px solid ${colors.border.soft}`,
    padding: '14px',
  },

  infoTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.primary,
    margin: '0 0 12px',
  },

  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '10px',
  },

  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },

  infoLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
  },

  infoValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.secondary,
  },

  colorCard: {
    background: colors.bg.card,
    borderRadius: radius.card,
    border: `1px solid ${colors.border.soft}`,
    padding: '14px',
  },

  colorTotal: {
    marginLeft: 'auto',
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.normal,
    color: colors.text.muted,
  },

  colorScrollArea: {
    height: '120px',
    overflowY: 'auto',
    marginRight: '-8px',
    paddingRight: '8px',
  },

  colorGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '6px',
  },

  colorItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 6px',
    background: colors.bg.tertiary,
    borderRadius: radius.bead,
  },

  colorBlock: {
    width: '24px',
    height: '24px',
    borderRadius: '4px',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  colorId: {
    fontSize: '8px',
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.95)',
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.6)',
  },

  colorCount: {
    fontSize: '10px',
    color: colors.text.muted,
    flex: 1,
    textAlign: 'right' as const,
  },

  bottomBar: {
    padding: '12px 16px 24px',
    background: colors.bg.secondary,
    borderTop: `1px solid ${colors.border.soft}`,
    flexShrink: 0,
  },

  startBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '14px 24px',
    background: `linear-gradient(145deg, ${colors.bead.cyan}, ${colors.bead.blue})`,
    border: 'none',
    borderRadius: radius.button,
    color: '#ffffff',
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyAlt,
    cursor: 'pointer',
    boxShadow: shadows.button,
    transition: animation.transition.fast,
  },

  startBtnDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },

  btnSpinner: {
    animation: 'spin 1s linear infinite',
  },

  loadingContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
  },

  spinner: {
    color: colors.bead.cyan,
    animation: 'spin 1s linear infinite',
  },

  loadingText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.muted,
  },

  errorContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    padding: '40px',
  },

  errorText: {
    fontSize: typography.fontSize.md,
    color: colors.text.muted,
    textAlign: 'center',
  },

  retryBtn: {
    padding: '10px 24px',
    background: colors.bg.tertiary,
    border: `1px solid ${colors.border.soft}`,
    borderRadius: radius.button,
    color: colors.text.secondary,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    cursor: 'pointer',
  },
};

export default TemplateDetailPage;
