/**
 * 逐层叠加3D查看器
 * 将等高线切片（ContourSlice）按 layerIndex 叠加渲染为3D方块
 * 用于验证：叠加后的形状是否与体素化模型一致
 *
 * 坐标映射：
 *   ContourSlice.pixels[row][col]
 *   row = Z方向（0 = Z最小）
 *   col = X方向（0 = X最小）
 *   layerIndex = Y方向（0 = 底层）
 */

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ContourSlice } from '../../services/3d/contourSliceService';

interface StackedLayerViewerProps {
  layers: ContourSlice[];
  gridSizeX: number;
  gridSizeY: number;
  gridSizeZ: number;
  height?: number;
}

const StackedLayerViewer: React.FC<StackedLayerViewerProps> = ({
  layers,
  gridSizeX,
  gridSizeY,
  gridSizeZ,
  height = 300,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!containerRef.current || layers.length === 0) return;

    cleanupRef.current?.();

    const container = containerRef.current;
    const w = container.clientWidth;
    const h = height;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

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

    // 按颜色分组收集所有层的体素
    const voxelSize = 1;
    const gap = 0.05;
    const actualSize = voxelSize - gap;
    const geometry = new THREE.BoxGeometry(actualSize, actualSize, actualSize);

    const colorGroups = new Map<string, THREE.Matrix4[]>();

    for (const layer of layers) {
      const y = layer.layerIndex;
      for (let row = 0; row < layer.pixels.length; row++) {
        for (let col = 0; col < layer.pixels[row].length; col++) {
          const color = layer.pixels[row][col];
          if (color === null) continue;

          // row = Z方向, col = X方向
          const x = col;
          const z = row;

          if (!colorGroups.has(color)) colorGroups.set(color, []);
          const matrix = new THREE.Matrix4();
          matrix.setPosition(
            x - gridSizeX / 2,
            y,
            z - gridSizeZ / 2
          );
          colorGroups.get(color)!.push(matrix);
        }
      }
    }

    // 创建 InstancedMesh
    const meshes: THREE.InstancedMesh[] = [];
    colorGroups.forEach((matrices, color) => {
      const material = new THREE.MeshPhongMaterial({
        color: new THREE.Color(color),
        shininess: 30,
      });
      const mesh = new THREE.InstancedMesh(geometry, material, matrices.length);
      matrices.forEach((mat, i) => mesh.setMatrixAt(i, mat));
      mesh.instanceMatrix.needsUpdate = true;
      scene.add(mesh);
      meshes.push(mesh);
    });

    // 相机位置
    const maxDim = Math.max(gridSizeX, gridSizeY, gridSizeZ);
    camera.position.set(maxDim * 1.2, maxDim * 0.8, maxDim * 1.2);
    controls.target.set(0, gridSizeY / 2, 0);
    controls.update();

    // 坐标轴
    const axesHelper = new THREE.AxesHelper(maxDim * 0.3);
    axesHelper.position.set(-gridSizeX / 2 - 1, 0, -gridSizeZ / 2 - 1);
    scene.add(axesHelper);

    // 动画
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      const newW = container.clientWidth;
      camera.aspect = newW / h;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, h);
    };
    window.addEventListener('resize', handleResize);

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
  }, [layers, gridSizeX, gridSizeY, gridSizeZ, height]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: `${height}px`,
        borderRadius: '12px',
        overflow: 'hidden',
      }}
    />
  );
};

export default StackedLayerViewer;
