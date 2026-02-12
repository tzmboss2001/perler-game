/**
 * 切片叠加3D查看器
 * 将十字切片按正确的3D位置渲染，用于验证切片是否与体素化模型一致
 * X切片渲染为YZ平面，Z切片渲染为XY平面
 */

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SlicePiece } from '../../services/3d/crossSliceService';

interface StackedSliceViewerProps {
  slices: SlicePiece[];
  gridSizeX: number;
  gridSizeY: number;
  gridSizeZ: number;
  height?: number;
}

const StackedSliceViewer: React.FC<StackedSliceViewerProps> = ({
  slices,
  gridSizeX,
  gridSizeY,
  gridSizeZ,
  height = 300,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!containerRef.current || slices.length === 0) return;

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

    // 灯光
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight1.position.set(5, 10, 7);
    scene.add(dirLight1);
    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
    dirLight2.position.set(-5, 5, -5);
    scene.add(dirLight2);

    // 按颜色分组收集所有切片体素
    const voxelSize = 1;
    const gap = 0.05;
    const actualSize = voxelSize - gap;

    // X切片用略厚的方块，Z切片也是
    const sliceThickness = 0.3;
    const xGeometry = new THREE.BoxGeometry(sliceThickness, actualSize, actualSize);
    const zGeometry = new THREE.BoxGeometry(actualSize, actualSize, sliceThickness);

    // 为每个切片方向分别收集体素
    const xColorGroups = new Map<string, THREE.Matrix4[]>();
    const zColorGroups = new Map<string, THREE.Matrix4[]>();

    for (const slice of slices) {
      const isX = slice.direction === 'X';
      const groups = isX ? xColorGroups : zColorGroups;

      for (let row = 0; row < slice.height; row++) {
        for (let col = 0; col < slice.pixels[row].length; col++) {
          const color = slice.pixels[row][col];
          if (color === null) continue;

          // 坐标映射
          const y = slice.height - 1 - row;
          let x: number, z: number;
          if (isX) {
            x = slice.position;
            z = col;
          } else {
            x = col;
            z = slice.position;
          }

          if (!groups.has(color)) groups.set(color, []);
          const matrix = new THREE.Matrix4();
          matrix.setPosition(
            x - gridSizeX / 2,
            y,
            z - gridSizeZ / 2
          );
          groups.get(color)!.push(matrix);
        }
      }
    }

    // 创建 InstancedMesh
    const meshes: THREE.InstancedMesh[] = [];

    const createMeshes = (
      groups: Map<string, THREE.Matrix4[]>,
      geometry: THREE.BoxGeometry
    ) => {
      groups.forEach((matrices, color) => {
        const material = new THREE.MeshPhongMaterial({
          color: new THREE.Color(color),
          shininess: 30,
          transparent: true,
          opacity: 0.9,
        });
        const mesh = new THREE.InstancedMesh(geometry, material, matrices.length);
        matrices.forEach((mat, i) => mesh.setMatrixAt(i, mat));
        mesh.instanceMatrix.needsUpdate = true;
        scene.add(mesh);
        meshes.push(mesh);
      });
    };

    createMeshes(xColorGroups, xGeometry);
    createMeshes(zColorGroups, zGeometry);

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
      xGeometry.dispose();
      zGeometry.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };

    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [slices, gridSizeX, gridSizeY, gridSizeZ, height]);

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

export default StackedSliceViewer;
