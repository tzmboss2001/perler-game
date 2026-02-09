/**
 * SavePanel - 存档面板
 * 显示存档列表，支持保存当前、加载、删除操作
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/gameStore';
import { BeadBoard } from '@/core/BeadBoard';
import { listSaves, savework, deleteSave, loadSave, generateThumbnail } from '@/services/storage';
import type { SaveData } from '@/services/storage';
import './SavePanel.css';

interface SavePanelProps {
  onClose: () => void;
}

export default function SavePanel({ onClose }: SavePanelProps) {
  const navigate = useNavigate();
  const board = useGameStore((s) => s.board);
  const setBoardSize = useGameStore((s) => s.setBoardSize);
  const setPhase = useGameStore((s) => s.setPhase);
  const triggerRender = useGameStore((s) => s.triggerRender);

  const [saves, setSaves] = useState<SaveData[]>([]);
  const [saveName, setSaveName] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);

  useEffect(() => {
    setSaves(listSaves());
  }, []);

  const handleSave = () => {
    const beads = board.getAllBeads();
    const thumbnail = generateThumbnail(beads, board.width, board.height);
    const name = saveName.trim() || `作品 ${new Date().toLocaleString('zh-CN')}`;

    savework({
      name,
      boardJson: board.serialize(),
      thumbnail,
      templateId: board.templateId,
      beadCount: board.count,
      boardWidth: board.width,
      boardHeight: board.height,
    });

    setSaves(listSaves());
    setShowSaveForm(false);
    setSaveName('');
  };

  const handleLoad = (id: string) => {
    const save = loadSave(id);
    if (!save) return;

    const newBoard = BeadBoard.deserialize(save.boardJson);
    setBoardSize(newBoard.width, newBoard.height);

    // 手动恢复拼豆到新 board
    const store = useGameStore.getState();
    store.board.clear();
    for (const bead of newBoard.beads.values()) {
      store.board.beads.set(`${bead.x},${bead.y}`, bead);
    }

    setPhase('placing');
    triggerRender();
    onClose();
    navigate('/game');
  };

  const handleDelete = (id: string) => {
    deleteSave(id);
    setSaves(listSaves());
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="save-panel-overlay" onClick={onClose}>
      <div className="save-panel" onClick={e => e.stopPropagation()}>
        <div className="save-panel-header">
          <h3>存档管理</h3>
          <button className="save-panel-close" onClick={onClose}>✕</button>
        </div>

        {/* 保存当前 */}
        {board.count > 0 && (
          <div className="save-current">
            {!showSaveForm ? (
              <button className="save-btn-main" onClick={() => setShowSaveForm(true)}>
                保存当前作品
              </button>
            ) : (
              <div className="save-form">
                <input
                  type="text"
                  className="save-name-input"
                  placeholder="作品名称（可选）"
                  value={saveName}
                  onChange={e => setSaveName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSave()}
                  autoFocus
                />
                <div className="save-form-actions">
                  <button className="save-btn-confirm" onClick={handleSave}>保存</button>
                  <button className="save-btn-cancel" onClick={() => setShowSaveForm(false)}>取消</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 存档列表 */}
        <div className="save-list">
          {saves.length === 0 ? (
            <p className="save-empty">暂无存档</p>
          ) : (
            saves.map(save => (
              <div key={save.id} className="save-item">
                <img src={save.thumbnail} alt={save.name} className="save-thumb" />
                <div className="save-info">
                  <span className="save-item-name">{save.name}</span>
                  <span className="save-item-meta">
                    {save.boardWidth}x{save.boardHeight} | {save.beadCount}颗 | {formatDate(save.createdAt)}
                  </span>
                </div>
                <div className="save-item-actions">
                  <button className="save-load-btn" onClick={() => handleLoad(save.id)}>加载</button>
                  <button className="save-delete-btn" onClick={() => handleDelete(save.id)}>删除</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
