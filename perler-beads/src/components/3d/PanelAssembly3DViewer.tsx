/**
 * 面板拼接3D预览器
 * 将6个面板按立方体位置排列在3D空间
 * 每个面板渲染为一层珠子方块，可旋转查看拼接效果
 */

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FacePanel, PanelFace, EdgePosition } from '../../types/3d/panel';

interface PanelAssembly3DViewerProps {
  panels: FacePanel[];
  gridSizeX: number;
  gridSizeY: number;
  gridSizeZ: number;
  height?: number;
}

/**
 * 获取面板在3D空间中的位置和旋转
 * 面板以单层方块排列在立方体的对应面上
 */
function getPanelTransform(
  face: PanelFace,
  sizeX: number,
  sizeY: number,
  sizeZ: number
): {
  getPosition: (row: number, col: number) => [number, number, number];
} {
  switch (face) {
    case 'front':
      // XY平面, Z=sizeZ/2 (前面)
      return {
        getPosition: (row, col) => [
          col - sizeX / 2,
          (sizeY - 1 - row) - sizeY / 2,
          sizeZ / 2,
        ],
      };
    case 'back':
      // XY平面, Z=-sizeZ/2 (后面), col镜像
      return {
        getPosition: (row, col) => [
          (sizeX - 1 - col) - sizeX / 2,
          (sizeY - 1 - row) - sizeY / 2,
          -sizeZ / 2,
        ],
      };
    case 'right':
      // ZY平面, X=sizeX/2 (右面)
      return {
        getPosition: (row, col) => [
          sizeX / 2,
          (sizeY - 1 - row) - sizeY / 2,
          col - sizeZ / 2,
        ],
      };
    case 'left':
      // ZY平面, X=-sizeX/2 (左面), col镜像
      return {
        getPosition: (row, col) => [
          -sizeX / 2,
          (sizeY - 1 - row) - sizeY / 2,
          (sizeZ - 1 - col) - sizeZ / 2,
        ],
      };
    case 'top':
      // XZ平面, Y=sizeY-1 (顶面)
      return {
        getPosition: (row, col) => [
          col - sizeX / 2,
          sizeY / 2,
          row - sizeZ / 2,
        ],
      };
    case 'bottom':
      // XZ平面, Y=0 (底面), row镜像
      return {
        getPosition: (row, col) => [
          col - sizeX / 2,
          -sizeY / 2,
          (sizeZ - 1 - row) - sizeZ / 2,
        ],
      };
  }
}

/**
 * 获取面板某条边上凸起卡齿的3D延伸方向
 * 卡齿沿面板平面内、从边缘向外延伸（与面板共面）
 * 每个face/edge组合有唯一的方向，基于getPanelTransform的坐标映射推导
 */
function getEdgeExtensionDir(
  face: PanelFace,
  edge: EdgePosition
): [number, number, number] {
  const dirs: Record<PanelFace, Record<EdgePosition, [number, number, number]>> = {
    front:  { top: [0,1,0],  bottom: [0,-1,0], left: [-1,0,0], right: [1,0,0]  },
    back:   { top: [0,1,0],  bottom: [0,-1,0], left: [1,0,0],  right: [-1,0,0] },
    right:  { top: [0,1,0],  bottom: [0,-1,0], left: [0,0,-1], right: [0,0,1]  },
    left:   { top: [0,1,0],  bottom: [0,-1,0], left: [0,0,1],  right: [0,0,-1] },
    top:    { top: [0,0,-1], bottom: [0,0,1],  left: [-1,0,0], right: [1,0,0]  },
    bottom: { top: [0,0,1],  bottom: [0,0,-1], left: [-1,0,0], right: [1,0,0]  },
  };
  return dirs[face][edge];
}

const PanelAssembly3DViewer: React.FC<PanelAssembly3DViewerProps> = ({
  panels,
  gridSizeX,
  gridSizeY,
  gridSizeZ,
  height = 300,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!containerRef.current || panels.length === 0) return;

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

    // 按颜色分组收集所有面板的体素
    const voxelSize = 1;
    const gap = 0.05;
    const actualSize = voxelSize - gap;
    const geometry = new THREE.BoxGeometry(actualSize, actualSize, actualSize);

    const colorGroups = new Map<string, THREE.Matrix4[]>();

    for (const panel of panels) {
      const transform = getPanelTransform(
        panel.face,
        gridSizeX,
        gridSizeY,
        gridSizeZ
      );

      for (let row = 0; row < panel.pixels.length; row++) {
        for (let col = 0; col < panel.pixels[row].length; col++) {
          const color = panel.pixels[row][col];
          if (color === null) continue;

          const [px, py, pz] = transform.getPosition(row, col);

          if (!colorGroups.has(color)) colorGroups.set(color, []);
          const matrix = new THREE.Matrix4();
          matrix.setPosition(px, py, pz);
          colorGroups.get(color)!.push(matrix);
        }
      }
    }

    // 在3D预览中回填凹槽区域的空洞（凹凸只在2D图纸上体现，3D显示完整面板）
    for (const panel of panels) {
      const transform = getPanelTransform(
        panel.face,
        gridSizeX,
        gridSizeY,
        gridSizeZ
      );

      const fillConcaveGaps = (edge: EdgePosition) => {
        const slots = panel.edgeSlots[edge];
        for (const slot of slots) {
          if (slot.type !== 'concave') continue;

          for (let i = 0; i < slot.length; i++) {
            const pos = slot.startPos + i;

            for (let d = 0; d < slot.depth; d++) {
              let row: number, col: number, refRow: number, refCol: number;
              switch (edge) {
                case 'top':
                  row = d; col = pos;
                  refRow = slot.depth; refCol = pos;
                  break;
                case 'bottom':
                  row = panel.pixels.length - 1 - d; col = pos;
                  refRow = panel.pixels.length - 1 - slot.depth; refCol = pos;
                  break;
                case 'left':
                  row = pos; col = d;
                  refRow = pos; refCol = slot.depth;
                  break;
                case 'right':
                  row = pos; col = (panel.pixels[0]?.length ?? 1) - 1 - d;
                  refRow = pos; refCol = (panel.pixels[0]?.length ?? 1) - 1 - slot.depth;
                  break;
              }

              // 只填 null 位置（凹槽空洞）
              if (panel.pixels[row]?.[col] !== null) continue;

              // 用凹槽内侧最近的颜色填充
              const color = panel.pixels[refRow]?.[refCol];
              if (!color) continue;

              const [px, py, pz] = transform.getPosition(row, col);
              if (!colorGroups.has(color)) colorGroups.set(color, []);
              const matrix = new THREE.Matrix4();
              matrix.setPosition(px, py, pz);
              colorGroups.get(color)!.push(matrix);
            }
          }
        }
      };

      fillConcaveGaps('top');
      fillConcaveGaps('bottom');
      fillConcaveGaps('left');
      fillConcaveGaps('right');
    }

    // 为凸起卡槽添加延伸体素（沿面板平面内、边缘向外延伸，与面板共面）
    for (const panel of panels) {
      const transform = getPanelTransform(
        panel.face,
        gridSizeX,
        gridSizeY,
        gridSizeZ
      );

      const addConvexExtensions = (edge: EdgePosition) => {
        const slots = panel.edgeSlots[edge];
        const dir = getEdgeExtensionDir(panel.face, edge);

        for (const slot of slots) {
          if (slot.type !== 'convex') continue;

          for (let i = 0; i < slot.length; i++) {
            const pos = slot.startPos + i;
            let row: number, col: number;
            switch (edge) {
              case 'top':    row = 0; col = pos; break;
              case 'bottom': row = panel.pixels.length - 1; col = pos; break;
              case 'left':   row = pos; col = 0; break;
              case 'right':  row = pos; col = (panel.pixels[0]?.length ?? 1) - 1; break;
            }

            const color = panel.pixels[row]?.[col];
            if (!color) continue;

            const [px, py, pz] = transform.getPosition(row, col);

            // 沿边缘向外延伸1个体素（= 相邻面板厚度，避免齿穿透面板）
            const extendDepth = 1;
            for (let d = 1; d <= extendDepth; d++) {
              const ex = px + dir[0] * d;
              const ey = py + dir[1] * d;
              const ez = pz + dir[2] * d;

              if (!colorGroups.has(color)) colorGroups.set(color, []);
              const matrix = new THREE.Matrix4();
              matrix.setPosition(ex, ey, ez);
              colorGroups.get(color)!.push(matrix);
            }
          }
        }
      };

      addConvexExtensions('top');
      addConvexExtensions('bottom');
      addConvexExtensions('left');
      addConvexExtensions('right');
    }

    // 填充8个顶角空隙（三面交汇处）
    // 每个角由3个面共享，从任意一个相邻面板的角落像素取色
    const cornerPositions: [number, number, number][] = [
      [ gridSizeX / 2,  gridSizeY / 2,  gridSizeZ / 2],  // 右上前
      [-gridSizeX / 2,  gridSizeY / 2,  gridSizeZ / 2],  // 左上前
      [ gridSizeX / 2, -gridSizeY / 2,  gridSizeZ / 2],  // 右下前
      [-gridSizeX / 2, -gridSizeY / 2,  gridSizeZ / 2],  // 左下前
      [ gridSizeX / 2,  gridSizeY / 2, -gridSizeZ / 2],  // 右上后
      [-gridSizeX / 2,  gridSizeY / 2, -gridSizeZ / 2],  // 左上后
      [ gridSizeX / 2, -gridSizeY / 2, -gridSizeZ / 2],  // 右下后
      [-gridSizeX / 2, -gridSizeY / 2, -gridSizeZ / 2],  // 左下后
    ];

    // 每个角对应的3个面及其角落像素位置 [face, row, col]
    const cornerFaceLookup: [PanelFace, number, number][][] = [
      // 右上前: front右上角, right左上角, top右下角
      [['front', 0, gridSizeX - 1], ['right', 0, 0], ['top', gridSizeZ - 1, gridSizeX - 1]],
      // 左上前: front左上角, left右上角, top左下角
      [['front', 0, 0], ['left', 0, 0], ['top', gridSizeZ - 1, 0]],
      // 右下前: front右下角, right左下角, bottom右上角
      [['front', gridSizeY - 1, gridSizeX - 1], ['right', gridSizeY - 1, 0], ['bottom', 0, gridSizeX - 1]],
      // 左下前: front左下角, left右下角, bottom左上角
      [['front', gridSizeY - 1, 0], ['left', gridSizeY - 1, 0], ['bottom', 0, 0]],
      // 右上后: back左上角, right右上角, top右上角
      [['back', 0, 0], ['right', 0, gridSizeZ - 1], ['top', 0, gridSizeX - 1]],
      // 左上后: back右上角, left左上角, top左上角
      [['back', 0, gridSizeX - 1], ['left', 0, gridSizeZ - 1], ['top', 0, 0]],
      // 右下后: back左下角, right右下角, bottom右下角
      [['back', gridSizeY - 1, 0], ['right', gridSizeY - 1, gridSizeZ - 1], ['bottom', gridSizeZ - 1, gridSizeX - 1]],
      // 左下后: back右下角, left左下角, bottom左下角
      [['back', gridSizeY - 1, gridSizeX - 1], ['left', gridSizeY - 1, gridSizeZ - 1], ['bottom', gridSizeZ - 1, 0]],
    ];

    const panelMap = new Map<PanelFace, FacePanel>();
    for (const p of panels) panelMap.set(p.face, p);

    for (let ci = 0; ci < cornerPositions.length; ci++) {
      const [cx, cy, cz] = cornerPositions[ci];
      const faceLookups = cornerFaceLookup[ci];

      // 从3个相邻面板中找到第一个有颜色的像素
      // 角落像素可能因凹槽为null，向内搜索最近的有色像素
      let cornerColor: string | null = null;
      for (const [face, row, col] of faceLookups) {
        const p = panelMap.get(face);
        if (!p) continue;
        if (p.pixels[row]?.[col]) {
          cornerColor = p.pixels[row][col];
          break;
        }
        // 角落为null时，沿对角线向内搜索
        const rowDir = row === 0 ? 1 : -1;
        const colDir = col === 0 ? 1 : -1;
        for (let step = 1; step <= 5; step++) {
          const sr = row + rowDir * step;
          const sc = col + colDir * step;
          if (p.pixels[sr]?.[sc]) {
            cornerColor = p.pixels[sr][sc];
            break;
          }
        }
        if (cornerColor) break;
      }

      if (cornerColor) {
        if (!colorGroups.has(cornerColor)) colorGroups.set(cornerColor, []);
        const matrix = new THREE.Matrix4();
        matrix.setPosition(cx, cy, cz);
        colorGroups.get(cornerColor)!.push(matrix);
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
    camera.position.set(maxDim * 1.5, maxDim * 1.0, maxDim * 1.5);
    controls.target.set(0, 0, 0);
    controls.update();

    // 坐标轴
    const axesHelper = new THREE.AxesHelper(maxDim * 0.3);
    axesHelper.position.set(-gridSizeX / 2 - 2, -gridSizeY / 2 - 1, -gridSizeZ / 2 - 2);
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
  }, [panels, gridSizeX, gridSizeY, gridSizeZ, height]);

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

export default PanelAssembly3DViewer;
