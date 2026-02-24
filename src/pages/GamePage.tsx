import { useState, useEffect, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/gameStore';
import GameCanvas from '@/components/GameCanvas';
import Toolbar from '@/components/Toolbar';
import ColorPalette from '@/components/ColorPalette';
import IroningPanel from '@/components/IroningPanel';
import RescuePanel from '@/components/RescuePanel';
import SavePanel from '@/components/SavePanel';
import TapingPanel from '@/components/TapingPanel';
import PaperingPanel from '@/components/PaperingPanel';
import './GamePage.css';

// 3D 场景懒加载（Three.js ~245KB gzip）
const FlippingScene = lazy(() => import('@/components/Scene3D/FlippingScene'));
const RemovingScene = lazy(() => import('@/components/Scene3D/RemovingScene'));

/** 3D 场景加载占位 */
function Scene3DFallback() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      height: '100vh',
      background: '#1a1a2e',
      color: '#fff',
      fontSize: '1.1rem',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 40, height: 40, margin: '0 auto 12px',
          border: '3px solid rgba(255,255,255,0.2)',
          borderTopColor: '#fff',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        加载3D场景中...
      </div>
    </div>
  );
}

export default function GamePage() {
  const navigate = useNavigate();
  const phase = useGameStore((s) => s.phase);
  const [showSavePanel, setShowSavePanel] = useState(false);

  useEffect(() => {
    if (phase === 'selecting') {
      navigate('/');
    }
  }, [phase, navigate]);

  // 贴美纹纸阶段
  if (phase === 'taping') {
    return <TapingPanel />;
  }

  // 翻转钉板阶段 (3D)
  if (phase === 'flipping') {
    return (
      <Suspense fallback={<Scene3DFallback />}>
        <FlippingScene />
      </Suspense>
    );
  }

  // 去除钉板阶段 (3D)
  if (phase === 'removing') {
    return (
      <Suspense fallback={<Scene3DFallback />}>
        <RemovingScene />
      </Suspense>
    );
  }

  // 铺烘焙纸阶段
  if (phase === 'papering') {
    return <PaperingPanel />;
  }

  // 熨烫阶段显示熨烫面板
  if (phase === 'ironing') {
    return <IroningPanel />;
  }

  // 抢救阶段显示抢救面板
  if (phase === 'rescuing') {
    return <RescuePanel />;
  }

  // 放置阶段显示画布
  return (
    <div className="game-page">
      <Toolbar onSave={() => setShowSavePanel(true)} />
      <GameCanvas />
      <ColorPalette />
      {showSavePanel && (
        <SavePanel onClose={() => setShowSavePanel(false)} />
      )}
    </div>
  );
}
