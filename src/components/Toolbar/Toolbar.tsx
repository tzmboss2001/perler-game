/**
 * Toolbar - 游戏工具栏
 * 包含：返回、撤销/重做、画笔/橡皮擦切换、清空、引导开关、音效开关、熨烫入口
 */

import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/gameStore';
import type { DrawTool } from '@/store/gameStore';
import './Toolbar.css';

interface ToolbarProps {
  onSave?: () => void;
}

export default function Toolbar({ onSave }: ToolbarProps) {
  const navigate = useNavigate();
  const board = useGameStore((s) => s.board);
  const drawTool = useGameStore((s) => s.drawTool);
  const setDrawTool = useGameStore((s) => s.setDrawTool);
  const undo = useGameStore((s) => s.undo);
  const redo = useGameStore((s) => s.redo);
  const canUndo = useGameStore((s) => s.canUndo);
  const canRedo = useGameStore((s) => s.canRedo);
  const clearBeads = useGameStore((s) => s.clearBeads);
  const setPhase = useGameStore((s) => s.setPhase);
  const renderVersion = useGameStore((s) => s.renderVersion);
  const selectedTemplate = useGameStore((s) => s.selectedTemplate);
  const showGuide = useGameStore((s) => s.showGuide);
  const toggleGuide = useGameStore((s) => s.toggleGuide);
  const soundEnabled = useGameStore((s) => s.soundEnabled);
  const toggleSound = useGameStore((s) => s.toggleSound);

  // 强制重新计算 canUndo/canRedo（因为依赖 renderVersion）
  void renderVersion;
  const _canUndo = canUndo();
  const _canRedo = canRedo();

  const handleIroning = () => {
    if (board.count === 0) return;
    setPhase('ironing');
    navigate('/game'); // 保持在游戏页面，切换熨烫UI
  };

  const tools: { id: DrawTool; label: string }[] = [
    { id: 'pen', label: '🖊' },
    { id: 'eraser', label: '⌫' },
  ];

  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <button className="tool-btn" onClick={() => navigate('/')}>
          ←
        </button>
      </div>

      <div className="toolbar-center">
        <button
          className={`tool-btn ${!_canUndo ? 'disabled' : ''}`}
          onClick={undo}
          disabled={!_canUndo}
          title="撤销"
        >
          ↩
        </button>
        <button
          className={`tool-btn ${!_canRedo ? 'disabled' : ''}`}
          onClick={redo}
          disabled={!_canRedo}
          title="重做"
        >
          ↪
        </button>

        <div className="tool-divider" />

        {tools.map((t) => (
          <button
            key={t.id}
            className={`tool-btn ${drawTool === t.id ? 'active' : ''}`}
            onClick={() => setDrawTool(t.id)}
            title={t.id === 'pen' ? '画笔' : '橡皮擦'}
          >
            {t.label}
          </button>
        ))}

        <div className="tool-divider" />

        <button
          className="tool-btn"
          onClick={clearBeads}
          title="清空"
        >
          🗑
        </button>

        {/* 保存按钮 */}
        {onSave && (
          <button
            className="tool-btn"
            onClick={onSave}
            title="存档"
          >
            💾
          </button>
        )}

        {/* 模板引导开关 */}
        {selectedTemplate && (
          <button
            className={`tool-btn ${showGuide ? 'active' : ''}`}
            onClick={toggleGuide}
            title={showGuide ? '隐藏引导' : '显示引导'}
          >
            👁
          </button>
        )}

        {/* 音效开关 */}
        <button
          className={`tool-btn ${soundEnabled ? '' : 'muted'}`}
          onClick={toggleSound}
          title={soundEnabled ? '静音' : '开启声音'}
        >
          {soundEnabled ? '🔊' : '🔇'}
        </button>
      </div>

      <div className="toolbar-right">
        <span className="bead-count">{board.count}</span>
        <button
          className={`ironing-btn ${board.count === 0 ? 'disabled' : ''}`}
          onClick={handleIroning}
          disabled={board.count === 0}
        >
          熨烫
        </button>
      </div>
    </div>
  );
}
