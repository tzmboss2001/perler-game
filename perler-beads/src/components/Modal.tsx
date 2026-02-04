import React, { useState, useEffect, useCallback } from 'react';
import { Warning, CheckCircle, XCircle, Info } from '@phosphor-icons/react';
import { colors, radius, typography, shadows, animation } from '../styles/designSystem';

/**
 * 统一弹框组件
 * 支持 Alert、Confirm、Prompt 三种模式
 */

// 弹框类型
type ModalType = 'info' | 'success' | 'warning' | 'error';

// 弹框配置
interface ModalConfig {
  type?: ModalType;
  title?: string;
  content: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  showInput?: boolean;
  inputPlaceholder?: string;
  inputDefaultValue?: string;
  onConfirm?: (inputValue?: string) => void;
  onCancel?: () => void;
}

interface ModalProps extends ModalConfig {
  visible: boolean;
  onClose: () => void;
}

// 图标映射
const iconMap = {
  info: { icon: Info, color: colors.bead.cyan },
  success: { icon: CheckCircle, color: colors.bead.green },
  warning: { icon: Warning, color: colors.bead.yellow },
  error: { icon: XCircle, color: colors.bead.red },
};

// Modal 组件
const Modal: React.FC<ModalProps> = ({
  visible,
  type = 'info',
  title,
  content,
  confirmText = '确定',
  cancelText = '取消',
  showCancel = false,
  showInput = false,
  inputPlaceholder = '',
  inputDefaultValue = '',
  onConfirm,
  onCancel,
  onClose,
}) => {
  const [inputValue, setInputValue] = useState(inputDefaultValue);
  const [isClosing, setIsClosing] = useState(false);

  // 重置输入值
  useEffect(() => {
    if (visible) {
      setInputValue(inputDefaultValue);
      setIsClosing(false);
    }
  }, [visible, inputDefaultValue]);

  // 关闭动画
  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 200);
  }, [onClose]);

  // 确认
  const handleConfirm = () => {
    onConfirm?.(inputValue);
    handleClose();
  };

  // 取消
  const handleCancel = () => {
    onCancel?.();
    handleClose();
  };

  // 点击遮罩关闭
  const handleMaskClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  };

  if (!visible) return null;

  const IconComponent = iconMap[type].icon;
  const iconColor = iconMap[type].color;

  return (
    <div
      style={{
        ...styles.mask,
        opacity: isClosing ? 0 : 1,
      }}
      onClick={handleMaskClick}
    >
      <div
        style={{
          ...styles.modal,
          transform: isClosing ? 'scale(0.9)' : 'scale(1)',
          opacity: isClosing ? 0 : 1,
        }}
      >
        {/* 图标 */}
        <div style={{ ...styles.iconBox, background: `${iconColor}20` }}>
          <IconComponent size={32} weight="fill" style={{ color: iconColor }} />
        </div>

        {/* 标题 */}
        {title && <h3 style={styles.title}>{title}</h3>}

        {/* 内容 */}
        <div style={styles.content}>
          {typeof content === 'string' ? (
            <p style={styles.contentText}>{content}</p>
          ) : (
            content
          )}
        </div>

        {/* 输入框 */}
        {showInput && (
          <input
            type="text"
            style={styles.input}
            placeholder={inputPlaceholder}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            autoFocus
          />
        )}

        {/* 按钮 */}
        <div style={styles.buttons}>
          {showCancel && (
            <button style={styles.cancelBtn} onClick={handleCancel}>
              {cancelText}
            </button>
          )}
          <button
            style={{
              ...styles.confirmBtn,
              background: type === 'error' || type === 'warning'
                ? `linear-gradient(145deg, ${colors.bead.red}, ${colors.bead.red}dd)`
                : `linear-gradient(145deg, ${colors.bead.cyan}, ${colors.pixel.blue})`,
              boxShadow: type === 'error' || type === 'warning'
                ? `0 4px 16px ${colors.bead.red}40`
                : `0 4px 16px ${colors.bead.cyan}40`,
              flex: showCancel ? 1 : 'none',
              minWidth: showCancel ? 'auto' : '120px',
            }}
            onClick={handleConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

// 样式
const styles: Record<string, React.CSSProperties> = {
  mask: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '20px',
    transition: 'opacity 0.2s ease',
  },

  modal: {
    width: '100%',
    maxWidth: '320px',
    background: colors.bg.card,
    borderRadius: radius.card,
    border: `1px solid ${colors.border.soft}`,
    boxShadow: shadows.lg,
    padding: '24px 20px',
    textAlign: 'center',
    transition: 'all 0.2s ease',
  },

  iconBox: {
    width: '64px',
    height: '64px',
    borderRadius: radius.full,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
  },

  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.primary,
    margin: '0 0 12px',
  },

  content: {
    marginBottom: '20px',
  },

  contentText: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.secondary,
    margin: 0,
    lineHeight: 1.6,
    whiteSpace: 'pre-line',
  },

  input: {
    width: '100%',
    padding: '12px 16px',
    background: colors.bg.tertiary,
    border: `1px solid ${colors.border.soft}`,
    borderRadius: radius.button,
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.primary,
    outline: 'none',
    marginBottom: '20px',
    boxSizing: 'border-box',
    textAlign: 'center',
  },

  buttons: {
    display: 'flex',
    gap: '12px',
  },

  cancelBtn: {
    flex: 1,
    padding: '14px 20px',
    background: colors.bg.tertiary,
    border: `1px solid ${colors.border.soft}`,
    borderRadius: radius.button,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.secondary,
    cursor: 'pointer',
    transition: animation.transition.fast,
  },

  confirmBtn: {
    flex: 1,
    padding: '14px 20px',
    border: 'none',
    borderRadius: radius.button,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyAlt,
    color: '#ffffff',
    cursor: 'pointer',
    transition: animation.transition.fast,
  },
};

export default Modal;

// ============ 便捷调用 Hook ============

interface ModalState {
  visible: boolean;
  config: ModalConfig;
}

export const useModal = () => {
  const [state, setState] = useState<ModalState>({
    visible: false,
    config: { content: '' },
  });

  const showModal = useCallback((config: ModalConfig) => {
    setState({ visible: true, config });
  }, []);

  const hideModal = useCallback(() => {
    setState(prev => ({ ...prev, visible: false }));
  }, []);

  // 便捷方法：Alert
  const showAlert = useCallback((
    content: string,
    options?: { type?: ModalType; title?: string; onConfirm?: () => void }
  ) => {
    showModal({
      type: options?.type || 'info',
      title: options?.title,
      content,
      showCancel: false,
      onConfirm: options?.onConfirm,
    });
  }, [showModal]);

  // 便捷方法：Success
  const showSuccess = useCallback((content: string, onConfirm?: () => void) => {
    showModal({
      type: 'success',
      title: '成功',
      content,
      showCancel: false,
      onConfirm,
    });
  }, [showModal]);

  // 便捷方法：Error
  const showError = useCallback((content: string, onConfirm?: () => void) => {
    showModal({
      type: 'error',
      title: '错误',
      content,
      showCancel: false,
      onConfirm,
    });
  }, [showModal]);

  // 便捷方法：Confirm
  const showConfirm = useCallback((
    content: string,
    options?: {
      type?: ModalType;
      title?: string;
      confirmText?: string;
      cancelText?: string;
      onConfirm?: () => void;
      onCancel?: () => void;
    }
  ) => {
    showModal({
      type: options?.type || 'warning',
      title: options?.title || '确认',
      content,
      showCancel: true,
      confirmText: options?.confirmText || '确定',
      cancelText: options?.cancelText || '取消',
      onConfirm: options?.onConfirm,
      onCancel: options?.onCancel,
    });
  }, [showModal]);

  // 便捷方法：Prompt
  const showPrompt = useCallback((
    content: string,
    options?: {
      type?: ModalType;
      title?: string;
      placeholder?: string;
      defaultValue?: string;
      confirmText?: string;
      cancelText?: string;
      onConfirm?: (value: string) => void;
      onCancel?: () => void;
    }
  ) => {
    showModal({
      type: options?.type || 'warning',
      title: options?.title || '请输入',
      content,
      showCancel: true,
      showInput: true,
      inputPlaceholder: options?.placeholder,
      inputDefaultValue: options?.defaultValue,
      confirmText: options?.confirmText || '确定',
      cancelText: options?.cancelText || '取消',
      onConfirm: (value) => options?.onConfirm?.(value || ''),
      onCancel: options?.onCancel,
    });
  }, [showModal]);

  // Modal 组件 props
  const modalProps = {
    visible: state.visible,
    ...state.config,
    onClose: hideModal,
  };

  return {
    modalProps,
    showModal,
    hideModal,
    showAlert,
    showSuccess,
    showError,
    showConfirm,
    showPrompt,
  };
};
