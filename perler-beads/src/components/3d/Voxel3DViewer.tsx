/**
 * 3D体素预览组件
 * 使用 Three.js 渲染体素模型，模拟实物效果
 *
 * v2.0 改进：
 * - 添加Z轴切割滑块，用户可以实时调整厚度
 * - 支持回调返回调整后的层数据
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Layer } from '../../types/3d/voxel';

interface Voxel3DViewerProps {
  layers: Layer[];
  onClose: () => void;
  onSave?: (layers: Layer[], zOffset: number) => void; // 保存调整后的数据
}

/**
 * 应用Z值偏移
 */
function applyZOffset(layers: Layer[], offset: number): Layer[] {
  if (offset === 0) return layers;

  const newLayers: Layer[] = [];
  for (const layer of layers) {
    const newZ = layer.z - offset;
    if (newZ > 0) {
      newLayers.push({
        ...layer,
        z: newZ,
      });
    }
  }
  return newLayers;
}

const Voxel3DViewer: React.FC<Voxel3DViewerProps> = ({ layers: originalLayers, onClose, onSave }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const meshesRef = useRef<THREE.InstancedMesh[]>([]);
  const baseRef = useRef<THREE.Mesh | null>(null);

  // Z轴切割状态
  const [zOffset, setZOffset] = useState(0);

  // 计算切割后的层
  const layers = useMemo(() => {
    return applyZOffset(originalLayers, zOffset);
  }, [originalLayers, zOffset]);

  // 计算体素数量
  const voxelCount = useMemo(() => {
    return layers.reduce((sum, layer) => sum + layer.beads.length, 0);
  }, [layers]);

  // 初始化 Three.js 场景（只执行一次）
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 创建场景
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    sceneRef.current = scene;

    // 创建相机
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    cameraRef.current = camera;

    // 创建渲染器
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 创建控制器
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;

    // 添加灯光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight2.position.set(-50, 50, -50);
    scene.add(directionalLight2);

    // 添加底座
    const modelWidth = originalLayers[0]?.width || 0;
    const modelHeight = originalLayers[0]?.height || 0;
    const baseGeometry = new THREE.BoxGeometry(modelWidth + 4, 0.5, modelHeight + 4);
    const baseMaterial = new THREE.MeshPhongMaterial({ color: 0x333333, shininess: 10 });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = -0.5;
    base.receiveShadow = true;
    scene.add(base);
    baseRef.current = base;

    // 设置初始相机位置
    const maxDimension = Math.max(modelWidth, modelHeight, originalLayers.length);
    camera.position.set(maxDimension * 1.5, maxDimension * 1.2, maxDimension * 1.5);
    camera.lookAt(0, originalLayers.length / 2, 0);
    controls.target.set(0, originalLayers.length / 2, 0);

    // 动画循环
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // 窗口大小变化处理
    const handleResize = () => {
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };
    window.addEventListener('resize', handleResize);

    // 清理
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [originalLayers]);

  // 当 layers 变化时，更新体素（切割后重新渲染）
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || layers.length === 0) return;

    // 移除旧的体素
    meshesRef.current.forEach(mesh => {
      scene.remove(mesh);
      mesh.geometry.dispose();
      if (mesh.material instanceof THREE.Material) {
        mesh.material.dispose();
      }
    });
    meshesRef.current = [];

    // 计算模型尺寸
    const modelWidth = layers[0]?.width || 0;
    const modelHeight = layers[0]?.height || 0;

    // 创建体素
    const voxelSize = 1;
    const gap = 0.05;
    const actualSize = voxelSize - gap;

    // 使用 InstancedMesh 优化性能
    const colorGroups = new Map<string, THREE.Matrix4[]>();

    // 收集所有体素按颜色分组
    layers.forEach((layer, idx) => {
      layer.beads.forEach((bead) => {
        const color = bead.color;
        if (!colorGroups.has(color)) {
          colorGroups.set(color, []);
        }

        const matrix = new THREE.Matrix4();
        matrix.setPosition(
          bead.x - modelWidth / 2,
          idx * voxelSize, // 使用索引而非 layer.z，确保从0开始
          bead.y - modelHeight / 2
        );
        colorGroups.get(color)!.push(matrix);
      });
    });

    // 为每种颜色创建 InstancedMesh
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
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
      meshesRef.current.push(mesh);
    });

    geometry.dispose();
  }, [layers]);

  // 处理保存
  const handleSave = () => {
    if (onSave) {
      onSave(layers, zOffset);
    }
    onClose();
  };

  const styles: Record<string, React.CSSProperties> = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.9)',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '12px 20px',
      background: 'rgba(255, 255, 255, 0.1)',
    },
    title: {
      color: '#fff',
      fontSize: '18px',
      fontWeight: 600,
    },
    headerButtons: {
      display: 'flex',
      gap: '10px',
    },
    button: {
      background: 'rgba(255, 255, 255, 0.2)',
      border: 'none',
      borderRadius: '8px',
      padding: '8px 16px',
      color: '#fff',
      cursor: 'pointer',
      fontSize: '14px',
    },
    saveButton: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      border: 'none',
      borderRadius: '8px',
      padding: '8px 16px',
      color: '#fff',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: 'bold',
    },
    viewerContainer: {
      flex: 1,
      overflow: 'hidden',
      position: 'relative',
    },
    controlPanel: {
      position: 'absolute',
      top: '20px',
      right: '20px',
      background: 'rgba(0, 0, 0, 0.7)',
      borderRadius: '12px',
      padding: '16px',
      minWidth: '200px',
    },
    controlTitle: {
      color: '#fff',
      fontSize: '14px',
      fontWeight: 'bold',
      marginBottom: '12px',
    },
    controlRow: {
      display: 'flex',
      alignItems: 'center',
      marginBottom: '8px',
    },
    controlLabel: {
      color: 'rgba(255, 255, 255, 0.8)',
      fontSize: '13px',
      flex: 1,
    },
    controlValue: {
      color: '#667eea',
      fontSize: '14px',
      fontWeight: 'bold',
      minWidth: '40px',
      textAlign: 'right',
    },
    slider: {
      width: '100%',
      marginTop: '8px',
      accentColor: '#667eea',
    },
    stats: {
      color: 'rgba(255, 255, 255, 0.6)',
      fontSize: '12px',
      marginTop: '12px',
      paddingTop: '12px',
      borderTop: '1px solid rgba(255, 255, 255, 0.2)',
    },
    hint: {
      position: 'absolute',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      color: 'rgba(255, 255, 255, 0.6)',
      fontSize: '14px',
      background: 'rgba(0, 0, 0, 0.5)',
      padding: '8px 16px',
      borderRadius: '20px',
    },
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.header}>
        <span style={styles.title}>3D 实物预览</span>
        <div style={styles.headerButtons}>
          {onSave && zOffset > 0 && (
            <button style={styles.saveButton} onClick={handleSave}>
              保存调整
            </button>
          )}
          <button style={styles.button} onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
      <div ref={containerRef} style={styles.viewerContainer}>
        {/* 控制面板 */}
        <div style={styles.controlPanel}>
          <div style={styles.controlTitle}>🔧 Z轴切割</div>
          <div style={styles.controlRow}>
            <span style={styles.controlLabel}>切掉底部</span>
            <span style={styles.controlValue}>{zOffset} 层</span>
          </div>
          <input
            type="range"
            style={styles.slider}
            min={0}
            max={Math.max(0, originalLayers.length - 1)}
            step={1}
            value={zOffset}
            onChange={(e) => setZOffset(parseInt(e.target.value))}
          />
          <div style={styles.stats}>
            原始: {originalLayers.length} 层 → 当前: {layers.length} 层<br />
            体素: {voxelCount} 颗
          </div>
        </div>
      </div>
      <div style={styles.hint}>拖动旋转 · 滚轮缩放 · 右键平移</div>
    </div>
  );
};

export default Voxel3DViewer;
