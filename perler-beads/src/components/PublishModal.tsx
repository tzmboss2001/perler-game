import React, { useState, useEffect } from 'react';
import { X, CircleNotch } from '@phosphor-icons/react';
import { colors, spacing, radius, typography, shadows, animation, mixins } from '../styles/designSystem';

interface PublishModalProps {
  visible: boolean;
  onPublish: (data: { title: string; description: string; difficulty: string }) => void;
  onCancel: () => void;
  loading?: boolean;
  defaultTitle?: string;
  gridSize?: string;
}

const PublishModal: React.FC<PublishModalProps> = ({
  visible,
  onPublish,
  onCancel,
  loading = false,
  defaultTitle = '',
  gridSize = '',
}) => {
  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState('medium');

  useEffect(() => {
    if (visible) {
      setTitle(defaultTitle || '');
      setDescription('');
      setDifficulty('medium');
    }
  }, [visible, defaultTitle]);

  const handlePublish = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    onPublish({ title: trimmedTitle, description: description.trim(), difficulty });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !loading) {
      handlePublish();
    }
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  if (!visible) return null;

  const difficultyOptions = [
    { value: 'easy', label: '简单', color: colors.bead.green },
    { value: 'medium', label: '中等', color: colors.bead.orange },
    { value: 'hard', label: '困难', color: colors.bead.red },
  ];

  return (
    <div style={styles.overlay} onClick={onCancel}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* 头部 */}
        <div style={styles.header}>
          <h3 style={styles.headerTitle}>分享到社区</h3>
          <button style={styles.closeButton} onClick={onCancel}>
            <X size={20} weight="bold" />
          </button>
        </div>

        {/* 内容 */}
        <div style={styles.content}>
          <p style={styles.desc}>
            分享你的拼豆作品，让更多人看到你的创意
          </p>
          {gridSize && (
            <p style={{ ...styles.desc, fontSize: '12px', color: colors.bead.cyan, margin: '0 0 12px' }}>
              网格尺寸: {gridSize}
            </p>
          )}

          {/* 标题 */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>作品标题 *</label>
            <input
              type="text"
              style={styles.input}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="给你的作品起个名字"
              maxLength={50}
              autoFocus
            />
          </div>

          {/* 描述 */}
          <div style={{ ...styles.inputGroup, marginTop: '12px' }}>
            <label style={styles.label}>作品描述（选填）</label>
            <textarea
              style={{ ...styles.input, minHeight: '72px', resize: 'vertical' } as React.CSSProperties}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="介绍一下这个作品的灵感或特点"
              maxLength={200}
            />
          </div>

          {/* 难度选择 */}
          <div style={{ ...styles.inputGroup, marginTop: '12px' }}>
            <label style={styles.label}>难度</label>
            <div style={styles.difficultyRow}>
              {difficultyOptions.map((opt) => (
                <button
                  key={opt.value}
                  style={{
                    ...styles.difficultyBtn,
                    ...(difficulty === opt.value ? {
                      background: `${opt.color}25`,
                      borderColor: opt.color,
                      color: opt.color,
                    } : {}),
                  }}
                  onClick={() => setDifficulty(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div style={styles.footer}>
          <button style={styles.cancelButton} onClick={onCancel} disabled={loading}>
            取消
          </button>
          <button
            style={{
              ...styles.publishButton,
              opacity: loading || !title.trim() ? 0.6 : 1,
            }}
            onClick={handlePublish}
            disabled={loading || !title.trim()}
          >
            {loading ? (
              <>
                <CircleNotch size={18} style={{ animation: 'spin 1s linear infinite' }} />
                发布中...
              </>
            ) : '发布到社区'}
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
  headerTitle: {
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
  desc: {
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
  } as React.CSSProperties,
  difficultyRow: {
    display: 'flex',
    gap: '8px',
  },
  difficultyBtn: {
    flex: 1,
    padding: '8px 12px',
    background: colors.bg.tertiary,
    border: `1px solid ${colors.border.soft}`,
    borderRadius: radius.md,
    color: colors.text.secondary,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    fontFamily: typography.fontFamilyAlt,
    cursor: 'pointer',
    transition: animation.transition.fast,
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
  } as React.CSSProperties,
  publishButton: {
    flex: 2,
    ...mixins.buttonPrimary,
    padding: `${spacing.md}px ${spacing.lg}px`,
    fontSize: typography.fontSize.md,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  } as React.CSSProperties,
};

export default PublishModal;
