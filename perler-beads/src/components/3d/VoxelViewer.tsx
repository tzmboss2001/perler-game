/**
 * 3D体素查看器组件
 * 将 VoxelGrid 数据渲染为彩色小方块的3D视图
 * 使用 InstancedMesh 优化性能，支持 OrbitControls 旋转/缩放
 */

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { VoxelGrid } from '../../services/3d/modelVoxelizeService';

interface VoxelViewerProps {
  voxelGrid: VoxelGrid;
  width?: number;
  height?: number;
}

const VoxelViewer: React.FC<VoxelViewerProps> = ({
  voxelGrid,
  width,
  height = 300,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!containerRef.current || !voxelGrid) return;

    // 清理旧场景
    cleanupRef.current?.();

    const container = containerRef.current;
    const w = width || container.clientWidth;
    const h = height;

    // 创建场景
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);

    // 创建相机
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);

    // 创建渲染器
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // 灯光（较强，确保正确 sRGB albedo 颜色看起来明亮）
    scene.add(new THREE.AmbientLight(0xffffff, 1.2));
    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight1.position.set(5, 10, 7);
    scene.add(dirLight1);
    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.5);
    dirLight2.position.set(-5, 5, -5);
    scene.add(dirLight2);
    const dirLight3 = new THREE.DirectionalLight(0xffffff, 0.3);
    dirLight3.position.set(0, -5, 5);
    scene.add(dirLight3);

    // 按颜色分组体素
    const { sizeX, sizeY, sizeZ, data } = voxelGrid;
    const colorGroups = new Map<string, THREE.Matrix4[]>();
    const voxelSize = 1;
    const gap = 0.05;
    const actualSize = voxelSize - gap;

    for (let x = 0; x < sizeX; x++) {
      for (let y = 0; y < sizeY; y++) {
        for (let z = 0; z < sizeZ; z++) {
          const color = data[x][y][z];
          if (color === null) continue;

          if (!colorGroups.has(color)) {
            colorGroups.set(color, []);
          }
          const matrix = new THREE.Matrix4();
          // 居中：x, z 居中；y 从0开始向上
          matrix.setPosition(
            x - sizeX / 2,
            y,
            z - sizeZ / 2
          );
          colorGroups.get(color)!.push(matrix);
        }
      }
    }

    // 为每种颜色创建 InstancedMesh
    const geometry = new THREE.BoxGeometry(actualSize, actualSize, actualSize);
    const meshes: THREE.InstancedMesh[] = [];

    colorGroups.forEach((matrices, color) => {
      const material = new THREE.MeshPhongMaterial({
        color: new THREE.Color(color),
        shininess: 30,
      });
      const mesh = new THREE.InstancedMesh(geometry, material, matrices.length);
      matrices.forEach((mat, i) => {
        mesh.setMatrixAt(i, mat);
      });
      mesh.instanceMatrix.needsUpdate = true;
      scene.add(mesh);
      meshes.push(mesh);
    });

    // 设置相机位置
    const maxDim = Math.max(sizeX, sizeY, sizeZ);
    camera.position.set(maxDim * 1.2, maxDim * 0.8, maxDim * 1.2);
    controls.target.set(0, sizeY / 2, 0);
    controls.update();

    // 添加坐标轴辅助线（小）
    const axesHelper = new THREE.AxesHelper(maxDim * 0.3);
    axesHelper.position.set(-sizeX / 2 - 1, 0, -sizeZ / 2 - 1);
    scene.add(axesHelper);

    // 动画循环
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // 窗口大小变化
    const handleResize = () => {
      const newW = width || container.clientWidth;
      camera.aspect = newW / h;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, h);
    };
    window.addEventListener('resize', handleResize);

    // 清理函数
    cleanupRef.current = () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      meshes.forEach((mesh) => {
        mesh.geometry.dispose();
        if (mesh.material instanceof THREE.Material) {
          mesh.material.dispose();
        }
      });
      geometry.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };

    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [voxelGrid, width, height]);

  return (
    <div
      ref={containerRef}
      style={{
        width: width ? `${width}px` : '100%',
        height: `${height}px`,
        borderRadius: '12px',
        overflow: 'hidden',
      }}
    />
  );
};

export default VoxelViewer;
