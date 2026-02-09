import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/gameStore';
import GameCanvas from '@/components/GameCanvas';
import Toolbar from '@/components/Toolbar';
import ColorPalette from '@/components/ColorPalette';
import IroningPanel from '@/components/IroningPanel';
import SavePanel from '@/components/SavePanel';
import './GamePage.css';

export default function GamePage() {
  const navigate = useNavigate();
  const phase = useGameStore((s) => s.phase);
  const [showSavePanel, setShowSavePanel] = useState(false);

  useEffect(() => {
    if (phase === 'selecting') {
      navigate('/');
    }
  }, [phase, navigate]);

  // 熨烫阶段显示熨烫面板
  if (phase === 'ironing') {
    return <IroningPanel />;
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
