/**
 * 登录弹窗组件
 * 智能登录：邮箱不存在时自动注册
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Envelope, Lock, Eye, EyeSlash } from '@phosphor-icons/react';
import { colors, radius, spacing, typography, shadows, animation, mixins } from '../styles/designSystem';
import { useUserStore } from '../store/userStore';

interface LoginModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  message?: string;
}

const LoginModal: React.FC<LoginModalProps> = ({
  visible,
  onClose,
  onSuccess,
  title = '请先登录',
  message = '登录后即可保存作品、同步进度',
}) => {
  const { smartLogin, loading, error, clearError } = useUserStore();

  // 表单状态
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 清除错误
  useEffect(() => {
    if (visible) {
      setLocalError(null);
      setSuccessMessage(null);
      clearError();
    }
  }, [visible, clearError]);

  // 表单验证
  const validateForm = (): boolean => {
    if (!email.trim()) {
      setLocalError('请输入邮箱地址');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setLocalError('请输入有效的邮箱地址');
      return false;
    }
    if (!password) {
      setLocalError('请输入密码');
      return false;
    }
    if (password.length < 6) {
      setLocalError('密码至少需要6个字符');
      return false;
    }

    setLocalError(null);
    return true;
  };

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    const result = await smartLogin({ email, password });
    if (result.success) {
      if (result.isNewUser) {
        // 新用户，显示欢迎提示
        setSuccessMessage('欢迎加入！账号已自动创建');
        setTimeout(() => {
          onSuccess();
        }, 1000);
      } else {
        onSuccess();
      }
    }
  };

  const displayError = localError || error;

  if (!visible) return null;

  return createPortal(
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        {/* 头部 */}
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>{title}</h2>
            <p style={styles.subtitle}>{message}</p>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={20} weight="bold" />
          </button>
        </div>

        {/* 表单 */}
        <form style={styles.form} onSubmit={handleSubmit}>
          {/* 邮箱 */}
          <div style={styles.inputGroup}>
            <Envelope size={18} style={styles.inputIcon} />
            <input
              type="email"
              placeholder="邮箱地址"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
            />
          </div>

          {/* 密码 */}
          <div style={styles.inputGroup}>
            <Lock size={18} style={styles.inputIcon} />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="密码（至少6位）"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ ...styles.input, ...styles.inputWithEye }}
            />
            <button
              type="button"
              style={styles.eyeButton}
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* 成功提示 */}
          {successMessage && (
            <div style={styles.success}>{successMessage}</div>
          )}

          {/* 错误提示 */}
          {displayError && !successMessage && (
            <div style={styles.error}>{displayError}</div>
          )}

          {/* 提交按钮 */}
          <button
            type="submit"
            style={{
              ...styles.submitButton,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
            disabled={loading}
          >
            {loading ? '请稍候...' : '登录 / 注册'}
          </button>
        </form>

        {/* 底部提示 */}
        <div style={styles.footer}>
          <p style={styles.footerText}>
            新邮箱将自动注册，忘记密码可通过邮箱找回
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1100,
    padding: spacing.lg,
  },

  modal: {
    width: '100%',
    maxWidth: '400px',
    background: colors.bg.secondary,
    borderRadius: radius.card,
    overflow: 'hidden',
  },

  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },

  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyAlt,
    ...mixins.gradientText,
    margin: 0,
  } as React.CSSProperties,

  subtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    margin: `${spacing.xs}px 0 0`,
  },

  closeBtn: {
    ...mixins.iconButton,
    background: colors.bg.tertiary,
  } as React.CSSProperties,

  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
    padding: `0 ${spacing.lg}px`,
  },

  inputGroup: {
    position: 'relative',
  },

  inputIcon: {
    position: 'absolute',
    left: spacing.md,
    top: '50%',
    transform: 'translateY(-50%)',
    color: colors.text.muted,
    zIndex: 1,
  },

  input: {
    width: '100%',
    padding: `${spacing.md}px ${spacing.md}px ${spacing.md}px ${spacing.huge}px`,
    backgroundColor: colors.bg.input,
    border: `1px solid ${colors.border.default}`,
    borderRadius: radius.md,
    color: colors.text.primary,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamilyAlt,
    outline: 'none',
    transition: animation.transition.fast,
    boxSizing: 'border-box',
  },

  inputWithEye: {
    paddingRight: spacing.huge,
  },

  eyeButton: {
    position: 'absolute',
    right: spacing.md,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    color: colors.text.muted,
    cursor: 'pointer',
    padding: spacing.xs,
  },

  error: {
    padding: spacing.sm,
    background: `${colors.status.error}20`,
    borderRadius: radius.md,
    border: `1px solid ${colors.status.error}40`,
    color: colors.status.error,
    fontSize: typography.fontSize.xs,
    textAlign: 'center',
  },

  success: {
    padding: spacing.sm,
    background: `${colors.status.success}20`,
    borderRadius: radius.md,
    border: `1px solid ${colors.status.success}40`,
    color: colors.status.success,
    fontSize: typography.fontSize.xs,
    textAlign: 'center',
  },

  submitButton: {
    width: '100%',
    padding: `${spacing.md}px`,
    background: `linear-gradient(145deg, ${colors.bead.cyan}, ${colors.pixel.blue})`,
    border: 'none',
    borderRadius: radius.button,
    color: colors.text.inverse,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    boxShadow: `${shadows.button}, ${shadows.glow.cyan}`,
    transition: animation.transition.fast,
    marginTop: spacing.sm,
  },

  footer: {
    padding: spacing.lg,
    textAlign: 'center',
  },

  footerText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
    margin: 0,
  },
};

export default LoginModal;
