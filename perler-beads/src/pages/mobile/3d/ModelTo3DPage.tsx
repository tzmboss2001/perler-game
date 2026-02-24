/**
 * 3D模型转拼豆图纸页面
 * GLB模型 → 加载 → 体素化 → 等高线镂空 → 生成拼豆像素图纸
 */

import React, { useState, useRef, useEffect, useCallback, CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Cube, Upload, Download, CaretRight, CaretLeft } from '@phosphor-icons/react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  loadGLBModel,
  voxelizeModel,
  getVoxelStats,
  VoxelGrid,
} from '../../../services/3d/modelVoxelizeService';
import VoxelViewer from '../../../components/3d/VoxelViewer';
import StackedLayerViewer from '../../../components/3d/StackedLayerViewer';
import {
  generateContourSlices,
  renderContourSliceToCanvas,
  renderCentipedeToCanvas,
  renderSkewerToCanvas,
  getContourSliceStats,
  ContourSlice,
  CentipedeConnector,
  TanghuluSkewer,
  ConnectionType,
  ConnectionRecommendation,
} from '../../../services/3d/contourSliceService';
import {
  generatePanelAssembly,
  renderFacePanelToCanvas,
  getFaceLabel,
  getAssemblyGuide,
} from '../../../services/3d/panelAssemblyService';
import { FacePanel, PanelAssemblyResult, PanelAssemblyConfig } from '../../../types/3d/panel';
import PanelAssembly3DViewer from '../../../components/3d/PanelAssembly3DViewer';

// ========================= 3D模型预览组件 =========================

function ModelPreview({
  modelUrl,
  style,
}: {
  modelUrl: string;
  style?: CSSProperties;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!containerRef.current || !modelUrl) return;

    // 清理旧场景
    cleanupRef.current?.();

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // 灯光
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);
    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
    dirLight2.position.set(-5, 5, -5);
    scene.add(dirLight2);

    // 加载模型
    loadGLBModel(modelUrl).then((model) => {
      scene.add(model);
      const box = new THREE.Box3().setFromObject(model);
      const center = new THREE.Vector3();
      box.getCenter(center);
      const size = new THREE.Vector3();
      box.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z);
      camera.position.set(
        center.x + maxDim * 1.5,
        center.y + maxDim * 0.8,
        center.z + maxDim * 1.5
      );
      controls.target.copy(center);
      controls.update();
    });

    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    cleanupRef.current = () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };

    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [modelUrl]);

  return <div ref={containerRef} style={{ width: '100%', height: '250px', borderRadius: '12px', overflow: 'hidden', ...style }} />;
}

// ========================= 等高线切片缩略图组件 =========================

function ContourSliceThumbnail({
  slice,
  onClick,
}: {
  slice: ContourSlice;
  onClick: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const rendered = renderContourSliceToCanvas(slice, 4, false, true);
    const ctx = canvasRef.current.getContext('2d')!;
    canvasRef.current.width = rendered.width;
    canvasRef.current.height = rendered.height;
    ctx.drawImage(rendered, 0, 0);
  }, [slice]);

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px',
        cursor: 'pointer',
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '8px',
          padding: '4px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          border: '2px solid #43e97b',
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            display: 'block',
            maxWidth: '100px',
            maxHeight: '100px',
            objectFit: 'contain',
          }}
        />
      </div>
      <div style={{ textAlign: 'center' }}>
        <span
          style={{
            fontSize: '12px',
            fontWeight: 'bold',
            color: '#43e97b',
            display: 'block',
          }}
        >
          {slice.id}
          {slice.isSolid && <span style={{ fontSize: '10px', color: '#ffd700' }}> 实心</span>}
        </span>
        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>
          {slice.beadCount}颗
          {slice.holes.length > 0 && (
            <span style={{ color: '#FF8C00' }}> {slice.holes.length}孔</span>
          )}
          {slice.skewerSlots.length > 0 && (
            <span style={{ color: '#8B5CF6' }}> {slice.skewerSlots.length}槽</span>
          )}
        </span>
      </div>
    </div>
  );
}

// ========================= 蜈蚣连接器缩略图组件 =========================

function CentipedeConnectorThumbnail({
  connector,
  onClick,
}: {
  connector: CentipedeConnector;
  onClick: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const cellSize = Math.max(4, Math.min(8, Math.floor(120 / connector.width)));
    const rendered = renderCentipedeToCanvas(connector, cellSize, false);
    const ctx = canvasRef.current.getContext('2d')!;
    canvasRef.current.width = rendered.width;
    canvasRef.current.height = rendered.height;
    ctx.drawImage(rendered, 0, 0);
  }, [connector]);

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px',
        cursor: 'pointer',
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '8px',
          padding: '4px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          border: '2px solid #FF8C00',
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            display: 'block',
            maxWidth: '120px',
            maxHeight: '40px',
            objectFit: 'contain',
          }}
        />
      </div>
      <div style={{ textAlign: 'center' }}>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 'bold',
            color: '#FF8C00',
            display: 'block',
          }}
        >
          {connector.id}
        </span>
        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>
          {connector.orientation === 'horizontal' ? 'H' : 'V'} · {connector.beadCount}颗
        </span>
      </div>
    </div>
  );
}

// ========================= 等高线切片详情弹窗（支持左右滑动） =========================

function ContourSliceDetailModal({
  slices,
  currentIndex,
  onClose,
  onNavigate,
}: {
  slices: ContourSlice[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const slice = slices[currentIndex];

  useEffect(() => {
    if (!canvasRef.current || !slice) return;
    const cellSize = Math.min(16, Math.floor(350 / Math.max(slice.width, slice.height)));
    const rendered = renderContourSliceToCanvas(slice, Math.max(cellSize, 4), true, true);
    canvasRef.current.width = rendered.width;
    canvasRef.current.height = rendered.height;
    const ctx = canvasRef.current.getContext('2d')!;
    ctx.drawImage(rendered, 0, 0);
  }, [slice]);

  // 键盘左右箭头导航
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        onNavigate(currentIndex - 1);
      } else if (e.key === 'ArrowRight' && currentIndex < slices.length - 1) {
        onNavigate(currentIndex + 1);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, slices.length, onNavigate, onClose]);

  const handleExport = () => {
    if (!slice) return;
    const cellSize = 20;
    const rendered = renderContourSliceToCanvas(slice, cellSize, true, true);
    const link = document.createElement('a');
    link.download = `${slice.id}_contour.png`;
    link.href = rendered.toDataURL('image/png');
    link.click();
  };

  // 触摸滑动
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    // 只在水平滑动距离大于垂直距离且超过50px时触发
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx < 0 && currentIndex < slices.length - 1) {
        onNavigate(currentIndex + 1); // 左滑 → 下一层
      } else if (dx > 0 && currentIndex > 0) {
        onNavigate(currentIndex - 1); // 右滑 → 上一层
      }
    }
  };

  if (!slice) return null;

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < slices.length - 1;

  const navBtnStyle: CSSProperties = {
    background: 'rgba(255,255,255,0.15)',
    border: 'none',
    color: '#fff',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: '18px',
    flexShrink: 0,
  };

  const navBtnDisabled: CSSProperties = {
    ...navBtnStyle,
    opacity: 0.2,
    cursor: 'default',
  };

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div
        style={modalStyles.content}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div style={modalStyles.header}>
          <h3 style={{ margin: 0, color: '#fff', fontSize: '16px' }}>
            {slice.id} (第{slice.id.replace('Layer-', '')}层)
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>
              {currentIndex + 1}/{slices.length}
            </span>
            <button style={modalStyles.closeBtn} onClick={onClose}>
              ×
            </button>
          </div>
        </div>
        <div style={modalStyles.info}>
          <span>尺寸: {slice.width} × {slice.height}</span>
          <span>珠子: {slice.beadCount}颗</span>
          <span>{slice.isSolid ? '实心层' : `孔洞: ${slice.holes.length}个`}</span>
          {slice.skewerSlots.length > 0 && <span style={{ color: '#8B5CF6' }}>槽: {slice.skewerSlots.length}个</span>}
        </div>

        {/* 图纸 + 左右导航 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 10px' }}>
          <button
            style={hasPrev ? navBtnStyle : navBtnDisabled}
            onClick={() => hasPrev && onNavigate(currentIndex - 1)}
          >
            <CaretLeft size={20} weight="bold" />
          </button>

          <div style={{ ...modalStyles.canvasWrap, flex: 1, margin: 0 }}>
            <canvas
              ref={canvasRef}
              style={{ maxWidth: '100%', maxHeight: '50vh', objectFit: 'contain' }}
            />
          </div>

          <button
            style={hasNext ? navBtnStyle : navBtnDisabled}
            onClick={() => hasNext && onNavigate(currentIndex + 1)}
          >
            <CaretRight size={20} weight="bold" />
          </button>
        </div>

        {/* 底部操作栏 */}
        <div style={{ display: 'flex', gap: '10px', padding: '12px 20px' }}>
          <button style={{ ...modalStyles.exportBtn, margin: 0, flex: 1 }} onClick={handleExport}>
            <Download size={16} /> 导出图纸
          </button>
        </div>

        {/* 滑动提示 */}
        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '11px', margin: '0 0 12px', padding: 0 }}>
          左右滑动 · 箭头键切换
        </p>
      </div>
    </div>
  );
}

// ========================= 蜈蚣连接器详情弹窗 =========================

function CentipedeDetailModal({
  connector,
  onClose,
}: {
  connector: CentipedeConnector;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const cellSize = Math.max(12, Math.min(24, Math.floor(350 / connector.width)));
    const rendered = renderCentipedeToCanvas(connector, cellSize, true);
    canvasRef.current.width = rendered.width;
    canvasRef.current.height = rendered.height;
    const ctx = canvasRef.current.getContext('2d')!;
    ctx.drawImage(rendered, 0, 0);
  }, [connector]);

  const handleExport = () => {
    const cellSize = 24;
    const rendered = renderCentipedeToCanvas(connector, cellSize, true);
    const link = document.createElement('a');
    link.download = `${connector.id}_centipede.png`;
    link.href = rendered.toDataURL('image/png');
    link.click();
  };

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={modalStyles.content} onClick={(e) => e.stopPropagation()}>
        <div style={modalStyles.header}>
          <h3 style={{ margin: 0, color: '#fff' }}>
            {connector.id}
          </h3>
          <button style={modalStyles.closeBtn} onClick={onClose}>
            ×
          </button>
        </div>
        <div style={modalStyles.info}>
          <span>层: {connector.betweenLayers[0] + 1} ↔ {connector.betweenLayers[1] + 1}</span>
          <span>方向: {connector.orientation === 'horizontal' ? '水平' : '垂直'}</span>
          <span>珠子: {connector.beadCount}颗</span>
          <span>腿: {connector.upperLegPositions.length}对</span>
        </div>
        <div style={{ padding: '8px 20px', color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>
          <p style={{ margin: '0 0 4px 0' }}>尺寸: {connector.width} × 3</p>
          <p style={{ margin: 0 }}>扫描线: {connector.centerLine}</p>
        </div>
        <div style={modalStyles.canvasWrap}>
          <canvas
            ref={canvasRef}
            style={{ maxWidth: '100%', maxHeight: '30vh', objectFit: 'contain' }}
          />
        </div>
        <button
          style={{ ...modalStyles.exportBtn, background: 'linear-gradient(135deg, #FF8C00 0%, #FF6347 100%)' }}
          onClick={handleExport}
        >
          <Download size={16} /> 导出连接片图纸
        </button>
      </div>
    </div>
  );
}

// ========================= 糖葫芦串插条缩略图组件 =========================

function TanghuluSkewerThumbnail({
  skewer,
  onClick,
}: {
  skewer: TanghuluSkewer;
  onClick: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const cellSize = Math.max(4, Math.min(8, Math.floor(120 / Math.max(skewer.width, skewer.height))));
    const rendered = renderSkewerToCanvas(skewer, cellSize, false);
    const ctx = canvasRef.current.getContext('2d')!;
    canvasRef.current.width = rendered.width;
    canvasRef.current.height = rendered.height;
    ctx.drawImage(rendered, 0, 0);
  }, [skewer]);

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px',
        cursor: 'pointer',
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '8px',
          padding: '4px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          border: '2px solid #8B5CF6',
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            display: 'block',
            maxWidth: '120px',
            maxHeight: '80px',
            objectFit: 'contain',
          }}
        />
      </div>
      <div style={{ textAlign: 'center' }}>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 'bold',
            color: '#8B5CF6',
            display: 'block',
          }}
        >
          {skewer.id}
        </span>
        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>
          {skewer.width}×{skewer.height} · {skewer.beadCount}颗
        </span>
      </div>
    </div>
  );
}

// ========================= 糖葫芦串详情弹窗 =========================

function TanghuluSkewerDetailModal({
  skewer,
  onClose,
}: {
  skewer: TanghuluSkewer;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const cellSize = Math.max(12, Math.min(24, Math.floor(350 / Math.max(skewer.width, skewer.height))));
    const rendered = renderSkewerToCanvas(skewer, cellSize, true);
    canvasRef.current.width = rendered.width;
    canvasRef.current.height = rendered.height;
    const ctx = canvasRef.current.getContext('2d')!;
    ctx.drawImage(rendered, 0, 0);
  }, [skewer]);

  const handleExport = () => {
    const cellSize = 24;
    const rendered = renderSkewerToCanvas(skewer, cellSize, true);
    const link = document.createElement('a');
    link.download = `${skewer.id}_skewer.png`;
    link.href = rendered.toDataURL('image/png');
    link.click();
  };

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={modalStyles.content} onClick={(e) => e.stopPropagation()}>
        <div style={modalStyles.header}>
          <h3 style={{ margin: 0, color: '#fff' }}>
            {skewer.id}
          </h3>
          <button style={modalStyles.closeBtn} onClick={onClose}>
            ×
          </button>
        </div>
        <div style={modalStyles.info}>
          <span>尺寸: {skewer.width} × {skewer.height}</span>
          <span>贯穿: {skewer.layerCount}层</span>
          <span>珠子: {skewer.beadCount}颗</span>
          <span>槽宽: {skewer.slotWidth}珠</span>
        </div>
        <div style={{ padding: '8px 20px', color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>
          <p style={{ margin: '0 0 4px 0' }}>
            位置: ({skewer.position.row}, {skewer.position.col})
          </p>
          <p style={{ margin: 0 }}>
            朝向: {skewer.position.orientation === 'horizontal' ? '水平' : '垂直'}
          </p>
        </div>
        <div style={modalStyles.canvasWrap}>
          <canvas
            ref={canvasRef}
            style={{ maxWidth: '100%', maxHeight: '40vh', objectFit: 'contain' }}
          />
        </div>
        <button
          style={{ ...modalStyles.exportBtn, background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)' }}
          onClick={handleExport}
        >
          <Download size={16} /> 导出插条图纸
        </button>
      </div>
    </div>
  );
}

// ========================= 面板拼接缩略图组件 =========================

function FacePanelThumbnail({
  panel,
  onClick,
}: {
  panel: FacePanel;
  onClick: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const rendered = renderFacePanelToCanvas(panel, 4, false, true);
    const ctx = canvasRef.current.getContext('2d')!;
    canvasRef.current.width = rendered.width;
    canvasRef.current.height = rendered.height;
    ctx.drawImage(rendered, 0, 0);
  }, [panel]);

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px',
        cursor: 'pointer',
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '8px',
          padding: '4px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          border: '2px solid #3b82f6',
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            display: 'block',
            maxWidth: '100px',
            maxHeight: '100px',
            objectFit: 'contain',
          }}
        />
      </div>
      <div style={{ textAlign: 'center' }}>
        <span
          style={{
            fontSize: '12px',
            fontWeight: 'bold',
            color: '#3b82f6',
            display: 'block',
          }}
        >
          {getFaceLabel(panel.face)}
        </span>
        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>
          {panel.baseWidth}x{panel.baseHeight} · {panel.beadCount}颗
        </span>
      </div>
    </div>
  );
}

// ========================= 面板详情弹窗（支持左右滑动） =========================

function FacePanelDetailModal({
  panels,
  currentIndex,
  onClose,
  onNavigate,
}: {
  panels: FacePanel[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const panel = panels[currentIndex];

  useEffect(() => {
    if (!canvasRef.current || !panel) return;
    const cellSize = Math.min(16, Math.floor(350 / Math.max(panel.width, panel.height)));
    const rendered = renderFacePanelToCanvas(panel, Math.max(cellSize, 4), true, true);
    canvasRef.current.width = rendered.width;
    canvasRef.current.height = rendered.height;
    const ctx = canvasRef.current.getContext('2d')!;
    ctx.drawImage(rendered, 0, 0);
  }, [panel]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        onNavigate(currentIndex - 1);
      } else if (e.key === 'ArrowRight' && currentIndex < panels.length - 1) {
        onNavigate(currentIndex + 1);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, panels.length, onNavigate, onClose]);

  const handleExport = () => {
    if (!panel) return;
    const cellSize = 20;
    const rendered = renderFacePanelToCanvas(panel, cellSize, true, true);
    const link = document.createElement('a');
    link.download = `${panel.id}_panel.png`;
    link.href = rendered.toDataURL('image/png');
    link.click();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx < 0 && currentIndex < panels.length - 1) {
        onNavigate(currentIndex + 1);
      } else if (dx > 0 && currentIndex > 0) {
        onNavigate(currentIndex - 1);
      }
    }
  };

  if (!panel) return null;

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < panels.length - 1;

  const navBtnStyle: CSSProperties = {
    background: 'rgba(255,255,255,0.15)',
    border: 'none',
    color: '#fff',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: '18px',
    flexShrink: 0,
  };

  const navBtnDisabled: CSSProperties = {
    ...navBtnStyle,
    opacity: 0.2,
    cursor: 'default',
  };

  // 统计凹凸数量
  const concaveCount = Object.values(panel.edgeSlots).flat().filter(s => s.type === 'concave').length;
  const convexCount = Object.values(panel.edgeSlots).flat().filter(s => s.type === 'convex').length;

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div
        style={modalStyles.content}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div style={modalStyles.header}>
          <h3 style={{ margin: 0, color: '#fff', fontSize: '16px' }}>
            {panel.id} ({getFaceLabel(panel.face)})
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>
              {currentIndex + 1}/{panels.length}
            </span>
            <button style={modalStyles.closeBtn} onClick={onClose}>
              ×
            </button>
          </div>
        </div>
        <div style={modalStyles.info}>
          <span>尺寸: {panel.baseWidth} × {panel.baseHeight}</span>
          <span>珠子: {panel.beadCount}颗</span>
          <span style={{ color: '#3b82f6' }}>凹: {concaveCount}组</span>
          <span style={{ color: '#f59e0b' }}>凸: {convexCount}组</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 10px' }}>
          <button
            style={hasPrev ? navBtnStyle : navBtnDisabled}
            onClick={() => hasPrev && onNavigate(currentIndex - 1)}
          >
            <CaretLeft size={20} weight="bold" />
          </button>

          <div style={{ ...modalStyles.canvasWrap, flex: 1, margin: 0 }}>
            <canvas
              ref={canvasRef}
              style={{ maxWidth: '100%', maxHeight: '50vh', objectFit: 'contain' }}
            />
          </div>

          <button
            style={hasNext ? navBtnStyle : navBtnDisabled}
            onClick={() => hasNext && onNavigate(currentIndex + 1)}
          >
            <CaretRight size={20} weight="bold" />
          </button>
        </div>

        <div style={{ display: 'flex', gap: '10px', padding: '12px 20px' }}>
          <button
            style={{
              ...modalStyles.exportBtn,
              margin: 0,
              flex: 1,
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            }}
            onClick={handleExport}
          >
            <Download size={16} /> 导出面板图纸
          </button>
        </div>

        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '11px', margin: '0 0 12px', padding: 0 }}>
          左右滑动 · 箭头键切换
        </p>
      </div>
    </div>
  );
}

// ========================= 组装顺序指南组件 =========================

function AssemblyGuideCard({
  assemblyResult,
}: {
  assemblyResult: PanelAssemblyResult;
}) {
  const steps = getAssemblyGuide(assemblyResult.assemblyOrder);

  return (
    <div
      style={{
        background: 'rgba(59,130,246,0.1)',
        border: '1px solid rgba(59,130,246,0.3)',
        borderRadius: '12px',
        padding: '12px 16px',
        marginTop: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <span style={{ fontSize: '16px' }}>&#x1F527;</span>
        <span style={{ color: '#3b82f6', fontSize: '14px', fontWeight: 'bold' }}>
          组装顺序
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {steps.map((step, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 10px',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '8px',
              fontSize: '13px',
              color: 'rgba(255,255,255,0.8)',
            }}
          >
            {step}
          </div>
        ))}
      </div>

      {/* 边缘连接统计 */}
      <div style={{ marginTop: '10px', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
        共 {assemblyResult.edges.length} 条卡槽边缘连接
      </div>
    </div>
  );
}

// ========================= 推荐卡片组件 =========================

function RecommendationCard({
  recommendation,
  currentType,
}: {
  recommendation: ConnectionRecommendation;
  currentType: ConnectionType;
}) {
  const { analysis } = recommendation;
  const isAutoUsing = currentType === 'auto';

  return (
    <div
      style={{
        background: 'rgba(139, 92, 246, 0.1)',
        border: '1px solid rgba(139, 92, 246, 0.3)',
        borderRadius: '12px',
        padding: '12px 16px',
        marginTop: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <span style={{ fontSize: '16px' }}>🤖</span>
        <span style={{ color: '#8B5CF6', fontSize: '13px', fontWeight: 'bold' }}>
          AI推荐: {recommendation.recommended === 'centipede' ? '蜈蚣骨架'
            : recommendation.recommended === 'tanghulu' ? '糖葫芦串'
            : recommendation.recommended === 'hybrid' ? '混合模式'
            : '无需连接'}
        </span>
        <span style={{
          fontSize: '11px',
          color: 'rgba(255,255,255,0.5)',
          marginLeft: 'auto',
        }}>
          置信度 {(recommendation.confidence * 100).toFixed(0)}%
        </span>
      </div>
      <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', margin: '0 0 8px 0' }}>
        {recommendation.reason}
      </p>
      {isAutoUsing && (
        <p style={{ color: '#8B5CF6', fontSize: '11px', margin: '0 0 8px 0', fontStyle: 'italic' }}>
          当前智能推荐模式，将自动使用此方案
        </p>
      )}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '6px',
        fontSize: '11px',
      }}>
        <div style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
          <div style={{ color: '#fff', fontWeight: 'bold' }}>{analysis.layerCount}</div>
          层数
        </div>
        <div style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
          <div style={{ color: '#fff', fontWeight: 'bold' }}>{Math.round(analysis.avgLayerArea)}</div>
          均面积
        </div>
        <div style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
          <div style={{ color: '#fff', fontWeight: 'bold' }}>{(analysis.overlapRatio * 100).toFixed(0)}%</div>
          重叠率
        </div>
      </div>
    </div>
  );
}

const modalStyles: Record<string, CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.85)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  content: {
    background: '#1e1e2e',
    borderRadius: '16px',
    maxWidth: '420px',
    width: '100%',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#fff',
    fontSize: '24px',
    cursor: 'pointer',
    padding: '0 4px',
  },
  info: {
    display: 'flex',
    gap: '16px',
    padding: '12px 20px',
    color: 'rgba(255,255,255,0.6)',
    fontSize: '13px',
    flexWrap: 'wrap',
  },
  canvasWrap: {
    padding: '10px 20px',
    display: 'flex',
    justifyContent: 'center',
    background: '#f8f8f8',
    margin: '0 10px',
    borderRadius: '8px',
  },
  exportBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: 'calc(100% - 40px)',
    margin: '16px 20px',
    padding: '12px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    borderRadius: '10px',
    color: '#fff',
    fontSize: '15px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
};

// ========================= 主页面 =========================

/** 构建模式 */
type BuildMode = 'contour' | 'panel';

export default function ModelTo3DPage() {
  const navigate = useNavigate();

  // 状态
  const [modelUrl, setModelUrl] = useState<string>('');
  const [modelName, setModelName] = useState<string>('');
  const [resolution, setResolution] = useState(32);
  // 构建模式
  const [buildMode, setBuildMode] = useState<BuildMode>('contour');
  // 等高线参数
  const [shellThickness, setShellThickness] = useState(3);
  const [connectionType, setConnectionType] = useState<ConnectionType>('auto');
  // 面板拼接参数
  const [slotGroupSize, setSlotGroupSize] = useState(3);
  const [slotDepth, setSlotDepth] = useState(2);
  // 处理状态
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ percent: 0, message: '' });
  const [voxelGrid, setVoxelGrid] = useState<VoxelGrid | null>(null);
  // 等高线切片结果
  const [contourSlices, setContourSlices] = useState<ContourSlice[]>([]);
  const [selectedContourIndex, setSelectedContourIndex] = useState<number>(-1);
  // 蜈蚣连接器结果
  const [connectors, setConnectors] = useState<CentipedeConnector[]>([]);
  const [selectedConnector, setSelectedConnector] = useState<CentipedeConnector | null>(null);
  // 糖葫芦串结果
  const [skewers, setSkewers] = useState<TanghuluSkewer[]>([]);
  const [selectedSkewer, setSelectedSkewer] = useState<TanghuluSkewer | null>(null);
  // 推荐结果
  const [recommendation, setRecommendation] = useState<ConnectionRecommendation | null>(null);
  // 面板拼接结果
  const [panelResult, setPanelResult] = useState<PanelAssemblyResult | null>(null);
  const [selectedPanelIndex, setSelectedPanelIndex] = useState<number>(-1);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 重置所有结果
  const resetResults = () => {
    setVoxelGrid(null);
    setContourSlices([]);
    setConnectors([]);
    setSkewers([]);
    setRecommendation(null);
    setPanelResult(null);
    setSelectedPanelIndex(-1);
    setSelectedContourIndex(-1);
  };

  // 选择示例模型
  const handleSelectExample = (model: string) => {
    setModelUrl(`/models/${model}`);
    setModelName(model);
    resetResults();
  };

  // 上传 GLB 文件
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.glb')) {
      alert('请选择 .glb 格式的3D模型文件');
      return;
    }
    const url = URL.createObjectURL(file);
    setModelUrl(url);
    setModelName(file.name);
    resetResults();
  };

  // 开始生成
  const handleGenerate = useCallback(async () => {
    if (!modelUrl) return;
    setProcessing(true);
    setProgress({ percent: 0, message: '加载模型...' });
    resetResults();

    try {
      // 1. 加载模型
      const scene = await loadGLBModel(modelUrl);
      setProgress({ percent: 10, message: '模型加载完成，开始体素化...' });

      // 2. 体素化
      const grid = await voxelizeModel(scene, resolution, (percent, message) => {
        setProgress({ percent: 10 + percent * 0.7, message });
      });

      const stats = getVoxelStats(grid);
      console.log('体素化完成:', stats);
      setVoxelGrid(grid);

      if (buildMode === 'contour') {
        // === 逐层叠加模式 ===
        setProgress({ percent: 85, message: '生成切片...' });

        const result = generateContourSlices(grid, {
          shellThickness,
          connectionType,
        });
        const contourStats = getContourSliceStats(result.slices);
        console.log('等高线切片完成:', contourStats);
        console.log('蜈蚣连接器:', result.connectors.length, '个');
        console.log('糖葫芦串:', result.skewers.length, '个');
        console.log('推荐:', result.recommendation);
        setContourSlices(result.slices);
        setConnectors(result.connectors);
        setSkewers(result.skewers);
        setRecommendation(result.recommendation ?? null);
      } else {
        // === 面板拼接模式 ===
        setProgress({ percent: 85, message: '生成面板图纸...' });

        const result = generatePanelAssembly(grid, {
          slotGroupSize,
          slotDepth,
        });
        console.log('面板拼接完成:', result.stats);
        console.log('面板数:', result.panels.length);
        console.log('边缘连接:', result.edges.length);
        setPanelResult(result);
      }

      setProgress({ percent: 100, message: '完成！' });
    } catch (err) {
      console.error('生成失败:', err);
      alert('生成失败: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setProcessing(false);
    }
  }, [modelUrl, resolution, buildMode, shellThickness, connectionType, slotGroupSize, slotDepth]);

  // 导出所有图纸（等高线 + 连接器 + 插条）
  const handleExportAllContour = () => {
    for (const slice of contourSlices) {
      const canvas = renderContourSliceToCanvas(slice, 20, true, true);
      const link = document.createElement('a');
      link.download = `${slice.id}_contour.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
    for (const conn of connectors) {
      const canvas = renderCentipedeToCanvas(conn, 24, true);
      const link = document.createElement('a');
      link.download = `${conn.id}_centipede.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
    for (const skewer of skewers) {
      const canvas = renderSkewerToCanvas(skewer, 24, true);
      const link = document.createElement('a');
      link.download = `${skewer.id}_skewer.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  };

  // 导出所有面板图纸
  const handleExportAllPanels = () => {
    if (!panelResult) return;
    for (const panel of panelResult.panels) {
      const canvas = renderFacePanelToCanvas(panel, 20, true, true);
      const link = document.createElement('a');
      link.download = `${panel.id}_panel.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  };

  // 计算连接器总珠子数
  const connectorTotalBeads = connectors.reduce((sum, c) => sum + c.beadCount, 0);

  return (
    <div style={pageStyles.container}>
      {/* 头部 */}
      <div style={pageStyles.header}>
        <button style={pageStyles.backBtn} onClick={() => navigate('/mobile/3d')}>
          <ArrowLeft size={20} color="white" />
        </button>
        <div>
          <h1 style={pageStyles.title}>3D模型转拼豆图纸</h1>
          <p style={pageStyles.subtitle}>
            GLB模型 → 等高线镂空图纸
          </p>
        </div>
      </div>

      {/* 模型选择 */}
      <div style={pageStyles.card}>
        <h3 style={pageStyles.cardTitle}>选择3D模型</h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            style={pageStyles.actionBtn}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={18} /> 上传GLB
          </button>
          <button
            style={{ ...pageStyles.actionBtn, background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}
            onClick={() => handleSelectExample('Duck.glb')}
          >
            <Cube size={18} /> Duck
          </button>
          <button
            style={{ ...pageStyles.actionBtn, background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}
            onClick={() => handleSelectExample('Avocado.glb')}
          >
            <Cube size={18} /> Avocado
          </button>
          <button
            style={{ ...pageStyles.actionBtn, background: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)' }}
            onClick={() => handleSelectExample('ColorBox.glb')}
          >
            <Cube size={18} /> Box
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".glb"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        {modelName && (
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', marginTop: '8px' }}>
            当前模型: {modelName}
          </p>
        )}
      </div>

      {/* 3D预览 */}
      {modelUrl && (
        <div style={pageStyles.card}>
          <h3 style={pageStyles.cardTitle}>模型预览</h3>
          <ModelPreview modelUrl={modelUrl} />
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginTop: '8px', textAlign: 'center' }}>
            拖动旋转 · 滚轮缩放
          </p>
        </div>
      )}

      {/* 参数设置 */}
      {modelUrl && (
        <div style={pageStyles.card}>
          <h3 style={pageStyles.cardTitle}>参数设置</h3>

          {/* 构建方式选择器 */}
          <div style={pageStyles.paramRow}>
            <span style={pageStyles.paramLabel}>构建方式</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              {([
                { mode: 'contour' as BuildMode, label: '逐层叠加', desc: '水平切片+连接器', color: '#43e97b' },
                { mode: 'panel' as BuildMode, label: '面板拼接', desc: '6面板+凹凸卡槽', color: '#3b82f6' },
              ]).map(({ mode, label, color }) => (
                <button
                  key={mode}
                  style={{
                    padding: '8px 18px',
                    border: buildMode === mode
                      ? `2px solid ${color}`
                      : '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '10px',
                    background: buildMode === mode
                      ? `${color}22`
                      : 'transparent',
                    color: buildMode === mode ? color : 'rgba(255,255,255,0.6)',
                    fontSize: '14px',
                    fontWeight: buildMode === mode ? 'bold' : 'normal',
                    cursor: 'pointer',
                    flex: 1,
                    textAlign: 'center',
                  }}
                  onClick={() => setBuildMode(mode)}
                >
                  {label}
                </button>
              ))}
            </div>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', marginTop: '6px' }}>
              {buildMode === 'contour'
                ? '适合有机形状（鸭子、牛油果等），逐层堆叠组装'
                : '适合规则几何体（盒子、立方体），6面板卡槽拼接'}
            </p>
          </div>

          {/* 分辨率 */}
          <div style={pageStyles.paramRow}>
            <span style={pageStyles.paramLabel}>分辨率</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[16, 32, 48, 64].map((r) => (
                <button
                  key={r}
                  style={{
                    ...pageStyles.chipBtn,
                    ...(resolution === r ? pageStyles.chipBtnActive : {}),
                  }}
                  onClick={() => setResolution(r)}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* === 逐层叠加模式参数 === */}
          {buildMode === 'contour' && (
            <>
              <div style={pageStyles.paramRow}>
                <span style={pageStyles.paramLabel}>壳厚度（珠子宽度）</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[2, 3, 4].map((t) => (
                    <button
                      key={t}
                      style={{
                        ...pageStyles.chipBtn,
                        ...(shellThickness === t ? {
                          ...pageStyles.chipBtnActive,
                          background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                        } : {}),
                      }}
                      onClick={() => setShellThickness(t)}
                    >
                      {t}珠
                    </button>
                  ))}
                </div>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', marginTop: '4px' }}>
                  {shellThickness === 2 ? '2珠宽：省珠子，适合小模型'
                    : shellThickness === 3 ? '3珠宽：平衡强度与省料（推荐）'
                    : '4珠宽：最坚固，适合大模型'}
                </p>
              </div>

              <div style={pageStyles.paramRow}>
                <span style={pageStyles.paramLabel}>连接方式</span>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {([
                    { type: 'auto' as ConnectionType, label: '智能推荐', color: '#8B5CF6' },
                    { type: 'centipede' as ConnectionType, label: '蜈蚣骨架', color: '#FF8C00' },
                    { type: 'tanghulu' as ConnectionType, label: '糖葫芦串', color: '#8B5CF6' },
                    { type: 'hybrid' as ConnectionType, label: '混合模式', color: '#EC4899' },
                    { type: 'none' as ConnectionType, label: '无连接', color: '#6B7280' },
                  ]).map(({ type, label, color }) => (
                    <button
                      key={type}
                      style={{
                        padding: '6px 12px',
                        border: connectionType === type
                          ? `2px solid ${color}`
                          : '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px',
                        background: connectionType === type
                          ? `${color}22`
                          : 'transparent',
                        color: connectionType === type ? color : 'rgba(255,255,255,0.6)',
                        fontSize: '12px',
                        fontWeight: connectionType === type ? 'bold' : 'normal',
                        cursor: 'pointer',
                      }}
                      onClick={() => setConnectionType(type)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', marginTop: '6px' }}>
                  {connectionType === 'auto' ? '根据模型特征自动选择最佳连接方式（推荐）'
                    : connectionType === 'centipede' ? '相邻层通过蜈蚣连接片固定，交替水平/垂直方向'
                    : connectionType === 'tanghulu' ? '竖直插条贯穿所有层，每层挖槽像串糖葫芦'
                    : connectionType === 'hybrid' ? '糖葫芦串+蜈蚣骨架混合使用，最稳固'
                    : '不使用连接结构，适合简单模型'}
                </p>
              </div>
            </>
          )}

          {/* === 面板拼接模式参数 === */}
          {buildMode === 'panel' && (
            <>
              <div style={pageStyles.paramRow}>
                <span style={pageStyles.paramLabel}>凹凸分组大小</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[2, 3, 4].map((s) => (
                    <button
                      key={s}
                      style={{
                        ...pageStyles.chipBtn,
                        ...(slotGroupSize === s ? {
                          ...pageStyles.chipBtnActive,
                          background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                        } : {}),
                      }}
                      onClick={() => setSlotGroupSize(s)}
                    >
                      {s}珠
                    </button>
                  ))}
                </div>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', marginTop: '4px' }}>
                  {slotGroupSize === 2 ? '2珠一组：卡槽密集，咬合紧密'
                    : slotGroupSize === 3 ? '3珠一组：平衡稳固与简洁（推荐）'
                    : '4珠一组：卡槽较少，适合大模型'}
                </p>
              </div>

              <div style={pageStyles.paramRow}>
                <span style={pageStyles.paramLabel}>槽深度</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[2, 3].map((d) => (
                    <button
                      key={d}
                      style={{
                        ...pageStyles.chipBtn,
                        ...(slotDepth === d ? {
                          ...pageStyles.chipBtnActive,
                          background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                        } : {}),
                      }}
                      onClick={() => setSlotDepth(d)}
                    >
                      {d}珠
                    </button>
                  ))}
                </div>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', marginTop: '4px' }}>
                  {slotDepth === 2 ? '2珠深：标准深度，适合大多数模型（推荐）'
                    : '3珠深：更深卡槽，咬合更牢固'}
                </p>
              </div>
            </>
          )}

          {/* 生成按钮 */}
          <button
            style={{
              ...pageStyles.generateBtn,
              background: buildMode === 'contour'
                ? 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
                : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              opacity: processing ? 0.6 : 1,
            }}
            onClick={handleGenerate}
            disabled={processing}
          >
            {processing ? (
              <>
                <span style={pageStyles.spinner} /> {progress.message}
              </>
            ) : (
              <>
                <CaretRight size={20} weight="bold" />
                {buildMode === 'contour' ? '开始生成等高线' : '开始生成面板图纸'}
              </>
            )}
          </button>

          {/* 进度条 */}
          {processing && (
            <div style={pageStyles.progressBar}>
              <div
                style={{
                  ...pageStyles.progressFill,
                  background: buildMode === 'contour'
                    ? 'linear-gradient(90deg, #43e97b, #38f9d7)'
                    : 'linear-gradient(90deg, #3b82f6, #1d4ed8)',
                  width: `${progress.percent}%`,
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* 体素统计 */}
      {voxelGrid && (
        <div style={pageStyles.card}>
          <h3 style={pageStyles.cardTitle}>体素化结果</h3>
          <div style={pageStyles.statsGrid}>
            <div style={pageStyles.statItem}>
              <span style={pageStyles.statValue}>{voxelGrid.sizeX}×{voxelGrid.sizeY}×{voxelGrid.sizeZ}</span>
              <span style={pageStyles.statLabel}>网格尺寸</span>
            </div>
            <div style={pageStyles.statItem}>
              <span style={pageStyles.statValue}>{getVoxelStats(voxelGrid).totalVoxels}</span>
              <span style={pageStyles.statLabel}>体素数量</span>
            </div>
            <div style={pageStyles.statItem}>
              <span style={pageStyles.statValue}>{(getVoxelStats(voxelGrid).filledRatio * 100).toFixed(1)}%</span>
              <span style={pageStyles.statLabel}>填充率</span>
            </div>
          </div>
        </div>
      )}

      {/* 3D体素预览 */}
      {voxelGrid && (
        <div style={pageStyles.card}>
          <h3 style={pageStyles.cardTitle}>3D体素预览</h3>
          <VoxelViewer voxelGrid={voxelGrid} height={300} />
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginTop: '8px', textAlign: 'center' }}>
            拖动旋转 · 滚轮缩放 · 与上方原始模型对比形状
          </p>
        </div>
      )}

      {/* 等高线叠加3D预览 - 验证逐层切片是否正确 */}
      {contourSlices.length > 0 && voxelGrid && (
        <div style={pageStyles.card}>
          <h3 style={pageStyles.cardTitle}>逐层叠加预览</h3>
          <StackedLayerViewer
            layers={contourSlices}
            gridSizeX={voxelGrid.sizeX}
            gridSizeY={voxelGrid.sizeY}
            gridSizeZ={voxelGrid.sizeZ}
            height={300}
          />
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginTop: '8px', textAlign: 'center' }}>
            所有层叠加后的3D效果 · 与上方体素图对比验证
          </p>
        </div>
      )}

      {/* 等高线切片结果 */}
      {contourSlices.length > 0 && (
        <div style={pageStyles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ ...pageStyles.cardTitle, marginBottom: 0 }}>等高线切片结果</h3>
            <button style={pageStyles.exportAllBtn} onClick={handleExportAllContour}>
              <Download size={14} /> 导出全部
            </button>
          </div>

          {/* AI推荐卡片 */}
          {recommendation && (
            <RecommendationCard
              recommendation={recommendation}
              currentType={connectionType}
            />
          )}

          <p style={{ color: '#43e97b', fontSize: '14px', fontWeight: 'bold', marginTop: '16px', marginBottom: '10px' }}>
            共 {contourSlices.length} 层（从底到顶）
          </p>

          <div style={pageStyles.sliceGrid}>
            {contourSlices.map((slice, idx) => (
              <ContourSliceThumbnail
                key={slice.id}
                slice={slice}
                onClick={() => setSelectedContourIndex(idx)}
              />
            ))}
          </div>

          {/* 蜈蚣连接器列表 */}
          {connectors.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <p style={{ color: '#FF8C00', fontSize: '14px', fontWeight: 'bold', marginBottom: '10px' }}>
                蜈蚣连接片 × {connectors.length}
              </p>
              <div style={pageStyles.sliceGrid}>
                {connectors.map((conn) => (
                  <CentipedeConnectorThumbnail
                    key={conn.id}
                    connector={conn}
                    onClick={() => setSelectedConnector(conn)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 糖葫芦串插条列表 */}
          {skewers.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <p style={{ color: '#8B5CF6', fontSize: '14px', fontWeight: 'bold', marginBottom: '10px' }}>
                糖葫芦串插条 × {skewers.length}
              </p>
              <div style={pageStyles.sliceGrid}>
                {skewers.map((skewer) => (
                  <TanghuluSkewerThumbnail
                    key={skewer.id}
                    skewer={skewer}
                    onClick={() => setSelectedSkewer(skewer)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 等高线统计 */}
          {(() => {
            const stats = getContourSliceStats(contourSlices);
            const skewerTotalBeads = skewers.reduce((sum, s) => sum + s.beadCount, 0);
            const hasConnOrSkewer = connectors.length > 0 || skewers.length > 0;
            const colCount = 2 + (connectors.length > 0 ? 1 : 0) + (skewers.length > 0 ? 1 : 0) + (hasConnOrSkewer ? 1 : 0);
            return (
              <div style={{ ...pageStyles.statsGrid, marginTop: '16px', gridTemplateColumns: `repeat(${Math.min(colCount, 5)}, 1fr)` }}>
                <div style={pageStyles.statItem}>
                  <span style={pageStyles.statValue}>{stats.totalLayers}</span>
                  <span style={pageStyles.statLabel}>总层数</span>
                </div>
                <div style={pageStyles.statItem}>
                  <span style={pageStyles.statValue}>{stats.totalBeads}</span>
                  <span style={pageStyles.statLabel}>层珠子</span>
                </div>
                {connectors.length > 0 && (
                  <div style={pageStyles.statItem}>
                    <span style={{ ...pageStyles.statValue, color: '#FF8C00' }}>{connectors.length}</span>
                    <span style={pageStyles.statLabel}>连接器</span>
                  </div>
                )}
                {skewers.length > 0 && (
                  <div style={pageStyles.statItem}>
                    <span style={{ ...pageStyles.statValue, color: '#8B5CF6' }}>{skewers.length}</span>
                    <span style={pageStyles.statLabel}>插条</span>
                  </div>
                )}
                {hasConnOrSkewer && (
                  <div style={pageStyles.statItem}>
                    <span style={pageStyles.statValue}>{stats.totalBeads + connectorTotalBeads + skewerTotalBeads}</span>
                    <span style={pageStyles.statLabel}>总珠子</span>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* ========================= 面板拼接结果 ========================= */}

      {/* 面板拼接3D预览 */}
      {panelResult && voxelGrid && (
        <div style={pageStyles.card}>
          <h3 style={pageStyles.cardTitle}>面板拼接3D预览</h3>
          <PanelAssembly3DViewer
            panels={panelResult.panels}
            gridSizeX={voxelGrid.sizeX}
            gridSizeY={voxelGrid.sizeY}
            gridSizeZ={voxelGrid.sizeZ}
            height={300}
          />
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginTop: '8px', textAlign: 'center' }}>
            6个面板按立方体拼接的3D效果 · 拖动旋转 · 滚轮缩放
          </p>
        </div>
      )}

      {/* 面板图纸 */}
      {panelResult && panelResult.panels.length > 0 && (
        <div style={pageStyles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ ...pageStyles.cardTitle, marginBottom: 0 }}>面板图纸</h3>
            <button style={pageStyles.exportAllBtn} onClick={handleExportAllPanels}>
              <Download size={14} /> 导出全部
            </button>
          </div>

          <p style={{ color: '#3b82f6', fontSize: '14px', fontWeight: 'bold', marginBottom: '10px' }}>
            共 {panelResult.panels.length} 个面板
          </p>

          <div style={pageStyles.sliceGrid}>
            {panelResult.panels.map((panel, idx) => (
              <FacePanelThumbnail
                key={panel.id}
                panel={panel}
                onClick={() => setSelectedPanelIndex(idx)}
              />
            ))}
          </div>

          {/* 组装顺序指南 */}
          <AssemblyGuideCard assemblyResult={panelResult} />

          {/* 面板统计 */}
          <div style={{ ...pageStyles.statsGrid, marginTop: '16px', gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div style={pageStyles.statItem}>
              <span style={{ ...pageStyles.statValue, color: '#3b82f6' }}>{panelResult.stats.totalPanels}</span>
              <span style={pageStyles.statLabel}>面板数</span>
            </div>
            <div style={pageStyles.statItem}>
              <span style={pageStyles.statValue}>{panelResult.stats.totalBeads}</span>
              <span style={pageStyles.statLabel}>总珠子数</span>
            </div>
            <div style={pageStyles.statItem}>
              <span style={pageStyles.statValue}>{panelResult.edges.length}</span>
              <span style={pageStyles.statLabel}>边缘连接</span>
            </div>
          </div>

          {/* 每面珠子分布 */}
          <div style={{ marginTop: '12px' }}>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '8px' }}>各面珠子分布:</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {panelResult.stats.panelBreakdown.map(({ face, beadCount }) => (
                <div
                  key={face}
                  style={{
                    padding: '4px 10px',
                    background: 'rgba(59,130,246,0.1)',
                    border: '1px solid rgba(59,130,246,0.2)',
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: 'rgba(255,255,255,0.7)',
                  }}
                >
                  {getFaceLabel(face)}: {beadCount}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 面板详情弹窗（支持左右滑动） */}
      {selectedPanelIndex >= 0 && panelResult && panelResult.panels.length > 0 && (
        <FacePanelDetailModal
          panels={panelResult.panels}
          currentIndex={selectedPanelIndex}
          onClose={() => setSelectedPanelIndex(-1)}
          onNavigate={(idx) => setSelectedPanelIndex(idx)}
        />
      )}

      {/* 等高线切片详情弹窗（支持左右滑动） */}
      {selectedContourIndex >= 0 && contourSlices.length > 0 && (
        <ContourSliceDetailModal
          slices={contourSlices}
          currentIndex={selectedContourIndex}
          onClose={() => setSelectedContourIndex(-1)}
          onNavigate={(idx) => setSelectedContourIndex(idx)}
        />
      )}

      {/* 蜈蚣连接器详情弹窗 */}
      {selectedConnector && (
        <CentipedeDetailModal
          connector={selectedConnector}
          onClose={() => setSelectedConnector(null)}
        />
      )}

      {/* 糖葫芦串插条详情弹窗 */}
      {selectedSkewer && (
        <TanghuluSkewerDetailModal
          skewer={selectedSkewer}
          onClose={() => setSelectedSkewer(null)}
        />
      )}
    </div>
  );
}

// ========================= 样式 =========================

const pageStyles: Record<string, CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
    padding: '20px',
    paddingBottom: '100px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '24px',
    color: 'white',
  },
  backBtn: {
    background: 'rgba(255,255,255,0.15)',
    border: 'none',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    marginRight: '15px',
  },
  title: {
    fontSize: '22px',
    fontWeight: 'bold',
    margin: 0,
    color: '#fff',
  },
  subtitle: {
    fontSize: '13px',
    opacity: 0.6,
    marginTop: '4px',
    color: '#fff',
  },
  card: {
    background: 'rgba(255,255,255,0.08)',
    borderRadius: '16px',
    padding: '20px',
    marginBottom: '16px',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 0,
    marginBottom: '14px',
  },
  actionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 18px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    borderRadius: '10px',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  paramRow: {
    marginBottom: '16px',
  },
  paramLabel: {
    display: 'block',
    color: 'rgba(255,255,255,0.7)',
    fontSize: '13px',
    marginBottom: '8px',
  },
  chipBtn: {
    padding: '6px 16px',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '20px',
    background: 'transparent',
    color: 'rgba(255,255,255,0.6)',
    fontSize: '14px',
    cursor: 'pointer',
  },
  chipBtnActive: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: '1px solid transparent',
    color: '#fff',
    fontWeight: 'bold',
  },
  generateBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    border: 'none',
    borderRadius: '12px',
    color: '#fff',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '8px',
  },
  spinner: {
    display: 'inline-block',
    width: '16px',
    height: '16px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  progressBar: {
    height: '4px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '2px',
    marginTop: '12px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #f093fb, #f5576c)',
    borderRadius: '2px',
    transition: 'width 0.3s ease',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '10px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '10px',
  },
  statValue: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.5)',
    marginTop: '4px',
  },
  sliceGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
  },
  exportAllBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 14px',
    background: 'rgba(255,255,255,0.15)',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '13px',
    cursor: 'pointer',
  },
};
