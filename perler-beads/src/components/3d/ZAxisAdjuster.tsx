/**
 * Z轴微调工具
 * 让用户可以调整每个像素的Z值，实时预览3D效果
 *
 * 功能：
 * - 点选模式：点击像素，用滑块调整Z值
 * - 画笔模式：选择+1/-1，在图上涂抹批量调整
 * - Z值范围：0~maxLayers（0=删除像素）
 * - 支持撤销/重做
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Layer, LayerBead } from '../../types/3d/voxel';
import { ArrowCounterClockwise, ArrowClockwise, FloppyDisk, X, Crosshair, PaintBrush, Plus, Minus } from '@phosphor-icons/react';

interface ZAxisAdjusterProps {
  layers: Layer[];
  maxLayers: number;
  onSave: (layers: Layer[]) => void;
  onClose: () => void;
}

// 深度像素数据
interface DepthPixel {
  x: number;
  y: number;
  z: number;
  color: string;
}

// 从layers提取深度数据
function layersToDepthMap(layers: Layer[]): Map<string, DepthPixel> {
  const depthMap = new Map<string, DepthPixel>();

  // 遍历所有层，记录每个像素的最大Z值
  layers.forEach(layer => {
    layer.beads.forEach(bead => {
      const key = `${bead.x},${bead.y}`;
      const existing = depthMap.get(key);
      if (!existing || layer.z > existing.z) {
        depthMap.set(key, {
          x: bead.x,
          y: bead.y,
          z: layer.z,
          color: bead.color,
        });
      }
    });
  });

  return depthMap;
}

// 从深度数据重建layers
function depthMapToLayers(depthMap: Map<string, DepthPixel>, maxLayers: number, width: number, height: number): Layer[] {
  const layersMap = new Map<number, LayerBead[]>();

  depthMap.forEach(pixel => {
    if (pixel.z > 0) {
      // 从第1层堆叠到目标层
      for (let layer = 1; layer <= pixel.z; layer++) {
        if (!layersMap.has(layer)) {
          layersMap.set(layer, []);
        }
        layersMap.get(layer)!.push({
          x: pixel.x,
          y: pixel.y,
          color: pixel.color,
          beadId: pixel.color,
        });
      }
    }
  });

  // 转换为Layer数组
  const layers: Layer[] = [];
  for (let z = 1; z <= maxLayers; z++) {
    const beads = layersMap.get(z) || [];
    if (beads.length > 0) {
      layers.push({ z, width, height, beads });
    }
  }

  return layers;
}

const ZAxisAdjuster: React.FC<ZAxisAdjusterProps> = ({ layers: initialLayers, maxLayers, onSave, onClose }) => {
  // 获取尺寸
  const width = initialLayers[0]?.width || 32;
  const height = initialLayers[0]?.height || 32;

  // 深度数据状态
  const [depthMap, setDepthMap] = useState<Map<string, DepthPixel>>(() => layersToDepthMap(initialLayers));

  // 历史记录（用于撤销/重做）
  const [history, setHistory] = useState<Map<string, DepthPixel>[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // 编辑模式
  const [mode, setMode] = useState<'select' | 'brush'>('select');
  const [brushDelta, setBrushDelta] = useState<1 | -1>(1); // +1 或 -1

  // 统一Z轴切割（减厚度）
  const [zCut, setZCut] = useState(0);

  // 选中的像素
  const [selectedPixel, setSelectedPixel] = useState<{ x: number; y: number } | null>(null);

  // 画布引用
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const threeDContainerRef = useRef<HTMLDivElement>(null);

  // Three.js 相关
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const meshesRef = useRef<THREE.InstancedMesh[]>([]);
  const highlightRef = useRef<THREE.Group | null>(null); // 高亮标记组

  // 是否正在拖动（画笔模式）
  const [isDragging, setIsDragging] = useState(false);

  // 计算当前layers（应用统一切割）
  const currentLayers = useMemo(() => {
    const baseLayers = depthMapToLayers(depthMap, maxLayers, width, height);
    if (zCut === 0) return baseLayers;

    // 应用统一切割
    const cutLayers: Layer[] = [];
    for (const layer of baseLayers) {
      const newZ = layer.z - zCut;
      if (newZ > 0) {
        cutLayers.push({ ...layer, z: newZ });
      }
    }
    return cutLayers;
  }, [depthMap, maxLayers, width, height, zCut]);

  // 计算原始层数（用于切割滑块最大值）
  const originalLayerCount = useMemo(() => {
    const baseLayers = depthMapToLayers(depthMap, maxLayers, width, height);
    return baseLayers.length;
  }, [depthMap, maxLayers, width, height]);

  // 保存到历史记录
  const saveToHistory = useCallback((newMap: Map<string, DepthPixel>) => {
    setHistory(prev => {
      // 截断当前位置之后的历史
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(new Map(newMap));
      // 最多保留20步
      if (newHistory.length > 20) {
        newHistory.shift();
        return newHistory;
      }
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, 19));
  }, [historyIndex]);

  // 撤销
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      setDepthMap(new Map(history[historyIndex - 1]));
    }
  }, [history, historyIndex]);

  // 重做
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
      setDepthMap(new Map(history[historyIndex + 1]));
    }
  }, [history, historyIndex]);

  // 修改像素Z值
  const updatePixelZ = useCallback((x: number, y: number, newZ: number) => {
    setDepthMap(prev => {
      const newMap = new Map(prev);
      const key = `${x},${y}`;
      const pixel = newMap.get(key);
      if (pixel) {
        if (newZ <= 0) {
          newMap.delete(key); // Z=0 删除像素
        } else {
          newMap.set(key, { ...pixel, z: Math.min(newZ, maxLayers) });
        }
      }
      saveToHistory(newMap);
      return newMap;
    });
  }, [maxLayers, saveToHistory]);

  // 画笔模式调整
  const applyBrush = useCallback((x: number, y: number) => {
    const key = `${x},${y}`;
    const pixel = depthMap.get(key);
    if (pixel) {
      const newZ = pixel.z + brushDelta;
      updatePixelZ(x, y, newZ);
    }
  }, [depthMap, brushDelta, updatePixelZ]);

  // 绘制2D深度图
  const draw2DDepthMap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cellSize = Math.min(
      (canvas.width - 20) / width,
      (canvas.height - 20) / height
    );
    const offsetX = (canvas.width - cellSize * width) / 2;
    const offsetY = (canvas.height - cellSize * height) / 2;

    // 清空画布
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 绘制像素
    depthMap.forEach(pixel => {
      const x = offsetX + pixel.x * cellSize;
      const y = offsetY + pixel.y * cellSize;

      // 绘制颜色
      ctx.fillStyle = pixel.color;
      ctx.fillRect(x, y, cellSize - 1, cellSize - 1);

      // 绘制深度提示（白色叠加，Z越大越亮）
      const alpha = (pixel.z / maxLayers) * 0.4;
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fillRect(x, y, cellSize - 1, cellSize - 1);

      // 显示Z值（仅当cellSize足够大时）
      if (cellSize >= 12) {
        ctx.fillStyle = pixel.z > maxLayers / 2 ? '#000' : '#fff';
        ctx.font = `${Math.max(8, cellSize * 0.4)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(pixel.z), x + cellSize / 2, y + cellSize / 2);
      }
    });

    // 绘制选中框
    if (selectedPixel) {
      const x = offsetX + selectedPixel.x * cellSize;
      const y = offsetY + selectedPixel.y * cellSize;
      ctx.strokeStyle = '#667eea';
      ctx.lineWidth = 3;
      ctx.strokeRect(x - 1, y - 1, cellSize + 1, cellSize + 1);
    }

    // 绘制网格线（仅当cellSize足够大时）
    if (cellSize >= 8) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 0.5;
      for (let i = 0; i <= width; i++) {
        ctx.beginPath();
        ctx.moveTo(offsetX + i * cellSize, offsetY);
        ctx.lineTo(offsetX + i * cellSize, offsetY + height * cellSize);
        ctx.stroke();
      }
      for (let i = 0; i <= height; i++) {
        ctx.beginPath();
        ctx.moveTo(offsetX, offsetY + i * cellSize);
        ctx.lineTo(offsetX + width * cellSize, offsetY + i * cellSize);
        ctx.stroke();
      }
    }
  }, [depthMap, width, height, maxLayers, selectedPixel]);

  // 处理画布点击
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    const cellSize = Math.min(
      (canvas.width - 20) / width,
      (canvas.height - 20) / height
    );
    const offsetX = (canvas.width - cellSize * width) / 2;
    const offsetY = (canvas.height - cellSize * height) / 2;

    const x = Math.floor((mouseX - offsetX) / cellSize);
    const y = Math.floor((mouseY - offsetY) / cellSize);

    if (x >= 0 && x < width && y >= 0 && y < height) {
      if (mode === 'select') {
        setSelectedPixel({ x, y });
      } else if (mode === 'brush') {
        applyBrush(x, y);
      }
    }
  }, [width, height, mode, applyBrush]);

  // 处理画布拖动（画笔模式）
  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || mode !== 'brush') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    const cellSize = Math.min(
      (canvas.width - 20) / width,
      (canvas.height - 20) / height
    );
    const offsetX = (canvas.width - cellSize * width) / 2;
    const offsetY = (canvas.height - cellSize * height) / 2;

    const x = Math.floor((mouseX - offsetX) / cellSize);
    const y = Math.floor((mouseY - offsetY) / cellSize);

    if (x >= 0 && x < width && y >= 0 && y < height) {
      applyBrush(x, y);
    }
  }, [isDragging, mode, width, height, applyBrush]);

  // 初始化2D画布
  useEffect(() => {
    draw2DDepthMap();
  }, [draw2DDepthMap]);

  // 初始化Three.js
  useEffect(() => {
    const container = threeDContainerRef.current;
    if (!container) return;

    const w = container.clientWidth;
    const h = container.clientHeight;

    // 创建场景
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    sceneRef.current = scene;

    // 创建相机
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);

    // 创建渲染器
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 创建控制器
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // 添加灯光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 100, 50);
    scene.add(directionalLight);

    // 添加底座
    const baseGeometry = new THREE.BoxGeometry(width + 4, 0.5, height + 4);
    const baseMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = -0.5;
    scene.add(base);

    // 设置相机位置
    const maxDimension = Math.max(width, height, maxLayers);
    camera.position.set(maxDimension * 1.5, maxDimension * 1.2, maxDimension * 1.5);
    camera.lookAt(0, maxLayers / 2, 0);
    controls.target.set(0, maxLayers / 2, 0);

    // 动画循环
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationId);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [width, height, maxLayers]);

  // 更新3D体素
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // 移除旧的体素
    meshesRef.current.forEach(mesh => {
      scene.remove(mesh);
      mesh.geometry.dispose();
      if (mesh.material instanceof THREE.Material) {
        mesh.material.dispose();
      }
    });
    meshesRef.current = [];

    if (currentLayers.length === 0) return;

    // 创建体素
    const voxelSize = 1;
    const gap = 0.05;
    const actualSize = voxelSize - gap;

    const colorGroups = new Map<string, THREE.Matrix4[]>();

    currentLayers.forEach((layer, idx) => {
      layer.beads.forEach(bead => {
        const color = bead.color;
        if (!colorGroups.has(color)) {
          colorGroups.set(color, []);
        }
        const matrix = new THREE.Matrix4();
        matrix.setPosition(
          bead.x - width / 2,
          idx * voxelSize,
          bead.y - height / 2
        );
        colorGroups.get(color)!.push(matrix);
      });
    });

    const geometry = new THREE.BoxGeometry(actualSize, actualSize, actualSize);

    colorGroups.forEach((matrices, color) => {
      const material = new THREE.MeshPhongMaterial({
        color: new THREE.Color(color),
        shininess: 30,
      });
      const mesh = new THREE.InstancedMesh(geometry, material, matrices.length);
      matrices.forEach((matrix, i) => {
        mesh.setMatrixAt(i, matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      scene.add(mesh);
      meshesRef.current.push(mesh);
    });

    geometry.dispose();
  }, [currentLayers, width, height]);

  // 更新3D高亮标记（与2D选中同步）
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // 移除旧的高亮
    if (highlightRef.current) {
      scene.remove(highlightRef.current);
      highlightRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
          child.geometry.dispose();
          if (child.material instanceof THREE.Material) {
            child.material.dispose();
          }
        }
      });
      highlightRef.current = null;
    }

    // 如果有选中的像素，创建高亮
    const pixelInfo = selectedPixel ? depthMap.get(`${selectedPixel.x},${selectedPixel.y}`) : null;
    if (selectedPixel && pixelInfo) {
      const group = new THREE.Group();
      const pixelZ = pixelInfo.z;

      // 计算位置
      const posX = selectedPixel.x - width / 2;
      const posZ = selectedPixel.y - height / 2;

      // 创建高亮线框（覆盖整个柱子高度）
      const boxHeight = pixelZ;
      const boxGeometry = new THREE.BoxGeometry(1.2, boxHeight, 1.2);
      const edges = new THREE.EdgesGeometry(boxGeometry);
      const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x00ff00,
        linewidth: 2,
      });
      const wireframe = new THREE.LineSegments(edges, lineMaterial);
      wireframe.position.set(posX, (boxHeight - 1) / 2, posZ);
      group.add(wireframe);

      // 创建顶部发光指示器
      const indicatorGeometry = new THREE.SphereGeometry(0.3, 16, 16);
      const indicatorMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        transparent: true,
        opacity: 0.8,
      });
      const indicator = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
      indicator.position.set(posX, pixelZ + 0.5, posZ);
      group.add(indicator);

      scene.add(group);
      highlightRef.current = group;
    }
  }, [selectedPixel, depthMap, width, height]);

  // 获取选中像素的信息
  const selectedPixelInfo = selectedPixel
    ? depthMap.get(`${selectedPixel.x},${selectedPixel.y}`)
    : null;

  // 保存
  const handleSave = () => {
    onSave(currentLayers);
    onClose();
  };

  // 计算体素数量
  const voxelCount = currentLayers.reduce((sum, layer) => sum + layer.beads.length, 0);

  const styles: Record<string, React.CSSProperties> = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: '#1a1a2e',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      padding: '12px 16px',
      background: 'rgba(255, 255, 255, 0.1)',
      gap: '12px',
    },
    title: {
      color: '#fff',
      fontSize: '16px',
      fontWeight: 'bold',
      flex: 1,
    },
    headerButton: {
      background: 'rgba(255, 255, 255, 0.2)',
      border: 'none',
      borderRadius: '8px',
      padding: '8px 12px',
      color: '#fff',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      fontSize: '13px',
    },
    headerButtonDisabled: {
      opacity: 0.5,
      cursor: 'not-allowed',
    },
    saveButton: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      border: 'none',
      borderRadius: '8px',
      padding: '8px 16px',
      color: '#fff',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      fontSize: '13px',
      fontWeight: 'bold',
    },
    toolbar: {
      display: 'flex',
      alignItems: 'center',
      padding: '10px 16px',
      background: 'rgba(255, 255, 255, 0.05)',
      gap: '16px',
      flexWrap: 'wrap',
    },
    toolGroup: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    toolLabel: {
      color: 'rgba(255, 255, 255, 0.7)',
      fontSize: '13px',
    },
    toolButton: {
      background: 'rgba(255, 255, 255, 0.1)',
      border: '2px solid transparent',
      borderRadius: '8px',
      padding: '8px 12px',
      color: '#fff',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      fontSize: '13px',
    },
    toolButtonActive: {
      background: 'rgba(102, 126, 234, 0.3)',
      borderColor: '#667eea',
    },
    mainContent: {
      flex: 1,
      display: 'flex',
      gap: '16px',
      padding: '16px',
      overflow: 'hidden',
    },
    panel: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      background: 'rgba(255, 255, 255, 0.05)',
      borderRadius: '12px',
      overflow: 'hidden',
    },
    panelTitle: {
      padding: '10px 16px',
      color: '#fff',
      fontSize: '14px',
      fontWeight: 'bold',
      background: 'rgba(255, 255, 255, 0.1)',
    },
    canvasContainer: {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
    },
    canvas: {
      maxWidth: '100%',
      maxHeight: '100%',
      cursor: mode === 'brush' ? 'crosshair' : 'pointer',
    },
    threeDContainer: {
      flex: 1,
    },
    footer: {
      padding: '12px 16px',
      background: 'rgba(255, 255, 255, 0.05)',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      flexWrap: 'wrap',
    },
    footerInfo: {
      color: 'rgba(255, 255, 255, 0.7)',
      fontSize: '13px',
    },
    zSlider: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      flex: 1,
    },
    slider: {
      flex: 1,
      maxWidth: '200px',
      accentColor: '#667eea',
    },
  };

  return (
    <div style={styles.overlay}>
      {/* 头部 */}
      <div style={styles.header}>
        <span style={styles.title}>Z轴微调</span>
        <button
          style={{
            ...styles.headerButton,
            ...(historyIndex <= 0 ? styles.headerButtonDisabled : {}),
          }}
          onClick={handleUndo}
          disabled={historyIndex <= 0}
        >
          <ArrowCounterClockwise size={16} />
          撤销
        </button>
        <button
          style={{
            ...styles.headerButton,
            ...(historyIndex >= history.length - 1 ? styles.headerButtonDisabled : {}),
          }}
          onClick={handleRedo}
          disabled={historyIndex >= history.length - 1}
        >
          <ArrowClockwise size={16} />
          重做
        </button>
        <button style={styles.saveButton} onClick={handleSave}>
          <FloppyDisk size={16} />
          保存
        </button>
        <button style={styles.headerButton} onClick={onClose}>
          <X size={16} />
          关闭
        </button>
      </div>

      {/* 工具栏 */}
      <div style={styles.toolbar}>
        <div style={styles.toolGroup}>
          <span style={styles.toolLabel}>模式:</span>
          <button
            style={{
              ...styles.toolButton,
              ...(mode === 'select' ? styles.toolButtonActive : {}),
            }}
            onClick={() => setMode('select')}
          >
            <Crosshair size={16} />
            点选
          </button>
          <button
            style={{
              ...styles.toolButton,
              ...(mode === 'brush' ? styles.toolButtonActive : {}),
            }}
            onClick={() => setMode('brush')}
          >
            <PaintBrush size={16} />
            画笔
          </button>
        </div>

        {mode === 'brush' && (
          <div style={styles.toolGroup}>
            <span style={styles.toolLabel}>调整:</span>
            <button
              style={{
                ...styles.toolButton,
                ...(brushDelta === 1 ? styles.toolButtonActive : {}),
              }}
              onClick={() => setBrushDelta(1)}
            >
              <Plus size={16} />
              +1
            </button>
            <button
              style={{
                ...styles.toolButton,
                ...(brushDelta === -1 ? styles.toolButtonActive : {}),
              }}
              onClick={() => setBrushDelta(-1)}
            >
              <Minus size={16} />
              -1
            </button>
          </div>
        )}

        {/* 统一Z轴切割 */}
        <div style={styles.toolGroup}>
          <span style={styles.toolLabel}>统一切割:</span>
          <input
            type="range"
            style={{ width: '100px', accentColor: '#f5576c' }}
            min={0}
            max={Math.max(0, originalLayerCount - 1)}
            step={1}
            value={zCut}
            onChange={(e) => setZCut(parseInt(e.target.value))}
          />
          <span style={{ color: '#f5576c', fontWeight: 'bold', minWidth: '60px' }}>
            -{zCut} 层
          </span>
        </div>

        <div style={styles.toolGroup}>
          <span style={styles.footerInfo}>
            原始: {originalLayerCount} 层 → 当前: {currentLayers.length} 层 | 体素: {voxelCount}
          </span>
        </div>
      </div>

      {/* 主内容 */}
      <div style={styles.mainContent}>
        {/* 2D编辑区 */}
        <div style={styles.panel}>
          <div style={styles.panelTitle}>2D 深度图（点击编辑）</div>
          <div style={styles.canvasContainer}>
            <canvas
              ref={canvasRef}
              width={Math.min(600, width * 12)}
              height={Math.min(600, height * 12)}
              style={styles.canvas}
              onClick={handleCanvasClick}
              onMouseDown={() => setIsDragging(true)}
              onMouseUp={() => setIsDragging(false)}
              onMouseLeave={() => setIsDragging(false)}
              onMouseMove={handleCanvasMouseMove}
            />
          </div>
        </div>

        {/* 3D预览区 */}
        <div style={styles.panel}>
          <div style={styles.panelTitle}>3D 实时预览</div>
          <div ref={threeDContainerRef} style={styles.threeDContainer} />
        </div>
      </div>

      {/* 底部 - 点选模式显示选中像素信息 */}
      {mode === 'select' && (
        <div style={styles.footer}>
          {selectedPixelInfo ? (
            <>
              <span style={styles.footerInfo}>
                选中: ({selectedPixel!.x}, {selectedPixel!.y})
              </span>
              <span style={styles.footerInfo}>
                颜色: {selectedPixelInfo.color}
              </span>
              <div style={styles.zSlider}>
                <span style={styles.footerInfo}>Z值:</span>
                <input
                  type="range"
                  style={styles.slider}
                  min={0}
                  max={maxLayers}
                  step={1}
                  value={selectedPixelInfo.z}
                  onChange={(e) => updatePixelZ(selectedPixel!.x, selectedPixel!.y, parseInt(e.target.value))}
                />
                <span style={{ ...styles.footerInfo, minWidth: '30px', fontWeight: 'bold', color: '#667eea' }}>
                  {selectedPixelInfo.z}
                </span>
              </div>
            </>
          ) : (
            <span style={styles.footerInfo}>点击左侧2D图选择一个像素进行编辑</span>
          )}
        </div>
      )}

      {mode === 'brush' && (
        <div style={styles.footer}>
          <span style={styles.footerInfo}>
            画笔模式：在左侧2D图上点击或拖动，每次 {brushDelta > 0 ? '+1' : '-1'} Z值
          </span>
        </div>
      )}
    </div>
  );
};

export default ZAxisAdjuster;
