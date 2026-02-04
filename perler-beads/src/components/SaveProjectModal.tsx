import React, { useState, useEffect } from 'react';
import { X, CircleNotch } from '@phosphor-icons/react';
import { colors, spacing, radius, typography, shadows, animation, mixins } from '../styles/designSystem';

interface SaveProjectModalProps {
  visible: boolean;
  onSave: (name: string) => void;
  onCancel: () => void;
  loading?: boolean;
  defaultName?: string;
}

const SaveProjectModal: React.FC<SaveProjectModalProps> = ({
  visible,
  onSave,
  onCancel,
  loading = false,
  defaultName = '',
}) => {
  const [name, setName] = useState(defaultName);

  useEffect(() => {
    if (visible) {
      // 打开弹窗时生成默认名称
      const now = new Date();
      const defaultProjectName = `拼豆方案_${now.getMonth() + 1}${now.getDate()}_${now.getHours()}${now.getMinutes()}`;
      setName(defaultName || defaultProjectName);
    }
  }, [visible, defaultName]);

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return;
    }
    onSave(trimmedName);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleSave();
    }
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  if (!visible) return null;

  return (
    <div style={styles.overlay} onClick={onCancel}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* 头部 */}
        <div style={styles.header}>
          <h3 style={styles.title}>保存方案</h3>
          <button style={styles.closeButton} onClick={onCancel}>
            <X size={20} weight="bold" />
          </button>
        </div>

        {/* 内容 */}
        <div style={styles.content}>
          <p style={styles.description}>
            为你的拼豆方案起个名字，方便下次继续制作
          </p>
          <div style={styles.inputGroup}>
            <label style={styles.label}>方案名称</label>
            <input
              type="text"
              style={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入方案名称"
              maxLength={50}
              autoFocus
            />
          </div>
        </div>

        {/* 底部按钮 */}
        <div style={styles.footer}>
          <button
            style={styles.cancelButton}
            onClick={onCancel}
            disabled={loading}
          >
            取消
          </button>
          <button
            style={{
              ...styles.saveButton,
              opacity: loading || !name.trim() ? 0.6 : 1,
            }}
            onClick={handleSave}
            disabled={loading || !name.trim()}
          >
            {loading ? (
              <>
                <CircleNotch size={18} style={{ animation: 'spin 1s linear infinite' }} />
                保存中...
              </>
            ) : '保存并开始制作'}
          </button>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: spacing.lg,
    backdropFilter: 'blur(4px)',
  },
  modal: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.xl,
    border: `1px solid ${colors.border.soft}`,
    boxShadow: shadows.lg,
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${spacing.lg}px ${spacing.xl}px`,
    borderBottom: `1px solid ${colors.border.soft}`,
  },
  title: {
    margin: 0,
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    fontFamily: typography.fontFamilyAlt,
  },
  closeButton: {
    width: 32,
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    borderRadius: radius.md,
    color: colors.text.secondary,
    cursor: 'pointer',
    transition: animation.transition.fast,
  },
  content: {
    padding: spacing.xl,
  },
  description: {
    margin: `0 0 ${spacing.lg}px`,
    fontSize: typography.fontSize.md,
    color: colors.text.secondary,
    lineHeight: typography.lineHeight.normal,
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
  },
  input: {
    ...mixins.input,
    width: '100%',
    boxSizing: 'border-box',
  },
  footer: {
    display: 'flex',
    gap: spacing.md,
    padding: spacing.xl,
    paddingTop: 0,
  },
  cancelButton: {
    flex: 1,
    ...mixins.buttonSecondary,
    padding: `${spacing.md}px ${spacing.lg}px`,
    fontSize: typography.fontSize.md,
  },
  saveButton: {
    flex: 2,
    ...mixins.buttonPrimary,
    padding: `${spacing.md}px ${spacing.lg}px`,
    fontSize: typography.fontSize.md,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
};

export default SaveProjectModal;
