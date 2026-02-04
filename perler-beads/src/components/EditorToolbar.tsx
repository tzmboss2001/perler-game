/**
 * 编辑工具栏组件
 * 支持触摸和鼠标操作
 */

import React from 'react';
import { PaintBrush, PaintBucket, Eraser, Eyedropper, ArrowCounterClockwise, ArrowClockwise, MagicWand } from '@phosphor-icons/react';
import { EditorTool } from '../store/editorStore';
import { BeadColor } from '../data/beadColors';
import { colors, radius, typography, shadows, animation } from '../styles/designSystem';

interface EditorToolbarProps {
  currentTool: EditorTool;
  onToolChange: (tool: EditorTool) => void;
  currentColor: BeadColor | null;
  onColorClick: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  isEditMode: boolean; // 用于控制工具栏启用/禁用
  onEnterBackgroundMode?: () => void; // 进入背景处理模式
}

const EditorToolbar: React.FC<EditorToolbarProps> = ({
  currentTool,
  onToolChange,
  currentColor,
  onColorClick,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  isEditMode,
  onEnterBackgroundMode,
}) => {
  const tools: { id: EditorTool; icon: React.ReactNode; label: string }[] = [
    { id: 'brush', icon: <PaintBrush size={20} weight="fill" />, label: '画笔' },
    { id: 'fill', icon: <PaintBucket size={20} weight="fill" />, label: '填充' },
    { id: 'eraser', icon: <Eraser size={20} weight="fill" />, label: '橡皮' },
    { id: 'picker', icon: <Eyedropper size={20} weight="fill" />, label: '吸色' },
  ];

  return (
    <div style={styles.container}>
      {/* 当前颜色 */}
      <button
        style={{
          ...styles.colorButton,
          opacity: isEditMode ? 1 : 0.5,
          pointerEvents: isEditMode ? 'auto' : 'none',
        }}
        onClick={onColorClick}
        title="选择颜色"
      >
        <div
          style={{
            ...styles.colorPreview,
            backgroundColor: currentColor?.hex || '#ffffff',
          }}
        />
        <span style={styles.colorLabel}>
          {currentColor?.id || '选色'}
        </span>
      </button>

      {/* 工具按钮 */}
      <div style={{
        ...styles.toolGroup,
        opacity: isEditMode ? 1 : 0.5,
        pointerEvents: isEditMode ? 'auto' : 'none',
      }}>
        {tools.map((tool) => (
          <button
            key={tool.id}
            style={{
              ...styles.toolButton,
              ...(currentTool === tool.id ? styles.toolButtonActive : {}),
            }}
            onClick={() => onToolChange(tool.id)}
            title={tool.label}
          >
            {tool.icon}
          </button>
        ))}
      </div>

      {/* 撤销/重做 */}
      <div style={styles.historyGroup}>
        <button
          style={{
            ...styles.historyButton,
            opacity: canUndo ? 1 : 0.4,
          }}
          onClick={onUndo}
          disabled={!canUndo}
          title="撤销"
        >
          <ArrowCounterClockwise size={18} weight="bold" />
        </button>
        <button
          style={{
            ...styles.historyButton,
            opacity: canRedo ? 1 : 0.4,
          }}
          onClick={onRedo}
          disabled={!canRedo}
          title="重做"
        >
          <ArrowClockwise size={18} weight="bold" />
        </button>
      </div>

      {/* 背景处理模式入口 */}
      {onEnterBackgroundMode && (
        <button
          style={{
            ...styles.magicButton,
            opacity: isEditMode ? 1 : 0.5,
            pointerEvents: isEditMode ? 'auto' : 'none',
          }}
          onClick={onEnterBackgroundMode}
          title="背景透明化"
        >
          <MagicWand size={18} weight="fill" />
        </button>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '8px 10px',
    background: colors.bg.card,
    borderRadius: radius.card,
    boxShadow: shadows.md,
    border: `1px solid ${colors.border.soft}`,
    flexWrap: 'nowrap',
  },


  colorButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 6px',
    background: colors.bg.tertiary,
    border: `1px solid ${colors.border.soft}`,
    borderRadius: radius.button,
    cursor: 'pointer',
    transition: animation.transition.fast,
    flexShrink: 0,
  },

  colorPreview: {
    width: '20px',
    height: '20px',
    borderRadius: radius.bead,
    boxShadow: `inset 0 2px 4px rgba(0,0,0,0.1), ${shadows.sm}`,
    border: '2px solid rgba(255,255,255,0.2)',
  },

  colorLabel: {
    fontSize: '10px',
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.secondary,
  },

  toolGroup: {
    display: 'flex',
    gap: '1px',
    padding: '2px',
    background: colors.bg.tertiary,
    borderRadius: radius.button,
    flexShrink: 0,
  },

  toolButton: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    borderRadius: radius.bead,
    color: colors.text.secondary,
    cursor: 'pointer',
    transition: animation.transition.fast,
  },

  toolButtonActive: {
    background: `linear-gradient(145deg, ${colors.bead.cyan}, ${colors.bead.cyan}cc)`,
    color: '#ffffff',
    boxShadow: shadows.sm,
  },

  historyGroup: {
    display: 'flex',
    gap: '2px',
    flexShrink: 0,
  },

  historyButton: {
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: colors.bg.tertiary,
    border: `1px solid ${colors.border.soft}`,
    borderRadius: radius.bead,
    color: colors.text.secondary,
    cursor: 'pointer',
    transition: animation.transition.fast,
  },

  magicButton: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: `linear-gradient(145deg, ${colors.bead.yellow}, ${colors.bead.orange})`,
    border: 'none',
    borderRadius: radius.bead,
    color: '#ffffff',
    cursor: 'pointer',
    transition: animation.transition.fast,
    flexShrink: 0,
    boxShadow: `0 2px 6px ${colors.bead.orange}60`,
  },
};

export default EditorToolbar;
