import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle, XCircle, Info, Warning, X } from '@phosphor-icons/react';
import { colors, radius, typography, shadows, animation } from '../styles/designSystem';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: number;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (type: ToastType, message: string, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

let toastId = 0;

/**
 * Toast Provider - 包裹应用以提供 Toast 功能
 */
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((type: ToastType, message: string, duration = 3000) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, type, message, duration }]);

    if (duration > 0) {
      setTimeout(() => removeToast(id), duration);
    }
  }, [removeToast]);

  const success = useCallback((message: string, duration?: number) => {
    showToast('success', message, duration);
  }, [showToast]);

  const error = useCallback((message: string, duration?: number) => {
    showToast('error', message, duration ?? 5000); // 错误消息默认显示更久
  }, [showToast]);

  const info = useCallback((message: string, duration?: number) => {
    showToast('info', message, duration);
  }, [showToast]);

  const warning = useCallback((message: string, duration?: number) => {
    showToast('warning', message, duration ?? 4000);
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, info, warning }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

/**
 * useToast Hook - 在组件中使用 Toast
 */
export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

/**
 * Toast 容器 - 显示所有 Toast
 */
const ToastContainer: React.FC<{ toasts: Toast[]; onRemove: (id: number) => void }> = ({
  toasts,
  onRemove,
}) => {
  if (toasts.length === 0) return null;

  return (
    <div style={styles.container}>
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={() => onRemove(toast.id)} />
      ))}
    </div>
  );
};

/**
 * 单个 Toast 项
 */
const ToastItem: React.FC<{ toast: Toast; onRemove: () => void }> = ({ toast, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 进入动画
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  const config = toastConfig[toast.type];

  return (
    <div
      style={{
        ...styles.toast,
        background: config.bg,
        borderColor: config.border,
        transform: isVisible ? 'translateY(0)' : 'translateY(-20px)',
        opacity: isVisible ? 1 : 0,
      }}
    >
      <div style={{ ...styles.icon, color: config.color }}>
        {config.icon}
      </div>
      <span style={styles.message}>{toast.message}</span>
      <button style={styles.closeBtn} onClick={onRemove}>
        <X size={16} />
      </button>
    </div>
  );
};

const toastConfig: Record<ToastType, { icon: React.ReactNode; color: string; bg: string; border: string }> = {
  success: {
    icon: <CheckCircle size={20} weight="fill" />,
    color: colors.bead.green,
    bg: `linear-gradient(145deg, ${colors.bead.green}15, ${colors.bead.green}08)`,
    border: `${colors.bead.green}40`,
  },
  error: {
    icon: <XCircle size={20} weight="fill" />,
    color: colors.bead.pink,
    bg: `linear-gradient(145deg, ${colors.bead.pink}15, ${colors.bead.pink}08)`,
    border: `${colors.bead.pink}40`,
  },
  info: {
    icon: <Info size={20} weight="fill" />,
    color: colors.bead.cyan,
    bg: `linear-gradient(145deg, ${colors.bead.cyan}15, ${colors.bead.cyan}08)`,
    border: `${colors.bead.cyan}40`,
  },
  warning: {
    icon: <Warning size={20} weight="fill" />,
    color: colors.bead.orange,
    bg: `linear-gradient(145deg, ${colors.bead.orange}15, ${colors.bead.orange}08)`,
    border: `${colors.bead.orange}40`,
  },
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    top: '16px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 10000,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    width: '90%',
    maxWidth: '360px',
  },

  toast: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    borderRadius: radius.md,
    border: '1px solid',
    boxShadow: shadows.md,
    backdropFilter: 'blur(10px)',
    transition: `all ${animation.duration.normal} ${animation.easing.spring}`,
    gap: '10px',
  },

  icon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  message: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.primary,
    lineHeight: 1.4,
  },

  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: colors.text.muted,
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    opacity: 0.7,
    transition: animation.transition.fast,
  },
};

export default ToastProvider;
